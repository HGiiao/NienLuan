using System.Text.Json;
using Microsoft.Extensions.Options;

namespace FlightAggregatorApi.Services;

public class VietQrOptions
{
    public string BaseUrl { get; set; } = "https://api.vietqr.io";
    public string ClientId { get; set; } = "";
    public string ApiKey { get; set; } = "";
}

public class VietQrService
{
    private readonly HttpClient _http;
    private readonly VietQrOptions _options;
    private readonly ILogger<VietQrService> _logger;

    public VietQrService(HttpClient http, IOptions<VietQrOptions> options, ILogger<VietQrService> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_options.ClientId) && !string.IsNullOrWhiteSpace(_options.ApiKey);

    public async Task<VietQrResult?> GenerateAsync(
        string accountNo, string accountName, string acqId, long amount, string addInfo)
    {
        if (!IsConfigured)
            return null;

        var request = new Dictionary<string, object?>
        {
            ["accountNo"] = accountNo,
            ["accountName"] = accountName,
            ["acqId"] = acqId,
            ["amount"] = amount,
            ["addInfo"] = addInfo,
            ["format"] = "text",
            ["template"] = "compact2",
        };

        using var req = new HttpRequestMessage(HttpMethod.Post, $"{_options.BaseUrl.TrimEnd('/')}/v2/generate");
        req.Headers.Add("x-client-id", _options.ClientId);
        req.Headers.Add("x-api-key", _options.ApiKey);
        req.Content = JsonContent.Create(request);

        try
        {
            var resp = await _http.SendAsync(req);
            var body = await resp.Content.ReadAsStringAsync();

            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogWarning("VietQR API HTTP {Status}: {Body}", (int)resp.StatusCode, body);
                return null;
            }

            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;
            var code = root.GetProperty("code").GetString();

            if (code != "00")
            {
                var desc = root.TryGetProperty("desc", out var d) ? d.GetString() : "";
                _logger.LogWarning("VietQR API code {Code} desc {Desc}", code, desc);
                return null;
            }

            var data = root.GetProperty("data");
            return new VietQrResult
            {
                QrDataUrl = data.GetProperty("qrDataURL").GetString() ?? "",
                QrCode = data.GetProperty("qrCode").GetString() ?? "",
                AcqId = data.TryGetProperty("acpId", out var acp) ? acp.GetInt64() : 0,
                AccountName = data.GetProperty("accountName").GetString() ?? accountName,
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "VietQR API call failed");
            return null;
        }
    }
}

public class VietQrResult
{
    public string QrDataUrl { get; set; } = "";
    public string QrCode { get; set; } = "";
    public long AcqId { get; set; }
    public string AccountName { get; set; } = "";
}
