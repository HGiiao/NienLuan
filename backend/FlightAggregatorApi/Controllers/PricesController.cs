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
        if (isRoundTrip && returnDate.Value < dateVal)
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
