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
        var activeRoutes = await db.Flights
            .GroupBy(f => new { f.DepartureLocation, f.ArrivalLocation })
            .Select(g => new { g.Key.DepartureLocation, g.Key.ArrivalLocation })
            .ToListAsync();

        foreach (var (from, to) in PopularRoutes)
        {
            var flights = await db.Flights
                .Where(f => f.DepartureLocation == from && f.ArrivalLocation == to)
                .ToListAsync();

            if (flights.Count == 0) continue;

            foreach (var flight in flights)
            {
                var change = (decimal)(_rng.NextDouble() * 0.10 - 0.05);
                var newPrice = Math.Round(flight.Price * (1 + change), 0);
                newPrice = Math.Max(newPrice, 200000);
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
    }
}
