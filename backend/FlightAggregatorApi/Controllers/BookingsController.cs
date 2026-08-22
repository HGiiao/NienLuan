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
        IQueryable<Models.Booking> query = _db.Bookings.AsNoTracking()
            .Include(b => b.User)
            .Include(b => b.Flight)
            .Include(b => b.Train)
            .Include(b => b.Bus)
            .Include(b => b.Segments)
            .Include(b => b.PassengerDetails)
            .Include(b => b.Insurances);

        if (userId.HasValue)
            query = query.Where(b => b.UserId == userId.Value);

        if (!string.IsNullOrWhiteSpace(email))
            query = query.Where(b => b.User.Email == email);

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(b => b.BookingDate)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        var now = DateTime.Now;
        foreach (var b in items) ApplyComputedFields(b, now);

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
            .Include(b => b.Segments)
            .Include(b => b.PassengerDetails)
            .Include(b => b.Insurances)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null) return NotFound();
        ApplyComputedFields(booking, DateTime.Now);
        return Ok(booking);
    }

    /// <summary>
    /// Thông tin hủy/hoàn tiền theo đúng chính sách "Hủy chuyến" trong chi tiết vé
    /// (dùng chung logic với lúc hủy thật — đảm bảo hiển thị 100% khớp với số tiền thực hoàn).
    /// </summary>
    [HttpGet("{id:long}/refund-info")]
    public async Task<IActionResult> GetRefundInfo(long id)
    {
        var booking = await _db.Bookings
            .AsNoTracking()
            .Include(b => b.Flight)
            .Include(b => b.Train)
            .Include(b => b.Bus)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null) return NotFound(new { message = "Đặt chỗ không tồn tại" });

        ApplyComputedFields(booking, DateTime.Now);

        var message = !(booking.CanCancel ?? false)
            ? booking.Status == "Cancelled" ? "Đặt chỗ đã bị hủy trước đó."
              : (booking.HasDeparted ?? false) ? "Chuyến đi đã khởi hành — không thể hủy. Bạn có thể đánh giá chuyến đi."
              : "Đặt chỗ không thuộc trạng thái có thể hủy."
            : null;

        return Ok(new
        {
            bookingId = booking.Id,
            status = booking.Status,
            canCancel = booking.CanCancel,
            canReview = booking.CanReview,
            hasDeparted = booking.HasDeparted,
            departureTime = booking.DepartureTime ?? booking.Flight?.DepartureTime ?? booking.Train?.DepartureTime ?? booking.Bus?.DepartureTime,
            hoursToDeparture = booking.HoursToDeparture,
            policyLabel = booking.CancelPolicyLabel,
            refundPercent = booking.RefundPercent,
            refundAmount = booking.RefundPreview,
            totalPrice = booking.TotalPrice,
            discountAmount = booking.DiscountAmount,
            message
        });
    }

    private static void ApplyComputedFields(Models.Booking b, DateTime now)
    {
        var depTime = b.DepartureTime ?? b.Flight?.DepartureTime ?? b.Train?.DepartureTime ?? b.Bus?.DepartureTime;
        var hasDeparted = depTime.HasValue && depTime <= now;

        b.HasDeparted = hasDeparted;
        b.HoursToDeparture = depTime.HasValue ? Math.Round((depTime.Value - now).TotalHours, 1) : null;

        // Booking gộp nhiều chặng: áp chính sách theo từng chặng, hoàn tiền = tổng hoàn của các chặng
        if (b.Segments.Count > 0)
        {
            decimal totalRefund = 0;
            int weightedPercent = 0;
            var paid = b.TotalPrice - (b.DiscountAmount ?? 0);
            var segmentTotal = b.Segments.Sum(s => s.Price * b.Passengers);
            if (segmentTotal > 0)
            {
                foreach (var seg in b.Segments)
                {
                    var segPaid = seg.Price * b.Passengers;
                    var segPolicy = FarePolicy.GetCancelPolicy(seg.SeatClass, seg.Price);
                    totalRefund += Math.Round(segPaid * segPolicy.RefundPercent / 100m, 0);
                    weightedPercent += (int)Math.Round(segPolicy.RefundPercent * segPaid / segmentTotal);
                }
                b.CancelPolicyLabel = "Chính sách hủy theo từng chặng";
                b.RefundPercent = weightedPercent;
                b.RefundPreview = totalRefund;
            }
            else
            {
                b.CancelPolicyLabel = "Chính sách hủy theo từng chặng";
                b.RefundPercent = 0;
                b.RefundPreview = 0;
            }
        }
        else
        {
            var price = b.UnitPrice ?? b.Flight?.Price ?? b.Train?.Price ?? b.Bus?.Price ?? 0m;
            var seatClass = b.SeatClass ?? b.Flight?.SeatClass ?? b.Train?.CoachClass ?? b.Bus?.CoachClass;
            var policy = FarePolicy.GetCancelPolicy(seatClass, price);

            b.CancelPolicyLabel = policy.Label;
            b.RefundPercent = policy.RefundPercent;

            var paid = b.TotalPrice - (b.DiscountAmount ?? 0);
            b.RefundPreview = Math.Round(paid * policy.RefundPercent / 100m, 0);
        }

        b.CanCancel = (b.Status == "Pending" || b.Status == "Confirmed") && !hasDeparted;
        b.CanReview = hasDeparted && b.Status != "Cancelled";
    }


    [HttpPost]
    public async Task<IActionResult> CreateBooking([FromBody] CreateBookingRequest request)
    {
        var isMultiLeg = request.Segments != null && request.Segments.Count > 0;
        var now = DateTime.Now;

        if (request.FlightId == null && request.TrainId == null && request.BusId == null && !isMultiLeg)
            return BadRequest(new { message = "Phải chọn chuyến bay, tàu hỏa hoặc xe khách" });

        // Số vé = số hành khách khai chi tiết (nếu có), ngược lại dùng field Passengers
        var passengerCount = request.PassengerDetails is { Count: > 0 } ? request.PassengerDetails.Count : request.Passengers;
        if (passengerCount <= 0)
            return BadRequest(new { message = "Số khách phải lớn hơn 0" });
        if (passengerCount > 9)
            return BadRequest(new { message = "Mỗi lần đặt tối đa 9 hành khách" });
        if (request.PassengerDetails is { Count: > 0 } && request.PassengerDetails.Any(p => string.IsNullOrWhiteSpace(p.FullName)))
            return BadRequest(new { message = "Vui lòng nhập họ tên cho tất cả hành khách" });

        // Bắt buộc nhập đủ thông tin từng hành khách (email, SĐT, CCCD...)
        if (request.PassengerDetails is { Count: > 0 })
        {
            for (var i = 0; i < request.PassengerDetails.Count; i++)
            {
                var p = request.PassengerDetails[i];
                var label = i == 0 ? "người đặt vé" : $"hành khách {i + 1}";
                if (string.IsNullOrWhiteSpace(p.Email))
                    return BadRequest(new { message = $"Vui lòng nhập email cho {label}" });
                if (string.IsNullOrWhiteSpace(p.Phone))
                    return BadRequest(new { message = $"Vui lòng nhập số điện thoại cho {label}" });
                if (string.IsNullOrWhiteSpace(p.IdNumber))
                    return BadRequest(new { message = $"Vui lòng nhập số CMND/CCCD/Hộ chiếu cho {label}" });
                if (p.DateOfBirth == null)
                    return BadRequest(new { message = $"Vui lòng chọn ngày sinh cho {label}" });
            }

            // Chặn trùng email / SĐT / CCCD giữa các hành khách và với thông tin người đặt vé
            string Norm(string? v) => (v ?? "").Trim().Replace(" ", "").ToUpperInvariant();
            var details = request.PassengerDetails;
            var dupFields = new (Func<CreatePassengerRequest, string?> Get, string NormValue, string Label)[]
            {
                (p => p.Email, Norm(request.Email), "Email"),
                (p => p.Phone, Norm(request.Phone), "Số điện thoại"),
                (p => p.IdNumber, "", "CMND/CCCD/Hộ chiếu"),
            };
            foreach (var (get, bookerNorm, label) in dupFields)
            {
                var seen = new Dictionary<string, int>();
                foreach (var (p, i) in details.Select((p, i) => (p, i)))
                {
                    var key = Norm(get(p));
                    if (key.Length == 0) continue;
                    if (i > 0)
                    {
                        // Trùng giữa các hành khách
                        if (seen.TryGetValue(key, out var firstIdx))
                            return BadRequest(new { message = $"{label} của hành khách {i + 1} bị trùng với {(firstIdx == 0 ? "người đặt vé" : $"hành khách {firstIdx + 1}")}. Vui lòng kiểm tra lại." });
                        // Trùng với email/SĐT của người đặt vé
                        if (bookerNorm.Length > 0 && key == bookerNorm)
                            return BadRequest(new { message = $"{label} của hành khách {i + 1} bị trùng với người đặt vé. Vui lòng kiểm tra lại." });
                    }
                    seen[key] = i;
                }
            }
        }

        // Chặn đặt trùng: cùng email + cùng chuyến bay/tàu/xe (không tính vé đã hủy)
        var bookingEmailKey = request.Email?.Trim().ToUpperInvariant() ?? "";
        if (bookingEmailKey.Length > 0)
        {
            var existingBookings = await _db.Bookings
                .Include(b => b.Segments)
                .Where(b => b.User.Email.ToUpper() == bookingEmailKey && b.Status != "Cancelled")
                .ToListAsync();

            if (existingBookings.Count > 0)
            {
                var duplicateItemIds = new List<long>();
                if (request.FlightId.HasValue) duplicateItemIds.Add(request.FlightId.Value);
                if (request.TrainId.HasValue) duplicateItemIds.Add(request.TrainId.Value);
                if (request.BusId.HasValue) duplicateItemIds.Add(request.BusId.Value);
                if (isMultiLeg) duplicateItemIds.AddRange(request.Segments!.Select(s => s.ItemId));

                var dup = existingBookings.Any(b =>
                    (request.FlightId.HasValue && b.FlightId == request.FlightId) ||
                    (request.TrainId.HasValue && b.TrainId == request.TrainId) ||
                    (request.BusId.HasValue && b.BusId == request.BusId) ||
                    (b.Segments.Any(s => duplicateItemIds.Contains(s.ItemId))));

                if (dup)
                    return Conflict(new { message = "Bạn đã đặt vé cho chuyến này rồi. Vui lòng kiểm tra lại danh sách vé." });
            }
        }

        decimal totalPrice = 0;
        Flight? flight = null;
        Train? train = null;
        Bus? bus = null;
        var segments = new List<Models.BookingSegment>();

        if (isMultiLeg)
        {
            // Lộ trình kết hợp: trừ ghế + snapshot từng chặng (bay/tàu/xe bất kỳ)
            foreach (var seg in request.Segments!)
            {
                switch ((seg.Mode ?? "").ToLowerInvariant())
                {
                    case "flight":
                    {
                        var f = await _db.Flights.FindAsync(seg.ItemId);
                        if (f == null) return BadRequest(new { message = $"Chuyến bay {seg.ItemId} không tồn tại" });
                        if (f.DepartureTime <= now) return BadRequest(new { message = $"Chuyến bay {f.AirlineCode} đã khởi hành — không thể đặt vé" });
                        if (f.Seats < passengerCount) return BadRequest(new { message = $"Chuyến bay {f.AirlineCode}: chỉ còn {f.Seats} ghế trống" });
                        f.Seats -= passengerCount;
                        segments.Add(new Models.BookingSegment
                        {
                            Mode = "flight", ItemId = f.Id, Code = f.AirlineCode, Name = f.AirlineName,
                            DepartureLocation = f.DepartureLocation, ArrivalLocation = f.ArrivalLocation,
                            DepartureTime = f.DepartureTime, ArrivalTime = f.ArrivalTime,
                            Price = f.Price, SeatClass = f.SeatClass,
                        });
                        totalPrice += f.Price * passengerCount;
                        break;
                    }
                    case "train":
                    {
                        var t = await _db.Trains.FindAsync(seg.ItemId);
                        if (t == null) return BadRequest(new { message = $"Tàu {seg.ItemId} không tồn tại" });
                        if (t.DepartureTime <= now) return BadRequest(new { message = $"Tàu {t.TrainCode} đã khởi hành — không thể đặt vé" });
                        if (t.Seats < passengerCount) return BadRequest(new { message = $"Tàu {t.TrainCode}: chỉ còn {t.Seats} ghế trống" });
                        t.Seats -= passengerCount;
                        segments.Add(new Models.BookingSegment
                        {
                            Mode = "train", ItemId = t.Id, Code = t.TrainCode, Name = t.TrainName,
                            DepartureLocation = t.DepartureLocation, ArrivalLocation = t.ArrivalLocation,
                            DepartureTime = t.DepartureTime, ArrivalTime = t.ArrivalTime,
                            Price = t.Price, SeatClass = t.CoachClass,
                        });
                        totalPrice += t.Price * passengerCount;
                        break;
                    }
                    case "bus":
                    {
                        var b = await _db.Buses.FindAsync(seg.ItemId);
                        if (b == null) return BadRequest(new { message = $"Xe khách {seg.ItemId} không tồn tại" });
                        if (b.DepartureTime <= now) return BadRequest(new { message = $"Xe {b.BusCode} đã khởi hành — không thể đặt vé" });
                        if (b.Seats < passengerCount) return BadRequest(new { message = $"Xe {b.BusCode}: chỉ còn {b.Seats} chỗ trống" });
                        b.Seats -= passengerCount;
                        segments.Add(new Models.BookingSegment
                        {
                            Mode = "bus", ItemId = b.Id, Code = b.BusCode, Name = b.BusCompany,
                            DepartureLocation = b.DepartureLocation, ArrivalLocation = b.ArrivalLocation,
                            DepartureTime = b.DepartureTime, ArrivalTime = b.ArrivalTime,
                            Price = b.Price, SeatClass = b.CoachClass,
                        });
                        totalPrice += b.Price * passengerCount;
                        break;
                    }
                    default:
                        return BadRequest(new { message = $"Loại phương tiện '{seg.Mode}' không hợp lệ" });
                }
            }
        }
        else if (request.FlightId.HasValue)
        {
            flight = await _db.Flights.FindAsync(request.FlightId.Value);
            if (flight == null)
                return BadRequest(new { message = "Chuyến bay không tồn tại" });

            if (flight.DepartureTime <= now)
                return BadRequest(new { message = "Chuyến bay đã khởi hành — không thể đặt vé" });

            if (flight.Seats < passengerCount)
                return BadRequest(new { message = $"Chỉ còn {flight.Seats} ghế trống" });

            flight.Seats -= passengerCount;
            totalPrice = flight.Price * passengerCount;
        }
        else if (request.TrainId.HasValue)
        {
            train = await _db.Trains.FindAsync(request.TrainId.Value);
            if (train == null)
                return BadRequest(new { message = "Tàu không tồn tại" });

            if (train.DepartureTime <= now)
                return BadRequest(new { message = "Chuyến tàu đã khởi hành — không thể đặt vé" });

            if (train.Seats < passengerCount)
                return BadRequest(new { message = $"Chỉ còn {train.Seats} ghế trống" });

            train.Seats -= passengerCount;
            totalPrice = train.Price * passengerCount;
        }
        else if (request.BusId.HasValue)
        {
            bus = await _db.Buses.FindAsync(request.BusId.Value);
            if (bus == null)
                return BadRequest(new { message = "Xe khách không tồn tại" });

            if (bus.DepartureTime <= now)
                return BadRequest(new { message = "Chuyến xe đã khởi hành — không thể đặt vé" });

            if (bus.Seats < passengerCount)
                return BadRequest(new { message = $"Chỉ còn {bus.Seats} chỗ trống" });

            bus.Seats -= passengerCount;
            totalPrice = bus.Price * passengerCount;
        }

        // Bảo hiểm chuyến đi: chỉ áp dụng khi toàn bộ chặng di chuyển bằng máy bay
        decimal insuranceTotal = 0;
        long? insurancePackageId = null;
        if (request.InsurancePackageId.HasValue)
        {
            var isFlightOnly = request.FlightId.HasValue && !request.TrainId.HasValue && !request.BusId.HasValue;
            if (isMultiLeg)
                isFlightOnly = request.Segments!.All(s => (s.Mode ?? "").Equals("flight", StringComparison.OrdinalIgnoreCase));

            if (!isFlightOnly)
                return BadRequest(new { message = "Bảo hiểm chuyến đi chỉ áp dụng cho vé máy bay" });

            var insurancePkg = await _db.InsurancePackages.FindAsync(request.InsurancePackageId.Value);
            if (insurancePkg == null || !insurancePkg.IsActive)
                return BadRequest(new { message = "Gói bảo hiểm không tồn tại hoặc đã ngừng hoạt động" });
            insurancePackageId = insurancePkg.Id;
            insuranceTotal = insurancePkg.Price * passengerCount;
            totalPrice += insuranceTotal;
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
            Passengers = passengerCount,
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
            Status = "Pending",
            // Snapshot vé tại thời điểm đặt — dùng cho trạng thái "đã đi" và chính sách hoàn đổi
            SeatClass = flight?.SeatClass ?? train?.CoachClass ?? bus?.CoachClass,
            UnitPrice = flight?.Price ?? train?.Price ?? bus?.Price,
            DepartureTime = flight?.DepartureTime ?? train?.DepartureTime ?? bus?.DepartureTime ?? segments.FirstOrDefault()?.DepartureTime,
        };

        if (request.PassengerDetails is { Count: > 0 })
        {
            booking.PassengerDetails = request.PassengerDetails.Select(p => new BookingPassenger
            {
                FullName = p.FullName.Trim(),
                DateOfBirth = p.DateOfBirth,
                Gender = p.Gender,
                Nationality = p.Nationality,
                IdNumber = p.IdNumber,
                Email = p.Email,
                Phone = p.Phone,
            }).ToList();
        }

        if (isMultiLeg)
        {
            // Booking gộp: gắn các chặng (cascade lưu cùng booking)
            booking.Segments = segments;
            booking.SeatClass = segments.FirstOrDefault()?.SeatClass;
            booking.UnitPrice = segments.Sum(s => s.Price);
        }

        _db.Bookings.Add(booking);
        await _db.SaveChangesAsync();

        // Tạo bản ghi bảo hiểm sau khi có BookingId
        if (insurancePackageId.HasValue)
        {
            var insurance = new BookingInsurance
            {
                BookingId = booking.Id,
                PackageId = insurancePackageId.Value,
                Price = insuranceTotal,
                Status = "active",
            };
            _db.BookingInsurances.Add(insurance);
            await _db.SaveChangesAsync();
        }

        // Thông báo đặt vé thành công cho khách hàng
        var customerEmail = booking.User?.Email ?? request.Email;
        var customerName = booking.User?.FullName ?? request.FullName;
        if (!string.IsNullOrWhiteSpace(customerEmail))
        {
            var routeSummary = isMultiLeg
                ? string.Join(" → ", segments.Select(s => s.DepartureLocation))
                  + " → " + segments.Last().ArrivalLocation
                : (flight != null
                    ? $"{flight.DepartureLocation} → {flight.ArrivalLocation}"
                    : train != null
                        ? $"{train.DepartureLocation} → {train.ArrivalLocation}"
                        : bus != null
                            ? $"{bus.DepartureLocation} → {bus.ArrivalLocation}"
                            : "Chuyến");

            var transportLabel = isMultiLeg
                ? $"Lộ trình {segments.Count} chặng"
                : flight != null
                    ? $"Chuyến bay {flight.AirlineCode}"
                    : train != null
                        ? $"Tàu {train.TrainCode}"
                        : bus != null
                            ? $"Xe {bus.BusCode}"
                            : "Đặt chỗ";

            _db.Notifications.Add(new Notification
            {
                Email = customerEmail,
                Type = "booking_success",
                Title = $"Đặt vé thành công #{booking.Id}",
                Message = $"Xin chào {customerName}, bạn đã đặt {transportLabel} ({routeSummary}) thành công. Mã đặt chỗ: #{booking.Id}. Tổng tiền: {totalPrice:N0}đ.",
                Link = "/bookings",
                CreatedAt = DateTime.UtcNow,
            });
            await _db.SaveChangesAsync();
        }

        // Gửi email xác nhận đặt chỗ
        if (!string.IsNullOrWhiteSpace(customerEmail) && !string.IsNullOrWhiteSpace(customerName))
        {
            var depTime = flight?.DepartureTime ?? train?.DepartureTime ?? bus?.DepartureTime ?? segments.FirstOrDefault()?.DepartureTime ?? DateTime.UtcNow;
            var arrTime = flight?.ArrivalTime ?? train?.ArrivalTime ?? bus?.ArrivalTime ?? segments.LastOrDefault()?.ArrivalTime ?? DateTime.UtcNow;
            var fromCode = flight?.DepartureLocation ?? train?.DepartureLocation ?? bus?.DepartureLocation ?? segments.FirstOrDefault()?.DepartureLocation ?? "";
            var toCode = flight?.ArrivalLocation ?? train?.ArrivalLocation ?? bus?.ArrivalLocation ?? segments.LastOrDefault()?.ArrivalLocation ?? "";
            var transportType = flight != null ? "flight" : train != null ? "train" : "bus";
            var transportCode = flight != null ? flight.AirlineCode : train != null ? train.TrainCode : bus != null ? bus.BusCode : "";
            var transportName = flight != null ? flight.AirlineName : train != null ? train.TrainName : bus != null ? bus.BusCompany : "";
            var itemPrice = flight?.Price ?? train?.Price ?? bus?.Price ?? segments.FirstOrDefault()?.Price ?? 0m;
            var paymentLabel = booking.PaymentMethod switch
            {
                "credit_card" => "Thẻ tín dụng",
                "e_wallet" => "Ví điện tử",
                "bank_transfer" => "Chuyển khoản",
                _ => booking.PaymentMethod ?? "Test (sandbox)"
            };

            _ = _email.SendBookingConfirmationAsync(
                toEmail: customerEmail,
                customerName: customerName,
                customerPhone: booking.User?.Phone ?? request.Phone ?? "",
                customerAddress: booking.Address ?? "",
                type: isMultiLeg ? "multi" : transportType,
                code: transportCode,
                airlineName: transportType == "flight" ? transportName : null,
                trainName: transportType == "train" ? transportName : null,
                busCompany: transportType == "bus" ? transportName : null,
                fromCode: fromCode,
                toCode: toCode,
                departureTime: depTime,
                arrivalTime: arrTime,
                itemPrice: itemPrice,
                passengers: booking.Passengers,
                totalPrice: totalPrice,
                paymentMethod: paymentLabel,
                transactionId: booking.TransactionId ?? booking.Id.ToString(),
                bookingId: booking.Id
            );
        }

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
            .Include(b => b.Segments)
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
                        if (!_moMo.IsConfigured)
                            return BadRequest(new { message = "MoMo chưa được cấu hình. Phương thức này chưa được hỗ trợ." });
                        var result = await _moMo.CreatePaymentAsync(booking.Id, amount, $"Ve247-Booking-{booking.Id}");
                        if (result.ResultCode != 0 && result.ResultCode != 9000)
                            return BadRequest(new { message = $"MoMo: {result.Message}" });
                        paymentUrl = result.PayUrl;
                        providerTransactionId = result.OrderId;
                        break;
                    }
                    case "zalopay":
                    {
                        if (!_zaloPay.IsConfigured)
                            return BadRequest(new { message = "ZaloPay chưa được cấu hình. Phương thức này chưa được hỗ trợ." });
                        var result = await _zaloPay.CreatePaymentAsync(booking.Id, amount, $"Booking #{booking.Id}");
                        if (result.ReturnCode != 1)
                            return BadRequest(new { message = $"ZaloPay: {result.ReturnMessage}" });
                        paymentUrl = result.OrderUrl;
                        providerTransactionId = result.AppTransId;
                        break;
                    }
