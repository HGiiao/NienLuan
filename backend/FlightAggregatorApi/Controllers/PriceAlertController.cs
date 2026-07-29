using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;
using FlightAggregatorApi.Models;
using FlightAggregatorApi.Services;

namespace FlightAggregatorApi.Controllers;

[ApiController]
[Route("api/price-alerts")]
public class PriceAlertController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly EmailService _email;
    private readonly ILogger<PriceAlertController> _logger;

    public PriceAlertController(ApplicationDbContext db, EmailService email, ILogger<PriceAlertController> logger)
    {
        _db = db;
        _email = email;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePriceAlertRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.RouteFrom) || string.IsNullOrWhiteSpace(request.RouteTo))
            return BadRequest(new { message = "Email, điểm đi và điểm đến không được để trống" });

        if (request.TargetPrice <= 0)
            return BadRequest(new { message = "Giá mục tiêu phải lớn hơn 0" });

        var lowest = await _db.Flights
            .Where(f => f.DepartureLocation == request.RouteFrom && f.ArrivalLocation == request.RouteTo)
            .OrderBy(f => f.Price)
            .Select(f => (decimal?)f.Price)
            .FirstOrDefaultAsync();

        if (lowest == null)
        {
            lowest = await _db.Trains
                .Where(t => t.DepartureLocation == request.RouteFrom && t.ArrivalLocation == request.RouteTo)
                .OrderBy(t => t.Price)
                .Select(t => (decimal?)t.Price)
                .FirstOrDefaultAsync();
        }

        var alert = new PriceAlert
        {
            Email = request.Email,
            RouteFrom = request.RouteFrom,
            RouteTo = request.RouteTo,
            TargetPrice = request.TargetPrice,
            CurrentPrice = lowest,
            IsActive = true,
        };

        _db.PriceAlerts.Add(alert);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            id = alert.Id,
            email = alert.Email,
            routeFrom = alert.RouteFrom,
            routeTo = alert.RouteTo,
            targetPrice = alert.TargetPrice,
            currentPrice = alert.CurrentPrice,
            isActive = alert.IsActive,
            createdAt = alert.CreatedAt,
        });
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return BadRequest(new { message = "Email không được để trống" });

        var alerts = await _db.PriceAlerts
            .Where(a => a.Email == email)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new
            {
                a.Id,
                a.Email,
                a.RouteFrom,
                a.RouteTo,
                a.TargetPrice,
                a.CurrentPrice,
                a.IsActive,
                a.CreatedAt,
                a.NotifiedAt,
            })
            .ToListAsync();

        return Ok(alerts);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        var alert = await _db.PriceAlerts.FindAsync(id);
        if (alert == null)
            return NotFound(new { message = "Cảnh báo không tồn tại" });

        _db.PriceAlerts.Remove(alert);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Đã xóa cảnh báo" });
    }

    [HttpPatch("{id:long}/toggle")]
    public async Task<IActionResult> Toggle(long id)
    {
        var alert = await _db.PriceAlerts.FindAsync(id);
        if (alert == null)
            return NotFound(new { message = "Cảnh báo không tồn tại" });

        alert.IsActive = !alert.IsActive;
        await _db.SaveChangesAsync();

        return Ok(new { message = alert.IsActive ? "Đã bật cảnh báo" : "Đã tắt cảnh báo" });
    }

    [HttpPost("check")]
    public async Task<IActionResult> CheckAlerts([FromQuery] string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return BadRequest(new { message = "Email không được để trống" });

        var alerts = await _db.PriceAlerts
            .Where(a => a.Email == email && a.IsActive && a.NotifiedAt == null)
            .ToListAsync();

        var triggered = new List<object>();

        foreach (var alert in alerts)
        {
            var lowestFlight = await _db.Flights
                .Where(f => f.DepartureLocation == alert.RouteFrom && f.ArrivalLocation == alert.RouteTo)
                .OrderBy(f => f.Price)
                .FirstOrDefaultAsync();

            var lowestTrain = await _db.Trains
                .Where(t => t.DepartureLocation == alert.RouteFrom && t.ArrivalLocation == alert.RouteTo)
                .OrderBy(t => t.Price)
                .FirstOrDefaultAsync();

            var lowestPrice = Math.Min(
                lowestFlight?.Price ?? decimal.MaxValue,
                lowestTrain?.Price ?? decimal.MaxValue
            );

            alert.CurrentPrice = lowestPrice == decimal.MaxValue ? null : lowestPrice;

            if (lowestPrice != decimal.MaxValue && lowestPrice <= alert.TargetPrice)
            {
                alert.NotifiedAt = DateTime.UtcNow;
                triggered.Add(new
                {
                    alert.Id,
                    alert.RouteFrom,
                    alert.RouteTo,
                    alert.TargetPrice,
                    CurrentPrice = lowestPrice,
                    alert.Email,
                });

                try
                {
                    await _email.SendPriceAlertAsync(alert.Email, alert.RouteFrom, alert.RouteTo, alert.TargetPrice, lowestPrice);
                    _logger.LogInformation("Đã gửi email cảnh báo giá đến {Email} cho tuyến {From}→{To}", alert.Email, alert.RouteFrom, alert.RouteTo);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Gửi email cảnh báo giá thất bại đến {Email}", alert.Email);
                }

                _db.Notifications.Add(new Notification
                {
                    Email = alert.Email,
                    Type = "price_drop",
                    Title = $"Giá vé {alert.RouteFrom} → {alert.RouteTo} đã giảm!",
                    Message = $"Giá hiện tại {lowestPrice:N0}đ thấp hơn mục tiêu {alert.TargetPrice:N0}đ.",
                    Link = $"/flights?from={alert.RouteFrom}&to={alert.RouteTo}",
                    CreatedAt = DateTime.UtcNow,
                });
            }
        }

        await _db.SaveChangesAsync();

        return Ok(new { triggered, message = $"Kiểm tra {alerts.Count} cảnh báo, {triggered.Count} cảnh báo kích hoạt" });
    }
}

public class CreatePriceAlertRequest
{
    public string Email { get; set; } = string.Empty;
    public string RouteFrom { get; set; } = string.Empty;
    public string RouteTo { get; set; } = string.Empty;
    public decimal TargetPrice { get; set; }
}
