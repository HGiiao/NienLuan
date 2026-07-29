using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;
using FlightAggregatorApi.Models;

namespace FlightAggregatorApi.Services;

public class RouteOptimizerService
{
    private readonly ApplicationDbContext _db;

    private static readonly string[] Hubs = ["HAN", "SGN", "DAD", "CXR", "PQC", "HCM"];

    public RouteOptimizerService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<List<OptimizedRoute>> FindOptimalRoute(
        string origin, string destination, DateOnly startDate, DateOnly endDate, string preference)
    {
        var allFlights = await _db.Flights.AsNoTracking()
            .Where(f => f.FlightDate >= startDate && f.FlightDate <= endDate)
            .ToListAsync();

        var allTrains = await _db.Trains.AsNoTracking()
            .Where(t => t.TrainDate >= startDate && t.TrainDate <= endDate)
            .ToListAsync();

        var routes = new List<OptimizedRoute>();

        // 1. Direct flights
        foreach (var f in allFlights.Where(f => f.DepartureLocation == origin && f.ArrivalLocation == destination))
        {
            routes.Add(FromFlight(f, "direct"));
        }

        // 2. Direct trains
        foreach (var t in allTrains.Where(t => t.DepartureLocation == origin && t.ArrivalLocation == destination))
        {
            routes.Add(FromTrain(t, "direct"));
        }

        // 3. Multi-leg via hub cities
        foreach (var hub in Hubs)
        {
            if (hub == origin || hub == destination) continue;

            // Flight → Train
            Combine(routes, allFlights.Where(f => f.DepartureLocation == origin && f.ArrivalLocation == hub),
                            allTrains.Where(t => t.DepartureLocation == hub && t.ArrivalLocation == destination),
                            "flight", "train", $"Qua {hub}");

            // Train → Flight
            Combine(routes, allTrains.Where(t => t.DepartureLocation == origin && t.ArrivalLocation == hub),
                            allFlights.Where(f => f.DepartureLocation == hub && f.ArrivalLocation == destination),
                            "train", "flight", $"Qua {hub}");

            // Flight → Flight
            Combine(routes, allFlights.Where(f => f.DepartureLocation == origin && f.ArrivalLocation == hub),
                            allFlights.Where(f => f.DepartureLocation == hub && f.ArrivalLocation == destination),
                            "flight", "flight", $"Qua {hub}");

            // Train → Train
            Combine(routes, allTrains.Where(t => t.DepartureLocation == origin && t.ArrivalLocation == hub),
                            allTrains.Where(t => t.DepartureLocation == hub && t.ArrivalLocation == destination),
                            "train", "train", $"Qua {hub}");
        }

        // 4. Three-leg routes (Flight → Train → Flight / Train → Flight → Train) via two hubs
        foreach (var mid in Hubs)
        {
            if (mid == origin || mid == destination) continue;
            foreach (var hub2 in Hubs)
            {
                if (hub2 == origin || hub2 == destination || hub2 == mid) continue;

                // Flight → Train → Flight
                Combine3(routes,
                    allFlights.Where(f => f.DepartureLocation == origin && f.ArrivalLocation == mid),
                    allTrains.Where(t => t.DepartureLocation == mid && t.ArrivalLocation == hub2),
                    allFlights.Where(f => f.DepartureLocation == hub2 && f.ArrivalLocation == destination),
                    "flight", "train", "flight", $"Qua {mid}, {hub2}");

                // Train → Flight → Train
                Combine3(routes,
                    allTrains.Where(t => t.DepartureLocation == origin && t.ArrivalLocation == mid),
                    allFlights.Where(f => f.DepartureLocation == mid && f.ArrivalLocation == hub2),
                    allTrains.Where(t => t.DepartureLocation == hub2 && t.ArrivalLocation == destination),
                    "train", "flight", "train", $"Qua {mid}, {hub2}");
            }
        }

        // Remove duplicates (same segments, same total price)
        routes = routes.DistinctBy(r => string.Join("|", r.Segments.Select(s => $"{s.Type}:{s.Code}:{s.DepartureTime}"))).ToList();

        // Sort by preference
        routes = preference switch
        {
            "cheapest" => [.. routes.OrderBy(r => r.TotalPrice)],
            "fastest" => [.. routes.OrderBy(r => r.TotalDuration)],
            _ => [.. routes.OrderBy(r => r.TotalPrice * 0.5m + (decimal)r.TotalDuration.TotalMinutes * 0.5m)]
        };

        return routes.Take(10).ToList();
    }

