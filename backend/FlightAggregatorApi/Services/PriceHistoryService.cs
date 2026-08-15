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

    /// <summary>
    /// Lấy xu hướng giá theo từng ngày cho một loại phương tiện.
    /// </summary>
    /// <param name="mode">"flight" | "train" | "bus" | "all" (mặc định flight khi rỗng)</param>
    public async Task<List<PriceTrendDto>> GetTrendData(string from, string to, int days, string mode = "flight")
    {
        var since = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-days));
        mode = (mode ?? "all").Trim().ToLowerInvariant();
        var valid = mode is "flight" or "train" or "bus" or "all";
        if (!valid) mode = "all";

        IQueryable<Models.PriceHistory> query = _db.PriceHistories
            .AsNoTracking()
            .Where(p => p.RouteFrom == from && p.RouteTo == to && p.RecordedDate >= since);

        if (mode != "all")
            query = query.Where(p => p.Mode == mode);

        var data = await query
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

    /// <summary>
    /// Ghi 1 mốc giá vào lịch sử cho một phương tiện (flight/train/bus).
    /// </summary>
    public async Task RecordPrice(string mode, long? flightId, long? trainId, long? busId, string from, string to, decimal price)
    {
        _db.PriceHistories.Add(new Models.PriceHistory
        {
            Mode = mode is "train" ? "train" : mode is "bus" ? "bus" : "flight",
            FlightId = flightId,
            TrainId = trainId,
            BusId = busId,
            RouteFrom = from,
            RouteTo = to,
            Price = price,
            RecordedDate = DateOnly.FromDateTime(DateTime.UtcNow)
        });
        await _db.SaveChangesAsync();
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
