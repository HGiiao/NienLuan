using System.Net.Http;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace FlightAggregatorApi.Services;

public class PayOSService
{
    private readonly IConfiguration _config;
    private readonly ILogger<PayOSService> _logger;
    private readonly IHttpClientFactory _http;

    public PayOSService(IConfiguration config, ILogger<PayOSService> logger, IHttpClientFactory http)
    {
        _config = config;
        _logger = logger;
        _http = http;
    }

    private string ClientId => _config["PayOS:ClientId"] ?? "";
    private string ApiKey => _config["PayOS:ApiKey"] ?? "";
    private string ChecksumKey => _config["PayOS:ChecksumKey"] ?? "";
    private string ApiUrl => _config["PayOS:ApiUrl"] ?? "https://api-merchant.payos.vn";
    private string ReturnUrl => _config["PayOS:ReturnUrl"]
        ?? "http://localhost:5173/payment/payos-return";
    private string WebhookUrl => _config["PayOS:WebhookUrl"]
        ?? "http://localhost:5000/api/payments/payos-ipn";
    private int ExpiredAfterMinutes =>
        int.TryParse(_config["PayOS:ExpiredAfterMinutes"], out var m) && m > 0 ? m : 30;

    public bool IsConfigured =>
        !string.IsNullOrEmpty(ClientId) && !string.IsNullOrEmpty(ApiKey) && !string.IsNullOrEmpty(ChecksumKey);

