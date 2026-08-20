using FlightAggregatorApi.Data;
using FlightAggregatorApi.Models;
using FlightAggregatorApi.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace FlightAggregatorApi.Tests;

public class RouteOptimizerServiceTests
{
    private static readonly DateOnly Day = new(2026, 8, 16);

    // ---------- Helpers ----------

    private static ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    private static RouteOptimizerService CreateService(ApplicationDbContext db)
        => new(db, new MemoryCache(new MemoryCacheOptions()), NullLogger<RouteOptimizerService>.Instance);

    private static async Task<List<OptimizedRoute>> FindRoutes(
        ApplicationDbContext db, string origin, string dest,
        DateOnly? start = null, DateOnly? end = null, string preference = "cheapest")
    {
        var svc = CreateService(db);
        var s = start ?? Day;
        var e = end ?? s;
        return await svc.FindOptimalRoute(origin, dest, s, e, preference);
    }

    private static Flight Flight(long id, string from, string to, int depHour, int depMin, int arrHour, int arrMin, decimal price, DateOnly? d = null)
        => new()
        {
            Id = id,
            AirlineCode = "VN",
            AirlineName = "Vietnam Airlines",
            DepartureLocation = from,
            ArrivalLocation = to,
            DepartureTime = (d ?? Day).ToDateTime(new TimeOnly(depHour, depMin)),
            ArrivalTime = (d ?? Day).ToDateTime(new TimeOnly(arrHour, arrMin)),
            Price = price,
            Seats = 50,
            FlightDate = d ?? Day,
            SeatClass = "Economy",
        };

    private static Train Train(long id, string from, string to, int depHour, int depMin, int arrHour, int arrMin, decimal price, DateOnly? d = null)
        => new()
        {
            Id = id,
            TrainCode = "SE1",
            TrainName = "SE1",
            DepartureLocation = from,
            ArrivalLocation = to,
            DepartureTime = (d ?? Day).ToDateTime(new TimeOnly(depHour, depMin)),
            ArrivalTime = (d ?? Day).ToDateTime(new TimeOnly(arrHour, arrMin)),
            Price = price,
            Seats = 100,
            TrainDate = d ?? Day,
            CoachClass = "Soft Seat",
        };

    private static Bus Bus(long id, string from, string to, int depHour, int depMin, int arrHour, int arrMin, decimal price, DateOnly? d = null)
        => new()
        {
            Id = id,
            BusCode = $"ML{id:000}",
            BusCompany = "Mai Linh",
            DepartureLocation = from,
            ArrivalLocation = to,
            DepartureTime = (d ?? Day).ToDateTime(new TimeOnly(depHour, depMin)),
            ArrivalTime = (d ?? Day).ToDateTime(new TimeOnly(arrHour, arrMin)),
            Price = price,
            Seats = 40,
            BusDate = d ?? Day,
            CoachClass = "Giường nằm",
        };

    // ---------- Direct routes ----------

    [Fact]
    public async Task Direct_Bus_Route_Is_Returned()
    {
        using var db = CreateContext();
        db.Buses.Add(Bus(1, "HAN", "SGN", 8, 0, 20, 0, 400_000));
        await db.SaveChangesAsync();

        var routes = await FindRoutes(db, "HAN", "SGN");

        var direct = Assert.Single(routes, r => r.Label == "direct");
        Assert.Equal("bus", direct.Segments[0].Type);
        Assert.Equal(400_000m, direct.TotalPrice);
    }

    // ---------- 2-leg combos ----------

    [Fact]
    public async Task Flight_To_Bus_Combination_Is_Generated()
    {
        using var db = CreateContext();
        db.Flights.Add(Flight(1, "HAN", "DAD", 6, 0, 7, 30, 1_000_000));
        db.Buses.Add(Bus(1, "DAD", "SGN", 10, 0, 14, 0, 350_000));
        await db.SaveChangesAsync();

        var routes = await FindRoutes(db, "HAN", "SGN");

        var combo = Assert.Single(routes, r => r.Segments.Count == 2);
        Assert.Equal("flight", combo.Segments[0].Type);
        Assert.Equal("bus", combo.Segments[1].Type);
        Assert.Equal("Qua DAD", combo.Label);
        Assert.Equal(1_350_000m, combo.TotalPrice);
        // 2.5h transfer between 07:30 arrival and 10:00 departure
        Assert.Equal(TimeSpan.FromHours(2.5), combo.TransferWait);
    }

