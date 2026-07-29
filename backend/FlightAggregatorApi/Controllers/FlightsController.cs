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
        [FromQuery] decimal? minPrice,
        [FromQuery] decimal? maxPrice,
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
            if (minPrice.HasValue)
                outboundQuery = outboundQuery.Where(f => f.Price >= minPrice.Value);
            if (maxPrice.HasValue)
                outboundQuery = outboundQuery.Where(f => f.Price <= maxPrice.Value);
            outboundQuery = ApplySort(outboundQuery, sortBy);
            var outboundTotal = await outboundQuery.CountAsync();
            var outboundItems = await outboundQuery.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

            var returnQuery = _db.Flights.AsNoTracking()
                .Where(f => f.DepartureLocation == to && f.ArrivalLocation == from)
                .Where(f => f.FlightDate == returnDate.Value);
            if (minPrice.HasValue)
                returnQuery = returnQuery.Where(f => f.Price >= minPrice.Value);
            if (maxPrice.HasValue)
                returnQuery = returnQuery.Where(f => f.Price <= maxPrice.Value);
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
        if (minPrice.HasValue)
            query = query.Where(f => f.Price >= minPrice.Value);
        if (maxPrice.HasValue)
            query = query.Where(f => f.Price <= maxPrice.Value);

        query = ApplySort(query, sortBy);

        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    private static IQueryable<Flight> ApplySort(IQueryable<Flight> query, string? sortBy)
    {
        return sortBy switch
        {
            "price" => query.OrderBy(f => f.Price),
            "price_desc" => query.OrderByDescending(f => f.Price),
            "departure" => query.OrderBy(f => f.DepartureTime),
            "duration" => query.OrderBy(f => f.ArrivalTime - f.DepartureTime),
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
