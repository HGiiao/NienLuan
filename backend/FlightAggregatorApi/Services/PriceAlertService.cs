using FlightAggregatorApi.Data;
using FlightAggregatorApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FlightAggregatorApi.Services;

public record PriceAlertCheckResult(int Count, List<object> Triggered);

/// <summary>
/// Logic dùng chung cho cảnh báo giá: so giá thấp nhất hiện tại của tuyến
/// (máy bay / xe khách / tàu hỏa) với mục tiêu user đặt. Khi giá đạt hoặc
/// thấp hơn mục tiêu → gửi email + thông báo trong app, đánh dấu NotifiedAt.
///
/// Được gọi từ:
///  - PriceAlertController (user bấm "Kiểm tra giá")
///  - PriceStreamService (tự động mỗi 30s khi giá biến động — user nhận thông báo
///    ngay khi giá chạm mức mong muốn mà không cần thao tác)
/// </summary>
public class PriceAlertService
{
    private readonly EmailService _email;
    private readonly ILogger<PriceAlertService> _logger;

    public PriceAlertService(EmailService email, ILogger<PriceAlertService> logger)
    {
        _email = email;
        _logger = logger;
    }

    public async Task<PriceAlertCheckResult> CheckAlertsAsync(ApplicationDbContext db, string? email = null)
    {
        var query = db.PriceAlerts.Where(a => a.IsActive && a.NotifiedAt == null);
        if (!string.IsNullOrWhiteSpace(email))
            query = query.Where(a => a.Email == email);

        var alerts = await query.ToListAsync();
        var triggered = new List<object>();

        foreach (var alert in alerts)
        {
            // Theo dõi theo chuyến cụ thể → so với giá hiện tại của chính chuyến đó;
            // ngược lại (alert cũ theo tuyến) → so với giá thấp nhất của tuyến
            var lowest = alert.ItemId.HasValue && !string.IsNullOrWhiteSpace(alert.Mode)
                ? await GetItemPriceAsync(db, alert.Mode, alert.ItemId.Value)
                : await GetLowestPriceAsync(db, alert.RouteFrom, alert.RouteTo);

            alert.CurrentPrice = lowest;

            if (lowest.HasValue && lowest.Value <= alert.TargetPrice)
            {
                alert.NotifiedAt = DateTime.UtcNow;
                triggered.Add(new
                {
                    alert.Id,
                    alert.RouteFrom,
                    alert.RouteTo,
                    alert.TargetPrice,
                    CurrentPrice = lowest.Value,
                    alert.Email,
                });

                db.Notifications.Add(new Notification
                {
                    Email = alert.Email,
                    Type = "price_drop",
                    Title = $"Giá vé {alert.RouteFrom} → {alert.RouteTo} đã đạt mục tiêu!",
                    Message = $"Giá hiện tại {lowest.Value:N0}đ đạt hoặc thấp hơn mục tiêu {alert.TargetPrice:N0}đ.",
                    Link = $"/flights?from={alert.RouteFrom}&to={alert.RouteTo}",
                    CreatedAt = DateTime.UtcNow,
                });

                try
                {
                    await _email.SendPriceAlertAsync(alert.Email, alert.RouteFrom, alert.RouteTo, alert.TargetPrice, lowest.Value);
                    _logger.LogInformation("Đã gửi email cảnh báo giá đến {Email} cho tuyến {From}→{To}", alert.Email, alert.RouteFrom, alert.RouteTo);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Gửi email cảnh báo giá thất bại đến {Email}", alert.Email);
                }
            }
        }

        await db.SaveChangesAsync();
        return new PriceAlertCheckResult(alerts.Count, triggered);
    }

    private static async Task<decimal?> GetItemPriceAsync(ApplicationDbContext db, string mode, long itemId)
    {
        return mode.ToLower() switch
        {
            "flight" => (await db.Flights.FindAsync(itemId))?.Price,
            "train" => (await db.Trains.FindAsync(itemId))?.Price,
            "bus" => (await db.Buses.FindAsync(itemId))?.Price,
            _ => null,
        };
    }

    /// <summary>Giá thấp nhất hiện tại của tuyến — tính trên cả máy bay, xe khách và tàu hỏa.</summary>
    public static async Task<decimal?> GetLowestPriceAsync(ApplicationDbContext db, string from, string to)
    {
        var minFlight = await db.Flights
            .Where(f => f.DepartureLocation == from && f.ArrivalLocation == to)
            .OrderBy(f => f.Price)
            .Select(f => (decimal?)f.Price)
            .FirstOrDefaultAsync();

        var minTrain = await db.Trains
            .Where(t => t.DepartureLocation == from && t.ArrivalLocation == to)
            .OrderBy(t => t.Price)
            .Select(t => (decimal?)t.Price)
            .FirstOrDefaultAsync();

        var minBus = await db.Buses
            .Where(b => b.DepartureLocation == from && b.ArrivalLocation == to)
            .OrderBy(b => b.Price)
            .Select(b => (decimal?)b.Price)
            .FirstOrDefaultAsync();

        var prices = new[] { minFlight, minTrain, minBus }.Where(p => p.HasValue).Select(p => p!.Value).ToArray();
        return prices.Length > 0 ? prices.Min() : null;
    }
}
