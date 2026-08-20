using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using FlightAggregatorApi.Data;
using FlightAggregatorApi.Models;

namespace FlightAggregatorApi.Services;

public class RouteOptimizerService
{
    private readonly ApplicationDbContext _db;
    private readonly IMemoryCache _cache;
    private readonly ILogger<RouteOptimizerService> _logger;

    private static readonly string[] Hubs = ["HAN", "SGN", "DAD", "CXR", "PQC", "HCM"];
    private const int ModeCount = 3; // flight, train, bus
    private static readonly TimeSpan MinTransfer = TimeSpan.FromHours(1);
    private static readonly TimeSpan MaxTransfer = TimeSpan.FromHours(6);
    private static readonly TimeSpan IdealTransferMin = TimeSpan.FromHours(2);
    private static readonly TimeSpan IdealTransferMax = TimeSpan.FromHours(3);
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

    public RouteOptimizerService(ApplicationDbContext db, IMemoryCache cache, ILogger<RouteOptimizerService> logger)
    {
        _db = db;
        _cache = cache;
        _logger = logger;
    }

    public async Task<List<OptimizedRoute>> FindOptimalRoute(
        string origin, string destination, DateOnly startDate, DateOnly endDate, string preference)
    {
        var cacheKey = $"route:{origin}:{destination}:{startDate}:{endDate}:{preference}";
        if (_cache.TryGetValue(cacheKey, out List<OptimizedRoute>? cached))
        {
            _logger.LogInformation("Route cache hit for {Origin}->{Destination} {Start}-{End}", origin, destination, startDate, endDate);
            return cached!;
        }

        var flights = await _db.Flights.AsNoTracking()
            .Where(f => f.FlightDate >= startDate && f.FlightDate <= endDate
                && ((f.DepartureLocation == origin && f.ArrivalLocation == destination)
                 || (f.DepartureLocation == origin && Hubs.Contains(f.ArrivalLocation))
                 || (Hubs.Contains(f.DepartureLocation) && f.ArrivalLocation == destination)
                 || (Hubs.Contains(f.DepartureLocation) && Hubs.Contains(f.ArrivalLocation))))
            .ToListAsync();

        var trains = await _db.Trains.AsNoTracking()
            .Where(t => t.TrainDate >= startDate && t.TrainDate <= endDate
                && ((t.DepartureLocation == origin && t.ArrivalLocation == destination)
                 || (t.DepartureLocation == origin && Hubs.Contains(t.ArrivalLocation))
                 || (Hubs.Contains(t.DepartureLocation) && t.ArrivalLocation == destination)
                 || (Hubs.Contains(t.DepartureLocation) && Hubs.Contains(t.ArrivalLocation))))
            .ToListAsync();

        var buses = await _db.Buses.AsNoTracking()
            .Where(b => b.BusDate >= startDate && b.BusDate <= endDate
                && ((b.DepartureLocation == origin && b.ArrivalLocation == destination)
                 || (b.DepartureLocation == origin && Hubs.Contains(b.ArrivalLocation))
                 || (Hubs.Contains(b.DepartureLocation) && b.ArrivalLocation == destination)
                 || (Hubs.Contains(b.DepartureLocation) && Hubs.Contains(b.ArrivalLocation))))
            .ToListAsync();

        _logger.LogInformation("Loaded {Flights} flights, {Trains} trains, {Buses} buses for route optimization",
            flights.Count, trains.Count, buses.Count);

        var flightSegs = flights.Select(FromFlight).ToList();
        var trainSegs = trains.Select(FromTrain).ToList();
        var busSegs = buses.Select(FromBus).ToList();

        var routes = new List<OptimizedRoute>();

        // Direct routes (1 leg) — all 3 modes
        AddDirect(routes, flightSegs, origin, destination);
        AddDirect(routes, trainSegs, origin, destination);
        AddDirect(routes, busSegs, origin, destination);

        // 2-leg routes through one hub — all mode combos (flight/train/bus)²
        foreach (var hub in Hubs)
        {
            if (hub == origin || hub == destination) continue;

            var outLegs = new[]
            {
                flightSegs.Where(s => s.DepartureLocation == origin && s.ArrivalLocation == hub).ToList(),
                trainSegs.Where(s => s.DepartureLocation == origin && s.ArrivalLocation == hub).ToList(),
                busSegs.Where(s => s.DepartureLocation == origin && s.ArrivalLocation == hub).ToList(),
            };
            var inLegs = new[]
            {
                flightSegs.Where(s => s.DepartureLocation == hub && s.ArrivalLocation == destination).ToList(),
                trainSegs.Where(s => s.DepartureLocation == hub && s.ArrivalLocation == destination).ToList(),
                busSegs.Where(s => s.DepartureLocation == hub && s.ArrivalLocation == destination).ToList(),
            };

            for (var i = 0; i < ModeCount; i++)
                for (var j = 0; j < ModeCount; j++)
                    Combine2(routes, outLegs[i], inLegs[j], $"Qua {hub}");
        }

        // 3-leg routes through two hubs — all mode combos (flight/train/bus)³
        foreach (var mid in Hubs)
        {
            if (mid == origin || mid == destination) continue;
            foreach (var hub2 in Hubs)
            {
                if (hub2 == origin || hub2 == destination || hub2 == mid) continue;

                var legs1 = new[]
                {
                    flightSegs.Where(s => s.DepartureLocation == origin && s.ArrivalLocation == mid).ToList(),
                    trainSegs.Where(s => s.DepartureLocation == origin && s.ArrivalLocation == mid).ToList(),
                    busSegs.Where(s => s.DepartureLocation == origin && s.ArrivalLocation == mid).ToList(),
                };
                var legs2 = new[]
                {
                    flightSegs.Where(s => s.DepartureLocation == mid && s.ArrivalLocation == hub2).ToList(),
                    trainSegs.Where(s => s.DepartureLocation == mid && s.ArrivalLocation == hub2).ToList(),
                    busSegs.Where(s => s.DepartureLocation == mid && s.ArrivalLocation == hub2).ToList(),
                };
                var legs3 = new[]
                {
                    flightSegs.Where(s => s.DepartureLocation == hub2 && s.ArrivalLocation == destination).ToList(),
                    trainSegs.Where(s => s.DepartureLocation == hub2 && s.ArrivalLocation == destination).ToList(),
                    busSegs.Where(s => s.DepartureLocation == hub2 && s.ArrivalLocation == destination).ToList(),
                };

                for (var i = 0; i < ModeCount; i++)
                    for (var j = 0; j < ModeCount; j++)
                        for (var k = 0; k < ModeCount; k++)
                            Combine3(routes, legs1[i], legs2[j], legs3[k], $"Qua {mid}, {hub2}");
            }
        }

        routes = routes.DistinctBy(r => string.Join("|", r.Segments.Select(s => $"{s.Type}:{s.Code}:{s.DepartureTime}"))).ToList();

        routes = preference switch
        {
            "cheapest" => [.. routes.OrderBy(r => r.TotalPrice)],
            "fastest" => [.. routes.OrderBy(r => r.TotalDuration)],
            "fewest_stops" => [.. routes.OrderBy(r => r.Segments.Count).ThenBy(r => r.TotalPrice)],
            "earliest_arrival" => [.. routes.OrderBy(r => r.Segments.Last().ArrivalTime)],
            _ => RankBalanced(routes),
        };

        var result = routes.Take(10).ToList();
        _cache.Set(cacheKey, result, CacheTtl);
        return result;
    }

