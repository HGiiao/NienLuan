using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;
using FlightAggregatorApi.Models;

namespace FlightAggregatorApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BusesController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public BusesController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetBuses(
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] DateOnly? date,
        [FromQuery] string? tripType,
        [FromQuery] DateOnly? returnDate,
        [FromQuery] string? sortBy,
        [FromQuery] string? minPrice,
        [FromQuery] string? maxPrice,
        [FromQuery] string? coachClass,
        [FromQuery] string? company,
        [FromQuery] string? timeFrom,
        [FromQuery] string? timeTo,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (tripType == "round-trip" && returnDate.HasValue
            && !string.IsNullOrEmpty(from) && !string.IsNullOrEmpty(to))
        {
            var outboundQuery = _db.Buses.AsNoTracking()
                .Where(b => b.DepartureLocation == from && b.ArrivalLocation == to);
            if (date.HasValue)
                outboundQuery = outboundQuery.Where(b => b.BusDate == date.Value);

            outboundQuery = ApplyPriceFilter(outboundQuery, minPrice, maxPrice);
            outboundQuery = ApplyBusFilter(outboundQuery, coachClass, company, timeFrom, timeTo);
            outboundQuery = ApplySort(outboundQuery, sortBy);
            var outboundTotal = await outboundQuery.CountAsync();
            var outboundItems = await outboundQuery.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

            var returnQuery = _db.Buses.AsNoTracking()
                .Where(b => b.DepartureLocation == to && b.ArrivalLocation == from)
                .Where(b => b.BusDate == returnDate.Value);

            returnQuery = ApplyPriceFilter(returnQuery, minPrice, maxPrice);
            returnQuery = ApplyBusFilter(returnQuery, coachClass, company, timeFrom, timeTo);
            returnQuery = ApplySort(returnQuery, sortBy);
            var returnTotal = await returnQuery.CountAsync();
            var returnItems = await returnQuery.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

            return Ok(new
            {
                outbound = new { items = outboundItems, total = outboundTotal, page, pageSize },
                @return = new { items = returnItems, total = returnTotal, page, pageSize }
            });
        }

        var query = _db.Buses.AsNoTracking();

        if (!string.IsNullOrEmpty(from))
            query = query.Where(b => b.DepartureLocation == from);
        if (!string.IsNullOrEmpty(to))
            query = query.Where(b => b.ArrivalLocation == to);
        if (date.HasValue)
            query = query.Where(b => b.BusDate == date.Value);

        query = ApplyPriceFilter(query, minPrice, maxPrice);
        query = ApplyBusFilter(query, coachClass, company, timeFrom, timeTo);
        query = ApplySort(query, sortBy);

        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    private static IQueryable<Bus> ApplyPriceFilter(IQueryable<Bus> query, string? minPrice, string? maxPrice)
    {
        if (decimal.TryParse(minPrice, out var min) && min > 0)
            query = query.Where(b => b.Price >= min);
        if (decimal.TryParse(maxPrice, out var max) && max > 0)
            query = query.Where(b => b.Price <= max);
        return query;
    }

    private static IQueryable<Bus> ApplyBusFilter(
        IQueryable<Bus> query,
        string? coachClass, string? company,
        string? timeFrom, string? timeTo)
    {
        if (!string.IsNullOrEmpty(coachClass) && coachClass != "all")
            query = query.Where(b => b.CoachClass == coachClass);
        if (!string.IsNullOrEmpty(company) && company != "all")
            query = query.Where(b => b.BusCompany == company);
        if (TimeSpan.TryParse(timeFrom, out var fromTime))
            query = query.Where(b => b.DepartureTime.TimeOfDay >= fromTime);
        if (TimeSpan.TryParse(timeTo, out var toTime))
            query = query.Where(b => b.DepartureTime.TimeOfDay <= toTime);
        return query;
    }

    private static IQueryable<Bus> ApplySort(IQueryable<Bus> query, string? sortBy)
    {
        return sortBy switch
        {
            "price" => query.OrderBy(b => b.Price),
            "price_desc" => query.OrderByDescending(b => b.Price),
            "departure" => query.OrderBy(b => b.DepartureTime),
            "duration" => query.OrderBy(b => b.ArrivalTime - b.DepartureTime),
            _ => query.OrderBy(b => b.Price)
        };
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetBus(long id)
    {
        var bus = await _db.Buses.AsNoTracking().FirstOrDefaultAsync(b => b.Id == id);
        if (bus == null) return NotFound();
        return Ok(bus);
    }

    [HttpPost("{id:long}/share")]
    public async Task<IActionResult> IncrementShareCount(long id)
    {
        var bus = await _db.Buses.FindAsync(id);
        if (bus == null) return NotFound();
        bus.ShareCount++;
        await _db.SaveChangesAsync();
        return Ok(new { shareCount = bus.ShareCount });
    }
}