    [Fact]
    public async Task Bus_To_Train_Combination_Is_Generated()
    {
        using var db = CreateContext();
        db.Buses.Add(Bus(1, "HAN", "DAD", 6, 0, 10, 0, 500_000));
        db.Trains.Add(Train(1, "DAD", "SGN", 13, 0, 20, 0, 600_000));
        await db.SaveChangesAsync();

        var routes = await FindRoutes(db, "HAN", "SGN");

        var combo = Assert.Single(routes, r => r.Segments.Count == 2);
        Assert.Equal("bus", combo.Segments[0].Type);
        Assert.Equal("train", combo.Segments[1].Type);
        Assert.Equal(1_100_000m, combo.TotalPrice);
    }

    [Fact]
    public async Task Bus_To_Flight_Combination_Is_Generated()
    {
        using var db = CreateContext();
        db.Buses.Add(Bus(1, "HAN", "DAD", 6, 0, 9, 0, 450_000));
        db.Flights.Add(Flight(1, "DAD", "SGN", 11, 0, 12, 30, 900_000));
        await db.SaveChangesAsync();

        var routes = await FindRoutes(db, "HAN", "SGN");

        var combo = Assert.Single(routes, r => r.Segments.Count == 2);
        Assert.Equal("bus", combo.Segments[0].Type);
        Assert.Equal("flight", combo.Segments[1].Type);
        Assert.Equal(1_350_000m, combo.TotalPrice);
        Assert.Equal(TimeSpan.FromHours(2), combo.TransferWait);
    }

    [Fact]
    public async Task Train_To_Bus_Combination_Is_Generated()
    {
        using var db = CreateContext();
        db.Trains.Add(Train(1, "HAN", "DAD", 6, 0, 12, 0, 550_000));
        db.Buses.Add(Bus(1, "DAD", "SGN", 14, 0, 18, 0, 320_000));
        await db.SaveChangesAsync();

        var routes = await FindRoutes(db, "HAN", "SGN");

        var combo = Assert.Single(routes, r => r.Segments.Count == 2);
        Assert.Equal("train", combo.Segments[0].Type);
        Assert.Equal("bus", combo.Segments[1].Type);
        Assert.Equal(870_000m, combo.TotalPrice);
        Assert.Equal(TimeSpan.FromHours(2), combo.TransferWait);
    }

    // ---------- 3-leg combo ----------

    [Fact]
    public async Task Three_Leg_Flight_Train_Bus_Is_Generated()
    {
        using var db = CreateContext();
        db.Flights.Add(Flight(1, "HAN", "DAD", 6, 0, 7, 30, 900_000));
        db.Trains.Add(Train(1, "DAD", "CXR", 10, 0, 15, 0, 450_000));
        db.Buses.Add(Bus(1, "CXR", "SGN", 17, 0, 21, 0, 300_000));
        await db.SaveChangesAsync();

        var routes = await FindRoutes(db, "HAN", "SGN");

        var combo = Assert.Single(routes, r => r.Segments.Count == 3);
        Assert.Equal(["flight", "train", "bus"], combo.Segments.Select(s => s.Type));
        Assert.Equal("Qua DAD, CXR", combo.Label);
        Assert.Equal(1_650_000m, combo.TotalPrice);
        // 2.5h + 2h transfers
        Assert.Equal(TimeSpan.FromHours(4.5), combo.TransferWait);
    }

    [Fact]
    public async Task Three_Leg_With_Invalid_Middle_Transfer_Is_Excluded()
    {
        using var db = CreateContext();
        db.Flights.Add(Flight(1, "HAN", "DAD", 6, 0, 7, 30, 900_000));
        db.Trains.Add(Train(1, "DAD", "CXR", 8, 0, 13, 0, 450_000));  // 30 min after flight arrival — invalid
        db.Buses.Add(Bus(1, "CXR", "SGN", 15, 0, 19, 0, 300_000));
        await db.SaveChangesAsync();

        var routes = await FindRoutes(db, "HAN", "SGN");

        Assert.DoesNotContain(routes, r => r.Segments.Count == 3);
    }

