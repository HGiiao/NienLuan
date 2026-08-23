using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;
using FlightAggregatorApi.Models;
using FlightAggregatorApi.Services;

namespace FlightAggregatorApi.Controllers;

[ApiController]
[Route("api/prices")]
public class PricesController : ControllerBase
{
    private readonly PriceHistoryService _historyService;
    private readonly RouteOptimizerService _routeService;
    private readonly PricePredictionService _predictionService;
    private readonly ApplicationDbContext _db;
    private readonly ILogger<PricesController> _logger;

    public PricesController(
        PriceHistoryService historyService,
        RouteOptimizerService routeService,
        PricePredictionService predictionService,
        ApplicationDbContext db,
        ILogger<PricesController> logger)
    {
        _historyService = historyService;
        _routeService = routeService;
        _predictionService = predictionService;
        _db = db;
        _logger = logger;
    }

    [HttpGet("trends")]
    public async Task<IActionResult> GetTrends(
        [FromQuery] string from,
        [FromQuery] string to,
        [FromQuery] int days = 7,
        [FromQuery] string mode = "flight")
    {
        days = days switch { 7 => 7, 14 => 14, 30 => 30, _ => 7 };
        if (string.IsNullOrWhiteSpace(from) || string.IsNullOrWhiteSpace(to))
            return BadRequest(new { message = "Thiếu điểm đi/đến" });

        var data = await _historyService.GetTrendData(from.Trim().ToUpperInvariant(), to.Trim().ToUpperInvariant(), days, mode);
        return Ok(data);
    }

    [HttpGet("current")]
    public async Task<IActionResult> GetCurrent(
        [FromQuery] string from,
        [FromQuery] string to)
    {
        if (string.IsNullOrWhiteSpace(from) || string.IsNullOrWhiteSpace(to))
            return BadRequest(new { message = "Thiếu điểm đi/đến" });

        var f = from.Trim().ToUpperInvariant();
        var t = to.Trim().ToUpperInvariant();

        var flightPrices = await _db.Flights
            .AsNoTracking()
            .Where(x => x.DepartureLocation == f && x.ArrivalLocation == t)
            .Select(x => x.Price)
            .ToListAsync();

        var trainPrices = await _db.Trains
            .AsNoTracking()
            .Where(x => x.DepartureLocation == f && x.ArrivalLocation == t)
            .Select(x => x.Price)
            .ToListAsync();

        var busPrices = await _db.Buses
            .AsNoTracking()
            .Where(x => x.DepartureLocation == f && x.ArrivalLocation == t)
            .Select(x => x.Price)
            .ToListAsync();

        var all = flightPrices.Concat(trainPrices).Concat(busPrices).ToList();
        if (!all.Any())
        {
            _logger.LogInformation("No current prices for {From}->{To}", f, t);
            return Ok(new { from = f, to = t, minPrice = (decimal?)null, avgPrice = (decimal?)null, maxPrice = (decimal?)null, count = 0 });
        }

        var min = all.Min();
        var max = all.Max();
        var avg = Math.Round(all.Average(), 0);

        return Ok(new { from = f, to = t, minPrice = min, avgPrice = avg, maxPrice = max, count = all.Count });
    }

