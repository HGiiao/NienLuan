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
    private readonly PriceAlertService _priceAlerts;
    private readonly ILogger<PriceAlertController> _logger;

    public PriceAlertController(ApplicationDbContext db, EmailService email, PriceAlertService priceAlerts, ILogger<PriceAlertController> logger)
    {
        _db = db;
        _email = email;
        _priceAlerts = priceAlerts;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePriceAlertRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.RouteFrom) || string.IsNullOrWhiteSpace(request.RouteTo))
            return BadRequest(new { message = "Email, điểm đi và điểm đến không được để trống" });

        if (request.TargetPrice <= 0)
            return BadRequest(new { message = "Giá mục tiêu phải lớn hơn 0" });

        // Buộc áp dụng đúng quyền lợi gói đã đăng ký: giới hạn số cảnh báo giá/ngày theo plan
        var plan = await PlanResolver.GetPlanForEmailAsync(_db, request.Email);
        var createdToday = await _db.PriceAlerts.CountAsync(a => a.Email == request.Email && a.CreatedAt >= DateTime.UtcNow.Date);
        if (createdToday >= plan.MaxAlertsPerDay)
        {
            return BadRequest(new
            {
                message = $"Gói {plan.Name} được tạo tối đa {plan.MaxAlertsPerDay} cảnh báo giá/ngày — bạn đã dùng hết hôm nay. Nâng cấp VIP để tăng giới hạn.",
                maxAlertsPerDay = plan.MaxAlertsPerDay,
                plan = plan.Name,
            });
        }

        var lowest = await PriceAlertService.GetLowestPriceAsync(_db, request.RouteFrom, request.RouteTo);

        // Theo dõi một chuyến cụ thể từ card → lấy giá của chính chuyến đó làm giá hiện tại
        decimal? itemPrice = null;
        if (request.ItemId.HasValue && !string.IsNullOrWhiteSpace(request.Mode))
        {
            itemPrice = request.Mode.ToLower() switch
            {
                "flight" => (await _db.Flights.FindAsync(request.ItemId.Value))?.Price,
                "train" => (await _db.Trains.FindAsync(request.ItemId.Value))?.Price,
                "bus" => (await _db.Buses.FindAsync(request.ItemId.Value))?.Price,
                _ => null,
            };
        }

        var alert = new PriceAlert
        {
            Email = request.Email,
            RouteFrom = request.RouteFrom,
            RouteTo = request.RouteTo,
            TargetPrice = request.TargetPrice,
            CurrentPrice = itemPrice ?? lowest,
            ItemId = request.ItemId,
            Mode = request.Mode,
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
                a.ItemId,
                a.Mode,
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

        var result = await _priceAlerts.CheckAlertsAsync(_db, email);

        return Ok(new { triggered = result.Triggered, message = $"Kiểm tra {result.Count} cảnh báo, {result.Triggered.Count} cảnh báo kích hoạt" });
    }
}

public class CreatePriceAlertRequest
{
    public string Email { get; set; } = string.Empty;
    public string RouteFrom { get; set; } = string.Empty;
    public string RouteTo { get; set; } = string.Empty;
    public decimal TargetPrice { get; set; }

    /// <summary>Id chuyến cụ thể được theo dõi (Flight/Train/Bus) — không bắt buộc.</summary>
    public long? ItemId { get; set; }

    /// <summary>flight / train / bus.</summary>
    public string? Mode { get; set; }
}
