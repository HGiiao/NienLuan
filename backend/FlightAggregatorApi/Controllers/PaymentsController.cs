using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;
using FlightAggregatorApi.Services;

namespace FlightAggregatorApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly VnPayService _vnPay;
    private readonly MoMoService _moMo;
    private readonly ZaloPayService _zaloPay;
    private readonly PayOSService _payOS;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(ApplicationDbContext db, VnPayService vnPay, MoMoService moMo, ZaloPayService zaloPay, PayOSService payOS, ILogger<PaymentsController> logger)
    {
        _db = db;
        _vnPay = vnPay;
        _moMo = moMo;
        _zaloPay = zaloPay;
        _payOS = payOS;
        _logger = logger;
    }

    [HttpPost("vnpay-return")]
    public async Task<IActionResult> VnPayReturn([FromBody] Dictionary<string, string> queryParams)
    {
        var result = _vnPay.VerifyReturnQuery(queryParams);

        if (result.IsValid && long.TryParse(result.TxnRef, out var bookingId))
        {
            var booking = await _db.Bookings.FindAsync(bookingId);
            if (booking != null && booking.Status == "Pending")
            {
                booking.Status = "Confirmed";
                booking.TransactionId = $"VNPAY_{result.TransactionNo}";
                booking.VnPayTransactionNo = result.TransactionNo;
                await _db.SaveChangesAsync();
                _logger.LogInformation("VNPay return: Booking #{Id} confirmed via TXN {Txn}",
                    bookingId, result.TransactionNo);
            }

            return Ok(new
            {
                success = true,
                transactionId = booking?.TransactionId ?? $"VNPAY_{result.TransactionNo}",
                message = "Thanh toán thành công",
            });
        }

        return Ok(new
        {
            success = false,
            message = result.Message,
        });
    }

    [HttpGet("vnpay-ipn")]
    public async Task<IActionResult> VnPayIpn([FromQuery] Dictionary<string, string> queryParams)
    {
        try
        {
            var result = _vnPay.VerifyReturnQuery(queryParams);

            if (result.IsValid && long.TryParse(result.TxnRef, out var bookingId))
            {
                var booking = await _db.Bookings.FindAsync(bookingId);
                if (booking != null && booking.Status == "Pending")
                {
                    booking.Status = "Confirmed";
                    booking.TransactionId = $"VNPAY_{result.TransactionNo}";
                    booking.VnPayTransactionNo = result.TransactionNo;
                    await _db.SaveChangesAsync();
                    _logger.LogInformation("VNPay IPN: Booking #{Id} confirmed via TXN {Txn}",
                        bookingId, result.TransactionNo);
                }

                return Ok(new { RspCode = "00", Message = "Confirm Success" });
            }

            return Ok(new { RspCode = "99", Message = "Invalid Signature" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "VNPay IPN processing error");
            return Ok(new { RspCode = "99", Message = "Internal Error" });
        }
    }

    // ================= MoMo =================
    [HttpPost("momo-return")]
    public async Task<IActionResult> MoMoReturn([FromBody] Dictionary<string, string> body)
    {
        var orderId = body.GetValueOrDefault("orderId") ?? body.GetValueOrDefault("orderId", "");
        var resultCode = body.GetValueOrDefault("resultCode", "-1");
        var transId = body.GetValueOrDefault("transId", "");

        // Parse orderId: "{bookingId}{3 digits suffix}"
        if (long.TryParse(new string(orderId.TakeWhile(char.IsDigit).ToArray()), out var bookingId))
        {
            var booking = await _db.Bookings.FindAsync(bookingId);
            if (booking != null && resultCode == "0" && booking.Status == "Pending")
            {
                booking.Status = "Confirmed";
                booking.TransactionId = $"MOMO_{transId}";
                booking.PaymentProvider = "momo";
                await _db.SaveChangesAsync();
                _logger.LogInformation("MoMo return: Booking #{Id} confirmed via TXN {Txn}", bookingId, transId);
            }

            return Ok(new { success = resultCode == "0", transactionId = $"MOMO_{transId}", message = resultCode == "0" ? "Thanh toán thành công" : "Thanh toán chưa hoàn tất" });
        }

        return Ok(new { success = false, message = "Không xác định được đơn hàng" });
    }

    [HttpPost("momo-ipn")]
    public async Task<IActionResult> MoMoIpn([FromBody] string jsonBody)
    {
        try
        {
            var valid = _moMo.VerifyCallback(jsonBody, out var data);
            if (!valid || data == null)
                return Ok(new { RspCode = "99", Message = "Invalid signature" });

            if (data.ResultCode == 0 && long.TryParse(new string(data.OrderId.TakeWhile(char.IsDigit).ToArray()), out var bookingId))
            {
                var booking = await _db.Bookings.FindAsync(bookingId);
                if (booking != null && booking.Status == "Pending")
                {
                    booking.Status = "Confirmed";
                    booking.TransactionId = $"MOMO_{data.TransId}";
                    booking.PaymentProvider = "momo";
                    await _db.SaveChangesAsync();
                    _logger.LogInformation("MoMo IPN: Booking #{Id} confirmed via TXN {Txn}", bookingId, data.TransId);
                }
            }

            return Ok(new { RspCode = "00", Message = "Confirm Success" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "MoMo IPN processing error");
            return Ok(new { RspCode = "99", Message = "Internal Error" });
        }
    }

    // ================= ZaloPay =================
    [HttpPost("zalopay-return")]
    public async Task<IActionResult> ZaloPayReturn([FromBody] Dictionary<string, string> form)
    {
        var data = form.GetValueOrDefault("data", "");
        var mac = form.GetValueOrDefault("mac", "");

        var valid = _zaloPay.VerifyCallback(data, mac, out var result);
        if (!valid || result == null)
            return Ok(new { success = false, message = "Chữ ký không hợp lệ" });

        if (result.Status == 1 && long.TryParse(result.AppUser, out var bookingId))
        {
            var booking = await _db.Bookings.FindAsync(bookingId);
            if (booking != null && booking.Status == "Pending")
            {
                booking.Status = "Confirmed";
                booking.TransactionId = $"ZALOPAY_{result.AppTransId}";
                booking.PaymentProvider = "zalopay";
                await _db.SaveChangesAsync();
                _logger.LogInformation("ZaloPay return: Booking #{Id} confirmed via TXN {Txn}", bookingId, result.AppTransId);
            }

            return Ok(new { success = true, transactionId = $"ZALOPAY_{result.AppTransId}", message = "Thanh toán thành công" });
        }

        return Ok(new { success = false, message = "Thanh toán chưa hoàn tất" });
    }

    [HttpPost("zalopay-ipn")]
    public async Task<IActionResult> ZaloPayIpn([FromForm] Dictionary<string, string> form)
    {
        try
        {
            var data = form.GetValueOrDefault("data", "");
            var mac = form.GetValueOrDefault("mac", "");

            var valid = _zaloPay.VerifyCallback(data, mac, out var result);
            if (!valid || result == null)
                return Ok(new { return_code = -1, return_message = "Invalid mac" });

            if (result.Status == 1 && long.TryParse(result.AppUser, out var bookingId))
            {
                var booking = await _db.Bookings.FindAsync(bookingId);
                if (booking != null && booking.Status == "Pending")
                {
                    booking.Status = "Confirmed";
                    booking.TransactionId = $"ZALOPAY_{result.AppTransId}";
                    booking.PaymentProvider = "zalopay";
                    await _db.SaveChangesAsync();
                    _logger.LogInformation("ZaloPay IPN: Booking #{Id} confirmed via TXN {Txn}", bookingId, result.AppTransId);
                }
            }

            return Ok(new { return_code = 1, return_message = "success" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ZaloPay IPN processing error");
            return Ok(new { return_code = -1, return_message = "Internal Error" });
        }
    }

    // ================= PayOS =================
    [HttpPost("payos-return")]
    public async Task<IActionResult> PayOSReturn([FromBody] Dictionary<string, string> queryParams)
    {
        var paymentLinkId = queryParams.GetValueOrDefault("id", "");
        var status = queryParams.GetValueOrDefault("status", "");
        var orderCodeStr = queryParams.GetValueOrDefault("orderCode", "");
        var code = queryParams.GetValueOrDefault("code", "");

        // Authoritative status check via PayOS API (query params can be spoofed)
        PayOSPaymentStatus? info = null;
        if (!string.IsNullOrEmpty(paymentLinkId))
            info = await _payOS.GetPaymentInfoAsync(paymentLinkId);

        // Order code comes from the authoritative API response; fall back to the query param
        var orderCode = info?.OrderCode ?? 0;
        if (orderCode == 0)
            int.TryParse(orderCodeStr, out orderCode);

        var isPaid = info?.Status == "PAID" || (status == "PAID" && code == "00");

        if (isPaid && orderCode > 0)
        {
            var reference = info?.Transactions?.FirstOrDefault()?.Reference ?? paymentLinkId;
            // Match by stored PayOSOrderCode (new links) or booking Id (legacy links created
            // before the retry-safe orderCode fix — their orderCode was the booking Id). Safe:
            // new codes are 9-digit (>= 100M) and never collide with small booking Ids.
            var booking = await _db.Bookings.FirstOrDefaultAsync(b =>
                b.PayOSOrderCode == orderCode || b.Id == (long)orderCode);
            if (booking != null && booking.Status == "Pending")
            {
                booking.Status = "Confirmed";
                booking.TransactionId = $"PAYOS_{reference}";
                booking.PaymentProvider = "payos";
                await _db.SaveChangesAsync();
                _logger.LogInformation("PayOS return: Booking #{Id} confirmed via ref {Ref}",
                    booking.Id, reference);
            }

            if (booking == null)
                return Ok(new { success = false, message = "Không tìm thấy đơn hàng tương ứng" });

            return Ok(new
            {
                success = true,
                bookingId = booking.Id,
                transactionId = $"PAYOS_{reference}",
                message = "Thanh toán thành công",
            });
        }

        return Ok(new
        {
            success = false,
            message = status == "CANCELLED" || code == "cancel"
                ? "Đơn hàng đã bị hủy"
                : "Thanh toán chưa hoàn tất",
        });
    }

    [HttpPost("payos-ipn")]
    public async Task<IActionResult> PayOSIpn()
    {
        try
        {
            string rawBody;
            using (var reader = new StreamReader(Request.Body))
                rawBody = await reader.ReadToEndAsync();

            var valid = _payOS.VerifyWebhook(rawBody, out var data);
            if (!valid || data == null)
                return Ok(new { error = 1, message = "Invalid signature" });

            if (data.Code == "00")
            {
                var booking = await _db.Bookings.FirstOrDefaultAsync(b =>
                    b.PayOSOrderCode == data.OrderCode || b.Id == (long)data.OrderCode);
                if (booking != null && booking.Status == "Pending")
                {
                    booking.Status = "Confirmed";
                    booking.TransactionId = $"PAYOS_{data.Reference}";
                    booking.PaymentProvider = "payos";
                    await _db.SaveChangesAsync();
                    _logger.LogInformation("PayOS IPN: Booking #{Id} confirmed via ref {Ref}",
                        booking.Id, data.Reference);
                }
            }

            return Ok(new { error = 0, message = "OK" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "PayOS IPN processing error");
            return Ok(new { error = -1, message = "Internal Error" });
        }
    }
}