    [HttpGet("compare")]
    public async Task<IActionResult> Compare(
        [FromQuery] string from,
        [FromQuery] string to,
        [FromQuery] DateOnly? date,
        [FromQuery] string? tripType,
        [FromQuery] DateOnly? returnDate,
        [FromQuery] string? email = null)
    {
        if (string.IsNullOrWhiteSpace(from) || string.IsNullOrWhiteSpace(to))
            return BadRequest(new { message = "Thiếu điểm đi/đến" });

        var f = from.Trim().ToUpperInvariant();
        var t = to.Trim().ToUpperInvariant();
        var dateVal = date ?? DateOnly.FromDateTime(DateTime.UtcNow);

        // Buộc áp dụng quyền lợi gói: Free (hoặc chưa đăng nhập) chỉ so sánh 1 hãng bay rẻ nhất
        var plan = await PlanResolver.GetPlanForEmailAsync(_db, email ?? "");
        bool limitAirline = !plan.MultiAirlineCompare;

        bool isRoundTrip = string.Equals(tripType, "round-trip", StringComparison.OrdinalIgnoreCase) && returnDate.HasValue;
        if (isRoundTrip && returnDate.HasValue && returnDate.Value < dateVal)
        {
            return BadRequest(new { message = "returnDate phải sau hoặc bằng date" });
        }

        if (isRoundTrip)
        {
            var outboundFlights = await _db.Flights
                .AsNoTracking()
                .Where(fx => fx.DepartureLocation == f && fx.ArrivalLocation == t && fx.FlightDate == dateVal)
                .OrderBy(fx => fx.Price)
                .ToListAsync();

            var outboundTrains = await _db.Trains
                .AsNoTracking()
                .Where(tx => tx.DepartureLocation == f && tx.ArrivalLocation == t && tx.TrainDate == dateVal)
                .OrderBy(tx => tx.Price)
                .ToListAsync();

            var outboundBuses = await _db.Buses
                .AsNoTracking()
                .Where(bx => bx.DepartureLocation == f && bx.ArrivalLocation == t && bx.BusDate == dateVal)
                .OrderBy(bx => bx.Price)
                .ToListAsync();

            var returnFlights = await _db.Flights
                .AsNoTracking()
                .Where(fx => fx.DepartureLocation == t && fx.ArrivalLocation == f && fx.FlightDate == returnDate!.Value)
                .OrderBy(fx => fx.Price)
                .ToListAsync();

            var returnTrains = await _db.Trains
                .AsNoTracking()
                .Where(tx => tx.DepartureLocation == t && tx.ArrivalLocation == f && tx.TrainDate == returnDate!.Value)
                .OrderBy(tx => tx.Price)
                .ToListAsync();

            var returnBuses = await _db.Buses
                .AsNoTracking()
                .Where(bx => bx.DepartureLocation == t && bx.ArrivalLocation == f && bx.BusDate == returnDate!.Value)
                .OrderBy(bx => bx.Price)
                .ToListAsync();

            if (limitAirline)
            {
                outboundFlights = KeepCheapestAirlineOnly(outboundFlights);
                returnFlights = KeepCheapestAirlineOnly(returnFlights);
            }

            _logger.LogInformation("Compare round-trip {F}->{T} {Date} & {RDate}: {OutCount} đi / {RetCount} về",
                f, t, dateVal, returnDate!.Value, outboundFlights.Count + outboundTrains.Count + outboundBuses.Count, returnFlights.Count + returnTrains.Count + returnBuses.Count);

            return Ok(new
            {
                outbound = new { flights = outboundFlights, trains = outboundTrains, buses = outboundBuses },
                returns = new { flights = returnFlights, trains = returnTrains, buses = returnBuses }
            });
        }

        var flights = await _db.Flights
            .AsNoTracking()
            .Where(fx => fx.DepartureLocation == f && fx.ArrivalLocation == t && fx.FlightDate == dateVal)
            .OrderBy(fx => fx.Price)
            .ToListAsync();

        var trains = await _db.Trains
            .AsNoTracking()
            .Where(tx => tx.DepartureLocation == f && tx.ArrivalLocation == t && tx.TrainDate == dateVal)
            .OrderBy(tx => tx.Price)
            .ToListAsync();

        var buses = await _db.Buses
            .AsNoTracking()
            .Where(bx => bx.DepartureLocation == f && bx.ArrivalLocation == t && bx.BusDate == dateVal)
            .OrderBy(bx => bx.Price)
            .ToListAsync();

        if (limitAirline)
        {
            flights = KeepCheapestAirlineOnly(flights);
        }

        _logger.LogInformation("Compare one-way {F}->{T} {Date}: {Count} results", f, t, dateVal, flights.Count + trains.Count + buses.Count);

        return Ok(new { flights, trains, buses });
    }

    /// <summary>
    /// Gói không có MultiAirlineCompare (Free): chỉ giữ chuyến bay của hãng rẻ nhất
    /// (danh sách đã sort theo giá tăng dần nên phần tử đầu là hãng rẻ nhất).
    /// </summary>
    private static List<Flight> KeepCheapestAirlineOnly(List<Flight> flights)
    {
        if (flights.Count <= 1) return flights;
        var cheapestAirline = flights[0].AirlineCode;
        return flights.Where(f => f.AirlineCode == cheapestAirline).ToList();
    }