    public async Task<List<RoundTripCombo>> FindRoundTripRoute(
        string origin, string destination, DateOnly startDate, DateOnly returnDate, string preference)
    {
        var cacheKey = $"roundtrip:{origin}:{destination}:{startDate}:{returnDate}:{preference}";
        if (_cache.TryGetValue(cacheKey, out List<RoundTripCombo>? cached))
        {
            _logger.LogInformation("Round-trip cache hit for {Origin}->{Destination} {Start}/{Return}", origin, destination, startDate, returnDate);
            return cached!;
        }

        var outbound = await FindOptimalRoute(origin, destination, startDate, startDate, preference);
        var returnLeg = await FindOptimalRoute(destination, origin, returnDate, returnDate, preference);

        // Ghép mọi cặp chiều đi x chiều về, giữ 1 combo rẻ nhất cho mỗi tổ hợp
        // phương tiện (đi bằng gì | về bằng gì) để gợi ý đa dạng.
        var combos = outbound
            .SelectMany(o => returnLeg.Select(r => new RoundTripCombo
            {
                Outbound = o,
                Return = r,
                TotalPrice = o.TotalPrice + r.TotalPrice,
                TotalDuration = o.TotalDuration + r.TotalDuration,
            }))
            .GroupBy(c => $"{ModeKey(c.Outbound)}|{ModeKey(c.Return)}")
            .Select(g => g.OrderBy(c => c.TotalPrice).First())
            .OrderBy(c => c.TotalPrice)
            .Take(10)
            .ToList();

        combos = SortRoundTrip(combos, preference).ToList();

        _cache.Set(cacheKey, combos, CacheTtl);
        return combos;
    }