    private void Combine(List<OptimizedRoute> routes,
        IEnumerable<Flight> firstFlights, IEnumerable<Train> secondTrains,
        string type1, string type2, string label)
    {
        foreach (var f in firstFlights)
        {
            foreach (var t in secondTrains)
            {
                if (f.ArrivalTime.AddHours(1) <= t.DepartureTime)
                {
                    routes.Add(new OptimizedRoute
                    {
                        Label = label,
                        TotalPrice = f.Price + t.Price,
                        TotalDuration = t.ArrivalTime - f.DepartureTime,
                        Segments =
                        [
                            new RouteSegment
                            {
                                Type = type1, Code = f.AirlineCode, Name = f.AirlineName,
                                DepartureLocation = f.DepartureLocation, ArrivalLocation = f.ArrivalLocation,
                                DepartureTime = f.DepartureTime, ArrivalTime = f.ArrivalTime, Price = f.Price
                            },
                            new RouteSegment
                            {
                                Type = type2, Code = t.TrainCode, Name = t.TrainName,
                                DepartureLocation = t.DepartureLocation, ArrivalLocation = t.ArrivalLocation,
                                DepartureTime = t.DepartureTime, ArrivalTime = t.ArrivalTime, Price = t.Price
                            }
                        ]
                    });
                }
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
                if (t.ArrivalTime.AddHours(1) <= f.DepartureTime)
                {
                    routes.Add(new OptimizedRoute
                    {
                        Label = label,
                        TotalPrice = t.Price + f.Price,
                        TotalDuration = f.ArrivalTime - t.DepartureTime,
                        Segments =
                        [
                            new RouteSegment
                            {
                                Type = type1, Code = t.TrainCode, Name = t.TrainName,
                                DepartureLocation = t.DepartureLocation, ArrivalLocation = t.ArrivalLocation,
                                DepartureTime = t.DepartureTime, ArrivalTime = t.ArrivalTime, Price = t.Price
                            },
                            new RouteSegment
                            {
                                Type = type2, Code = f.AirlineCode, Name = f.AirlineName,
                                DepartureLocation = f.DepartureLocation, ArrivalLocation = f.ArrivalLocation,
                                DepartureTime = f.DepartureTime, ArrivalTime = f.ArrivalTime, Price = f.Price
                            }
                        ]
                    });
                }
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
                if (f1.ArrivalTime.AddHours(1) <= f2.DepartureTime)
                {
                    routes.Add(new OptimizedRoute
                    {
                        Label = label,
                        TotalPrice = f1.Price + f2.Price,
                        TotalDuration = f2.ArrivalTime - f1.DepartureTime,
                        Segments =
                        [
                            new RouteSegment
                            {
                                Type = type1, Code = f1.AirlineCode, Name = f1.AirlineName,
                                DepartureLocation = f1.DepartureLocation, ArrivalLocation = f1.ArrivalLocation,
                                DepartureTime = f1.DepartureTime, ArrivalTime = f1.ArrivalTime, Price = f1.Price
                            },
                            new RouteSegment
                            {
                                Type = type2, Code = f2.AirlineCode, Name = f2.AirlineName,
                                DepartureLocation = f2.DepartureLocation, ArrivalLocation = f2.ArrivalLocation,
                                DepartureTime = f2.DepartureTime, ArrivalTime = f2.ArrivalTime, Price = f2.Price
                            }
                        ]
                    });
                }
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
                if (t1.ArrivalTime.AddHours(1) <= t2.DepartureTime)
                {
                    routes.Add(new OptimizedRoute
                    {
                        Label = label,
                        TotalPrice = t1.Price + t2.Price,
                        TotalDuration = t2.ArrivalTime - t1.DepartureTime,
                        Segments =
                        [
                            new RouteSegment
                            {
                                Type = type1, Code = t1.TrainCode, Name = t1.TrainName,
                                DepartureLocation = t1.DepartureLocation, ArrivalLocation = t1.ArrivalLocation,
                                DepartureTime = t1.DepartureTime, ArrivalTime = t1.ArrivalTime, Price = t1.Price
                            },
                            new RouteSegment
                            {
                                Type = type2, Code = t2.TrainCode, Name = t2.TrainName,
                                DepartureLocation = t2.DepartureLocation, ArrivalLocation = t2.ArrivalLocation,
                                DepartureTime = t2.DepartureTime, ArrivalTime = t2.ArrivalTime, Price = t2.Price
                            }
                        ]
                    });
                }
            }
        }
    }

