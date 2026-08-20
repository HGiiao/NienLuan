using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;
using FlightAggregatorApi.Models;

namespace FlightAggregatorApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FlightsController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public FlightsController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetFlights(
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] DateOnly? date,
        [FromQuery] string? tripType,
        [FromQuery] DateOnly? returnDate,
        [FromQuery] string? sortBy,
        [FromQuery] string? minPrice,
        [FromQuery] string? maxPrice,
        [FromQuery] string? seatClass,
        [FromQuery] string? airline,
        [FromQuery] string? timeFrom,
        [FromQuery] string? timeTo,
        [FromQuery] int? minSeats,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (tripType == "round-trip" && returnDate.HasValue
            && !string.IsNullOrEmpty(from) && !string.IsNullOrEmpty(to))
        {
            var outboundQuery = _db.Flights.AsNoTracking()
                .Where(f => f.DepartureLocation == from && f.ArrivalLocation == to);
            if (date.HasValue)
                outboundQuery = outboundQuery.Where(f => f.FlightDate == date.Value);

            outboundQuery = ApplyPriceFilter(outboundQuery, minPrice, maxPrice);
            outboundQuery = ApplyFlightFilter(outboundQuery, seatClass, airline, timeFrom, timeTo, minSeats);
            outboundQuery = ApplySort(outboundQuery, sortBy);
            var outboundTotal = await outboundQuery.CountAsync();
            var outboundItems = await outboundQuery.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

            var returnQuery = _db.Flights.AsNoTracking()
                .Where(f => f.DepartureLocation == to && f.ArrivalLocation == from)
                .Where(f => f.FlightDate == returnDate.Value);

            returnQuery = ApplyPriceFilter(returnQuery, minPrice, maxPrice);
            returnQuery = ApplyFlightFilter(returnQuery, seatClass, airline, timeFrom, timeTo, minSeats);
            returnQuery = ApplySort(returnQuery, sortBy);
            var returnTotal = await returnQuery.CountAsync();
            var returnItems = await returnQuery.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

            return Ok(new
            {
                outbound = new { items = outboundItems, total = outboundTotal, page, pageSize },
                @return = new { items = returnItems, total = returnTotal, page, pageSize }
            });
        }

        var query = _db.Flights.AsNoTracking();

        if (!string.IsNullOrEmpty(from))
            query = query.Where(f => f.DepartureLocation == from);
        if (!string.IsNullOrEmpty(to))
            query = query.Where(f => f.ArrivalLocation == to);
        if (date.HasValue)
            query = query.Where(f => f.FlightDate == date.Value);

        query = ApplyPriceFilter(query, minPrice, maxPrice);
        query = ApplyFlightFilter(query, seatClass, airline, timeFrom, timeTo, minSeats);
        query = ApplySort(query, sortBy);

        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    private static IQueryable<Flight> ApplyPriceFilter(IQueryable<Flight> query, string? minPrice, string? maxPrice)
    {
        if (decimal.TryParse(minPrice, out var min) && min > 0)
            query = query.Where(f => f.Price >= min);
        if (decimal.TryParse(maxPrice, out var max) && max > 0)
            query = query.Where(f => f.Price <= max);
        return query;
    }

    private static IQueryable<Flight> ApplyFlightFilter(
        IQueryable<Flight> query,
        string? seatClass, string? airline,
        string? timeFrom, string? timeTo, int? minSeats)
    {
        if (!string.IsNullOrEmpty(seatClass) && seatClass != "all")
            query = query.Where(f => f.SeatClass == seatClass);
        if (!string.IsNullOrEmpty(airline) && airline != "all")
            query = query.Where(f => f.AirlineCode == airline);
        if (TimeSpan.TryParse(timeFrom, out var fromTime))
            query = query.Where(f => f.DepartureTime.TimeOfDay >= fromTime);
        if (TimeSpan.TryParse(timeTo, out var toTime))
            query = query.Where(f => f.DepartureTime.TimeOfDay <= toTime);
        if (minSeats.HasValue && minSeats > 0)
            query = query.Where(f => f.Seats >= minSeats.Value);
        return query;
    }

    private static IQueryable<Flight> ApplySort(IQueryable<Flight> query, string? sortBy)
    {
        return sortBy switch
        {
            "price" => query.OrderBy(f => f.Price),
            "price_desc" => query.OrderByDescending(f => f.Price),
            "departure" => query.OrderBy(f => f.DepartureTime),
            "duration" => query.OrderBy(f => EF.Functions.DateDiffMinute(f.DepartureTime, f.ArrivalTime)),
            _ => query.OrderBy(f => f.Price)
        };
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetFlight(long id)
    {
        var flight = await _db.Flights.AsNoTracking().FirstOrDefaultAsync(f => f.Id == id);
        if (flight == null) return NotFound();
        return Ok(flight);
    }

    [HttpPost("{id:long}/share")]
    public async Task<IActionResult> IncrementShareCount(long id)
    {
        var flight = await _db.Flights.FindAsync(id);
        if (flight == null) return NotFound();
        flight.ShareCount++;
        await _db.SaveChangesAsync();
        return Ok(new { shareCount = flight.ShareCount });
    }
}