    /// <summary>
    /// So sánh ngày lân cận (Flexible Dates): giá thấp nhất + số chuyến theo từng ngày
    /// trong khoảng [date - days .. date + days], tách riêng máy bay / tàu hỏa / xe khách.
    /// Ngày nào không có chuyến thì trả null để frontend tô xám.
    /// </summary>
    [HttpGet("compare/flexible")]
    public async Task<IActionResult> CompareFlexible(
        [FromQuery] string from,
        [FromQuery] string to,
        [FromQuery] DateOnly? date,
        [FromQuery] int days = 3)
    {
        if (string.IsNullOrWhiteSpace(from) || string.IsNullOrWhiteSpace(to))
            return BadRequest(new { message = "Thiếu điểm đi/đến" });

        days = days switch { <= 1 => 1, >= 7 => 7, _ => days };
        var f = from.Trim().ToUpperInvariant();
        var t = to.Trim().ToUpperInvariant();
        var baseDate = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var start = baseDate.AddDays(-days);
        var end = baseDate.AddDays(days);

        var flightMins = await _db.Flights
            .AsNoTracking()
            .Where(x => x.DepartureLocation == f && x.ArrivalLocation == t && x.FlightDate >= start && x.FlightDate <= end)
            .GroupBy(x => x.FlightDate)
            .Select(g => new { Date = g.Key, MinPrice = g.Min(x => x.Price), Count = g.Count() })
            .ToDictionaryAsync(x => x.Date);

        var trainMins = await _db.Trains
            .AsNoTracking()
            .Where(x => x.DepartureLocation == f && x.ArrivalLocation == t && x.TrainDate >= start && x.TrainDate <= end)
            .GroupBy(x => x.TrainDate)
            .Select(g => new { Date = g.Key, MinPrice = g.Min(x => x.Price), Count = g.Count() })
            .ToDictionaryAsync(x => x.Date);

        var busMins = await _db.Buses
            .AsNoTracking()
            .Where(x => x.DepartureLocation == f && x.ArrivalLocation == t && x.BusDate >= start && x.BusDate <= end)
            .GroupBy(x => x.BusDate)
            .Select(g => new { Date = g.Key, MinPrice = g.Min(x => x.Price), Count = g.Count() })
            .ToDictionaryAsync(x => x.Date);

        var results = Enumerable.Range(0, (end.DayNumber - start.DayNumber) + 1)
            .Select(offset =>
            {
                var d = start.AddDays(offset);
                flightMins.TryGetValue(d, out var fl);
                trainMins.TryGetValue(d, out var tr);
                busMins.TryGetValue(d, out var bu);
                return new
                {
                    date = d,
                    flights = fl == null ? null : new { minPrice = fl.MinPrice, count = fl.Count },
                    trains = tr == null ? null : new { minPrice = tr.MinPrice, count = tr.Count },
                    buses = bu == null ? null : new { minPrice = bu.MinPrice, count = bu.Count },
                };
            })
            .ToList();

        _logger.LogInformation("Compare flexible {F}->{T} around {Date} ±{Days}d", f, t, baseDate, days);
        return Ok(new { from = f, to = t, baseDate, days, results });
    }

    /// <summary>
    /// Điểm đánh giá trung bình theo từng chuyến của tuyến+ngày đang so sánh,
    /// trả về map {"flight_5": {avg, count}, "train_2": {...}, ...} để frontend
    /// tra cứu O(1) khi hiển thị ⭐ và tính Best Value.
    /// </summary>
    [HttpGet("compare/ratings")]
    public async Task<IActionResult> CompareRatings(
        [FromQuery] string from,
        [FromQuery] string to,
        [FromQuery] DateOnly? date)
    {
        if (string.IsNullOrWhiteSpace(from) || string.IsNullOrWhiteSpace(to))
            return BadRequest(new { message = "Thiếu điểm đi/đến" });

        var f = from.Trim().ToUpperInvariant();
        var t = to.Trim().ToUpperInvariant();
        var dateVal = date ?? DateOnly.FromDateTime(DateTime.UtcNow);

        var flightRatings = await (
            from r in _db.Reviews.AsNoTracking()
            join fl in _db.Flights.AsNoTracking() on r.FlightId equals fl.Id
            where fl.DepartureLocation == f && fl.ArrivalLocation == t && fl.FlightDate == dateVal
            group r by r.FlightId into g
            select new { Id = g.Key!.Value, Avg = g.Average(x => (double)x.Rating), Count = g.Count() }
        ).ToListAsync();

        var trainRatings = await (
            from r in _db.Reviews.AsNoTracking()
            join tn in _db.Trains.AsNoTracking() on r.TrainId equals tn.Id
            where tn.DepartureLocation == f && tn.ArrivalLocation == t && tn.TrainDate == dateVal
            group r by r.TrainId into g
            select new { Id = g.Key!.Value, Avg = g.Average(x => (double)x.Rating), Count = g.Count() }
        ).ToListAsync();

        var busRatings = await (
            from r in _db.Reviews.AsNoTracking()
            join b in _db.Buses.AsNoTracking() on r.BusId equals b.Id
            where b.DepartureLocation == f && b.ArrivalLocation == t && b.BusDate == dateVal
            group r by r.BusId into g
            select new { Id = g.Key!.Value, Avg = g.Average(x => (double)x.Rating), Count = g.Count() }
        ).ToListAsync();

        var map = new Dictionary<string, object>();
        foreach (var x in flightRatings) map[$"flight_{x.Id}"] = new { avg = Math.Round(x.Avg, 1), count = x.Count };
        foreach (var x in trainRatings) map[$"train_{x.Id}"] = new { avg = Math.Round(x.Avg, 1), count = x.Count };
        foreach (var x in busRatings) map[$"bus_{x.Id}"] = new { avg = Math.Round(x.Avg, 1), count = x.Count };

        return Ok(map);
    }