    private void Combine3(List<OptimizedRoute> routes,
        IEnumerable<Flight> leg1, IEnumerable<Train> leg2, IEnumerable<Flight> leg3,
        string t1, string t2, string t3, string label)
    {
        foreach (var l1 in leg1)
            foreach (var l2 in leg2)
                if (l1.ArrivalTime.AddHours(1) <= l2.DepartureTime)
                    foreach (var l3 in leg3)
                        if (l2.ArrivalTime.AddHours(1) <= l3.DepartureTime)
                            routes.Add(new OptimizedRoute
                            {
                                Label = label,
                                TotalPrice = l1.Price + l2.Price + l3.Price,
                                TotalDuration = l3.ArrivalTime - l1.DepartureTime,
                                Segments =
                                [
                                    new() { Type = t1, Code = l1.AirlineCode, Name = l1.AirlineName, DepartureLocation = l1.DepartureLocation, ArrivalLocation = l1.ArrivalLocation, DepartureTime = l1.DepartureTime, ArrivalTime = l1.ArrivalTime, Price = l1.Price },
                                    new() { Type = t2, Code = l2.TrainCode, Name = l2.TrainName, DepartureLocation = l2.DepartureLocation, ArrivalLocation = l2.ArrivalLocation, DepartureTime = l2.DepartureTime, ArrivalTime = l2.ArrivalTime, Price = l2.Price },
                                    new() { Type = t3, Code = l3.AirlineCode, Name = l3.AirlineName, DepartureLocation = l3.DepartureLocation, ArrivalLocation = l3.ArrivalLocation, DepartureTime = l3.DepartureTime, ArrivalTime = l3.ArrivalTime, Price = l3.Price },
                                ]
                            });
    }

    private void Combine3(List<OptimizedRoute> routes,
        IEnumerable<Train> leg1, IEnumerable<Flight> leg2, IEnumerable<Train> leg3,
        string t1, string t2, string t3, string label)
    {
        foreach (var l1 in leg1)
            foreach (var l2 in leg2)
                if (l1.ArrivalTime.AddHours(1) <= l2.DepartureTime)
                    foreach (var l3 in leg3)
                        if (l2.ArrivalTime.AddHours(1) <= l3.DepartureTime)
                            routes.Add(new OptimizedRoute
                            {
                                Label = label,
                                TotalPrice = l1.Price + l2.Price + l3.Price,
                                TotalDuration = l3.ArrivalTime - l1.DepartureTime,
                                Segments =
                                [
                                    new() { Type = t1, Code = l1.TrainCode, Name = l1.TrainName, DepartureLocation = l1.DepartureLocation, ArrivalLocation = l1.ArrivalLocation, DepartureTime = l1.DepartureTime, ArrivalTime = l1.ArrivalTime, Price = l1.Price },
                                    new() { Type = t2, Code = l2.AirlineCode, Name = l2.AirlineName, DepartureLocation = l2.DepartureLocation, ArrivalLocation = l2.ArrivalLocation, DepartureTime = l2.DepartureTime, ArrivalTime = l2.ArrivalTime, Price = l2.Price },
                                    new() { Type = t3, Code = l3.TrainCode, Name = l3.TrainName, DepartureLocation = l3.DepartureLocation, ArrivalLocation = l3.ArrivalLocation, DepartureTime = l3.DepartureTime, ArrivalTime = l3.ArrivalTime, Price = l3.Price },
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
                    DepartureTime = f.DepartureTime, ArrivalTime = f.ArrivalTime, Price = f.Price
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
                    DepartureTime = t.DepartureTime, ArrivalTime = t.ArrivalTime, Price = t.Price
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
}
