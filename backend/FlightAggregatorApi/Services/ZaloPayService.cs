using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace FlightAggregatorApi.Services;

public class ZaloPayService
{
    private readonly IConfiguration _config;
    private readonly ILogger<ZaloPayService> _logger;
    private readonly IHttpClientFactory _http;

    public ZaloPayService(IConfiguration config, ILogger<ZaloPayService> logger, IHttpClientFactory http)
    {
        _config = config;
        _logger = logger;
        _http = http;
    }

    private string AppId => _config["ZaloPay:AppId"] ?? "";
    private string Key1 => _config["ZaloPay:Key1"] ?? "";
    private string Key2 => _config["ZaloPay:Key2"] ?? "";
    private string CreateUrl => _config["ZaloPay:CreateUrl"] ?? "https://sb-openapi.zalopay.vn/v2/create";
    private string CallbackUrl => _config["ZaloPay:CallbackUrl"] ?? "http://localhost:5000/api/payments/zalopay-ipn";
    private string RedirectUrl => _config["ZaloPay:RedirectUrl"] ?? "http://localhost:5173/payment/zalopay-return";

    public async Task<ZaloPayCreateResult> CreatePaymentAsync(long orderId, decimal amount, string orderInfo)
    {
        var appTransId = $"{DateTime.Now:yyMMdd}_{orderId}_{Random.Shared.Next(1000, 9999)}";
        var appTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
        var amountLong = (long)amount;

        var embedData = JsonSerializer.Serialize(new { redirecturl = RedirectUrl });
        var items = JsonSerializer.Serialize(new object[] { new { itemid = orderId.ToString(), itemname = orderInfo, itemprice = amountLong, itemquantity = 1 } });

        var rawMac = $"{AppId}|{appTransId}|{orderId}|{amountLong}|{appTime}|{embedData}|{items}";
        var mac = HmacSha256(Key1, rawMac);

        var form = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["app_id"] = AppId,
            ["app_user"] = orderId.ToString(),
            ["app_time"] = appTime.ToString(),
            ["app_trans_id"] = appTransId,
            ["amount"] = amountLong.ToString(),
            ["description"] = $"Ve247 - {orderInfo} (#{orderId})",
            ["embed_data"] = embedData,
            ["item"] = items,
            ["bank_code"] = "",
            ["mac"] = mac,
            ["callback_url"] = CallbackUrl,
        });

        var client = _http.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(30);
        var resp = await client.PostAsync(CreateUrl, form);
        var json = await resp.Content.ReadAsStringAsync();

        var result = JsonSerializer.Deserialize<ZaloPayCreateResult>(json,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        result ??= new ZaloPayCreateResult { ReturnCode = -1, ReturnMessage = json };
        result.AppTransId = appTransId;

        if (result.ReturnCode != 1)
            _logger.LogWarning("ZaloPay create failed (code {Code}): {Msg} | raw: {Raw}", result.ReturnCode, result.ReturnMessage, json);

        return result;
    }

    public bool VerifyCallback(string data, string mac, out ZaloPayCallbackResult? result)
    {
        result = null;
        try
        {
            var computed = HmacSha256(Key2, data);
            if (!string.Equals(computed, mac, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("ZaloPay signature mismatch. Expected {Expected}, got {Actual}", computed, mac);
                return false;
            }

            using var doc = JsonDocument.Parse(data);
            var root = doc.RootElement;
            result = new ZaloPayCallbackResult
            {
                AppTransId = root.TryGetProperty("app_trans_id", out var t) ? t.GetString() ?? "" : "",
                AppUser = root.TryGetProperty("app_user", out var u) ? u.GetString() ?? "" : "",
                Amount = root.TryGetProperty("amount", out var a) ? a.GetInt64() : 0,
                Status = root.TryGetProperty("status", out var s) ? s.GetInt32() : -1,
                Channel = root.TryGetProperty("channel", out var c) ? c.GetString() ?? "" : "",
            };
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ZaloPay callback parse error");
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

public class ZaloPayCreateResult
{
    public int ReturnCode { get; set; }
    public string ReturnMessage { get; set; } = "";
    public int SubReturnCode { get; set; }
    public string SubReturnMessage { get; set; } = "";
    public string OrderUrl { get; set; } = "";
    public string ZpTransToken { get; set; } = "";
    public string OrderToken { get; set; } = "";
    public string AppTransId { get; set; } = "";
}

public class ZaloPayCallbackResult
{
    public string AppTransId { get; set; } = "";
    public string AppUser { get; set; } = "";
    public long Amount { get; set; }
    public int Status { get; set; }
    public string Channel { get; set; } = "";
}
