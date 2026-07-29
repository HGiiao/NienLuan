using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;
using FlightAggregatorApi.Models;

namespace FlightAggregatorApi.Controllers;

[ApiController]
[Route("api/notifications")]
public class NotificationsController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public NotificationsController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetNotifications([FromQuery] string email, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var query = _db.Notifications.AsNoTracking().Where(n => n.Email == email).OrderByDescending(n => n.CreatedAt);
        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount([FromQuery] string email)
    {
        var count = await _db.Notifications.AsNoTracking().CountAsync(n => n.Email == email && !n.IsRead);
        return Ok(new { count });
    }

    [HttpPatch("{id:long}/read")]
    public async Task<IActionResult> MarkAsRead(long id)
    {
        var n = await _db.Notifications.FindAsync(id);
        if (n == null) return NotFound();
        n.IsRead = true;
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllAsRead([FromQuery] string email)
    {
        await _db.Notifications.Where(n => n.Email == email && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
        return Ok(new { success = true });
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> DeleteNotification(long id)
    {
        var n = await _db.Notifications.FindAsync(id);
        if (n == null) return NotFound();
        _db.Notifications.Remove(n);
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPost("seed")]
    public async Task<IActionResult> SeedNotifications([FromQuery] string email)
    {
        var types = new[] {
            ("price_drop", "Giá vé giảm mạnh!", "Vé máy bay HAN → SGN giảm từ 2,500,000₫ xuống còn 1,890,000₫. Nhanh tay đặt ngay!", "/flights?from=HAN&to=SGN"),
            ("low_seats", "Sắp hết ghế!", "Chuyến bay HAN → DAD ngày 25/07 chỉ còn 3 ghế. Đặt ngay kẻo lỡ!", "/flights?from=HAN&to=DAD&date=2026-07-25"),
            ("weather", "Thời tiết tại điểm đến", "TP. Hồ Chí Minh ngày mai: nắng nóng 35°C, có mưa rào về chiều. Nhớ mang ô!", ""),
            ("visa", "Visa requirements", "Bạn cần visa nhập cảnh vào Việt Nam nếu mang hộ chiếu nước ngoài. Xem chi tiết!", ""),
        };

        foreach (var (type, title, message, link) in types)
        {
            _db.Notifications.Add(new Notification
            {
                Email = email,
                Type = type,
                Title = title,
                Message = message,
                Link = link,
                CreatedAt = DateTime.UtcNow.AddMinutes(-Random.Shared.Next(1, 4320))
            });
        }

        await _db.SaveChangesAsync();
        return Ok(new { success = true, count = types.Length });
    }
}