    /// <summary>
    /// Áp dụng ưu tiên vào thứ tự combo khứ hồi (trước đây luôn sort theo giá nên
    /// đổi ưu tiên không thay đổi kết quả hiển thị).
    /// </summary>
    private static IEnumerable<RoundTripCombo> SortRoundTrip(List<RoundTripCombo> combos, string preference)
    {
        return preference switch
        {
            "cheapest" => combos.OrderBy(c => c.TotalPrice),
            "fastest" => combos.OrderBy(c => c.TotalDuration),
            "fewest_stops" => combos
                .OrderBy(c => c.Outbound.Segments.Count + c.Return.Segments.Count)
                .ThenBy(c => c.TotalPrice),
            "earliest_arrival" => combos.OrderBy(c => c.Return.Segments.Last().ArrivalTime),
            _ => RankBalancedCombos(combos),
        };
    }

    private static List<RoundTripCombo> RankBalancedCombos(List<RoundTripCombo> combos)
    {
        if (combos.Count == 0) return combos;

        var minPrice = combos.Min(c => c.TotalPrice);
        var minDuration = combos.Min(c => c.TotalDuration.TotalMinutes);
        if (minPrice <= 0) minPrice = 1m;
        if (minDuration <= 0) minDuration = 1;

        return [.. combos
            .Select(c => new
            {
                Combo = c,
                Score = (double)(c.TotalPrice / minPrice) + (c.TotalDuration.TotalMinutes / minDuration)
            })
            .OrderBy(x => x.Score)
            .Select(x => x.Combo)];
    }

    private static string ModeKey(OptimizedRoute route) =>
        string.Join("+", route.Segments.Select(s => s.Type));

    /// <summary>
    /// Xếp hạng "cân bằng": chuẩn hóa giá và thời lượng về cùng thang đo (tỉ lệ với
    /// mức tốt nhất của từng tiêu chí) rồi cộng lại. Tránh trộn VND (hàng triệu) với
    /// phút (hàng trăm) khiến giá luôn lấn át như công thức cũ.
    /// </summary>
    private static List<OptimizedRoute> RankBalanced(IEnumerable<OptimizedRoute> routes)
    {
        var list = routes.ToList();
        if (list.Count == 0) return list;

        var minPrice = list.Min(r => r.TotalPrice);
        var minDuration = list.Min(r => r.TotalDuration.TotalMinutes);
        if (minPrice <= 0) minPrice = 1m;
        if (minDuration <= 0) minDuration = 1;

        return [.. list
            .Select(r => new
            {
                Route = r,
                Score = (double)(r.TotalPrice / minPrice) + (r.TotalDuration.TotalMinutes / minDuration)
            })
            .OrderBy(x => x.Score)
            .Select(x => x.Route)];
    }

    private static void AddDirect(List<OptimizedRoute> routes, IEnumerable<RouteSegment> segments, string origin, string destination)
    {
        foreach (var s in segments.Where(s => s.DepartureLocation == origin && s.ArrivalLocation == destination))
        {
            routes.Add(new OptimizedRoute
            {
                Label = "direct",
                TotalPrice = s.Price,
                TotalDuration = s.ArrivalTime - s.DepartureTime,
                Segments = [s]
            });
        }
    }

