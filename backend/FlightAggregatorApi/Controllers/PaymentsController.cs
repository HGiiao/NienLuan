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
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(ApplicationDbContext db, VnPayService vnPay, ILogger<PaymentsController> logger)
    {
        _db = db;
        _vnPay = vnPay;
        _logger = logger;
    }

    [HttpPost("vnpay-return")]
    public async Task<IActionResult> VnPayReturn([FromQuery] Dictionary<string, string> queryParams)
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
}
