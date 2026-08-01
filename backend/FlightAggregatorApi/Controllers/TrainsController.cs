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
        [FromQuery] string? minPrice,
        [FromQuery] string? maxPrice,
        [FromQuery] string? coachClass,
        [FromQuery] string? trainType,
        [FromQuery] string? timeFrom,
        [FromQuery] string? timeTo,
        [FromQuery] int? minSeats,
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

            outboundQuery = ApplyPriceFilter(outboundQuery, minPrice, maxPrice);
            outboundQuery = ApplyTrainFilter(outboundQuery, coachClass, trainType, timeFrom, timeTo, minSeats);
            outboundQuery = ApplySort(outboundQuery, sortBy);
            var outboundTotal = await outboundQuery.CountAsync();
            var outboundItems = await outboundQuery.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

            var returnQuery = _db.Trains.AsNoTracking()
                .Where(t => t.DepartureLocation == to && t.ArrivalLocation == from)
                .Where(t => t.TrainDate == returnDate.Value);

            returnQuery = ApplyPriceFilter(returnQuery, minPrice, maxPrice);
            returnQuery = ApplyTrainFilter(returnQuery, coachClass, trainType, timeFrom, timeTo, minSeats);
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

        query = ApplyPriceFilter(query, minPrice, maxPrice);
        query = ApplyTrainFilter(query, coachClass, trainType, timeFrom, timeTo, minSeats);
        query = ApplySort(query, sortBy);

        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    private static IQueryable<Train> ApplyPriceFilter(IQueryable<Train> query, string? minPrice, string? maxPrice)
    {
        if (decimal.TryParse(minPrice, out var min) && min > 0)
            query = query.Where(t => t.Price >= min);
        if (decimal.TryParse(maxPrice, out var max) && max > 0)
            query = query.Where(t => t.Price <= max);
        return query;
    }

    private static IQueryable<Train> ApplyTrainFilter(
        IQueryable<Train> query,
        string? coachClass, string? trainType,
        string? timeFrom, string? timeTo, int? minSeats)
    {
        if (!string.IsNullOrEmpty(coachClass) && coachClass != "all")
            query = query.Where(t => t.CoachClass == coachClass);
        if (!string.IsNullOrEmpty(trainType) && trainType != "all")
            query = query.Where(t => t.TrainName == trainType);
        if (TimeSpan.TryParse(timeFrom, out var fromTime))
            query = query.Where(t => t.DepartureTime.TimeOfDay >= fromTime);
        if (TimeSpan.TryParse(timeTo, out var toTime))
            query = query.Where(t => t.DepartureTime.TimeOfDay <= toTime);
        if (minSeats.HasValue && minSeats > 0)
            query = query.Where(t => t.Seats >= minSeats.Value);
        return query;
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
