using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;
using FlightAggregatorApi.Hubs;
using FlightAggregatorApi.Models;

namespace FlightAggregatorApi.Services;

public class PriceStreamService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly IHubContext<PriceHub> _hub;
    private readonly ILogger<PriceStreamService> _logger;
    private static readonly Random _rng = new();
    private static readonly ConcurrentDictionary<long, decimal> _basePrices = new();

    // Thời gian ân hạn: chuyến bay admin vừa tạo/cập nhật giá được giữ nguyên giá
    // (không tham gia dao động) trong khoảng này để giá hiển thị đúng như admin đặt.
    private static readonly TimeSpan AdminGracePeriod = TimeSpan.FromMinutes(5);
    private static readonly ConcurrentDictionary<long, DateTime> _adminSetAt = new();

    private static readonly (string From, string To)[] PopularRoutes =
    [
        ("HAN", "SGN"), ("HAN", "DAD"), ("SGN", "DAD"),
        ("SGN", "CXR"), ("HAN", "PQC"), ("DAD", "SGN"),
        ("HAN", "CXR"), ("SGN", "HAN"),
    ];

    public PriceStreamService(IServiceProvider services, IHubContext<PriceHub> hub, ILogger<PriceStreamService> logger)
    {
        _services = services;
        _hub = hub;
        _logger = logger;
    }

    /// <summary>
    /// Đồng bộ base price khi admin tạo/cập nhật giá chuyến bay. Nếu không gọi,
    /// vòng dao động 30s sẽ ghi đè giá mới bằng base price cũ trong bộ nhớ
    /// → giá admin vừa đặt bị "quay ngược" phía user.
    /// Giá vừa đặt cũng được miễn dao động trong AdminGracePeriod (5 phút).
    /// Truyền null price để xoá khoá (dùng khi xoá chuyến bay).
    /// </summary>
    public static void UpdateBasePrice(long flightId, decimal? price)
    {
        if (price.HasValue)
        {
            _basePrices[flightId] = price.Value;
            _adminSetAt[flightId] = DateTime.UtcNow;
        }
        else
        {
            _basePrices.TryRemove(flightId, out _);
            _adminSetAt.TryRemove(flightId, out _);
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
                await FluctuatePrices();
            }
            catch (OperationCanceledException) { break; }
            catch (Exception ex)
            {
                _logger.LogError(ex, "PriceStreamService error");
            }
        }
    }

    private async Task FluctuatePrices()
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var month = today.Month;

        var configs = await db.PriceConfigs
            .Where(pc => pc.IsActive && pc.Month == month)
            .ToDictionaryAsync(pc => (pc.RouteFrom, pc.RouteTo));

        foreach (var (from, to) in PopularRoutes)
        {
            var flights = await db.Flights
                .Where(f => f.DepartureLocation == from && f.ArrivalLocation == to)
                .ToListAsync();

            if (flights.Count == 0) continue;

            configs.TryGetValue((from, to), out var config);
            var multiplier = config?.Multiplier ?? 1.0m;
            var volPct = config?.BaseVolatilityPct ?? 5;

            foreach (var flight in flights)
            {
                // Chuyến admin vừa đặt giá → giữ nguyên trong thời gian ân hạn,
                // hết hạn thì gỡ khoá và quay lại dao động bình thường
                if (_adminSetAt.TryGetValue(flight.Id, out var adminSetAt))
                {
                    if (DateTime.UtcNow - adminSetAt < AdminGracePeriod) continue;
                    _adminSetAt.TryRemove(flight.Id, out _);
                }

                if (!_basePrices.ContainsKey(flight.Id))
                {
                    _basePrices[flight.Id] = flight.Price;
                }

                var targetPrice = _basePrices[flight.Id] * multiplier;
                var change = (decimal)(_rng.NextDouble() * volPct * 2 / 100.0 - volPct / 100.0);
                var newPrice = Math.Round(targetPrice * (1 + change), 0);
                newPrice = Math.Max(newPrice, 200000);
                newPrice = Math.Min(newPrice, 8_000_000m);
                flight.Price = newPrice;
            }

            var minPrice = flights.Min(f => f.Price);
            var maxPrice = flights.Max(f => f.Price);
            var avgPrice = Math.Round(flights.Average(f => f.Price), 0);

            await db.SaveChangesAsync();

            foreach (var flight in flights)
            {
                var exists = await db.PriceHistories.AnyAsync(h =>
                    h.FlightId == flight.Id && h.RouteFrom == from && h.RouteTo == to && h.RecordedDate == today);
                if (!exists)
                {
                    db.PriceHistories.Add(new Models.PriceHistory
                    {
                        FlightId = flight.Id,
                        RouteFrom = from,
                        RouteTo = to,
                        Price = flight.Price,
                        RecordedDate = today,
                        CreatedAt = DateTime.UtcNow,
                    });
                }
            }
            await db.SaveChangesAsync();

            var watchAlerts = await db.PriceAlerts
                .Where(a => a.RouteFrom == from && a.RouteTo == to && a.IsActive)
                .ToListAsync();
            foreach (var alert in watchAlerts)
            {
                if (alert.CurrentPrice.HasValue && minPrice < alert.CurrentPrice.Value * 0.9m)
                {
                    db.Notifications.Add(new Notification
                    {
                        Email = alert.Email,
                        Type = "price_drop",
                        Title = $"Giá vé {from} → {to} giảm mạnh!",
                        Message = $"Giá hiện tại {minPrice:N0}đ, giảm {((alert.CurrentPrice.Value - minPrice) / alert.CurrentPrice.Value * 100):F0}%.",
                        Link = $"/flights?from={from}&to={to}",
                        CreatedAt = DateTime.UtcNow,
                    });
                }
            }
            await db.SaveChangesAsync();

            await _hub.Clients.Group($"route_{from}_{to}").SendAsync("ReceivePriceUpdate", new
            {
                routeFrom = from,
                routeTo = to,
                minPrice,
                maxPrice,
                avgPrice,
                timestamp = DateTime.UtcNow,
            });
        }

        // Tự động kiểm tra cảnh báo giá mỗi chu kỳ: khi giá đạt/thấp hơn mục tiêu
        // → gửi email + thông báo ngay, không cần user bấm "Kiểm tra giá".
        // Quyền này chỉ dành cho gói có EarlyPriceAlerts (VIP/Premium) — user Free
        // phải bấm "Kiểm tra giá" thủ công.
        var alertService = scope.ServiceProvider.GetRequiredService<PriceAlertService>();
        await alertService.CheckAlertsAsync(db, earlyOnly: true);
    }
}