    public async Task<PayOSCreateResult?> CreatePaymentAsync(
        long orderId, decimal amount, string description,
        string? buyerName = null, string? buyerEmail = null, string? buyerPhone = null)
    {
        var amountLong = (long)amount;
        var orderCode = (int)orderId;
        var expiredAt = DateTimeOffset.UtcNow.AddMinutes(ExpiredAfterMinutes).ToUnixTimeSeconds();
        var returnUrl = ReturnUrl;
        var cancelUrl = returnUrl;

        // Signature: HMAC-SHA256(checksumKey) over params sorted alphabetically
        var signatureData = $"amount={amountLong}&cancelUrl={cancelUrl}&description={description}" +
                            $"&orderCode={orderCode}&returnUrl={returnUrl}";
        var signature = HmacSha256(ChecksumKey, signatureData);

        var payload = new Dictionary<string, object?>
        {
            ["orderCode"] = orderCode,
            ["amount"] = amountLong,
            ["description"] = description,
            ["buyerName"] = buyerName,
            ["buyerEmail"] = buyerEmail,
            ["buyerPhone"] = buyerPhone,
            ["cancelUrl"] = cancelUrl,
            ["returnUrl"] = returnUrl,
            ["expiredAt"] = expiredAt,
            ["signature"] = signature,
        };

        var client = _http.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(30);
        client.DefaultRequestHeaders.Add("x-client-id", ClientId);
        client.DefaultRequestHeaders.Add("x-api-key", ApiKey);

        var resp = await client.PostAsJsonAsync($"{ApiUrl}/v2/payment-requests", payload);
        var json = await resp.Content.ReadAsStringAsync();

        var envelope = JsonSerializer.Deserialize<PayOSEnvelope<PayOSCreateResult>>(json,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        if (envelope == null || envelope.Code != "00" || envelope.Data == null)
        {
            _logger.LogWarning("PayOS create failed (code {Code}): {Desc} | raw: {Raw}",
                envelope?.Code, envelope?.Desc, json);
            return envelope?.Data;
        }

        envelope.Data.OrderCode = orderCode;
        return envelope.Data;
    }

    public async Task<PayOSPaymentStatus?> GetPaymentInfoAsync(string paymentLinkId)
    {
        var client = _http.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(30);
        client.DefaultRequestHeaders.Add("x-client-id", ClientId);
        client.DefaultRequestHeaders.Add("x-api-key", ApiKey);

        var resp = await client.GetAsync($"{ApiUrl}/v2/payment-requests/{paymentLinkId}");
        var json = await resp.Content.ReadAsStringAsync();

        var envelope = JsonSerializer.Deserialize<PayOSEnvelope<PayOSPaymentStatus>>(json,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        if (envelope == null || envelope.Code != "00" || envelope.Data == null)
        {
            _logger.LogWarning("PayOS get-info failed (code {Code}): {Desc} | raw: {Raw}",
                envelope?.Code, envelope?.Desc, json);
            return null;
        }

        return envelope.Data;
    }

    public bool VerifyWebhook(string rawBody, out PayOSWebhookData? data)
    {
        data = null;
        try
        {
            using var doc = JsonDocument.Parse(rawBody);
            var root = doc.RootElement;

            var signature = root.TryGetProperty("signature", out var s) ? s.GetString() ?? "" : "";
            var dataJson = root.TryGetProperty("data", out var d) ? d.GetRawText() : null;
            if (string.IsNullOrEmpty(dataJson))
                return false;

            var computed = HmacSha256(ChecksumKey, dataJson);
            if (!string.Equals(computed, signature, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("PayOS webhook signature mismatch. Expected {Expected}, got {Actual}",
                    computed, signature);
                return false;
            }

            data = JsonSerializer.Deserialize<PayOSWebhookData>(dataJson,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "PayOS webhook parse error");
            return false;
        }
    }

    private static string HmacSha256(string key, string data)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}

public class PayOSEnvelope<T>
{
    [JsonPropertyName("code")] public string Code { get; set; } = "";
    [JsonPropertyName("desc")] public string Desc { get; set; } = "";
    [JsonPropertyName("data")] public T? Data { get; set; }
    [JsonPropertyName("signature")] public string Signature { get; set; } = "";
}

public class PayOSCreateResult
{
    [JsonPropertyName("id")] public string Id { get; set; } = "";
    [JsonPropertyName("orderCode")] public int OrderCode { get; set; }
    [JsonPropertyName("amount")] public long Amount { get; set; }
    [JsonPropertyName("amountPaid")] public long AmountPaid { get; set; }
    [JsonPropertyName("amountRemaining")] public long AmountRemaining { get; set; }
    [JsonPropertyName("status")] public string Status { get; set; } = "";
    [JsonPropertyName("checkoutUrl")] public string CheckoutUrl { get; set; } = "";
    [JsonPropertyName("qrCode")] public string QrCode { get; set; } = "";
}

public class PayOSPaymentStatus
{
    [JsonPropertyName("id")] public string Id { get; set; } = "";
    [JsonPropertyName("orderCode")] public int OrderCode { get; set; }
    [JsonPropertyName("amount")] public long Amount { get; set; }
    [JsonPropertyName("amountPaid")] public long AmountPaid { get; set; }
    [JsonPropertyName("status")] public string Status { get; set; } = "";
    [JsonPropertyName("cancelledAt")] public long? CancelledAt { get; set; }
    [JsonPropertyName("transactions")] public List<PayOSTransaction>? Transactions { get; set; }
}

public class PayOSTransaction
{
    [JsonPropertyName("reference")] public string Reference { get; set; } = "";
    [JsonPropertyName("amount")] public long Amount { get; set; }
    [JsonPropertyName("description")] public string Description { get; set; } = "";
    [JsonPropertyName("transactionDateTime")] public string TransactionDateTime { get; set; } = "";
}

public class PayOSWebhookData
{
    [JsonPropertyName("orderCode")] public int OrderCode { get; set; }
    [JsonPropertyName("amount")] public long Amount { get; set; }
    [JsonPropertyName("description")] public string Description { get; set; } = "";
    [JsonPropertyName("accountNumber")] public string AccountNumber { get; set; } = "";
    [JsonPropertyName("reference")] public string Reference { get; set; } = "";
    [JsonPropertyName("transactionDateTime")] public string TransactionDateTime { get; set; } = "";
    [JsonPropertyName("currency")] public string Currency { get; set; } = "";
    [JsonPropertyName("paymentLinkId")] public string PaymentLinkId { get; set; } = "";
    [JsonPropertyName("code")] public string Code { get; set; } = "";
    [JsonPropertyName("desc")] public string Desc { get; set; } = "";
}
