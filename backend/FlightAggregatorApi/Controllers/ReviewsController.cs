using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;
using FlightAggregatorApi.Models;

namespace FlightAggregatorApi.Controllers;

[ApiController]
[Route("api/reviews")]
public class ReviewsController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public ReviewsController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] long? flightId,
        [FromQuery] long? trainId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var query = _db.Reviews.AsNoTracking();

        if (flightId.HasValue)
            query = query.Where(r => r.FlightId == flightId);
        if (trainId.HasValue)
            query = query.Where(r => r.TrainId == trainId);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(
        [FromQuery] long? flightId,
        [FromQuery] long? trainId)
    {
        var query = _db.Reviews.AsNoTracking();

        if (flightId.HasValue)
            query = query.Where(r => r.FlightId == flightId);
        if (trainId.HasValue)
            query = query.Where(r => r.TrainId == trainId);

        var avg = await query.AverageAsync(r => (double?)r.Rating) ?? 0;
        var count = await query.CountAsync();
        var distribution = await query
            .GroupBy(r => r.Rating)
            .Select(g => new { Rating = g.Key, Count = g.Count() })
            .ToListAsync();

        return Ok(new
        {
            averageRating = Math.Round(avg, 1),
            totalReviews = count,
            distribution = Enumerable.Range(1, 5).Select(r => new
            {
                rating = r,
                count = distribution.FirstOrDefault(d => d.Rating == r)?.Count ?? 0
            })
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateReviewRequest request)
    {
        if (request.Rating < 1 || request.Rating > 5)
            return BadRequest("Rating must be between 1 and 5");
        if (string.IsNullOrEmpty(request.Comment))
            return BadRequest("Comment is required");

        var review = new Review
        {
            FlightId = request.FlightId,
            TrainId = request.TrainId,
            Email = request.Email,
            AuthorName = request.AuthorName,
            Rating = request.Rating,
            Comment = request.Comment
        };

        _db.Reviews.Add(review);
        await _db.SaveChangesAsync();

        return Ok(review);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        var review = await _db.Reviews.FirstOrDefaultAsync(r => r.Id == id);
        if (review == null) return NotFound();
        _db.Reviews.Remove(review);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public class CreateReviewRequest
{
    public long? FlightId { get; set; }
    public long? TrainId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
}
