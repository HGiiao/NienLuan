using System.Net.Http;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace FlightAggregatorApi.Services;

public class MoMoService
{
    private readonly IConfiguration _config;
    private readonly ILogger<MoMoService> _logger;
    private readonly IHttpClientFactory _http;

    public MoMoService(IConfiguration config, ILogger<MoMoService> logger, IHttpClientFactory http)
    {
        _config = config;
        _logger = logger;
        _http = http;
    }

    private string PartnerCode => _config["MoMo:PartnerCode"] ?? "";
    private string AccessKey => _config["MoMo:AccessKey"] ?? "";
    private string SecretKey => _config["MoMo:SecretKey"] ?? "";

    public bool IsConfigured => !string.IsNullOrWhiteSpace(PartnerCode) && !string.IsNullOrWhiteSpace(AccessKey) && !string.IsNullOrWhiteSpace(SecretKey);
    private string SandboxUrl => _config["MoMo:SandboxUrl"] ?? "https://test-payment.momo.vn/v2/gateway/api/create";
    private string RedirectUrl => _config["MoMo:RedirectUrl"] ?? "http://localhost:5173/payment/momo-return";
    private string IpnUrl => _config["MoMo:IpnUrl"] ?? "http://localhost:5000/api/payments/momo-ipn";

    public async Task<MoMoCreateResult> CreatePaymentAsync(long orderId, decimal amount, string orderInfo)
    {
        var amountLong = (long)amount;
        var requestId = orderId.ToString() + DateTime.UtcNow.Ticks % 100000;
        var orderIdStr = orderId.ToString() + (DateTime.UtcNow.Ticks % 1000).ToString("D3");

        var rawSignature = $"accessKey={AccessKey}&amount={amountLong}&extraData=&ipnUrl={IpnUrl}" +
                           $"&orderId={orderIdStr}&orderInfo={orderInfo}&partnerCode={PartnerCode}" +
                           $"&redirectUrl={RedirectUrl}&requestId={requestId}&requestType=captureWallet";
        var signature = HmacSha256(SecretKey, rawSignature);

        var payload = new
        {
            partnerCode = PartnerCode,
            partnerName = "Vé247",
            storeId = "Ve247Store",
            requestId,
            amount = amountLong,
            orderId = orderIdStr,
            orderInfo,
            redirectUrl = RedirectUrl,
            ipnUrl = IpnUrl,
            requestType = "captureWallet",
            extraData = "",
            lang = "vi",
            signature,
        };

        var client = _http.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(30);
        var resp = await client.PostAsJsonAsync(SandboxUrl, payload);
        var json = await resp.Content.ReadAsStringAsync();

        var result = JsonSerializer.Deserialize<MoMoCreateResult>(json,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        result ??= new MoMoCreateResult { ResultCode = -1, Message = json };

        if (result.ResultCode != 0 && result.ResultCode != 9000)
            _logger.LogWarning("MoMo create failed (code {Code}): {Msg} | raw: {Raw}", result.ResultCode, result.Message, json);

        return result;
    }

    public bool VerifyCallback(string jsonBody, out MoMoIpnResult? data)
    {
        data = null;
        try
        {
            using var doc = JsonDocument.Parse(jsonBody);
            data = JsonSerializer.Deserialize<MoMoIpnResult>(jsonBody,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            var accessKey = doc.RootElement.GetProperty("accessKey").GetString() ?? "";
            var amount = doc.RootElement.GetProperty("amount").GetInt64().ToString();
            var extraData = doc.RootElement.GetProperty("extraData").GetString() ?? "";
            var message = doc.RootElement.GetProperty("message").GetString() ?? "";
            var orderId = doc.RootElement.GetProperty("orderId").GetString() ?? "";
            var orderInfo = doc.RootElement.GetProperty("orderInfo").GetString() ?? "";
            var orderType = doc.RootElement.GetProperty("orderType").GetString() ?? "";
            var partnerCode = doc.RootElement.GetProperty("partnerCode").GetString() ?? "";
            var payType = doc.RootElement.GetProperty("payType").GetString() ?? "";
            var requestId = doc.RootElement.GetProperty("requestId").GetString() ?? "";
            var signature = doc.RootElement.GetProperty("signature").GetString() ?? "";
            var resultCode = doc.RootElement.GetProperty("resultCode").GetInt64().ToString();

            var raw = $"accessKey={accessKey}&amount={amount}&extraData={extraData}&message={message}" +
                      $"&orderId={orderId}&orderInfo={orderInfo}&orderType={orderType}&partnerCode={partnerCode}" +
                      $"&payType={payType}&requestId={requestId}&resultCode={resultCode}";
            var computed = HmacSha256(SecretKey, raw);

            if (!string.Equals(computed, signature, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("MoMo signature mismatch. Expected {Expected}, got {Actual}", computed, signature);
                return false;
            }
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "MoMo callback parse error");
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

public class MoMoCreateResult
{
    [JsonPropertyName("partnerCode")] public string PartnerCode { get; set; } = "";
    [JsonPropertyName("orderId")] public string OrderId { get; set; } = "";
    [JsonPropertyName("requestId")] public string RequestId { get; set; } = "";
    [JsonPropertyName("amount")] public long Amount { get; set; }
    [JsonPropertyName("orderInfo")] public string OrderInfo { get; set; } = "";
    [JsonPropertyName("orderType")] public string OrderType { get; set; } = "";
    [JsonPropertyName("transId")] public long TransId { get; set; }
    [JsonPropertyName("resultCode")] public int ResultCode { get; set; }
    [JsonPropertyName("message")] public string Message { get; set; } = "";
    [JsonPropertyName("payUrl")] public string PayUrl { get; set; } = "";
    [JsonPropertyName("deeplink")] public string Deeplink { get; set; } = "";
    [JsonPropertyName("qrCodeUrl")] public string QrCodeUrl { get; set; } = "";
}

public class MoMoIpnResult
{
    [JsonPropertyName("partnerCode")] public string PartnerCode { get; set; } = "";
    [JsonPropertyName("orderId")] public string OrderId { get; set; } = "";
    [JsonPropertyName("requestId")] public string RequestId { get; set; } = "";
    [JsonPropertyName("amount")] public long Amount { get; set; }
    [JsonPropertyName("orderInfo")] public string OrderInfo { get; set; } = "";
    [JsonPropertyName("orderType")] public string OrderType { get; set; } = "";
    [JsonPropertyName("transId")] public long TransId { get; set; }
    [JsonPropertyName("resultCode")] public int ResultCode { get; set; }
    [JsonPropertyName("message")] public string Message { get; set; } = "";
    [JsonPropertyName("payType")] public string PayType { get; set; } = "";
    [JsonPropertyName("signature")] public string Signature { get; set; } = "";
}
