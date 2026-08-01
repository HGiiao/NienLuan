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

        _logger.LogInformation("Loaded {Flights} flights, {Trains} trains for route optimization", flights.Count, trains.Count);

        var routes = new List<OptimizedRoute>();

        foreach (var f in flights.Where(f => f.DepartureLocation == origin && f.ArrivalLocation == destination))
            routes.Add(FromFlight(f, "direct"));

        foreach (var t in trains.Where(t => t.DepartureLocation == origin && t.ArrivalLocation == destination))
            routes.Add(FromTrain(t, "direct"));

        foreach (var hub in Hubs)
        {
            if (hub == origin || hub == destination) continue;

            Combine(routes,
                flights.Where(f => f.DepartureLocation == origin && f.ArrivalLocation == hub),
                trains.Where(t => t.DepartureLocation == hub && t.ArrivalLocation == destination),
                "flight", "train", $"Qua {hub}");

            Combine(routes,
                trains.Where(t => t.DepartureLocation == origin && t.ArrivalLocation == hub),
                flights.Where(f => f.DepartureLocation == hub && f.ArrivalLocation == destination),
                "train", "flight", $"Qua {hub}");

            Combine(routes,
                flights.Where(f => f.DepartureLocation == origin && f.ArrivalLocation == hub),
                flights.Where(f => f.DepartureLocation == hub && f.ArrivalLocation == destination),
                "flight", "flight", $"Qua {hub}");

            Combine(routes,
                trains.Where(t => t.DepartureLocation == origin && t.ArrivalLocation == hub),
                trains.Where(t => t.DepartureLocation == hub && t.ArrivalLocation == destination),
                "train", "train", $"Qua {hub}");
        }

        foreach (var mid in Hubs)
        {
            if (mid == origin || mid == destination) continue;
            foreach (var hub2 in Hubs)
            {
                if (hub2 == origin || hub2 == destination || hub2 == mid) continue;

                Combine3(routes,
                    flights.Where(f => f.DepartureLocation == origin && f.ArrivalLocation == mid),
                    trains.Where(t => t.DepartureLocation == mid && t.ArrivalLocation == hub2),
                    flights.Where(f => f.DepartureLocation == hub2 && f.ArrivalLocation == destination),
                    "flight", "train", "flight", $"Qua {mid}, {hub2}");

                Combine3(routes,
                    trains.Where(t => t.DepartureLocation == origin && t.ArrivalLocation == mid),
                    flights.Where(f => f.DepartureLocation == mid && f.ArrivalLocation == hub2),
                    trains.Where(t => t.DepartureLocation == hub2 && t.ArrivalLocation == destination),
                    "train", "flight", "train", $"Qua {mid}, {hub2}");
            }
        }

        routes = routes.DistinctBy(r => string.Join("|", r.Segments.Select(s => $"{s.Type}:{s.Code}:{s.DepartureTime}"))).ToList();

        routes = preference switch
        {
            "cheapest" => [.. routes.OrderBy(r => r.TotalPrice)],
            "fastest" => [.. routes.OrderBy(r => r.TotalDuration)],
            "fewest_stops" => [.. routes.OrderBy(r => r.Segments.Count).ThenBy(r => r.TotalPrice)],
            "earliest_arrival" => [.. routes.OrderBy(r => r.Segments.Last().ArrivalTime)],
            _ => [.. routes.OrderBy(r => r.TotalPrice * 0.5m + (decimal)r.TotalDuration.TotalMinutes * 0.5m)]
        };

        var result = routes.Take(10).ToList();
        _cache.Set(cacheKey, result, CacheTtl);
        return result;
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

    private void Combine(List<OptimizedRoute> routes,
        IEnumerable<Flight> firstFlights, IEnumerable<Train> secondTrains,
        string type1, string type2, string label)
    {
        foreach (var f in firstFlights)
        {
            foreach (var t in secondTrains)
            {
                if (!IsValidTransfer(f.ArrivalTime, t.DepartureTime, out var wait)) continue;
                routes.Add(new OptimizedRoute
                {
                    Label = label,
                    TotalPrice = f.Price + t.Price,
                    TotalDuration = t.ArrivalTime - f.DepartureTime,
                    TransferWait = wait,
                    TransferScore = TransferScore(wait),
                    Segments =
                    [
                        new RouteSegment
                        {
                            Type = type1, Code = f.AirlineCode, Name = f.AirlineName,
                            DepartureLocation = f.DepartureLocation, ArrivalLocation = f.ArrivalLocation,
                            DepartureTime = f.DepartureTime, ArrivalTime = f.ArrivalTime, Price = f.Price, Id = f.Id
                        },
                        new RouteSegment
                        {
                            Type = type2, Code = t.TrainCode, Name = t.TrainName,
                            DepartureLocation = t.DepartureLocation, ArrivalLocation = t.ArrivalLocation,
                            DepartureTime = t.DepartureTime, ArrivalTime = t.ArrivalTime, Price = t.Price, Id = t.Id
                        }
                    ]
                });
            }
        }
    }

    private void Combine(List<OptimizedRoute> routes,
        IEnumerable<Train> firstTrains, IEnumerable<Flight> secondFlights,
        string type1, string type2, string label)
    {
        foreach (var t in firstTrains)
        {
            foreach (var f in secondFlights)
            {
                if (!IsValidTransfer(t.ArrivalTime, f.DepartureTime, out var wait)) continue;
                routes.Add(new OptimizedRoute
                {
                    Label = label,
                    TotalPrice = t.Price + f.Price,
                    TotalDuration = f.ArrivalTime - t.DepartureTime,
                    TransferWait = wait,
                    TransferScore = TransferScore(wait),
                    Segments =
                    [
                        new RouteSegment
                        {
                            Type = type1, Code = t.TrainCode, Name = t.TrainName,
                            DepartureLocation = t.DepartureLocation, ArrivalLocation = t.ArrivalLocation,
                            DepartureTime = t.DepartureTime, ArrivalTime = t.ArrivalTime, Price = t.Price, Id = t.Id
                        },
                        new RouteSegment
                        {
                            Type = type2, Code = f.AirlineCode, Name = f.AirlineName,
                            DepartureLocation = f.DepartureLocation, ArrivalLocation = f.ArrivalLocation,
                            DepartureTime = f.DepartureTime, ArrivalTime = f.ArrivalTime, Price = f.Price, Id = f.Id
                        }
                    ]
                });
            }
        }
    }

    private void Combine(List<OptimizedRoute> routes,
        IEnumerable<Flight> firstF, IEnumerable<Flight> secondF,
        string type1, string type2, string label)
    {
        foreach (var f1 in firstF)
        {
            foreach (var f2 in secondF)
            {
                if (!IsValidTransfer(f1.ArrivalTime, f2.DepartureTime, out var wait)) continue;
                routes.Add(new OptimizedRoute
                {
                    Label = label,
                    TotalPrice = f1.Price + f2.Price,
                    TotalDuration = f2.ArrivalTime - f1.DepartureTime,
                    TransferWait = wait,
                    TransferScore = TransferScore(wait),
                    Segments =
                    [
                        new RouteSegment
                        {
                            Type = type1, Code = f1.AirlineCode, Name = f1.AirlineName,
                            DepartureLocation = f1.DepartureLocation, ArrivalLocation = f1.ArrivalLocation,
                            DepartureTime = f1.DepartureTime, ArrivalTime = f1.ArrivalTime, Price = f1.Price, Id = f1.Id
                        },
                        new RouteSegment
                        {
                            Type = type2, Code = f2.AirlineCode, Name = f2.AirlineName,
                            DepartureLocation = f2.DepartureLocation, ArrivalLocation = f2.ArrivalLocation,
                            DepartureTime = f2.DepartureTime, ArrivalTime = f2.ArrivalTime, Price = f2.Price, Id = f2.Id
                        }
                    ]
                });
            }
        }
    }

    private void Combine(List<OptimizedRoute> routes,
        IEnumerable<Train> firstT, IEnumerable<Train> secondT,
        string type1, string type2, string label)
    {
        foreach (var t1 in firstT)
        {
            foreach (var t2 in secondT)
            {
                if (!IsValidTransfer(t1.ArrivalTime, t2.DepartureTime, out var wait)) continue;
                routes.Add(new OptimizedRoute
                {
                    Label = label,
                    TotalPrice = t1.Price + t2.Price,
                    TotalDuration = t2.ArrivalTime - t1.DepartureTime,
                    TransferWait = wait,
                    TransferScore = TransferScore(wait),
                    Segments =
                    [
                        new RouteSegment
                        {
                            Type = type1, Code = t1.TrainCode, Name = t1.TrainName,
                            DepartureLocation = t1.DepartureLocation, ArrivalLocation = t1.ArrivalLocation,
                            DepartureTime = t1.DepartureTime, ArrivalTime = t1.ArrivalTime, Price = t1.Price, Id = t1.Id
                        },
                        new RouteSegment
                        {
                            Type = type2, Code = t2.TrainCode, Name = t2.TrainName,
                            DepartureLocation = t2.DepartureLocation, ArrivalLocation = t2.ArrivalLocation,
                            DepartureTime = t2.DepartureTime, ArrivalTime = t2.ArrivalTime, Price = t2.Price, Id = t2.Id
                        }
                    ]
                });
            }
        }
    }

    private void Combine3(List<OptimizedRoute> routes,
        IEnumerable<Flight> leg1, IEnumerable<Train> leg2, IEnumerable<Flight> leg3,
        string t1, string t2, string t3, string label)
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
                                Segments =
                                [
                                    new() { Type = t1, Code = l1.AirlineCode, Name = l1.AirlineName, DepartureLocation = l1.DepartureLocation, ArrivalLocation = l1.ArrivalLocation, DepartureTime = l1.DepartureTime, ArrivalTime = l1.ArrivalTime, Price = l1.Price, Id = l1.Id },
                                    new() { Type = t2, Code = l2.TrainCode, Name = l2.TrainName, DepartureLocation = l2.DepartureLocation, ArrivalLocation = l2.ArrivalLocation, DepartureTime = l2.DepartureTime, ArrivalTime = l2.ArrivalTime, Price = l2.Price, Id = l2.Id },
                                    new() { Type = t3, Code = l3.AirlineCode, Name = l3.AirlineName, DepartureLocation = l3.DepartureLocation, ArrivalLocation = l3.ArrivalLocation, DepartureTime = l3.DepartureTime, ArrivalTime = l3.ArrivalTime, Price = l3.Price, Id = l3.Id },
                                ]
                            });
    }

    private void Combine3(List<OptimizedRoute> routes,
        IEnumerable<Train> leg1, IEnumerable<Flight> leg2, IEnumerable<Train> leg3,
        string t1, string t2, string t3, string label)
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
                                Segments =
                                [
                                    new() { Type = t1, Code = l1.TrainCode, Name = l1.TrainName, DepartureLocation = l1.DepartureLocation, ArrivalLocation = l1.ArrivalLocation, DepartureTime = l1.DepartureTime, ArrivalTime = l1.ArrivalTime, Price = l1.Price, Id = l1.Id },
                                    new() { Type = t2, Code = l2.AirlineCode, Name = l2.AirlineName, DepartureLocation = l2.DepartureLocation, ArrivalLocation = l2.ArrivalLocation, DepartureTime = l2.DepartureTime, ArrivalTime = l2.ArrivalTime, Price = l2.Price, Id = l2.Id },
                                    new() { Type = t3, Code = l3.TrainCode, Name = l3.TrainName, DepartureLocation = l3.DepartureLocation, ArrivalLocation = l3.ArrivalLocation, DepartureTime = l3.DepartureTime, ArrivalTime = l3.ArrivalTime, Price = l3.Price, Id = l3.Id },
                                ]
                            });
    }

    private static OptimizedRoute FromFlight(Flight f, string label)
    {
        return new OptimizedRoute
        {
            Label = label,
            TotalPrice = f.Price,
            TotalDuration = f.ArrivalTime - f.DepartureTime,
            Segments =
            [
                new RouteSegment
                {
                    Type = "flight", Code = f.AirlineCode, Name = f.AirlineName,
                    DepartureLocation = f.DepartureLocation, ArrivalLocation = f.ArrivalLocation,
                    DepartureTime = f.DepartureTime, ArrivalTime = f.ArrivalTime, Price = f.Price, Id = f.Id
                }
            ]
        };
    }

    private static OptimizedRoute FromTrain(Train t, string label)
    {
        return new OptimizedRoute
        {
            Label = label,
            TotalPrice = t.Price,
            TotalDuration = t.ArrivalTime - t.DepartureTime,
            Segments =
            [
                new RouteSegment
                {
                    Type = "train", Code = t.TrainCode, Name = t.TrainName,
                    DepartureLocation = t.DepartureLocation, ArrivalLocation = t.ArrivalLocation,
                    DepartureTime = t.DepartureTime, ArrivalTime = t.ArrivalTime, Price = t.Price, Id = t.Id
                }
            ]
        };
    }
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
