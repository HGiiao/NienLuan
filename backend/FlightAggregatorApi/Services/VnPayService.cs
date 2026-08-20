using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;

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

    public string CreatePaymentUrl(long orderId, decimal amount, string orderInfo, string ipAddress)
    {
        if (string.IsNullOrWhiteSpace(TmnCode) || string.IsNullOrWhiteSpace(HashSecret))
            throw new InvalidOperationException("VNPay chưa được cấu hình: thiếu TmnCode hoặc HashSecret. Đăng ký tại https://sandbox.vnpayment.vn/devreg/ và điền vào appsettings.");

        // Số tiền phải là số nguyên = VND × 100 (VNPay khử phần thập phân)
        var amountLong = (long)Math.Round(amount * 100, 0, MidpointRounding.AwayFromZero);
        if (amountLong <= 0)
            throw new InvalidOperationException("Số tiền thanh toán phải lớn hơn 0");

        // IP phải là IPv4 hợp lệ — `::1` (IPv6 loopback) bị VNPay từ chối (lỗi code 99)
        var vnpIpAddr = NormalizeIpv4(ipAddress);

        // KHÔNG gửi vnp_IpnUrl trong URL thanh toán: VNPay sandbox hiện tại từ chối
        // request có tham số này (trả code 99). IPN URL phải được khai báo riêng
        // với VNPay khi đăng ký merchant (xem tài liệu "Cài đặt Code IPN URL").
        var createDate = DateTime.UtcNow.AddHours(7); // GMT+7
        var expireDate = createDate.AddMinutes(15);

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
            { "vnp_CreateDate", createDate.ToString("yyyyMMddHHmmss") },
            { "vnp_ExpireDate", expireDate.ToString("yyyyMMddHHmmss") },
            { "vnp_IpAddr", vnpIpAddr },
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

        var url = SandboxUrl + "?" + query;
        _logger.LogInformation("VNPay payment URL created for order {OrderId}: {Url}", orderId, url);
        return url;
    }

    /// <summary>
    /// Chuẩn hóa IP về IPv4 — VNPay yêu cầu vnp_IpAddr là IPv4.
    /// Khi chạy localhost, RemoteIpAddress thường là `::1` (IPv6 loopback) → đổi thành 127.0.0.1.
    /// </summary>
    public static string NormalizeIpv4(string? ip)
    {
        if (string.IsNullOrWhiteSpace(ip)) return "127.0.0.1";

        ip = ip.Trim();
        if (IPAddress.TryParse(ip, out var parsed))
        {
            if (IPAddress.IsLoopback(parsed) || parsed.AddressFamily == AddressFamily.InterNetworkV6 && parsed.IsIPv4MappedToIPv6)
                return parsed.IsIPv4MappedToIPv6 ? parsed.MapToIPv4().ToString() : "127.0.0.1";
            if (parsed.AddressFamily == AddressFamily.InterNetwork)
                return parsed.ToString();
        }
        // Trường hợp còn lại: dùng luôn chuỗi gốc hoặc fallback
        return ip.Length > 45 ? ip[..45] : ip;
    }

    public static string ResolveClientIp(HttpContext? context)
    {
        if (context == null) return "127.0.0.1";

        var forwarded = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwarded))
        {
            var first = forwarded.Split(',')[0].Trim();
            if (!string.IsNullOrWhiteSpace(first)) return NormalizeIpv4(first);
        }

        return NormalizeIpv4(context.Connection.RemoteIpAddress?.ToString());
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