    // ---------- Transfer constraints (1-6h) ----------

    [Fact]
    public async Task Transfer_Shorter_Than_One_Hour_Is_Excluded()
    {
        using var db = CreateContext();
        db.Flights.Add(Flight(1, "HAN", "DAD", 6, 0, 7, 0, 900_000));
        db.Buses.Add(Bus(1, "DAD", "SGN", 7, 30, 11, 30, 350_000)); // 30 min transfer
        await db.SaveChangesAsync();

        var routes = await FindRoutes(db, "HAN", "SGN");

        Assert.DoesNotContain(routes, r => r.Segments.Count == 2);
    }

    [Fact]
    public async Task Transfer_Longer_Than_Six_Hours_Is_Excluded()
    {
        using var db = CreateContext();
        db.Flights.Add(Flight(1, "HAN", "DAD", 6, 0, 7, 0, 900_000));
        db.Buses.Add(Bus(1, "DAD", "SGN", 14, 0, 18, 0, 350_000)); // 7h transfer
        await db.SaveChangesAsync();

        var routes = await FindRoutes(db, "HAN", "SGN");

        Assert.DoesNotContain(routes, r => r.Segments.Count == 2);
    }

    [Fact]
    public async Task Transfer_Exactly_One_Hour_And_Six_Hours_Are_Valid()
    {
        using var db = CreateContext();
        db.Flights.Add(Flight(1, "HAN", "DAD", 6, 0, 7, 0, 900_000));
        db.Buses.Add(Bus(1, "DAD", "SGN", 8, 0, 12, 0, 350_000));   // exactly 1h
        db.Buses.Add(Bus(2, "DAD", "SGN", 13, 0, 17, 0, 320_000));  // exactly 6h
        await db.SaveChangesAsync();

        var routes = await FindRoutes(db, "HAN", "SGN");

        var combos = routes.Where(r => r.Segments.Count == 2).ToList();
        Assert.Equal(2, combos.Count);
        Assert.Contains(combos, r => r.TransferWait == TimeSpan.FromHours(1));
        Assert.Contains(combos, r => r.TransferWait == TimeSpan.FromHours(6));
    }

    // ---------- Date range filter ----------

    [Fact]
    public async Task Items_Outside_Date_Range_Are_Ignored()
    {
        using var db = CreateContext();
        db.Buses.Add(Bus(1, "HAN", "SGN", 8, 0, 20, 0, 400_000)); // on Day
        db.Flights.Add(new Flight
        {
            Id = 1,
            AirlineCode = "VJ",
            AirlineName = "VietJet Air",
            DepartureLocation = "HAN",
            ArrivalLocation = "SGN",
            DepartureTime = Day.AddDays(3).ToDateTime(new TimeOnly(6, 0)),
            ArrivalTime = Day.AddDays(3).ToDateTime(new TimeOnly(7, 30)),
            Price = 600_000,
            Seats = 50,
            FlightDate = Day.AddDays(3), // outside range
            SeatClass = "Economy",
        });
        await db.SaveChangesAsync();

        var routes = await FindRoutes(db, "HAN", "SGN", start: Day, end: Day);

        var direct = Assert.Single(routes);
        Assert.Equal("bus", direct.Segments[0].Type);
    }

    // ---------- Preferences / sorting ----------

    [Fact]
    public async Task Cheapest_Preference_Puts_Lowest_Price_First()
    {
        using var db = CreateContext();
        db.Buses.Add(Bus(1, "HAN", "SGN", 8, 0, 20, 0, 300_000));
        db.Flights.Add(Flight(1, "HAN", "SGN", 6, 0, 7, 30, 1_200_000));
        db.Flights.Add(Flight(2, "HAN", "DAD", 6, 0, 7, 30, 250_000));
        db.Buses.Add(Bus(2, "DAD", "SGN", 10, 0, 14, 0, 350_000)); // combo = 600k
        await db.SaveChangesAsync();

        var routes = await FindRoutes(db, "HAN", "SGN");

        Assert.Equal(300_000m, routes[0].TotalPrice);
    }

