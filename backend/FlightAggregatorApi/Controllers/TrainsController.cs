using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;
using FlightAggregatorApi.Models;

namespace FlightAggregatorApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TrainsController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public TrainsController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetTrains(
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
            var outboundQuery = _db.Trains.AsNoTracking()
                .Where(t => t.DepartureLocation == from && t.ArrivalLocation == to);
            if (date.HasValue)
                outboundQuery = outboundQuery.Where(t => t.TrainDate == date.Value);
            if (minPrice.HasValue)
                outboundQuery = outboundQuery.Where(t => t.Price >= minPrice.Value);
            if (maxPrice.HasValue)
                outboundQuery = outboundQuery.Where(t => t.Price <= maxPrice.Value);
            outboundQuery = ApplySort(outboundQuery, sortBy);
            var outboundTotal = await outboundQuery.CountAsync();
            var outboundItems = await outboundQuery.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

            var returnQuery = _db.Trains.AsNoTracking()
                .Where(t => t.DepartureLocation == to && t.ArrivalLocation == from)
                .Where(t => t.TrainDate == returnDate.Value);
            if (minPrice.HasValue)
                returnQuery = returnQuery.Where(t => t.Price >= minPrice.Value);
            if (maxPrice.HasValue)
                returnQuery = returnQuery.Where(t => t.Price <= maxPrice.Value);
            returnQuery = ApplySort(returnQuery, sortBy);
            var returnTotal = await returnQuery.CountAsync();
            var returnItems = await returnQuery.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

            return Ok(new
            {
                outbound = new { items = outboundItems, total = outboundTotal, page, pageSize },
                @return = new { items = returnItems, total = returnTotal, page, pageSize }
            });
        }

        var query = _db.Trains.AsNoTracking();

        if (!string.IsNullOrEmpty(from))
            query = query.Where(t => t.DepartureLocation == from);
        if (!string.IsNullOrEmpty(to))
            query = query.Where(t => t.ArrivalLocation == to);
        if (date.HasValue)
            query = query.Where(t => t.TrainDate == date.Value);
        if (minPrice.HasValue)
            query = query.Where(t => t.Price >= minPrice.Value);
        if (maxPrice.HasValue)
            query = query.Where(t => t.Price <= maxPrice.Value);

        query = ApplySort(query, sortBy);

        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    private static IQueryable<Train> ApplySort(IQueryable<Train> query, string? sortBy)
    {
        return sortBy switch
        {
            "price" => query.OrderBy(t => t.Price),
            "price_desc" => query.OrderByDescending(t => t.Price),
            "departure" => query.OrderBy(t => t.DepartureTime),
            "duration" => query.OrderBy(t => t.ArrivalTime - t.DepartureTime),
            _ => query.OrderBy(t => t.Price)
        };
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetTrain(long id)
    {
        var train = await _db.Trains.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
        if (train == null) return NotFound();
        return Ok(train);
    }

    [HttpPost("{id:long}/share")]
    public async Task<IActionResult> IncrementShareCount(long id)
    {
        var train = await _db.Trains.FindAsync(id);
        if (train == null) return NotFound();
        train.ShareCount++;
        await _db.SaveChangesAsync();
        return Ok(new { shareCount = train.ShareCount });
    }
}