    [HttpGet("predict")]
    public async Task<IActionResult> Predict(
        [FromQuery] string from,
        [FromQuery] string to,
        [FromQuery] int days = 7)
    {
        if (string.IsNullOrWhiteSpace(from) || string.IsNullOrWhiteSpace(to))
            return BadRequest(new { message = "Thiếu điểm đi/đến" });

        var result = await _predictionService.Predict(from.Trim().ToUpperInvariant(), to.Trim().ToUpperInvariant(), days);
        return Ok(result);
    }

    [HttpGet("calendar")]
    public async Task<IActionResult> GetCalendar(
        [FromQuery] string from,
        [FromQuery] string? to,
        [FromQuery] int month,
        [FromQuery] int year)
    {
        if (string.IsNullOrWhiteSpace(from))
            return BadRequest(new { message = "Thiếu điểm đi" });

        var f = from.Trim().ToUpperInvariant();
        var startDate = new DateOnly(year, month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var destinations = !string.IsNullOrWhiteSpace(to)
            ? new List<string> { to.Trim().ToUpperInvariant() }
            : await _db.Flights
                .AsNoTracking()
                .Where(fl => fl.DepartureLocation == f)
                .Select(fl => fl.ArrivalLocation)
                .Distinct()
                .Take(8)
                .ToListAsync();

        var flights = await _db.Flights
            .AsNoTracking()
            .Where(fl => fl.DepartureLocation == f
                && destinations.Contains(fl.ArrivalLocation)
                && fl.FlightDate >= startDate
                && fl.FlightDate <= endDate)
            .GroupBy(fl => new { fl.ArrivalLocation, fl.FlightDate })
            .Select(g => new
            {
                Location = g.Key.ArrivalLocation,
                Date = g.Key.FlightDate,
                MinPrice = g.Min(fl => fl.Price)
            })
            .ToListAsync();

        var rows = destinations.Select(dest => new
        {
            location = dest,
            days = Enumerable.Range(0, (endDate.DayNumber - startDate.DayNumber) + 1)
                .Select(offset =>
                {
                    var d = startDate.AddDays(offset);
                    var match = flights.FirstOrDefault(fl => fl.Location == dest && fl.Date == d);
                    return match != null ? (decimal?)match.MinPrice : null;
                })
                .ToList()
        }).ToList();

        return Ok(new
        {
            month,
            year,
            from = f,
            startDate,
            endDate,
            rows
        });
    }

    [HttpPost("optimal-route")]
    public async Task<IActionResult> GetOptimalRoute([FromBody] OptimalRouteRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.OriginCity) || string.IsNullOrWhiteSpace(request.DestinationCity))
            return BadRequest(new { message = "originCity and destinationCity are required" });

        var startDate = DateOnly.FromDateTime(request.StartDate);
        var endDate = request.EndDate != default ? DateOnly.FromDateTime(request.EndDate) : startDate;
        if (endDate < startDate) endDate = startDate;

        var routes = await _routeService.FindOptimalRoute(
            request.OriginCity.Trim().ToUpperInvariant(),
            request.DestinationCity.Trim().ToUpperInvariant(),
            startDate,
            endDate,
            request.Preferences ?? "cheapest");

        return Ok(routes);
    }

    [HttpPost("optimal-roundtrip")]
    public async Task<IActionResult> GetOptimalRoundTrip([FromBody] OptimalRouteRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.OriginCity) || string.IsNullOrWhiteSpace(request.DestinationCity))
            return BadRequest(new { message = "originCity and destinationCity are required" });

        var startDate = DateOnly.FromDateTime(request.StartDate);
        var returnDate = request.EndDate != default ? DateOnly.FromDateTime(request.EndDate) : startDate;
        if (returnDate <= startDate) returnDate = startDate.AddDays(1);

        var combos = await _routeService.FindRoundTripRoute(
            request.OriginCity.Trim().ToUpperInvariant(),
            request.DestinationCity.Trim().ToUpperInvariant(),
            startDate,
            returnDate,
            request.Preferences ?? "cheapest");

        return Ok(combos);
    }

    [HttpGet("carbon")]
    public IActionResult GetCarbonFootprint([FromQuery] string from, [FromQuery] string to)
    {
        if (string.IsNullOrWhiteSpace(from) || string.IsNullOrWhiteSpace(to))
            return BadRequest(new { message = "Vui lòng nhập điểm đi và điểm đến" });

        var result = CarbonFootprintService.Calculate(from.ToUpperInvariant(), to.ToUpperInvariant());
        return Ok(result);
    }
}

public class OptimalRouteRequest
{
    public string OriginCity { get; set; } = string.Empty;
    public string DestinationCity { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? Preferences { get; set; }
}
