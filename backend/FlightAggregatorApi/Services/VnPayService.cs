using System.Net;
using System.Security.Cryptography;
using System.Text;

namespace FlightAggregatorApi.Services;

public class VnPayService
{
    private readonly IConfiguration _config;
    private readonly ILogger<VnPayService> _logger;

    public VnPayService(IConfiguration config, ILogger<VnPayService> logger)
    {
        _config = config;
        _logger = logger;
    }

    private string TmnCode => _config["VnPay:TmnCode"] ?? "";
    private string HashSecret => _config["VnPay:HashSecret"] ?? "";
    private string SandboxUrl => _config["VnPay:SandboxUrl"]
        ?? "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    private string ReturnUrl => _config["VnPay:ReturnUrl"]
        ?? "http://localhost:5173/payment/vnpay-return";
    private string IpnUrl => _config["VnPay:IpnUrl"]
        ?? "http://localhost:5000/api/payments/vnpay-ipn";

    public string CreatePaymentUrl(long orderId, decimal amount, string orderInfo, string ipAddress)
    {
        var amountLong = (long)(amount * 100);
        var createDate = DateTime.UtcNow.AddHours(7);

        var params_ = new SortedList<string, string>
        {
            { "vnp_Version", "2.1.0" },
            { "vnp_Command", "pay" },
            { "vnp_TmnCode", TmnCode },
            { "vnp_Amount", amountLong.ToString() },
            { "vnp_CurrCode", "VND" },
            { "vnp_TxnRef", orderId.ToString() },
            { "vnp_OrderInfo", orderInfo },
            { "vnp_OrderType", "other" },
            { "vnp_Locale", "vn" },
            { "vnp_ReturnUrl", ReturnUrl },
            { "vnp_IpnUrl", IpnUrl },
            { "vnp_CreateDate", createDate.ToString("yyyyMMddHHmmss") },
            { "vnp_ExpireDate", createDate.AddMinutes(15).ToString("yyyyMMddHHmmss") },
            { "vnp_IpAddr", ipAddress },
        };

        var hashData = "";
        var query = "";
        var i = 0;
        foreach (var kvp in params_)
        {
            var encodedKey = WebUtility.UrlEncode(kvp.Key);
            var encodedValue = WebUtility.UrlEncode(kvp.Value);
            if (i == 1)
            {
                hashData += "&" + encodedKey + "=" + encodedValue;
                query += "&" + encodedKey + "=" + encodedValue;
            }
            else
            {
                hashData += encodedKey + "=" + encodedValue;
                query += encodedKey + "=" + encodedValue;
                i = 1;
            }
        }

        var secureHash = HmacSha512(HashSecret, hashData);
        query += "&vnp_SecureHash=" + WebUtility.UrlEncode(secureHash);

        return SandboxUrl + "?" + query;
    }

    public VnPayVerifyResult VerifyReturnQuery(Dictionary<string, string> queryParams)
    {
        queryParams.TryGetValue("vnp_SecureHash", out var incomingHash);

        var sortedParams = new SortedList<string, string>();
        foreach (var kvp in queryParams)
        {
            if (kvp.Key != "vnp_SecureHash" && kvp.Key.StartsWith("vnp_"))
            {
                sortedParams.Add(kvp.Key, kvp.Value);
            }
        }

        var hashData = "";
        var i = 0;
        foreach (var kvp in sortedParams)
        {
            var encodedKey = WebUtility.UrlEncode(kvp.Key);
            var encodedValue = WebUtility.UrlEncode(kvp.Value);
            if (i == 1)
            {
                hashData += "&" + encodedKey + "=" + encodedValue;
            }
            else
            {
                hashData += encodedKey + "=" + encodedValue;
                i = 1;
            }
        }

        var computedHash = HmacSha512(HashSecret, hashData);

        if (string.IsNullOrEmpty(incomingHash) ||
            !string.Equals(computedHash, incomingHash, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("VNPay signature mismatch. Expected: {Expected}, Got: {Actual}",
                computedHash, incomingHash);
            return new VnPayVerifyResult { IsValid = false, Message = "Chữ ký không hợp lệ", SignatureValid = false };
        }

        var responseCode = queryParams.GetValueOrDefault("vnp_ResponseCode", "");
        var transactionNo = queryParams.GetValueOrDefault("vnp_TransactionNo", "");
        var txnRef = queryParams.GetValueOrDefault("vnp_TxnRef", "");
        var amount = queryParams.GetValueOrDefault("vnp_Amount", "0");

        return new VnPayVerifyResult
        {
            IsValid = responseCode == "00",
            Message = responseCode == "00"
                ? "Thanh toán thành công"
                : $"VNPay trả về mã lỗi: {responseCode}",
            TransactionNo = transactionNo,
            TxnRef = txnRef,
            Amount = long.TryParse(amount, out var a) ? a / 100m : 0,
            ResponseCode = responseCode,
            SignatureValid = true,
        };
    }

    private static string HmacSha512(string key, string data)
    {
        var keyBytes = Encoding.UTF8.GetBytes(key);
        var dataBytes = Encoding.UTF8.GetBytes(data);
        using var hmac = new HMACSHA512(keyBytes);
        var hash = hmac.ComputeHash(dataBytes);
        return Convert.ToHexString(hash);
    }
}

public class VnPayVerifyResult
{
    public bool IsValid { get; set; }
    public bool SignatureValid { get; set; }
    public string Message { get; set; } = string.Empty;
    public string TransactionNo { get; set; } = string.Empty;
    public string TxnRef { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string ResponseCode { get; set; } = string.Empty;
}
