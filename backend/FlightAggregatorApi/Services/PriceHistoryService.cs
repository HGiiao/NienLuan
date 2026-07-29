using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;

namespace FlightAggregatorApi.Services;

public class PriceHistoryService
{
    private readonly ApplicationDbContext _db;

    public PriceHistoryService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<List<PriceTrendDto>> GetTrendData(string from, string to, int days)
    {
        var since = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-days));

        var data = await _db.PriceHistories
            .AsNoTracking()
            .Where(p => p.RouteFrom == from && p.RouteTo == to && p.RecordedDate >= since)
            .GroupBy(p => p.RecordedDate)
            .Select(g => new PriceTrendDto
            {
                Date = g.Key,
                MinPrice = g.Min(p => p.Price),
                MaxPrice = g.Max(p => p.Price),
                AvgPrice = g.Average(p => p.Price)
            })
            .OrderBy(d => d.Date)
            .ToListAsync();

        return data;
    }

    public async Task RecordPrice(long? flightId, long? trainId, string from, string to, decimal price)
    {
        _db.PriceHistories.Add(new Models.PriceHistory
        {
            FlightId = flightId,
            TrainId = trainId,
            RouteFrom = from,
            RouteTo = to,
            Price = price,
            RecordedDate = DateOnly.FromDateTime(DateTime.UtcNow)
        });
        await _db.SaveChangesAsync();
    }
}

public class PriceTrendDto
{
    public DateOnly Date { get; set; }
    public decimal MinPrice { get; set; }
    public decimal MaxPrice { get; set; }
    public decimal AvgPrice { get; set; }
}