    [Fact]
    public async Task Fastest_Preference_Puts_Shortest_Duration_First()
    {
        using var db = CreateContext();
        db.Flights.Add(Flight(1, "HAN", "SGN", 6, 0, 7, 30, 1_000_000));   // 1.5h
        db.Buses.Add(Bus(1, "HAN", "SGN", 6, 0, 20, 0, 300_000));            // 14h
        await db.SaveChangesAsync();

        var routes = await FindRoutes(db, "HAN", "SGN", preference: "fastest");

        var directFlight = Assert.Single(routes, r => r.Label == "direct" && r.Segments[0].Type == "flight");
        Assert.Equal(routes[0].TotalPrice, directFlight.TotalPrice);
        Assert.Equal(TimeSpan.FromHours(1.5), routes[0].TotalDuration);
    }

    [Fact]
    public async Task Balanced_Preference_Is_A_Real_Tradeoff_Not_Same_As_Cheapest()
    {
        using var db = CreateContext();
        db.Flights.Add(Flight(1, "HAN", "SGN", 6, 0, 7, 30, 1_000_000)); // nhanh 1.5h, giá cao
        db.Buses.Add(Bus(1, "HAN", "SGN", 6, 0, 20, 0, 300_000));        // rẻ nhất nhưng 14h
        db.Flights.Add(Flight(2, "HAN", "DAD", 6, 0, 7, 30, 250_000));
        db.Buses.Add(Bus(2, "DAD", "SGN", 10, 0, 14, 0, 350_000));       // combo 600k, ~8h
        await db.SaveChangesAsync();

        var cheapest = await FindRoutes(db, "HAN", "SGN", preference: "cheapest");
        var balanced = await FindRoutes(db, "HAN", "SGN", preference: "balanced");

        // cheapest đặt xe khách 300k (14h) lên đầu
        Assert.Equal(300_000m, cheapest[0].TotalPrice);
        // balanced phải khác cheapest — ưu tiên chuyến bay 1M/1.5h (cân bằng giá+thời gian)
        Assert.NotEqual(300_000m, balanced[0].TotalPrice);
        Assert.Equal("flight", balanced[0].Segments[0].Type);
        Assert.Equal(TimeSpan.FromHours(1.5), balanced[0].TotalDuration);
    }

    // ---------- Round-trip combos ----------

    [Fact]
    public async Task RoundTrip_Combines_Outbound_And_Return_Legs()
    {
        using var db = CreateContext();
        var returnDay = Day.AddDays(2);

        db.Flights.Add(Flight(1, "HAN", "SGN", 6, 0, 7, 30, 1_000_000));          // outbound flight
        db.Buses.Add(Bus(1, "HAN", "SGN", 8, 0, 20, 0, 400_000));                   // outbound bus (cheaper)
        db.Flights.Add(Flight(2, "SGN", "HAN", 9, 0, 10, 30, 900_000, returnDay));  // return flight
        db.Trains.Add(Train(1, "SGN", "HAN", 12, 0, 20, 0, 500_000, returnDay));    // return train (cheaper)
        await db.SaveChangesAsync();

        var svc = CreateService(db);
        var combos = await svc.FindRoundTripRoute("HAN", "SGN", Day, returnDay, "cheapest");

        Assert.NotEmpty(combos);
        var combo = combos[0];
        Assert.Equal("bus", combo.Outbound.Segments[0].Type);
        Assert.Equal("train", combo.Return.Segments[0].Type);
        Assert.Equal(combo.Outbound.TotalPrice + combo.Return.TotalPrice, combo.TotalPrice);
        Assert.Equal(900_000m, combo.TotalPrice);
        Assert.Equal(TimeSpan.FromHours(20), combo.TotalDuration);
    }

    [Fact]
    public async Task RoundTrip_Keeps_One_Combo_Per_Mode_Combination()
    {
        using var db = CreateContext();
        var returnDay = Day.AddDays(3);

        // Two outbound flights (different prices) + two return flights — all combos are "flight|flight"
        db.Flights.Add(Flight(1, "HAN", "SGN", 6, 0, 7, 30, 1_000_000));
        db.Flights.Add(Flight(2, "HAN", "SGN", 8, 0, 9, 30, 800_000));
        db.Flights.Add(Flight(3, "SGN", "HAN", 10, 0, 11, 30, 900_000, returnDay));
        db.Flights.Add(Flight(4, "SGN", "HAN", 13, 0, 14, 30, 700_000, returnDay));
        await db.SaveChangesAsync();

        var svc = CreateService(db);
        var combos = await svc.FindRoundTripRoute("HAN", "SGN", Day, returnDay, "cheapest");

        // 2 outbound × 2 return = 4 combos, but all share the "flight|flight" mode key → deduped to 1 cheapest
        var combo = Assert.Single(combos);
        Assert.Equal(1_500_000m, combo.TotalPrice); // 800k + 700k
        Assert.Equal("flight", combo.Outbound.Segments[0].Type);
        Assert.Equal("flight", combo.Return.Segments[0].Type);
    }

