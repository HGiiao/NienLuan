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
    private readonly ILogger<BookingsController> _logger;
    private static readonly Random _rng = new();

    public BookingsController(ApplicationDbContext db, VnPayService vnPay, ILogger<BookingsController> logger)
    {
        _db = db;
        _vnPay = vnPay;
        _logger = logger;
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
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null) return NotFound();
        return Ok(booking);
    }

    [HttpPost]
    public async Task<IActionResult> CreateBooking([FromBody] CreateBookingRequest request)
    {
        if (request.FlightId == null && request.TrainId == null)
            return BadRequest(new { message = "Phải chọn chuyến bay hoặc tàu hỏa" });
        if (request.Passengers <= 0)
            return BadRequest(new { message = "Số khách phải lớn hơn 0" });

        decimal totalPrice = 0;
        Flight? flight = null;
        Train? train = null;

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
            TotalPrice = totalPrice,
            Passengers = request.Passengers,
            Address = request.Address,
            PaymentMethod = request.PaymentMethod,
            Status = "Pending"
        };

        _db.Bookings.Add(booking);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetBooking), new { id = booking.Id }, booking);
    }

    [HttpPost("{id:long}/pay")]
    public async Task<IActionResult> ProcessPayment(long id)
    {
        var booking = await _db.Bookings
            .Include(b => b.User)
            .Include(b => b.Flight)
            .Include(b => b.Train)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null) return NotFound(new { message = "Không tìm thấy đặt chỗ" });

        if (booking.Status == "Confirmed")
            return Ok(new { success = true, booking, transactionId = booking.TransactionId ?? booking.Id.ToString() });

        if (booking.Status == "Cancelled")
            return BadRequest(new { message = "Đặt chỗ đã bị hủy" });

        // VNPay — generate payment URL, don't confirm yet
        if (booking.PaymentMethod == "e_wallet")
        {
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
            var orderInfo = $"Thanh toán đặt chỗ #{booking.Id} - Vé247";
            var paymentUrl = _vnPay.CreatePaymentUrl(booking.Id, booking.TotalPrice, orderInfo, ipAddress);

            booking.TransactionId = $"VNPAY_{DateTime.UtcNow:yyyyMMddHHmmss}_{_rng.Next(1000, 9999)}";
            await _db.SaveChangesAsync();

            return Ok(new { redirect = true, paymentUrl, transactionId = booking.TransactionId });
        }

        // Sandbox/test mode — always succeeds
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
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null) return NotFound(new { message = "Đặt chỗ không tồn tại" });
        if (booking.Status == "Cancelled")
            return BadRequest(new { message = "Đặt chỗ đã bị hủy" });

        if (booking.FlightId != null && booking.Flight != null)
            booking.Flight.Seats += booking.Passengers;

        if (booking.TrainId != null && booking.Train != null)
            booking.Train.Seats += booking.Passengers;

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
            .Include(b => b.User)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null) return NotFound();

        var isFlight = booking.Flight != null;
        var item = isFlight ? (object?)booking.Flight : booking.Train;
        if (item == null) return NotFound();

        var depTime = isFlight ? ((Flight)item).DepartureTime : ((Train)item).DepartureTime;
        var arrTime = isFlight ? ((Flight)item).ArrivalTime : ((Train)item).ArrivalTime;
        var depLoc = isFlight ? ((Flight)item).DepartureLocation : ((Train)item).DepartureLocation;
        var arrLoc = isFlight ? ((Flight)item).ArrivalLocation : ((Train)item).ArrivalLocation;
        var typeName = isFlight ? "Chuyến bay" : "Chuyến tàu";
        var code = isFlight ? ((Flight)item).AirlineCode : ((Train)item).TrainCode;

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
    public int Passengers { get; set; } = 1;
}