case "vnpay":
                        {
                            var ip = VnPayService.ResolveClientIp(HttpContext);
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

        // Phương thức này không có cổng thanh toán tự động (Thẻ tín dụng / Chuyển khoản / test):
        // KHÔNG tự xác nhận. Giữ trạng thái chờ, admin xác nhận sau khi nhận được tiền.
        booking.PaymentMethod = booking.PaymentMethod ?? provider;
        booking.PaymentProvider = booking.PaymentProvider ?? provider;
        await _db.SaveChangesAsync();

        _logger.LogInformation("Booking #{Id} created — awaiting manual confirmation ({Provider})", booking.Id, provider);

        return Ok(new
        {
            success = true,
            redirect = false,
            pending = true,
            transactionId = booking.TransactionId ?? booking.Id.ToString(),
            booking,
            message = "Đặt chỗ đã tạo. Vui lòng hoàn tất thanh toán — chúng tôi sẽ xác nhận sau khi nhận được tiền.",
        });
    }

    [HttpPatch("{id:long}/cancel")]
    public async Task<IActionResult> CancelBooking(long id)
    {
        var booking = await _db.Bookings
            .Include(b => b.Flight)
            .Include(b => b.Train)
            .Include(b => b.Bus)
            .Include(b => b.Segments)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null) return NotFound(new { message = "Đặt chỗ không tồn tại" });
        if (booking.Status == "Cancelled")
            return BadRequest(new { message = "Đặt chỗ đã bị hủy" });

        // Không cho hủy khi đã qua giờ khởi hành — chuyển sang trạng thái đánh giá chuyến đi
        var now = DateTime.Now;
        var depTime = booking.DepartureTime ?? booking.Flight?.DepartureTime ?? booking.Train?.DepartureTime ?? booking.Bus?.DepartureTime;
        if (depTime.HasValue && depTime <= now)
            return BadRequest(new
            {
                message = "Chuyến đi đã khởi hành — không thể hủy. Bạn có thể đánh giá chuyến đi.",
                hasDeparted = true,
            });

        // Hoàn tiền: booking gộp tính theo từng chặng; booking thường theo chính sách 1 vé
        decimal refundAmount = 0;
        int refundPercent = 0;
        string policyLabel;

        if (booking.Segments.Count > 0)
        {
            foreach (var seg in booking.Segments)
            {
                // Hoàn ghế từng chặng
                await RestoreSeatAsync(seg.Mode, seg.ItemId, booking.Passengers);

                var segPolicy = FarePolicy.GetCancelPolicy(seg.SeatClass, seg.Price);
                refundAmount += Math.Round(seg.Price * booking.Passengers * segPolicy.RefundPercent / 100m, 0);
                refundPercent += segPolicy.RefundPercent / Math.Max(1, booking.Segments.Count);
            }
            policyLabel = "Chính sách hủy theo từng chặng";
        }
        else
        {
            var price = booking.UnitPrice ?? booking.Flight?.Price ?? booking.Train?.Price ?? booking.Bus?.Price ?? 0m;
            var seatClass = booking.SeatClass ?? booking.Flight?.SeatClass ?? booking.Train?.CoachClass ?? booking.Bus?.CoachClass;
            var policy = FarePolicy.GetCancelPolicy(seatClass, price);
            refundPercent = policy.RefundPercent;
            policyLabel = policy.Label;
            refundAmount = Math.Round((booking.TotalPrice - (booking.DiscountAmount ?? 0)) * policy.RefundPercent / 100m, 0);

            if (booking.FlightId != null && booking.Flight != null)
                booking.Flight.Seats += booking.Passengers;

            if (booking.TrainId != null && booking.Train != null)
                booking.Train.Seats += booking.Passengers;

            if (booking.BusId != null && booking.Bus != null)
                booking.Bus.Seats += booking.Passengers;
        }

        booking.Status = "Cancelled";
        booking.RefundAmount = refundAmount;
        await _db.SaveChangesAsync();

        _logger.LogInformation("Booking #{BookingId} cancelled — refund {RefundAmount:N0}đ ({RefundPercent}%)", id, refundAmount, refundPercent);
        return Ok(new
        {
            message = "Đã hủy đặt chỗ",
            status = "Cancelled",
            refundAmount,
            refundPercent,
            policyLabel,
            hoursToDeparture = depTime.HasValue ? (double?)Math.Round((depTime.Value - now).TotalHours, 1) : null,
        });
    }

    private async Task RestoreSeatAsync(string mode, long itemId, int passengers)
    {
        switch ((mode ?? "").ToLowerInvariant())
        {
            case "flight":
                var f = await _db.Flights.FindAsync(itemId);
                if (f != null) f.Seats += passengers;
                break;
            case "train":
                var t = await _db.Trains.FindAsync(itemId);
                if (t != null) t.Seats += passengers;
                break;
            case "bus":
                var b = await _db.Buses.FindAsync(itemId);
                if (b != null) b.Seats += passengers;
                break;
        }
    }

    // Thanh toán thất bại/hủy: hoàn ghế và đánh dấu đặt chỗ bị hủy (chưa trả tiền nên không hoàn tiền)
    private async Task CancelUnpaidBookingAsync(Booking booking)
    {
        if (booking.Segments.Count > 0)
        {
            foreach (var seg in booking.Segments)
                await RestoreSeatAsync(seg.Mode, seg.ItemId, booking.Passengers);
        }
        else
        {
            if (booking.FlightId != null) await RestoreSeatAsync("flight", booking.FlightId.Value, booking.Passengers);
            if (booking.TrainId != null) await RestoreSeatAsync("train", booking.TrainId.Value, booking.Passengers);
            if (booking.BusId != null) await RestoreSeatAsync("bus", booking.BusId.Value, booking.Passengers);
        }
        booking.Status = "Cancelled";
        booking.RefundAmount = 0;
        await _db.SaveChangesAsync();
        _logger.LogInformation("Booking #{Id} auto-cancelled — payment failed/abandoned", booking.Id);
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

    /// <summary>Lộ trình kết hợp: danh sách chặng (mode + itemId). Khi có field này thì bỏ qua FlightId/TrainId/BusId.</summary>
    public List<CreateSegmentRequest>? Segments { get; set; }
    public int Passengers { get; set; } = 1;

    /// <summary>Danh sách hành khách (mỗi phần tử = 1 vé). Khi có dữ liệu thì Passengers được lấy theo số phần tử này.</summary>
    public List<CreatePassengerRequest>? PassengerDetails { get; set; }

    /// <summary>Gói bảo hiểm chuyến đi (áp cho tất cả hành khách, giá × số hành khách).</summary>
    public long? InsurancePackageId { get; set; }
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

public class CreateSegmentRequest
{
    public string Mode { get; set; } = "flight";
    public long ItemId { get; set; }
}

public class CreatePassengerRequest
{
    public string FullName { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? Nationality { get; set; }
    public string? IdNumber { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
}

public class PayRequest
{
    public string? Provider { get; set; }
    public string? PaymentMethod { get; set; }
}