    [Fact]
    public async Task RoundTrip_Sorts_By_Total_Price_Ascending()
    {
        using var db = CreateContext();
        var returnDay = Day.AddDays(4);

        db.Flights.Add(Flight(1, "HAN", "SGN", 6, 0, 7, 30, 1_200_000));           // expensive outbound
        db.Buses.Add(Bus(1, "HAN", "SGN", 8, 0, 20, 0, 350_000));                   // cheap outbound
        db.Flights.Add(Flight(2, "SGN", "HAN", 9, 0, 10, 30, 1_000_000, returnDay)); // expensive return
        db.Trains.Add(Train(1, "SGN", "HAN", 12, 0, 20, 0, 450_000, returnDay));     // cheap return
        await db.SaveChangesAsync();

        var svc = CreateService(db);
        var combos = await svc.FindRoundTripRoute("HAN", "SGN", Day, returnDay, "cheapest");

        Assert.NotEmpty(combos);
        Assert.Equal(800_000m, combos[0].TotalPrice); // bus(350k) + train(450k)
        Assert.True(combos[0].TotalPrice <= combos.Last().TotalPrice);
    }

    [Fact]
    public async Task RoundTrip_Applies_Preference_To_Combo_Ordering()
    {
        using var db = CreateContext();
        var returnDay = Day.AddDays(2);

        db.Flights.Add(Flight(1, "HAN", "SGN", 6, 0, 7, 30, 1_000_000));           // outbound flight (fast)
        db.Buses.Add(Bus(1, "HAN", "SGN", 6, 0, 20, 0, 350_000));                    // outbound bus (cheap)
        db.Flights.Add(Flight(2, "SGN", "HAN", 9, 0, 10, 30, 1_000_000, returnDay)); // return flight (fast)
        db.Buses.Add(Bus(2, "SGN", "HAN", 12, 0, 20, 0, 350_000, returnDay));        // return bus (cheap)
        await db.SaveChangesAsync();

        var svc = CreateService(db);

        var cheapest = await svc.FindRoundTripRoute("HAN", "SGN", Day, returnDay, "cheapest");
        Assert.Equal(700_000m, cheapest[0].TotalPrice); // bus|bus

        var fastest = await svc.FindRoundTripRoute("HAN", "SGN", Day, returnDay, "fastest");
        Assert.Equal(2_000_000m, fastest[0].TotalPrice); // flight|flight
        Assert.Equal(TimeSpan.FromHours(3), fastest[0].TotalDuration);

        var balanced = await svc.FindRoundTripRoute("HAN", "SGN", Day, returnDay, "balanced");
        Assert.NotEqual(700_000m, balanced[0].TotalPrice); // không phải rẻ nhất
        Assert.Equal(TimeSpan.FromHours(3), balanced[0].TotalDuration);
    }

    [Fact]
    public async Task Same_Query_Within_Ttl_Hits_Cache()
    {
        using var db = CreateContext();
        db.Buses.Add(Bus(1, "HAN", "SGN", 8, 0, 20, 0, 400_000));
        await db.SaveChangesAsync();

        var svc = CreateService(db);
        var first = await svc.FindOptimalRoute("HAN", "SGN", Day, Day, "cheapest");

        // Add a cheaper bus AFTER the first query — cache should hide it
        db.Buses.Add(Bus(2, "HAN", "SGN", 9, 0, 21, 0, 200_000));
        await db.SaveChangesAsync();

        var second = await svc.FindOptimalRoute("HAN", "SGN", Day, Day, "cheapest");

        Assert.Equal(first.Count, second.Count);
        Assert.Equal(400_000m, second.Single().TotalPrice);
    }
}
