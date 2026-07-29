using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;
using FlightAggregatorApi.Models;

namespace FlightAggregatorApi.Controllers;

[ApiController]
[Route("api/community-tips")]
public class CommunityTipsController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public CommunityTipsController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? from,
        [FromQuery] string? to)
    {
        var query = _db.CommunityTips.AsNoTracking();

        if (!string.IsNullOrEmpty(from))
            query = query.Where(t => t.RouteFrom == from);
        if (!string.IsNullOrEmpty(to))
            query = query.Where(t => t.RouteTo == to);

        var items = await query
            .OrderByDescending(t => t.Upvotes)
            .ThenByDescending(t => t.CreatedAt)
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTipRequest request)
    {
        if (string.IsNullOrEmpty(request.RouteFrom) || string.IsNullOrEmpty(request.RouteTo))
            return BadRequest("Route is required");
        if (string.IsNullOrEmpty(request.Tip))
            return BadRequest("Tip content is required");

        var tip = new CommunityTip
        {
            RouteFrom = request.RouteFrom,
            RouteTo = request.RouteTo,
            Tip = request.Tip,
            Category = request.Category,
            AuthorName = request.AuthorName,
            Email = request.Email
        };

        _db.CommunityTips.Add(tip);
        await _db.SaveChangesAsync();

        return Ok(tip);
    }

    [HttpPost("{id:long}/upvote")]
    public async Task<IActionResult> Upvote(long id)
    {
        var tip = await _db.CommunityTips.FirstOrDefaultAsync(t => t.Id == id);
        if (tip == null) return NotFound();
        tip.Upvotes++;
        await _db.SaveChangesAsync();
        return Ok(new { upvotes = tip.Upvotes });
    }
}

public class CreateTipRequest
{
    public string RouteFrom { get; set; } = string.Empty;
    public string RouteTo { get; set; } = string.Empty;
    public string Tip { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}
