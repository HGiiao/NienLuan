using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;
using FlightAggregatorApi.Services;

namespace FlightAggregatorApi.Controllers;

[ApiController]
[Route("api/seats")]
public class SeatsController : ControllerBase
{
    private readonly SeatMapService _seatMapService;
    private readonly ApplicationDbContext _db;

    public SeatsController(SeatMapService seatMapService, ApplicationDbContext db)
    {
        _seatMapService = seatMapService;
        _db = db;
    }

    [HttpGet("map")]
    public async Task<IActionResult> GetSeatMap([FromQuery] string type, [FromQuery] long referenceId)
    {
        if (string.IsNullOrEmpty(type) || referenceId <= 0)
            return BadRequest(new { message = "Vui lòng nhập type và referenceId" });

        var seats = await _seatMapService.GetOrGenerateSeatMap(type, referenceId);
        return Ok(new { type, referenceId, seats });
    }

    [HttpPost("book")]
    public async Task<IActionResult> BookSeats([FromBody] BookSeatsRequest request)
    {
        if (request.SeatIds == null || request.SeatIds.Count == 0)
            return BadRequest(new { message = "Vui lòng chọn ghế" });

        var seats = await _db.Seats.Where(s => request.SeatIds.Contains(s.Id)).ToListAsync();

        var unavailable = seats.Where(s => s.Status != "available").ToList();
        if (unavailable.Count > 0)
            return BadRequest(new { message = $"Ghế {string.Join(", ", unavailable.Select(s => s.SeatNumber))} đã có người đặt" });

        foreach (var seat in seats)
        {
            seat.Status = "booked";
            seat.BookedBy = request.UserId;
        }

        await _db.SaveChangesAsync();
        return Ok(new { success = true, seats = seats.Select(s => s.SeatNumber).ToList() });
    }
}

public class BookSeatsRequest
{
    public List<long> SeatIds { get; set; } = new();
    public long UserId { get; set; }
}
