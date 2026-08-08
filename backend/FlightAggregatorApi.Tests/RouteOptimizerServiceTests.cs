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
    private static readonly DateTime DayStart = Day.ToDateTime(TimeOnly.MinValue);

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

    private static Flight Flight(long id, string from, string to, int depHour, int depMin, int arrHour, int arrMin, decimal price)
        => new()
        {
            Id = id,
            AirlineCode = "VN",
            AirlineName = "Vietnam Airlines",
            DepartureLocation = from,
            ArrivalLocation = to,
            DepartureTime = DayStart.AddHours(depHour).AddMinutes(depMin),
            ArrivalTime = DayStart.AddHours(arrHour).AddMinutes(arrMin),
            Price = price,
            Seats = 50,
            FlightDate = Day,
            SeatClass = "Economy",
        };

    private static Train Train(long id, string from, string to, int depHour, int depMin, int arrHour, int arrMin, decimal price)
        => new()
        {
            Id = id,
            TrainCode = "SE1",
            TrainName = "SE1",
            DepartureLocation = from,
            ArrivalLocation = to,
            DepartureTime = DayStart.AddHours(depHour).AddMinutes(depMin),
            ArrivalTime = DayStart.AddHours(arrHour).AddMinutes(arrMin),
            Price = price,
            Seats = 100,
            TrainDate = Day,
            CoachClass = "Soft Seat",
        };

    private static Bus Bus(long id, string from, string to, int depHour, int depMin, int arrHour, int arrMin, decimal price)
        => new()
        {
            Id = id,
            BusCode = $"ML{id:000}",
            BusCompany = "Mai Linh",
            DepartureLocation = from,
            ArrivalLocation = to,
            DepartureTime = DayStart.AddHours(depHour).AddMinutes(depMin),
            ArrivalTime = DayStart.AddHours(arrHour).AddMinutes(arrMin),
            Price = price,
            Seats = 40,
            BusDate = Day,
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

    // ---------- Cache ----------

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