    private static void Combine2(List<OptimizedRoute> routes,
        IEnumerable<RouteSegment> firstLegs, IEnumerable<RouteSegment> secondLegs, string label)
    {
        foreach (var l1 in firstLegs)
        {
            foreach (var l2 in secondLegs)
            {
                if (!IsValidTransfer(l1.ArrivalTime, l2.DepartureTime, out var wait)) continue;
                routes.Add(new OptimizedRoute
                {
                    Label = label,
                    TotalPrice = l1.Price + l2.Price,
                    TotalDuration = l2.ArrivalTime - l1.DepartureTime,
                    TransferWait = wait,
                    TransferScore = TransferScore(wait),
                    Segments = [l1, l2]
                });
            }
        }
    }

    private static void Combine3(List<OptimizedRoute> routes,
        IEnumerable<RouteSegment> leg1, IEnumerable<RouteSegment> leg2, IEnumerable<RouteSegment> leg3, string label)
    {
        foreach (var l1 in leg1)
            foreach (var l2 in leg2)
                if (IsValidTransfer(l1.ArrivalTime, l2.DepartureTime, out var w1))
                    foreach (var l3 in leg3)
                        if (IsValidTransfer(l2.ArrivalTime, l3.DepartureTime, out var w2))
                            routes.Add(new OptimizedRoute
                            {
                                Label = label,
                                TotalPrice = l1.Price + l2.Price + l3.Price,
                                TotalDuration = l3.ArrivalTime - l1.DepartureTime,
                                TransferWait = w1 + w2,
                                TransferScore = TransferScore(w1) + TransferScore(w2),
                                Segments = [l1, l2, l3]
                            });
    }

    private static bool IsValidTransfer(DateTime arrival, DateTime departure, out TimeSpan waitTime)
    {
        waitTime = departure - arrival;
        return waitTime >= MinTransfer && waitTime <= MaxTransfer;
    }

    private static int TransferScore(TimeSpan wait)
    {
        if (wait >= IdealTransferMin && wait <= IdealTransferMax) return 0;
        if (wait >= MinTransfer && wait <= MaxTransfer) return 1;
        return 2;
    }

    private static RouteSegment FromFlight(Flight f) => new()
    {
        Type = "flight", Code = f.AirlineCode, Name = f.AirlineName,
        DepartureLocation = f.DepartureLocation, ArrivalLocation = f.ArrivalLocation,
        DepartureTime = f.DepartureTime, ArrivalTime = f.ArrivalTime, Price = f.Price, Id = f.Id
    };

    private static RouteSegment FromTrain(Train t) => new()
    {
        Type = "train", Code = t.TrainCode, Name = t.TrainName,
        DepartureLocation = t.DepartureLocation, ArrivalLocation = t.ArrivalLocation,
        DepartureTime = t.DepartureTime, ArrivalTime = t.ArrivalTime, Price = t.Price, Id = t.Id
    };

    private static RouteSegment FromBus(Bus b) => new()
    {
        Type = "bus", Code = b.BusCode, Name = b.BusCompany,
        DepartureLocation = b.DepartureLocation, ArrivalLocation = b.ArrivalLocation,
        DepartureTime = b.DepartureTime, ArrivalTime = b.ArrivalTime, Price = b.Price, Id = b.Id
    };
}

public class OptimizedRoute
{
    public string Label { get; set; } = "direct";
    public decimal TotalPrice { get; set; }
    public TimeSpan TotalDuration { get; set; }
    public double TotalDurationMinutes => TotalDuration.TotalMinutes;
    public TimeSpan TransferWait { get; set; }
    public int TransferScore { get; set; }
    public List<RouteSegment> Segments { get; set; } = new();
}

public class RouteSegment
{
    public string Type { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string DepartureLocation { get; set; } = string.Empty;
    public string ArrivalLocation { get; set; } = string.Empty;
    public DateTime DepartureTime { get; set; }
    public DateTime ArrivalTime { get; set; }
    public decimal Price { get; set; }
    public long Id { get; set; }
}

public class RoundTripCombo
{
    public OptimizedRoute Outbound { get; set; } = new();
    public OptimizedRoute Return { get; set; } = new();
    public decimal TotalPrice { get; set; }
    public TimeSpan TotalDuration { get; set; }
    public double TotalDurationMinutes => TotalDuration.TotalMinutes;
    public string OutboundModes => string.Join("+", Outbound.Segments.Select(s => s.Type));
    public string ReturnModes => string.Join("+", Return.Segments.Select(s => s.Type));
}
