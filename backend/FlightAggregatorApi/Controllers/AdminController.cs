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

        // Revenue over time (daily)
        var revenueOverTime = await _db.Bookings
            .AsNoTracking()
            .Where(b => b.Status == "Confirmed" && b.BookingDate >= periodStart)
            .GroupBy(b => b.BookingDate.Date)
            .Select(g => new { date = g.Key.ToString("yyyy-MM-dd"), revenue = g.Sum(b => b.TotalPrice) })
            .OrderBy(x => x.date)
            .ToListAsync();

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
        var monthlyRevenue = await _db.Bookings
            .AsNoTracking()
            .Where(b => b.Status == "Confirmed" && b.BookingDate >= twelveMoAgo)
            .GroupBy(b => new { b.BookingDate.Year, b.BookingDate.Month })
            .Select(g => new { month = g.Key.Year + "-" + g.Key.Month.ToString("00"), revenue = g.Sum(b => b.TotalPrice) })
            .OrderBy(x => x.month)
            .ToListAsync();

        // Top train routes (via bookings)
        var topTrainRoutes = await _db.Bookings
            .AsNoTracking()
            .Where(b => b.TrainId != null)
            .Include(b => b.Train)
            .GroupBy(b => new { b.Train!.DepartureLocation, b.Train.ArrivalLocation })
            .Select(g => new { route = g.Key.DepartureLocation + " → " + g.Key.ArrivalLocation, count = g.Count() })
            .OrderByDescending(x => x.count)
            .Take(5)
            .ToListAsync();

        // Airline market share (via flight bookings)
        var airlineMarketShare = await _db.Bookings
            .AsNoTracking()
            .Where(b => b.FlightId != null)
            .Include(b => b.Flight)
            .GroupBy(b => b.Flight!.AirlineName)
            .Select(g => new { airline = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToListAsync();

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

        int Pct(int now, int prev) => prev > 0 ? (int)Math.Round((double)(now - prev) / prev * 100) : now > 0 ? 100 : 0;
        int PctD(decimal now, decimal prev) => prev > 0 ? (int)Math.Round((now - prev) / prev * 100) : now > 0 ? 100 : 0;

        // Recent transactions
        var recentTransactions = await _db.Bookings
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
                date = b.BookingDate.ToString("yyyy-MM-dd HH:mm"),
                type = b.FlightId != null ? "Chuyến bay" : b.TrainId != null ? "Tàu hỏa" : "—"
            })
            .ToListAsync();

        return Ok(new
        {
            revenueOverTime,
            revenueComparison = new { current = currentRevenue, previous = previousRevenue, change = revenueChange },
            bookingStatusDistribution,
            monthlyRevenue,
            topTrainRoutes,
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

    private static string EscapeCsv(string value) => value.Contains(',') || value.Contains('"') || value.Contains('\n') ? $"\"{value.Replace("\"", "\"\"")}\"" : value;
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
