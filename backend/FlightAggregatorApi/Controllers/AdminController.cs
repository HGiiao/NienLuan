using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;
using FlightAggregatorApi.Models;
using FlightAggregatorApi.Helpers;

namespace FlightAggregatorApi.Controllers;

[ApiController]
[Route("api/admin")]
[RequireAdmin]
public class AdminController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<AdminController> _logger;

    public AdminController(ApplicationDbContext db, ILogger<AdminController> logger)
    {
        _db = db;
        _logger = logger;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var totalUsers = await _db.Users.CountAsync();
        var totalBookings = await _db.Bookings.CountAsync();
        var totalFlights = await _db.Flights.CountAsync();
        var totalTrains = await _db.Trains.CountAsync();
        var confirmedBookings = await _db.Bookings.CountAsync(b => b.Status == "Confirmed");
        var pendingBookings = await _db.Bookings.CountAsync(b => b.Status == "Pending");
        var cancelledBookings = await _db.Bookings.CountAsync(b => b.Status == "Cancelled");
        var totalRevenue = await _db.Bookings
            .Where(b => b.Status == "Confirmed")
            .SumAsync(b => b.TotalPrice);

        return Ok(new
        {
            totalUsers,
            totalBookings,
            totalFlights,
            totalTrains,
            confirmedBookings,
            pendingBookings,
            cancelledBookings,
            totalRevenue,
        });
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers([FromQuery] string? search, [FromQuery] string? role, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        IQueryable<User> query = _db.Users.AsNoTracking();

        if (!string.IsNullOrEmpty(role))
            query = query.Where(u => u.Role == role);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(u =>
                u.Email.Contains(search) ||
                u.FullName.Contains(search) ||
                u.Phone.Contains(search));

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    [HttpDelete("users/{id:long}")]
    public async Task<IActionResult> DeleteUser(long id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "Người dùng không tồn tại" });
        if (user.Role == "Admin")
            return BadRequest(new { message = "Không thể xoá tài khoản Admin" });

        try
        {
            var bookings = await _db.Bookings.Where(b => b.UserId == id).ToListAsync();
            if (bookings.Count > 0)
            {
                _db.Bookings.RemoveRange(bookings);
                _logger.LogInformation("Admin deleted {Count} bookings for user #{UserId}", bookings.Count, id);
            }

            _db.Users.Remove(user);
            await _db.SaveChangesAsync();
            _logger.LogInformation("Admin deleted user #{UserId}", id);
            return Ok(new { message = "Đã xoá người dùng" });
        }
        catch (DbUpdateException ex)
        {
            _logger.LogError(ex, "Failed to delete user #{UserId} due to FK constraint", id);
            return BadRequest(new { message = "Không thể xoá người dùng vì có dữ liệu liên quan (đặt chỗ, lịch sử giá)" });
        }
    }

    [HttpGet("bookings")]
    public async Task<IActionResult> GetBookings(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        IQueryable<Booking> query = _db.Bookings
            .AsNoTracking()
            .Include(b => b.User)
            .Include(b => b.Flight)
            .Include(b => b.Train);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(b => b.Status == status);

        if (dateFrom.HasValue)
            query = query.Where(b => b.BookingDate >= dateFrom.Value);

        if (dateTo.HasValue)
            query = query.Where(b => b.BookingDate <= dateTo.Value);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(b =>
                b.User.Email.Contains(search) ||
                b.User.FullName.Contains(search) ||
                b.Id.ToString().Contains(search));

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(b => b.BookingDate)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    [HttpPost("bookings/{id:long}/confirm")]
    public async Task<IActionResult> ConfirmBooking(long id)
    {
        var booking = await _db.Bookings.FindAsync(id);
        if (booking == null) return NotFound(new { message = "Đặt chỗ không tồn tại" });
        if (booking.Status == "Confirmed")
            return Ok(new { message = "Đặt chỗ đã được xác nhận", status = "Confirmed" });
        if (booking.Status == "Cancelled")
            return BadRequest(new { message = "Đặt chỗ đã bị hủy" });

        booking.Status = "Confirmed";
        booking.PaymentProvider = booking.PaymentProvider ?? "manual";
        booking.TransactionId ??= $"TXN_{DateTime.UtcNow:yyyyMMddHHmmss}";
        await _db.SaveChangesAsync();
        _logger.LogInformation("Admin confirmed booking #{BookingId} (manual payment)", id);

        return Ok(new { message = "Đã xác nhận thanh toán", status = "Confirmed" });
    }

    [HttpGet("flights")]
    public async Task<IActionResult> GetFlights([FromQuery] string? search, [FromQuery] string? airline, [FromQuery] DateTime? dateFrom, [FromQuery] DateTime? dateTo, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        IQueryable<Flight> query = _db.Flights.AsNoTracking();

        if (!string.IsNullOrEmpty(airline))
            query = query.Where(f => f.AirlineCode == airline);

        if (dateFrom.HasValue)
            query = query.Where(f => f.DepartureTime >= dateFrom.Value);

        if (dateTo.HasValue)
            query = query.Where(f => f.DepartureTime <= dateTo.Value);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(f =>
                f.AirlineCode.Contains(search) ||
                f.AirlineName.Contains(search) ||
                f.DepartureLocation.Contains(search) ||
                f.ArrivalLocation.Contains(search));

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(f => f.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    [HttpPost("flights")]
    public async Task<IActionResult> CreateFlight([FromBody] CreateFlightRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.AirlineCode) || string.IsNullOrWhiteSpace(request.DepartureLocation))
            return BadRequest(new { message = "Thông tin chuyến bay không hợp lệ" });

        if (await _db.Flights.AnyAsync(f => f.AirlineCode.ToUpper() == request.AirlineCode.Trim().ToUpper()))
            return Conflict(new { message = $"Mã chuyến bay \"{request.AirlineCode}\" đã tồn tại" });

        var flight = new Flight
        {
            AirlineCode = request.AirlineCode,
            AirlineName = request.AirlineName ?? request.AirlineCode,
            DepartureLocation = request.DepartureLocation,
            ArrivalLocation = request.ArrivalLocation,
            DepartureTime = request.DepartureTime,
            ArrivalTime = request.ArrivalTime,
            Price = request.Price,
            Seats = request.Seats,
            SeatClass = request.SeatClass ?? "Economy",
            FlightDate = DateOnly.FromDateTime(request.DepartureTime),
        };

        _db.Flights.Add(flight);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetFlights), new { id = flight.Id }, flight);
    }

    [HttpPut("flights/{id:long}")]
    public async Task<IActionResult> UpdateFlight(long id, [FromBody] CreateFlightRequest request)
    {
        var flight = await _db.Flights.FindAsync(id);
        if (flight == null) return NotFound(new { message = "Chuyến bay không tồn tại" });

        if (await _db.Flights.AnyAsync(f => f.Id != id && f.AirlineCode.ToUpper() == request.AirlineCode.Trim().ToUpper()))
            return Conflict(new { message = $"Mã chuyến bay \"{request.AirlineCode}\" đã tồn tại" });

        flight.AirlineCode = request.AirlineCode;
        flight.AirlineName = request.AirlineName ?? request.AirlineCode;
        flight.DepartureLocation = request.DepartureLocation;
        flight.ArrivalLocation = request.ArrivalLocation;
        flight.DepartureTime = request.DepartureTime;
        flight.ArrivalTime = request.ArrivalTime;
        flight.Price = request.Price;
        flight.Seats = request.Seats;
        flight.SeatClass = request.SeatClass ?? "Economy";
        flight.FlightDate = DateOnly.FromDateTime(request.DepartureTime);

        await _db.SaveChangesAsync();
        _logger.LogInformation("Admin updated flight #{FlightId}", id);

        return Ok(flight);
    }

    [HttpDelete("flights/{id:long}")]
    public async Task<IActionResult> DeleteFlight(long id)
    {
        var flight = await _db.Flights.FindAsync(id);
        if (flight == null) return NotFound(new { message = "Chuyến bay không tồn tại" });

        _db.Flights.Remove(flight);
        await _db.SaveChangesAsync();
        _logger.LogInformation("Admin deleted flight #{FlightId}", id);

        return Ok(new { message = "Đã xoá chuyến bay" });
    }

    [HttpGet("trains")]
    public async Task<IActionResult> GetTrains([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        IQueryable<Train> query = _db.Trains.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(t =>
                t.TrainCode.Contains(search) ||
                t.TrainName.Contains(search) ||
                t.DepartureLocation.Contains(search) ||
                t.ArrivalLocation.Contains(search));

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    [HttpPost("trains")]
    public async Task<IActionResult> CreateTrain([FromBody] CreateTrainRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.TrainCode) || string.IsNullOrWhiteSpace(request.DepartureLocation))
            return BadRequest(new { message = "Thông tin tàu không hợp lệ" });

        if (await _db.Trains.AnyAsync(t => t.TrainCode.ToUpper() == request.TrainCode.Trim().ToUpper()))
            return Conflict(new { message = $"Mã tàu \"{request.TrainCode}\" đã tồn tại" });

        var train = new Train
        {
            TrainCode = request.TrainCode,
            TrainName = request.TrainName ?? request.TrainCode,
            DepartureLocation = request.DepartureLocation,
            ArrivalLocation = request.ArrivalLocation,
            DepartureTime = request.DepartureTime,
            ArrivalTime = request.ArrivalTime,
            Price = request.Price,
            Seats = request.Seats,
            CoachClass = request.CoachClass ?? "",
            TrainDate = DateOnly.FromDateTime(request.DepartureTime),
        };

        _db.Trains.Add(train);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTrains), new { id = train.Id }, train);
    }

    [HttpPut("trains/{id:long}")]
    public async Task<IActionResult> UpdateTrain(long id, [FromBody] CreateTrainRequest request)
    {
        var train = await _db.Trains.FindAsync(id);
        if (train == null) return NotFound(new { message = "Tàu không tồn tại" });

        if (await _db.Trains.AnyAsync(t => t.Id != id && t.TrainCode.ToUpper() == request.TrainCode.Trim().ToUpper()))
            return Conflict(new { message = $"Mã tàu \"{request.TrainCode}\" đã tồn tại" });

        train.TrainCode = request.TrainCode;
        train.TrainName = request.TrainName ?? request.TrainCode;
        train.DepartureLocation = request.DepartureLocation;
        train.ArrivalLocation = request.ArrivalLocation;
        train.DepartureTime = request.DepartureTime;
        train.ArrivalTime = request.ArrivalTime;
        train.Price = request.Price;
        train.Seats = request.Seats;
        train.CoachClass = request.CoachClass ?? "";
        train.TrainDate = DateOnly.FromDateTime(request.DepartureTime);

        await _db.SaveChangesAsync();
        _logger.LogInformation("Admin updated train #{TrainId}", id);

        return Ok(train);
    }

    [HttpDelete("trains/{id:long}")]
    public async Task<IActionResult> DeleteTrain(long id)
    {
        var train = await _db.Trains.FindAsync(id);
        if (train == null) return NotFound(new { message = "Tàu không tồn tại" });

        _db.Trains.Remove(train);
        await _db.SaveChangesAsync();
        _logger.LogInformation("Admin deleted train #{TrainId}", id);

        return Ok(new { message = "Đã xoá tàu" });
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats([FromQuery] int period = 30)
    {
        var now = DateTime.UtcNow;
        var periodStart = now.AddDays(-period);
        var prevPeriodStart = periodStart.AddDays(-period);

        // Revenue over time (daily) — EF không dịch được ToString trong query → lấy ngày thô, format ở client
        var revenueOverTimeRaw = await _db.Bookings
            .AsNoTracking()
            .Where(b => b.Status == "Confirmed" && b.BookingDate >= periodStart)
            .GroupBy(b => b.BookingDate.Date)
            .Select(g => new { date = g.Key, revenue = g.Sum(b => b.TotalPrice) })
            .OrderBy(x => x.date)
            .ToListAsync();
        var revenueOverTime = revenueOverTimeRaw
            .Select(x => new { date = x.date.ToString("yyyy-MM-dd"), revenue = x.revenue })
            .ToList();

        // Revenue comparison
        var currentRevenue = await _db.Bookings
            .Where(b => b.Status == "Confirmed" && b.BookingDate >= periodStart)
            .SumAsync(b => (decimal?)b.TotalPrice) ?? 0;
        var previousRevenue = await _db.Bookings
            .Where(b => b.Status == "Confirmed" && b.BookingDate >= prevPeriodStart && b.BookingDate < periodStart)
            .SumAsync(b => (decimal?)b.TotalPrice) ?? 0;
        var revenueChange = previousRevenue > 0
            ? (int)Math.Round((currentRevenue - previousRevenue) / previousRevenue * 100)
            : currentRevenue > 0 ? 100 : 0;

        // Booking status distribution
        var bookingStatusDistribution = await _db.Bookings
            .AsNoTracking()
            .GroupBy(b => b.Status)
            .Select(g => new { status = g.Key, count = g.Count() })
            .ToListAsync();

        // Monthly revenue (past 12 months)
        var twelveMoAgo = now.AddMonths(-12);
        var monthlyRevenueRaw = await _db.Bookings
            .AsNoTracking()
            .Where(b => b.Status == "Confirmed" && b.BookingDate >= twelveMoAgo)
            .GroupBy(b => new { b.BookingDate.Year, b.BookingDate.Month })
            .Select(g => new { year = g.Key.Year, month = g.Key.Month, revenue = g.Sum(b => b.TotalPrice) })
            .OrderBy(x => x.year).ThenBy(x => x.month)
            .ToListAsync();
        var monthlyRevenue = monthlyRevenueRaw
            .Select(x => new { month = x.year + "-" + x.month.ToString("00"), revenue = x.revenue })
            .ToList();

        // Top train routes (via bookings)
        var topTrainRoutesRaw = await _db.Bookings
            .AsNoTracking()
            .Where(b => b.TrainId != null)
            .Include(b => b.Train)
            .GroupBy(b => new { b.Train!.DepartureLocation, b.Train.ArrivalLocation })
            .Select(g => new { dep = g.Key.DepartureLocation, arr = g.Key.ArrivalLocation, count = g.Count() })
            .OrderByDescending(x => x.count)
            .Take(5)
            .ToListAsync();
        var topTrainRoutes = topTrainRoutesRaw
            .Select(x => new { route = x.dep + " → " + x.arr, count = x.count })
            .ToList();

        // Top flight routes (via bookings)
        var topFlightRoutesRaw = await _db.Bookings
            .AsNoTracking()
            .Where(b => b.FlightId != null)
            .Include(b => b.Flight)
            .GroupBy(b => new { b.Flight!.DepartureLocation, b.Flight.ArrivalLocation })
            .Select(g => new { dep = g.Key.DepartureLocation, arr = g.Key.ArrivalLocation, count = g.Count() })
            .OrderByDescending(x => x.count)
            .Take(5)
            .ToListAsync();
        var topFlightRoutes = topFlightRoutesRaw
            .Select(x => new { route = x.dep + " → " + x.arr, count = x.count })
            .ToList();

        // Airline market share (via flight bookings)
        var airlineMarketShare = await _db.Bookings
            .AsNoTracking()
            .Where(b => b.FlightId != null)
            .Include(b => b.Flight)
            .GroupBy(b => b.Flight!.AirlineName)
            .Select(g => new { airline = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToListAsync();

        // Bookings per day (7 ngày qua) — cho biểu đồ đặt chỗ ở Tổng quan
        var weekStart = now.AddDays(-6).Date;
        var bookingsOverTimeRaw = await _db.Bookings
            .AsNoTracking()
            .Where(b => b.BookingDate >= weekStart)
            .GroupBy(b => b.BookingDate.Date)
            .Select(g => new { date = g.Key, count = g.Count() })
            .OrderBy(x => x.date)
            .ToListAsync();
        var bookingsOverTime = bookingsOverTimeRaw
            .Select(x => new { date = x.date.ToString("yyyy-MM-dd"), count = x.count })
            .ToList();

        // Growth metrics (WoW)
        var weekAgo = now.AddDays(-7);
        var twoWeeksAgo = now.AddDays(-14);
        var usersThisWeek = await _db.Users.CountAsync(u => u.CreatedAt >= weekAgo);
        var usersLastWeek = await _db.Users.CountAsync(u => u.CreatedAt >= twoWeeksAgo && u.CreatedAt < weekAgo);
        var bookingsThisWeek = await _db.Bookings.CountAsync(b => b.BookingDate >= weekAgo);
        var bookingsLastWeek = await _db.Bookings.CountAsync(b => b.BookingDate >= twoWeeksAgo && b.BookingDate < weekAgo);
        var revenueThisWeek = await _db.Bookings
            .Where(b => b.Status == "Confirmed" && b.BookingDate >= weekAgo)
            .SumAsync(b => (decimal?)b.TotalPrice) ?? 0;
        var revenueLastWeek = await _db.Bookings
            .Where(b => b.Status == "Confirmed" && b.BookingDate >= twoWeeksAgo && b.BookingDate < weekAgo)
            .SumAsync(b => (decimal?)b.TotalPrice) ?? 0;

        // Chỉ tính % khi kỳ trước có dữ liệu (>0). Nếu kỳ trước = 0 mà kỳ này có dữ liệu,
        // trả null để frontend hiển thị "Mới" thay vì +100% gây hiểu nhầm.
        int? Pct(int now, int prev) => prev > 0 ? (int)Math.Round((double)(now - prev) / prev * 100) : (int?)null;
        int? PctD(decimal now, decimal prev) => prev > 0 ? (int)Math.Round((now - prev) / prev * 100) : (int?)null;

        // Recent transactions
        var recentTransactionsRaw = await _db.Bookings
            .AsNoTracking()
            .Include(b => b.User)
            .OrderByDescending(b => b.BookingDate)
            .Take(10)
            .Select(b => new
            {
                id = b.Id,
                userName = b.User.FullName,
                email = b.User.Email,
                amount = b.TotalPrice,
                status = b.Status,
                date = b.BookingDate,
                type = b.FlightId != null ? "Chuyến bay" : b.TrainId != null ? "Tàu hỏa" : b.BusId != null ? "Xe khách" : "—"
            })
            .ToListAsync();
        var recentTransactions = recentTransactionsRaw
            .Select(t => new { t.id, t.userName, t.email, t.amount, t.status, date = t.date.ToString("yyyy-MM-dd HH:mm"), t.type })
            .ToList();

        return Ok(new
        {
            revenueOverTime,
            revenueComparison = new { current = currentRevenue, previous = previousRevenue, change = revenueChange },
            bookingStatusDistribution,
            monthlyRevenue,
            topTrainRoutes,
            topFlightRoutes,
            bookingsOverTime,
            airlineMarketShare,
            growthMetrics = new
            {
                usersWoW = Pct(usersThisWeek, usersLastWeek),
                bookingsWoW = Pct(bookingsThisWeek, bookingsLastWeek),
                revenueWoW = PctD(revenueThisWeek, revenueLastWeek),
                usersThisWeek,
                usersLastWeek,
                bookingsThisWeek,
                bookingsLastWeek,
                revenueThisWeek,
                revenueLastWeek
            },
            recentTransactions
        });
    }

    [HttpPost("flights/import")]
    public async Task<IActionResult> ImportFlights([FromBody] List<CreateFlightRequest> requests)
    {
        if (requests == null || requests.Count == 0)
            return BadRequest(new { message = "Danh sách chuyến bay rỗng" });

        var flights = requests.Select(r => new Flight
        {
            AirlineCode = r.AirlineCode,
            AirlineName = r.AirlineName ?? r.AirlineCode,
            DepartureLocation = r.DepartureLocation,
            ArrivalLocation = r.ArrivalLocation,
            DepartureTime = r.DepartureTime,
            ArrivalTime = r.ArrivalTime,
            Price = r.Price,
            Seats = r.Seats,
            SeatClass = r.SeatClass ?? "Economy",
            FlightDate = DateOnly.FromDateTime(r.DepartureTime),
        }).ToList();

        _db.Flights.AddRange(flights);
        await _db.SaveChangesAsync();
        _logger.LogInformation("Admin imported {Count} flights", flights.Count);

        return Ok(new { message = $"Đã nhập {flights.Count} chuyến bay", count = flights.Count });
    }

    [HttpGet("flights/export")]
    public async Task<IActionResult> ExportFlights([FromQuery] string? airline)
    {
        IQueryable<Flight> query = _db.Flights.AsNoTracking();
        if (!string.IsNullOrEmpty(airline))
            query = query.Where(f => f.AirlineCode == airline);

        var flights = await query.OrderBy(f => f.DepartureTime).ToListAsync();
        var csv = new System.Text.StringBuilder();
        csv.AppendLine("AirlineCode,AirlineName,DepartureLocation,ArrivalLocation,DepartureTime,ArrivalTime,Price,Seats,SeatClass,FlightDate");
        foreach (var f in flights)
            csv.AppendLine($"{f.AirlineCode},{EscapeCsv(f.AirlineName)},{f.DepartureLocation},{f.ArrivalLocation},{f.DepartureTime:O},{f.ArrivalTime:O},{f.Price},{f.Seats},{EscapeCsv(f.SeatClass)},{f.FlightDate:O}");

        return File(System.Text.Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", $"flights_{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    [HttpPost("trains/import")]
    public async Task<IActionResult> ImportTrains([FromBody] List<CreateTrainRequest> requests)
    {
        if (requests == null || requests.Count == 0)
            return BadRequest(new { message = "Danh sách tàu rỗng" });

        var trains = requests.Select(r => new Train
        {
            TrainCode = r.TrainCode,
            TrainName = r.TrainName ?? r.TrainCode,
            DepartureLocation = r.DepartureLocation,
            ArrivalLocation = r.ArrivalLocation,
            DepartureTime = r.DepartureTime,
            ArrivalTime = r.ArrivalTime,
            Price = r.Price,
            Seats = r.Seats,
            CoachClass = r.CoachClass ?? "",
            TrainDate = DateOnly.FromDateTime(r.DepartureTime),
        }).ToList();

        _db.Trains.AddRange(trains);
        await _db.SaveChangesAsync();
        _logger.LogInformation("Admin imported {Count} trains", trains.Count);

        return Ok(new { message = $"Đã nhập {trains.Count} chuyến tàu", count = trains.Count });
    }

    [HttpGet("trains/export")]
    public async Task<IActionResult> ExportTrains()
    {
        var trains = await _db.Trains.AsNoTracking().OrderBy(t => t.DepartureTime).ToListAsync();
        var csv = new System.Text.StringBuilder();
        csv.AppendLine("TrainCode,TrainName,DepartureLocation,ArrivalLocation,DepartureTime,ArrivalTime,Price,Seats,CoachClass,TrainDate");
        foreach (var t in trains)
            csv.AppendLine($"{t.TrainCode},{EscapeCsv(t.TrainName)},{t.DepartureLocation},{t.ArrivalLocation},{t.DepartureTime:O},{t.ArrivalTime:O},{t.Price},{t.Seats},{EscapeCsv(t.CoachClass)},{t.TrainDate:O}");

        return File(System.Text.Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", $"trains_{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    // ─────────────────────────────── Xe khách (Bus) ───────────────────────────────

    [HttpGet("buses")]
    public async Task<IActionResult> GetBuses([FromQuery] string? search, [FromQuery] string? company, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        IQueryable<Bus> query = _db.Buses.AsNoTracking();

        if (!string.IsNullOrEmpty(company))
            query = query.Where(b => b.BusCompany == company);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(b =>
                b.BusCode.Contains(search) ||
                b.BusCompany.Contains(search) ||
                b.DepartureLocation.Contains(search) ||
                b.ArrivalLocation.Contains(search) ||
                b.CoachClass.Contains(search));

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(b => b.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    [HttpPost("buses")]
    public async Task<IActionResult> CreateBus([FromBody] CreateBusRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.BusCode) || string.IsNullOrWhiteSpace(request.DepartureLocation))
            return BadRequest(new { message = "Thông tin xe khách không hợp lệ" });

        if (await _db.Buses.AnyAsync(b => b.BusCode.ToUpper() == request.BusCode.Trim().ToUpper()))
            return Conflict(new { message = $"Mã chuyến xe \"{request.BusCode}\" đã tồn tại" });

        var bus = new Bus
        {
            BusCode = request.BusCode,
            BusCompany = request.BusCompany ?? "",
            DepartureLocation = request.DepartureLocation,
            ArrivalLocation = request.ArrivalLocation,
            DepartureTime = request.DepartureTime,
            ArrivalTime = request.ArrivalTime,
            Price = request.Price,
            Seats = request.Seats,
            CoachClass = request.CoachClass ?? "",
            PickupPoint = request.PickupPoint ?? "",
            DropoffPoint = request.DropoffPoint ?? "",
            BusDate = DateOnly.FromDateTime(request.DepartureTime),
        };

        _db.Buses.Add(bus);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetBuses), new { id = bus.Id }, bus);
    }

    [HttpPut("buses/{id:long}")]
    public async Task<IActionResult> UpdateBus(long id, [FromBody] CreateBusRequest request)
    {
        var bus = await _db.Buses.FindAsync(id);
        if (bus == null) return NotFound(new { message = "Chuyến xe không tồn tại" });

        if (await _db.Buses.AnyAsync(b => b.Id != id && b.BusCode.ToUpper() == request.BusCode.Trim().ToUpper()))
            return Conflict(new { message = $"Mã chuyến xe \"{request.BusCode}\" đã tồn tại" });

        bus.BusCode = request.BusCode;
        bus.BusCompany = request.BusCompany ?? "";
        bus.DepartureLocation = request.DepartureLocation;
        bus.ArrivalLocation = request.ArrivalLocation;
        bus.DepartureTime = request.DepartureTime;
        bus.ArrivalTime = request.ArrivalTime;
        bus.Price = request.Price;
        bus.Seats = request.Seats;
        bus.CoachClass = request.CoachClass ?? "";
        bus.PickupPoint = request.PickupPoint ?? "";
        bus.DropoffPoint = request.DropoffPoint ?? "";
        bus.BusDate = DateOnly.FromDateTime(request.DepartureTime);

        await _db.SaveChangesAsync();
        _logger.LogInformation("Admin updated bus #{BusId}", id);

        return Ok(bus);
    }

    [HttpDelete("buses/{id:long}")]
    public async Task<IActionResult> DeleteBus(long id)
    {
        var bus = await _db.Buses.FindAsync(id);
        if (bus == null) return NotFound(new { message = "Chuyến xe không tồn tại" });

        _db.Buses.Remove(bus);
        await _db.SaveChangesAsync();
        _logger.LogInformation("Admin deleted bus #{BusId}", id);

        return Ok(new { message = "Đã xoá chuyến xe" });
    }

    [HttpPost("buses/import")]
    public async Task<IActionResult> ImportBuses([FromBody] List<CreateBusRequest> requests)
    {
        if (requests == null || requests.Count == 0)
            return BadRequest(new { message = "Danh sách chuyến xe rỗng" });

        var buses = requests.Select(r => new Bus
        {
            BusCode = r.BusCode,
            BusCompany = r.BusCompany ?? "",
            DepartureLocation = r.DepartureLocation,
            ArrivalLocation = r.ArrivalLocation,
            DepartureTime = r.DepartureTime,
            ArrivalTime = r.ArrivalTime,
            Price = r.Price,
            Seats = r.Seats,
            CoachClass = r.CoachClass ?? "",
            PickupPoint = r.PickupPoint ?? "",
            DropoffPoint = r.DropoffPoint ?? "",
            BusDate = DateOnly.FromDateTime(r.DepartureTime),
        }).ToList();

        _db.Buses.AddRange(buses);
        await _db.SaveChangesAsync();
        _logger.LogInformation("Admin imported {Count} buses", buses.Count);

        return Ok(new { message = $"Đã nhập {buses.Count} chuyến xe", count = buses.Count });
    }

    [HttpGet("buses/export")]
    public async Task<IActionResult> ExportBuses([FromQuery] string? company)
    {
        IQueryable<Bus> query = _db.Buses.AsNoTracking();
        if (!string.IsNullOrEmpty(company))
            query = query.Where(b => b.BusCompany == company);

        var buses = await query.OrderBy(b => b.DepartureTime).ToListAsync();
        var csv = new System.Text.StringBuilder();
        csv.AppendLine("BusCode,BusCompany,DepartureLocation,ArrivalLocation,DepartureTime,ArrivalTime,Price,Seats,CoachClass,PickupPoint,DropoffPoint,BusDate");
        foreach (var b in buses)
            csv.AppendLine($"{b.BusCode},{EscapeCsv(b.BusCompany)},{b.DepartureLocation},{b.ArrivalLocation},{b.DepartureTime:O},{b.ArrivalTime:O},{b.Price},{b.Seats},{EscapeCsv(b.CoachClass)},{EscapeCsv(b.PickupPoint)},{EscapeCsv(b.DropoffPoint)},{b.BusDate:O}");

        return File(System.Text.Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", $"buses_{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    // ─────────────────────────────── Gói VIP (Subscriptions) ───────────────────────────────

    [HttpGet("subscriptions")]
    public async Task<IActionResult> GetSubscriptions([FromQuery] string? search, [FromQuery] string? plan, [FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        IQueryable<UserSubscription> query = _db.UserSubscriptions.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(s => s.User!.Email.Contains(search) || s.User.FullName.Contains(search));
        if (!string.IsNullOrEmpty(plan))
            query = query.Where(s => s.Plan!.Name == plan);
        if (!string.IsNullOrEmpty(status))
            query = query.Where(s => s.Status == status);

        var total = await query.CountAsync();
        var items = await query
            .Select(s => new
            {
                s.Id,
                s.UserId,
                s.PlanId,
                s.BillingCycle,
                s.StartDate,
                s.EndDate,
                s.Status,
                user = new { s.User!.Id, s.User.FullName, s.User.Email, s.User.Phone },
                plan = new { s.Plan!.Id, s.Plan.Name, s.Plan.MonthlyPrice, s.Plan.YearlyPrice },
            })
            .OrderByDescending(x => x.StartDate)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    // ─────────────────────────────── Chi tiết người dùng ───────────────────────────────

    [HttpGet("users/{id:long}/overview")]
    public async Task<IActionResult> GetUserOverview(long id)
    {
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
        if (user == null) return NotFound(new { message = "Người dùng không tồn tại" });

        var bookings = await _db.Bookings.AsNoTracking()
            .Where(b => b.UserId == id)
            .OrderByDescending(b => b.BookingDate)
            .Take(20)
            .Select(b => new
            {
                b.Id,
                b.Status,
                b.TotalPrice,
                b.PaymentMethod,
                b.BookingDate,
                type = b.FlightId != null ? "Chuyến bay" : b.TrainId != null ? "Tàu hỏa" : b.BusId != null ? "Xe khách" : "—",
            })
            .ToListAsync();

        var subscription = await _db.UserSubscriptions.AsNoTracking()
            .Include(s => s.Plan)
            .Where(s => s.UserId == id && s.Status == "active" && s.EndDate > DateTime.UtcNow)
            .OrderByDescending(s => s.StartDate)
            .FirstOrDefaultAsync();

        var alerts = await _db.PriceAlerts.AsNoTracking()
            .Where(a => a.Email == user.Email)
            .OrderByDescending(a => a.CreatedAt)
            .Take(20)
            .ToListAsync();

        var spins = await _db.LuckyWheelSpins.AsNoTracking()
            .Where(s => s.Email == user.Email)
            .OrderByDescending(s => s.CreatedAt)
            .Take(20)
            .ToListAsync();

        var notifications = await _db.Notifications.AsNoTracking()
            .Where(n => n.Email == user.Email)
            .OrderByDescending(n => n.CreatedAt)
            .Take(10)
            .ToListAsync();

        return Ok(new
        {
            user = new
            {
                user.Id,
                user.Email,
                user.FullName,
                user.Phone,
                user.Role,
                user.IsEmailVerified,
                user.Address,
                user.PaymentMethod,
                user.CreatedAt,
            },
            bookings,
            subscription = subscription == null ? null : new
            {
                plan = subscription.Plan?.Name,
                subscription.BillingCycle,
                subscription.StartDate,
                subscription.EndDate,
                subscription.Status,
            },
            alerts,
            spins,
            notifications,
        });
    }

    // ─────────────────────────────── Gửi thông báo cho toàn bộ người dùng ───────────────────────────────

    [HttpPost("notifications/broadcast")]
    public async Task<IActionResult> BroadcastNotification([FromBody] BroadcastNotificationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest(new { message = "Tiêu đề thông báo không được để trống" });

        var emails = await _db.Users.AsNoTracking().Select(u => u.Email).ToListAsync();
        if (emails.Count == 0)
            return Ok(new { message = "Chưa có người dùng nào để gửi", count = 0 });

        var notifications = emails.Select(e => new Notification
        {
            Email = e,
            Type = string.IsNullOrWhiteSpace(request.Type) ? "announcement" : request.Type,
            Title = request.Title,
            Message = request.Message ?? "",
            Link = string.IsNullOrWhiteSpace(request.Link) ? null : request.Link,
            CreatedAt = DateTime.UtcNow,
        }).ToList();

        _db.Notifications.AddRange(notifications);
        await _db.SaveChangesAsync();
        _logger.LogInformation("Admin broadcast notification to {Count} users", emails.Count);

        return Ok(new { message = $"Đã gửi thông báo tới {emails.Count} người dùng", count = emails.Count });
    }

    private static string EscapeCsv(string value) => value.Contains(',') || value.Contains('"') || value.Contains('\n') ? $"\"{value.Replace("\"", "\"\"")}\"" : value;
}

public class CreateBusRequest
{
    public string BusCode { get; set; } = string.Empty;
    public string? BusCompany { get; set; }
    public string DepartureLocation { get; set; } = string.Empty;
    public string ArrivalLocation { get; set; } = string.Empty;
    public DateTime DepartureTime { get; set; }
    public DateTime ArrivalTime { get; set; }
    public decimal Price { get; set; }
    public int Seats { get; set; }
    public string? CoachClass { get; set; }
    public string? PickupPoint { get; set; }
    public string? DropoffPoint { get; set; }
}

public class BroadcastNotificationRequest
{
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Link { get; set; }
    public string? Type { get; set; }
}

public class CreateFlightRequest
{
    public string AirlineCode { get; set; } = string.Empty;
    public string? AirlineName { get; set; }
    public string DepartureLocation { get; set; } = string.Empty;
    public string ArrivalLocation { get; set; } = string.Empty;
    public DateTime DepartureTime { get; set; }
    public DateTime ArrivalTime { get; set; }
    public decimal Price { get; set; }
    public int Seats { get; set; }
    public string? SeatClass { get; set; }
}

public class CreateTrainRequest
{
    public string TrainCode { get; set; } = string.Empty;
    public string? TrainName { get; set; }
    public string DepartureLocation { get; set; } = string.Empty;
    public string ArrivalLocation { get; set; } = string.Empty;
    public DateTime DepartureTime { get; set; }
    public DateTime ArrivalTime { get; set; }
    public decimal Price { get; set; }
    public int Seats { get; set; }
    public string? CoachClass { get; set; }
}
