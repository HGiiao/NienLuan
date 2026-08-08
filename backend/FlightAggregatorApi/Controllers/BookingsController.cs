using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;
using FlightAggregatorApi.Models;
using FlightAggregatorApi.Services;

namespace FlightAggregatorApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly VnPayService _vnPay;
    private readonly MoMoService _moMo;
    private readonly ZaloPayService _zaloPay;
    private readonly PayOSService _payOS;
    private readonly ILogger<BookingsController> _logger;
    private readonly EmailService _email;
    private static readonly Random _rng = new();

    public BookingsController(ApplicationDbContext db, VnPayService vnPay, MoMoService moMo, ZaloPayService zaloPay, PayOSService payOS, ILogger<BookingsController> logger, EmailService email)
    {
        _db = db;
        _vnPay = vnPay;
        _moMo = moMo;
        _zaloPay = zaloPay;
        _payOS = payOS;
        _logger = logger;
        _email = email;
    }

    [HttpGet]
    public async Task<IActionResult> GetBookings(
        [FromQuery] long? userId,
        [FromQuery] string? email,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        IQueryable<Models.Booking> query = _db.Bookings.AsNoTracking().Include(b => b.User);

        if (userId.HasValue)
            query = query.Where(b => b.UserId == userId.Value);

        if (!string.IsNullOrWhiteSpace(email))
            query = query.Where(b => b.User.Email == email);

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(b => b.BookingDate)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetBooking(long id)
    {
        var booking = await _db.Bookings
            .AsNoTracking()
            .Include(b => b.User)
            .Include(b => b.Flight)
            .Include(b => b.Train)
            .Include(b => b.Bus)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null) return NotFound();
        return Ok(booking);
    }

    [HttpPost]
    public async Task<IActionResult> CreateBooking([FromBody] CreateBookingRequest request)
    {
        if (request.FlightId == null && request.TrainId == null && request.BusId == null)
            return BadRequest(new { message = "Phải chọn chuyến bay, tàu hỏa hoặc xe khách" });
        if (request.Passengers <= 0)
            return BadRequest(new { message = "Số khách phải lớn hơn 0" });

        decimal totalPrice = 0;
        Flight? flight = null;
        Train? train = null;
        Bus? bus = null;

        if (request.FlightId.HasValue)
        {
            flight = await _db.Flights.FindAsync(request.FlightId.Value);
            if (flight == null)
                return BadRequest(new { message = "Chuyến bay không tồn tại" });

            if (flight.Seats < request.Passengers)
                return BadRequest(new { message = $"Chỉ còn {flight.Seats} ghế trống" });

            flight.Seats -= request.Passengers;
            totalPrice = flight.Price * request.Passengers;
        }
        else if (request.TrainId.HasValue)
        {
            train = await _db.Trains.FindAsync(request.TrainId.Value);
            if (train == null)
                return BadRequest(new { message = "Tàu không tồn tại" });

            if (train.Seats < request.Passengers)
                return BadRequest(new { message = $"Chỉ còn {train.Seats} ghế trống" });

            train.Seats -= request.Passengers;
            totalPrice = train.Price * request.Passengers;
        }
        else if (request.BusId.HasValue)
        {
            bus = await _db.Buses.FindAsync(request.BusId.Value);
            if (bus == null)
                return BadRequest(new { message = "Xe khách không tồn tại" });

            if (bus.Seats < request.Passengers)
                return BadRequest(new { message = $"Chỉ còn {bus.Seats} chỗ trống" });

            bus.Seats -= request.Passengers;
            totalPrice = bus.Price * request.Passengers;
        }

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user == null)
        {
            user = new User
            {
                Email = request.Email,
                FullName = request.FullName,
                Phone = request.Phone ?? "",
                PasswordHash = "",
                IsEmailVerified = false,
                Role = "User",
            };
            _db.Users.Add(user);
        }

        var booking = new Booking
        {
            UserId = user.Id,
            FlightId = request.FlightId,
            TrainId = request.TrainId,
            BusId = request.BusId,
            TotalPrice = totalPrice,
            Passengers = request.Passengers,
            Address = request.Address,
            PaymentMethod = request.PaymentMethod,
            PromoCode = request.PromoCode,
            DiscountAmount = request.DiscountAmount,
            DateOfBirth = request.DateOfBirth,
            Gender = request.Gender,
            Nationality = request.Nationality,
            IdNumber = request.IdNumber,
            EmergencyContactName = request.EmergencyContactName,
            EmergencyContactPhone = request.EmergencyContactPhone,
            SpecialRequests = request.SpecialRequests,
            Status = "Pending"
        };

        _db.Bookings.Add(booking);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetBooking), new { id = booking.Id }, booking);
    }

    [HttpPost("{id:long}/pay")]
    public async Task<IActionResult> ProcessPayment(long id, [FromBody] PayRequest? request)
    {
        var provider = request?.Provider ?? request?.PaymentMethod ?? "test_mode";

        var booking = await _db.Bookings
            .Include(b => b.User)
            .Include(b => b.Flight)
            .Include(b => b.Train)
            .Include(b => b.Bus)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null) return NotFound(new { message = "Không tìm thấy đặt chỗ" });

        if (booking.Status == "Confirmed")
            return Ok(new { success = true, booking, transactionId = booking.TransactionId ?? booking.Id.ToString() });

        if (booking.Status == "Cancelled")
            return BadRequest(new { message = "Đặt chỗ đã bị hủy" });

        // E-wallet payment — create real gateway URL (MoMo / ZaloPay / VNPay)
        var amount = booking.TotalPrice - (booking.DiscountAmount ?? 0);
        if (amount <= 0) amount = booking.TotalPrice;

        if (provider == "momo" || provider == "zalopay" || provider == "vnpay" || provider == "payos")
        {
            booking.PaymentProvider = provider;
            booking.PaymentMethod = "e_wallet";
            await _db.SaveChangesAsync();

            try
            {
                string? paymentUrl = null;
                string? providerTransactionId = null;

                switch (provider)
                {
                    case "momo":
                    {
                        var result = await _moMo.CreatePaymentAsync(booking.Id, amount, $"Ve247-Booking-{booking.Id}");
                        if (result.ResultCode != 0 && result.ResultCode != 9000)
                            return BadRequest(new { message = $"MoMo: {result.Message}" });
                        paymentUrl = result.PayUrl;
                        providerTransactionId = result.OrderId;
                        break;
                    }
                    case "zalopay":
                    {
                        var result = await _zaloPay.CreatePaymentAsync(booking.Id, amount, $"Booking #{booking.Id}");
                        if (result.ReturnCode != 1)
                            return BadRequest(new { message = $"ZaloPay: {result.ReturnMessage}" });
                        paymentUrl = result.OrderUrl;
                        providerTransactionId = result.AppTransId;
                        break;
                    }
                    case "vnpay":
                    {
                        var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
                        paymentUrl = _vnPay.CreatePaymentUrl(booking.Id, amount, $"Ve247 booking #{booking.Id}", ip);
                        providerTransactionId = booking.Id.ToString();
                        break;
                    }
                    case "payos":
                    {
                        if (!_payOS.IsConfigured)
                            return BadRequest(new { message = "PayOS chưa được cấu hình API key. Vui lòng thử phương thức khác." });

                        // PayOS requires a UNIQUE orderCode per payment request — using booking.Id
                        // collides when the user retries payment, so generate a fresh 9-digit code
                        // and persist it to map the return/webhook back to this booking.
                        var orderCode = Random.Shared.Next(100_000_000, 1_000_000_000);
                        booking.PayOSOrderCode = orderCode;
                        await _db.SaveChangesAsync();

                        var result = await _payOS.CreatePaymentAsync(
                            orderCode, amount, $"Ve247 Booking {booking.Id}",
                            booking.User?.FullName, booking.User?.Email, booking.User?.Phone);
                        if (result == null || string.IsNullOrEmpty(result.CheckoutUrl))
                            return BadRequest(new { message = "PayOS: Không tạo được link thanh toán" });
                        paymentUrl = result.CheckoutUrl;
                        providerTransactionId = result.Id;
                        break;
                    }
                }

                if (string.IsNullOrEmpty(paymentUrl))
                    return BadRequest(new { message = "Không tạo được đường dẫn thanh toán" });

                return Ok(new { success = true, redirect = true, paymentUrl, provider, providerTransactionId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create e-wallet payment URL for booking #{Id}", booking.Id);
                return StatusCode(500, new { message = "Không thể kết nối cổng thanh toán. Vui lòng thử lại." });
            }
        }

        // Sandbox/test mode — always succeeds (kể cả e_wallet, credit_card, bank_transfer)
        booking.Status = "Confirmed";

        var transactionId = booking.TransactionId ?? $"TXN_{DateTime.UtcNow:yyyyMMddHHmmss}_{_rng.Next(1000, 9999)}";
        booking.PaymentMethod = booking.PaymentMethod ?? "test_mode";
        booking.TransactionId ??= transactionId;

        _db.Notifications.Add(new Notification
        {
            Email = booking.User?.Email ?? "",
            Type = "booking",
            Title = "Đặt chỗ thành công!",
            Message = $"Đơn hàng #{booking.Id} đã xác nhận. Tổng: {booking.TotalPrice:N0}đ",
            Link = "/bookings",
            CreatedAt = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync();

        // Send email confirmation
        try
        {
            var item = booking.Flight ?? (object?)booking.Train ?? booking.Bus;
            await _email.SendBookingConfirmationAsync(
                toEmail: booking.User?.Email ?? "",
                customerName: booking.User?.FullName ?? "Khách hàng",
                customerPhone: booking.User?.Phone ?? "",
                customerAddress: booking.Address ?? "",
                type: booking.FlightId != null ? "flight" : booking.TrainId != null ? "train" : "bus",
                code: booking.Flight != null ? $"{booking.Flight.AirlineCode}{(booking.Flight.Id % 900) + 100}" : booking.Train?.TrainCode ?? booking.Bus?.BusCode,
                airlineName: booking.Flight?.AirlineName,
                trainName: booking.Train?.TrainName,
                busCompany: booking.Bus?.BusCompany,
                fromCode: booking.Flight?.DepartureLocation ?? booking.Train?.DepartureLocation ?? booking.Bus?.DepartureLocation ?? "",
                toCode: booking.Flight?.ArrivalLocation ?? booking.Train?.ArrivalLocation ?? booking.Bus?.ArrivalLocation ?? "",
                departureTime: booking.Flight?.DepartureTime ?? booking.Train?.DepartureTime ?? booking.Bus?.DepartureTime ?? default,
                arrivalTime: booking.Flight?.ArrivalTime ?? booking.Train?.ArrivalTime ?? booking.Bus?.ArrivalTime ?? default,
                itemPrice: booking.Flight?.Price ?? booking.Train?.Price ?? booking.Bus?.Price ?? 0,
                passengers: booking.Passengers,
                totalPrice: booking.TotalPrice,
                paymentMethod: booking.PaymentMethod,
                transactionId: transactionId,
                bookingId: booking.Id
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send booking confirmation email for #{Id}", booking.Id);
        }

        _logger.LogInformation("Payment processed: Booking #{Id}, Transaction {TxnId}", booking.Id, transactionId);

        return Ok(new
        {
            success = true,
            transactionId,
            booking
        });
    }

    [HttpPatch("{id:long}/cancel")]
    public async Task<IActionResult> CancelBooking(long id)
    {
        var booking = await _db.Bookings
            .Include(b => b.Flight)
            .Include(b => b.Train)
            .Include(b => b.Bus)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null) return NotFound(new { message = "Đặt chỗ không tồn tại" });
        if (booking.Status == "Cancelled")
            return BadRequest(new { message = "Đặt chỗ đã bị hủy" });

        if (booking.FlightId != null && booking.Flight != null)
            booking.Flight.Seats += booking.Passengers;

        if (booking.TrainId != null && booking.Train != null)
            booking.Train.Seats += booking.Passengers;

        if (booking.BusId != null && booking.Bus != null)
            booking.Bus.Seats += booking.Passengers;

        booking.Status = "Cancelled";
        await _db.SaveChangesAsync();
        _logger.LogInformation("Booking #{BookingId} cancelled", id);
        return Ok(new { message = "Đã hủy đặt chỗ" });
    }

    [HttpGet("{id:long}/calendar")]
    public async Task<IActionResult> ExportCalendar(long id)
    {
        var booking = await _db.Bookings
            .Include(b => b.Flight)
            .Include(b => b.Train)
            .Include(b => b.Bus)
            .Include(b => b.User)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null) return NotFound();

        var isFlight = booking.Flight != null;
        var isBus = booking.Bus != null;
        var item = isFlight ? (object?)booking.Flight : isBus ? booking.Bus : booking.Train;
        if (item == null) return NotFound();

        var depTime = isFlight ? ((Flight)item).DepartureTime : isBus ? ((Bus)item).DepartureTime : ((Train)item).DepartureTime;
        var arrTime = isFlight ? ((Flight)item).ArrivalTime : isBus ? ((Bus)item).ArrivalTime : ((Train)item).ArrivalTime;
        var depLoc = isFlight ? ((Flight)item).DepartureLocation : isBus ? ((Bus)item).DepartureLocation : ((Train)item).DepartureLocation;
        var arrLoc = isFlight ? ((Flight)item).ArrivalLocation : isBus ? ((Bus)item).ArrivalLocation : ((Train)item).ArrivalLocation;
        var typeName = isFlight ? "Chuyến bay" : isBus ? "Xe khách" : "Chuyến tàu";
        var code = isFlight ? ((Flight)item).AirlineCode : isBus ? ((Bus)item).BusCode : ((Train)item).TrainCode;

        var uid = $"ve247-booking-{booking.Id}@ve247.vn";
        var now = DateTime.UtcNow.ToString("yyyyMMddTHHmmssZ");
        var dtStart = depTime.ToString("yyyyMMddTHHmmss");
        var dtEnd = arrTime.ToString("yyyyMMddTHHmmss");

        var ics = new StringBuilder();
        ics.AppendLine("BEGIN:VCALENDAR");
        ics.AppendLine("VERSION:2.0");
        ics.AppendLine("PRODID:-//Vé247//Booking//VI");
        ics.AppendLine("CALSCALE:GREGORIAN");
        ics.AppendLine("METHOD:PUBLISH");
        ics.AppendLine("BEGIN:VEVENT");
        ics.AppendLine($"UID:{uid}");
        ics.AppendLine($"DTSTART:{dtStart}");
        ics.AppendLine($"DTEND:{dtEnd}");
        ics.AppendLine($"DTSTAMP:{now}");
        ics.AppendLine($"CREATED:{now}");
        ics.AppendLine($"SUMMARY:{typeName} {code} - {depLoc} → {arrLoc}");
        ics.AppendLine($"DESCRIPTION:Vé247 - {typeName} {code}\\nTuyến: {depLoc} → {arrLoc}\\nKhởi hành: {depTime:HH:mm dd/MM/yyyy}\\nHành khách: {booking.Passengers}\\nMã đặt chỗ: #{booking.Id}");
        ics.AppendLine($"LOCATION:{depLoc}");
        ics.AppendLine("STATUS:CONFIRMED");
        ics.AppendLine($"SEQUENCE:0");
        ics.AppendLine("BEGIN:VALARM");
        ics.AppendLine("TRIGGER:-PT24H");
        ics.AppendLine("ACTION:DISPLAY");
        ics.AppendLine($"DESCRIPTION:Nhắc nhở: {typeName} {code} - {depLoc} → {arrLoc} trong 24 giờ nữa");
        ics.AppendLine("END:VALARM");
        ics.AppendLine("END:VEVENT");
        ics.AppendLine("END:VCALENDAR");

        return File(Encoding.UTF8.GetBytes(ics.ToString()), "text/calendar", $"ve247-booking-{booking.Id}.ics");
    }
}

public class CreateBookingRequest
{
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? PaymentMethod { get; set; }
    public long? FlightId { get; set; }
    public long? TrainId { get; set; }
    public long? BusId { get; set; }
    public int Passengers { get; set; } = 1;
    public string? PromoCode { get; set; }
    public decimal? DiscountAmount { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? Nationality { get; set; }
    public string? IdNumber { get; set; }
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public string? SpecialRequests { get; set; }
}

public class PayRequest
{
    public string? Provider { get; set; }
    public string? PaymentMethod { get; set; }
}
