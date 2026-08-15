using FlightAggregatorApi.Data;
using FlightAggregatorApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FlightAggregatorApi.Services;

public class SeedDataService
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<SeedDataService> _logger;

    public SeedDataService(ApplicationDbContext db, ILogger<SeedDataService> logger)
    {
        _db = db;
        _logger = logger;
    }

    private static readonly (string Code, string Name)[] Airlines = [
        ("VN", "Vietnam Airlines"),
        ("VJ", "VietJet Air"),
        ("QH", "Bamboo Airways"),
        ("VU", "Vietravel Airlines"),
        ("BL", "Pacific Airlines"),
    ];

    private static readonly double[] AirlineWeights = [35, 30, 18, 10, 7];

    private static readonly string[] Airports = [
        "HAN", "SGN", "DAD", "HPH", "CXR", "PQC", "HUI", "VII", "VCA", "UIH"
    ];

    private static readonly (string From, string To, double Weight)[] FlightRoutes = [
        ("HAN", "SGN", 20), ("SGN", "HAN", 20),
        ("HAN", "DAD", 14), ("DAD", "HAN", 14),
        ("SGN", "DAD", 12), ("DAD", "SGN", 12),
        ("SGN", "PQC", 10), ("PQC", "SGN", 10),
        ("HAN", "CXR", 8),  ("CXR", "HAN", 8),
        ("SGN", "CXR", 7),  ("CXR", "SGN", 7),
        ("HAN", "HPH", 5),  ("HPH", "HAN", 5),
        ("SGN", "HPH", 4),  ("HPH", "SGN", 4),
        ("HAN", "HUI", 4),  ("HUI", "HAN", 4),
        ("SGN", "HUI", 3),  ("HUI", "SGN", 3),
        ("DAD", "HPH", 3),  ("HPH", "DAD", 3),
        ("SGN", "VII", 3),  ("VII", "SGN", 3),
        ("HAN", "VII", 3),  ("VII", "HAN", 3),
        ("DAD", "CXR", 2),  ("CXR", "DAD", 2),
        ("SGN", "VCA", 2),  ("VCA", "SGN", 2),
        ("SGN", "UIH", 2),  ("UIH", "SGN", 2),
        ("HAN", "VCA", 1),  ("VCA", "HAN", 1),
        ("DAD", "HUI", 1),  ("HUI", "DAD", 1),
    ];

    private static readonly string[] TrainStations = ["HAN", "VII", "HUI", "DAD", "QNG", "CXR", "BHH", "HCM"];

    private static readonly (string From, string To, double Weight)[] TrainRoutes = [
        ("HAN", "HCM", 20), ("HCM", "HAN", 20),
        ("HAN", "DAD", 15), ("DAD", "HAN", 15),
        ("DAD", "HCM", 12), ("HCM", "DAD", 12),
        ("HAN", "HUI", 8),  ("HUI", "HAN", 8),
        ("HUI", "HCM", 6),  ("HCM", "HUI", 6),
        ("HAN", "CXR", 5),  ("CXR", "HAN", 5),
        ("DAD", "CXR", 4),  ("CXR", "DAD", 4),
        ("VII", "HCM", 3),  ("HCM", "VII", 3),
        ("HAN", "VII", 2),  ("VII", "HAN", 2),
        ("DAD", "QNG", 2),  ("QNG", "DAD", 2),
        ("CXR", "HCM", 1),  ("HCM", "CXR", 1),
        ("HUI", "DAD", 1),  ("DAD", "HUI", 1),
    ];

    private static readonly string[] CoachClasses = ["Soft Sleeper", "Hard Sleeper", "Seat", "Soft Seat"];

    // Khoảng cách đường sắt Bắc-Nam (km) — khớp giá thực tế 2026 (vetau247, đường sắt VN):
    //   HAN-SGN 1726km: ghế mềm 895k-1.15M, khoang 6 1.2M-1.54M, khoang 4 1.4M-1.68M
    //   HAN-DAD 791km: ghế mềm 629k-731k, khoang 6 823k-1.015M, khoang 4 995k-1.26M
    private static readonly Dictionary<(string, string), double> TrainRouteDistancesKm = new()
    {
        { ("HAN", "HCM"), 1726 }, { ("HCM", "HAN"), 1726 },
        { ("HAN", "DAD"), 791 },  { ("DAD", "HAN"), 791 },
        { ("DAD", "HCM"), 935 },  { ("HCM", "DAD"), 935 },
        { ("HAN", "HUI"), 688 },  { ("HUI", "HAN"), 688 },
        { ("HUI", "HCM"), 1038 }, { ("HCM", "HUI"), 1038 },
        { ("HAN", "CXR"), 1315 }, { ("CXR", "HAN"), 1315 },
        { ("DAD", "CXR"), 524 },  { ("CXR", "DAD"), 524 },
        { ("VII", "HCM"), 1407 }, { ("HCM", "VII"), 1407 },
        { ("HAN", "VII"), 319 },  { ("VII", "HAN"), 319 },
        { ("DAD", "QNG"), 170 },  { ("QNG", "DAD"), 170 },
        { ("CXR", "HCM"), 411 },  { ("HCM", "CXR"), 411 },
        { ("HUI", "DAD"), 103 },  { ("DAD", "HUI"), 103 },
    };

    // Giá tàu = phí cố định + đồng/km theo hạng chỗ (khớp giá thực tế 2026)
    private static readonly Dictionary<string, double> TrainPricePerKm = new()
    {
        ["Seat"] = 380,
        ["Soft Seat"] = 480,
        ["Soft Sleeper"] = 600,
        ["Hard Sleeper"] = 680,
    };

    private const double TrainBaseFee = 300_000;

    private static readonly string[] TrainCodePrefixes = ["SE", "TN", "LP"];

    private static readonly string[] BusCompanies = [
        "Mai Linh", "Kumho Samco", "Hải Âu", "Sao Việt", "Phương Trang"
    ];

    private static readonly string[] BusCoachClasses = [
        "Giường nằm", "Ghế ngồi", "Limousine", "VIP"
    ];

    private static readonly string[] BusPickupPoints = [
        "Bến xe Miền Đông", "Bến xe Giáp Bát", "Bến xe Trung tâm", "Bến xe Nước Ngầm", "Bến xe Trung tâm"
    ];

    private static readonly string[] BusDropoffPoints = [
        "Bến xe Trung tâm", "Bến xe Miền Tây", "Bến xe An Sương", "Bến xe Hà Nội", "Bến xe Đà Nẵng"
    ];

    private static readonly Dictionary<(string, string), double> BusRouteDistancesKm = new()
    {
        { ("HAN", "SGN"), 1610 }, { ("SGN", "HAN"), 1610 },
        { ("HAN", "DAD"), 760 },  { ("DAD", "HAN"), 760 },
        { ("SGN", "DAD"), 960 },  { ("DAD", "SGN"), 960 },
        { ("HAN", "HUI"), 230 },  { ("HUI", "HAN"), 230 },
        { ("SGN", "HUI"), 900 },  { ("HUI", "SGN"), 900 },
        { ("HAN", "CXR"), 1280 }, { ("CXR", "HAN"), 1280 },
        { ("SGN", "CXR"), 400 },  { ("CXR", "SGN"), 400 },
        { ("DAD", "HUI"), 100 },  { ("HUI", "DAD"), 100 },
        { ("HAN", "HPH"), 100 },  { ("HPH", "HAN"), 100 },
        { ("SGN", "HPH"), 1600 }, { ("HPH", "SGN"), 1600 },
        { ("HAN", "VII"), 290 },  { ("VII", "HAN"), 290 },
        { ("SGN", "VII"), 300 },  { ("VII", "SGN"), 300 },
        { ("DAD", "CXR"), 500 },  { ("CXR", "DAD"), 500 },
        { ("HAN", "PQC"), 1100 }, { ("PQC", "HAN"), 1100 },
        { ("SGN", "PQC"), 300 },  { ("PQC", "SGN"), 300 },
        { ("SGN", "UIH"), 350 },  { ("UIH", "SGN"), 350 },
    };

    // Giá cơ bản theo hạng ghế (đồng/km), tỉ lệ với độ dài tuyến
    // Điều chỉnh theo giá thực tế 2026 (Phương Trang, redbus, vexere):
    //   HAN-DAD 760km: giường nằm 400-500k (~560đ/km), limousine 750k-1.05M (~950đ/km)
    //   HAN-SGN 1610km: giường nằm ~1.04M, limousine ~1.35M
    //   SGN-CXR 400km: giường nằm ~310k
    private static readonly Dictionary<string, double> BusPricePerKm = new()
    {
        ["Ghế ngồi"] = 420,
        ["Giường nằm"] = 560,
        ["Limousine"] = 950,
        ["VIP"] = 1150,
    };

    private static readonly (string From, string To, double Weight)[] BusRoutes = [
        ("HAN", "SGN", 18), ("SGN", "HAN", 18),
        ("HAN", "DAD", 14), ("DAD", "HAN", 14),
        ("SGN", "DAD", 12), ("DAD", "SGN", 12),
        ("HAN", "HUI", 10), ("HUI", "HAN", 10),
        ("SGN", "HUI", 6),  ("HUI", "SGN", 6),
        ("HAN", "CXR", 8),  ("CXR", "HAN", 8),
        ("SGN", "CXR", 7),  ("CXR", "SGN", 7),
        ("DAD", "HUI", 6),  ("HUI", "DAD", 6),
        ("HAN", "HPH", 8),  ("HPH", "HAN", 8),
        ("SGN", "HPH", 4),  ("HPH", "SGN", 4),
        ("HAN", "VII", 4),  ("VII", "HAN", 4),
        ("SGN", "VII", 3),  ("VII", "SGN", 3),
        ("DAD", "CXR", 5),  ("CXR", "DAD", 5),
        ("HAN", "PQC", 3),  ("PQC", "HAN", 3),
        ("SGN", "PQC", 3),  ("PQC", "SGN", 3),
        ("SGN", "UIH", 2),  ("UIH", "SGN", 2),
    ];

    private static readonly Dictionary<string, string> RouteTiers = new()
    {
        ["HAN-SGN"] = "long", ["SGN-HAN"] = "long",
        ["SGN-DAD"] = "medium", ["DAD-SGN"] = "medium",
        ["HAN-DAD"] = "medium", ["DAD-HAN"] = "medium",
        ["SGN-PQC"] = "medium", ["PQC-SGN"] = "medium",
        ["HAN-CXR"] = "medium", ["CXR-HAN"] = "medium",
        ["HAN-HUI"] = "medium", ["HUI-HAN"] = "medium",
        ["SGN-HUI"] = "medium", ["HUI-SGN"] = "medium",
        ["DAD-CXR"] = "medium", ["CXR-DAD"] = "medium",
        ["SGN-UIH"] = "medium", ["UIH-SGN"] = "medium",
        ["SGN-VCA"] = "medium", ["VCA-SGN"] = "medium",
        ["HAN-VCA"] = "medium", ["VCA-HAN"] = "medium",
        ["HAN-HPH"] = "short", ["HPH-HAN"] = "short",
        ["SGN-HPH"] = "short", ["HPH-SGN"] = "short",
        ["DAD-HPH"] = "short", ["HPH-DAD"] = "short",
        ["SGN-VII"] = "short", ["VII-SGN"] = "short",
        ["HAN-VII"] = "short", ["VII-HAN"] = "short",
        ["DAD-HUI"] = "short", ["HUI-DAD"] = "short",
        ["HAN-PQC"] = "long", ["PQC-HAN"] = "long",
        ["SGN-CXR"] = "medium", ["CXR-SGN"] = "medium",
    };

    // (EconomyMin, EconomyMax, PremiumMin, PremiumMax, BusinessMin, BusinessMax)
    // Điều chỉnh theo giá thực tế 2026 (vietjetair, vietnamairlines):
    //   HAN-SGN (long ~1700km): VJ eco 506-868k, VN eco 1.04-1.5M, Bamboo 750k-2.5M
    //   HAN-DAD (medium ~620km): VJ eco từ 611k, VN eco từ 1.088M
    //   Short (~100-300km): eco 300k-900k
    private static readonly Dictionary<string, (int EcoMin, int EcoMax, int PremMin, int PremMax, int BusMin, int BusMax)> SeatPriceRanges = new()
    {
        ["long"] = (500_000, 1_600_000, 1_800_000, 3_200_000, 3_500_000, 6_500_000),
        ["medium"] = (450_000, 1_300_000, 1_400_000, 2_600_000, 2_800_000, 5_500_000),
        ["short"] = (300_000, 900_000, 1_000_000, 1_800_000, 2_000_000, 3_500_000),
    };

    // Airline price factor: base × airlineFactor → final price
    // Điều chỉnh theo giá thực tế 2026: VJ rẻ hơn VN ~40-50% (HAN-SGN VJ 506-868k vs VN 1.04-1.5M)
    private static readonly Dictionary<string, double> AirlinePriceFactors = new()
    {
        ["VN"] = 1.12, ["VJ"] = 0.68, ["QH"] = 0.95, ["VU"] = 0.85, ["BL"] = 0.72,
    };

    private static readonly Dictionary<string, (int Min, int Max)> RoutePriceRange = new()
    {
        ["HAN-SGN"] = (500_000, 6_500_000), ["SGN-HAN"] = (500_000, 6_500_000),
        ["HAN-DAD"] = (450_000, 5_500_000), ["DAD-HAN"] = (450_000, 5_500_000),
        ["SGN-DAD"] = (450_000, 5_500_000), ["DAD-SGN"] = (450_000, 5_500_000),
        ["SGN-PQC"] = (450_000, 5_500_000), ["PQC-SGN"] = (450_000, 5_500_000),
        ["HAN-CXR"] = (450_000, 5_500_000), ["CXR-HAN"] = (450_000, 5_500_000),
        ["HAN-HUI"] = (450_000, 5_500_000), ["HUI-HAN"] = (450_000, 5_500_000),
        ["SGN-HUI"] = (450_000, 5_500_000), ["HUI-SGN"] = (450_000, 5_500_000),
        ["DAD-CXR"] = (450_000, 5_500_000), ["CXR-DAD"] = (450_000, 5_500_000),
        ["SGN-UIH"] = (450_000, 5_500_000), ["UIH-SGN"] = (450_000, 5_500_000),
        ["SGN-VCA"] = (450_000, 5_500_000), ["VCA-SGN"] = (450_000, 5_500_000),
        ["HAN-VCA"] = (450_000, 5_500_000), ["VCA-HAN"] = (450_000, 5_500_000),
        ["HAN-HPH"] = (300_000, 3_500_000), ["HPH-HAN"] = (300_000, 3_500_000),
        ["SGN-HPH"] = (300_000, 3_500_000), ["HPH-SGN"] = (300_000, 3_500_000),
        ["DAD-HPH"] = (300_000, 3_500_000), ["HPH-DAD"] = (300_000, 3_500_000),
        ["SGN-VII"] = (300_000, 3_500_000), ["VII-SGN"] = (300_000, 3_500_000),
        ["HAN-VII"] = (300_000, 3_500_000), ["VII-HAN"] = (300_000, 3_500_000),
        ["DAD-HUI"] = (300_000, 3_500_000), ["HUI-DAD"] = (300_000, 3_500_000),
        ["HAN-PQC"] = (500_000, 6_500_000), ["PQC-HAN"] = (500_000, 6_500_000),
        ["SGN-CXR"] = (450_000, 5_500_000), ["CXR-SGN"] = (450_000, 5_500_000),
    };

    private static string PickSeatClass(string routeKey)
    {
        var tier = RouteTiers.GetValueOrDefault(routeKey, "medium");
        var roll = Random.Shared.NextDouble();
        return tier switch
        {
            "long" => roll switch { < 0.25 => "Business", < 0.55 => "Premium Economy", _ => "Economy" },
            "medium" => roll switch { < 0.12 => "Business", < 0.38 => "Premium Economy", _ => "Economy" },
            _ => roll switch { < 0.04 => "Business", < 0.22 => "Premium Economy", _ => "Economy" },
        };
    }

    private static decimal GenerateSeatPrice(string routeKey, string seatClass, double airlineFactor, double weekendMultiplier)
    {
        var tier = RouteTiers.GetValueOrDefault(routeKey, "medium");
        var range = SeatPriceRanges[tier];

        var (min, max) = seatClass switch
        {
            "Business" => (range.BusMin, range.BusMax),
            "Premium Economy" => (range.PremMin, range.PremMax),
            _ => (range.EcoMin, range.EcoMax),
        };

        var price = min + Random.Shared.NextDouble() * (max - min);
        price *= airlineFactor;
        price *= weekendMultiplier;

        var variation = 1.0 + (Random.Shared.NextDouble() - 0.5) * 0.08;
        price *= variation;

        price = Math.Round(price / 1000) * 1000;
        return (decimal)Math.Clamp(price, 100_000, 8_000_000);
    }

    public async Task SeedAsync()
    {
        try
        {
            var hasFlights = await _db.Flights.AnyAsync();
            if (hasFlights)
            {
                _logger.LogInformation("Seed skipped: database already has flights.");
                return;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Seed failed checking existing flights. Tables may not exist yet.");
            throw;
        }

        _logger.LogInformation("Starting seed data generation...");

        var today = DateOnly.FromDateTime(DateTime.Today);
        var endDate = new DateOnly(2026, 8, 30);
        var totalDays = endDate.DayNumber - today.DayNumber + 1;

        _logger.LogInformation("Seeding {Days} days from {From} to {To}", totalDays, today, endDate);

        var flights = new List<Flight>();
        var trains = new List<Train>();
        var buses = new List<Bus>();
        var usedTrainCodes = new HashSet<string>();
        var usedBusCodes = new HashSet<string>();

        for (var date = today; date <= endDate; date = date.AddDays(1))
        {
            var isWeekend = date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;
            var weekendMultiplier = isWeekend ? 1.05 + Random.Shared.NextDouble() * 0.1 : 1.0;

            GenerateFlightsForDate(date, weekendMultiplier, flights);
            GenerateTrainsForDate(date, weekendMultiplier, trains, usedTrainCodes);
            GenerateBusesForDate(date, weekendMultiplier, buses, usedBusCodes);
        }

        _logger.LogInformation("Generated {Flights} flights, {Trains} trains and {Buses} buses", flights.Count, trains.Count, buses.Count);

        await _db.Flights.AddRangeAsync(flights);
        await _db.Trains.AddRangeAsync(trains);
        await _db.Buses.AddRangeAsync(buses);

        await SeedPriceHistoryAsync(today, endDate);

        if (!await _db.Users.AnyAsync(u => u.Email == "user@example.com"))
        {
            _db.Users.Add(new User
            {
                Email = "user@example.com",
                FullName = "Nguyen Van A",
                Phone = "0901234567",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456"),
                IsEmailVerified = true,
            });
        }

        try
        {
            await _db.SaveChangesAsync();
            _logger.LogInformation("Seed completed successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Seed failed during SaveChangesAsync");
            throw;
        }
    }

    private static readonly (string From, string To)[] RoundTripPairs = [
        ("HAN", "SGN"), ("HAN", "DAD"), ("SGN", "DAD"),
        ("SGN", "PQC"), ("HAN", "CXR"),
    ];

    private void GenerateFlightsForDate(DateOnly date, double weekendMultiplier, List<Flight> flights)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var daysUntilDeparture = date.DayNumber - today.DayNumber;

        var rtAirline = PickWeightedAirline();
        var rtAirlineFactor = AirlinePriceFactors[rtAirline.Code] + (Random.Shared.NextDouble() - 0.5) * 0.06;
        var pairIdx = 0;

        foreach (var (from, to) in RoundTripPairs)
        {
            var groupId = date.DayNumber * 10L + pairIdx;
            var routeKey = $"{from}-{to}";

            var outboundHour = Random.Shared.Next(6, 11);
            var outboundMinute = Random.Shared.Next(0, 12) * 5;
            var outboundDeparture = date.ToDateTime(new TimeOnly(outboundHour, outboundMinute));
            var outboundDuration = Random.Shared.Next(50, 181);
            var outboundArrival = outboundDeparture.AddMinutes(outboundDuration);

            var outboundSeatClass = PickSeatClass(routeKey);
            var outboundPrice = GenerateSeatPrice(routeKey, outboundSeatClass, rtAirlineFactor, weekendMultiplier);

            if (Random.Shared.NextDouble() < 0.15)
                outboundPrice = (decimal)((double)outboundPrice * (0.75 + Random.Shared.NextDouble() * 0.15));

            var outboundSeats = daysUntilDeparture switch
            {
                <= 2  => Random.Shared.Next(3, 26),
                <= 7  => Random.Shared.Next(5, 51),
                <= 14 => Random.Shared.Next(10, 101),
                _     => Random.Shared.Next(20, 181),
            };

            flights.Add(new Flight
            {
                AirlineCode = rtAirline.Code,
                AirlineName = rtAirline.Name,
                DepartureLocation = from,
                ArrivalLocation = to,
                DepartureTime = outboundDeparture,
                ArrivalTime = outboundArrival,
                Price = outboundPrice,
                Seats = outboundSeats,
                SeatClass = outboundSeatClass,
                FlightDate = date,
                RoundTripGroupId = groupId,
                CreatedAt = DateTime.UtcNow,
            });

            var returnHour = Random.Shared.Next(14, 20);
            var returnMinute = Random.Shared.Next(0, 12) * 5;
            var returnDeparture = date.ToDateTime(new TimeOnly(returnHour, returnMinute));
            var returnDuration = Random.Shared.Next(50, 181);
            var returnArrival = returnDeparture.AddMinutes(returnDuration);

            var returnRouteKey = $"{to}-{from}";
            var returnSeatClass = PickSeatClass(returnRouteKey);
            var returnPrice = GenerateSeatPrice(returnRouteKey, returnSeatClass, rtAirlineFactor, weekendMultiplier);

            if (Random.Shared.NextDouble() < 0.15)
                returnPrice = (decimal)((double)returnPrice * (0.75 + Random.Shared.NextDouble() * 0.15));

            var returnSeats = daysUntilDeparture switch
            {
                <= 2  => Random.Shared.Next(3, 26),
                <= 7  => Random.Shared.Next(5, 51),
                <= 14 => Random.Shared.Next(10, 101),
                _     => Random.Shared.Next(20, 181),
            };

            flights.Add(new Flight
            {
                AirlineCode = rtAirline.Code,
                AirlineName = rtAirline.Name,
                DepartureLocation = to,
                ArrivalLocation = from,
                DepartureTime = returnDeparture,
                ArrivalTime = returnArrival,
                Price = returnPrice,
                Seats = returnSeats,
                SeatClass = returnSeatClass,
                FlightDate = date,
                RoundTripGroupId = groupId,
                CreatedAt = DateTime.UtcNow,
            });

            pairIdx++;
        }

        for (var i = 0; i < 10; i++)
        {
            var (from, to) = PickWeighted(FlightRoutes);
            var airline = PickWeightedAirline();
            var airlineFactor = AirlinePriceFactors[airline.Code] + (Random.Shared.NextDouble() - 0.5) * 0.06;
            var routeKey = $"{from}-{to}";

            var hour = GetWeightedHour();
            var minute = Random.Shared.Next(0, 12) * 5;
            var departureTime = date.ToDateTime(new TimeOnly(hour, minute));

            var durationMinutes = Random.Shared.Next(50, 181);
            var arrivalTime = departureTime.AddMinutes(durationMinutes);

            var seatClass = PickSeatClass(routeKey);
            var price = GenerateSeatPrice(routeKey, seatClass, airlineFactor, weekendMultiplier);

            if (Random.Shared.NextDouble() < 0.15)
                price = (decimal)((double)price * (0.75 + Random.Shared.NextDouble() * 0.15));

            var seats = daysUntilDeparture switch
            {
                <= 2  => Random.Shared.Next(3, 26),
                <= 7  => Random.Shared.Next(5, 51),
                <= 14 => Random.Shared.Next(10, 101),
                _     => Random.Shared.Next(20, 181),
            };

            flights.Add(new Flight
            {
                AirlineCode = airline.Code,
                AirlineName = airline.Name,
                DepartureLocation = from,
                ArrivalLocation = to,
                DepartureTime = departureTime,
                ArrivalTime = arrivalTime,
                Price = price,
                Seats = seats,
                SeatClass = seatClass,
                FlightDate = date,
                CreatedAt = DateTime.UtcNow,
            });
        }
    }

    private void GenerateTrainsForDate(DateOnly date, double weekendMultiplier, List<Train> trains, HashSet<string> usedCodes)
    {
        for (var i = 0; i < 5; i++)
        {
            var (from, to) = PickWeighted(TrainRoutes);
            var distanceKm = TrainRouteDistancesKm.GetValueOrDefault((from, to), 500.0);

            var hour = Random.Shared.Next(0, 24);
            var minute = Random.Shared.Next(0, 12) * 5;
            var departureTime = date.ToDateTime(new TimeOnly(hour, minute));

            // Thời gian di chuyển tỉ lệ với khoảng cách (tốc độ 40-55 km/h gồm dừng ga), + thời gian chờ
            var speedKmh = 40 + Random.Shared.NextDouble() * 15;
            var travelHours = distanceKm / speedKmh;
            var durationMinutes = (int)Math.Round(travelHours * 60) + Random.Shared.Next(20, 90);

            var arrivalTime = departureTime.AddMinutes(durationMinutes);

            var coachClass = CoachClasses[Random.Shared.Next(CoachClasses.Length)];

            // Giá = phí cố định + km * hệ số hạng chỗ, điều chỉnh cuối tuần
            var ratePerKm = TrainPricePerKm.GetValueOrDefault(coachClass, 480);
            var basePrice = TrainBaseFee + distanceKm * ratePerKm;
            basePrice *= weekendMultiplier;

            if (Random.Shared.NextDouble() < 0.15)
                basePrice *= 0.85 + Random.Shared.NextDouble() * 0.15;

            var price = (decimal)Math.Round(basePrice / 10000) * 10000;
            if (price < 100_000m) price = 100_000m;

            var prefix = TrainCodePrefixes[Random.Shared.Next(TrainCodePrefixes.Length)];
            var number = Random.Shared.Next(1, 100);
            var trainCode = $"{prefix}{number}";
            while (!usedCodes.Add(trainCode))
            {
                number = Random.Shared.Next(1, 100);
                trainCode = $"{prefix}{number}";
            }

            var seats = coachClass switch
            {
                "Soft Sleeper" => Random.Shared.Next(30, 101),
                "Hard Sleeper" => Random.Shared.Next(50, 151),
                "Soft Seat" => Random.Shared.Next(100, 251),
                _ => Random.Shared.Next(100, 401),
            };

            var trainName = prefix switch
            {
                "SE" => "Reunification Express",
                "TN" => "Fast Train",
                _ => "Local Train",
            };

            trains.Add(new Train
            {
                TrainCode = trainCode,
                TrainName = trainName,
                DepartureLocation = from,
                ArrivalLocation = to,
                DepartureTime = departureTime,
                ArrivalTime = arrivalTime,
                Price = price,
                Seats = seats,
                CoachClass = coachClass,
                TrainDate = date,
                CreatedAt = DateTime.UtcNow,
            });
        }
    }

    private void GenerateBusesForDate(DateOnly date, double weekendMultiplier, List<Bus> buses, HashSet<string> usedCodes)
    {
        var tripsPerDay = Random.Shared.Next(8, 13);
        for (var i = 0; i < tripsPerDay; i++)
        {
            var (from, to) = PickWeighted(BusRoutes);
            var distanceKm = BusRouteDistancesKm.GetValueOrDefault((from, to), 500.0);

            var hour = Random.Shared.Next(4, 24);
            var minute = Random.Shared.Next(0, 12) * 5;
            var departureTime = date.ToDateTime(new TimeOnly(hour, minute));

            var company = BusCompanies[Random.Shared.Next(BusCompanies.Length)];
            var coachClass = BusCoachClasses[Random.Shared.Next(BusCoachClasses.Length)];

            // Thời gian di chuyển tỉ lệ với khoảng cách (tốc độ 45-60 km/h), + thời gian dừng nghỉ
            var speedKmh = 45 + Random.Shared.NextDouble() * 15;
            var travelHours = distanceKm / speedKmh;
            var durationMinutes = (int)Math.Round(travelHours * 60) + Random.Shared.Next(30, 90);

            // Giá cơ bản theo km * hạng ghế + phụ phí cố định, điều chỉnh cuối tuần
            var ratePerKm = BusPricePerKm.GetValueOrDefault(coachClass, 280);
            var basePrice = distanceKm * ratePerKm + 40_000;
            basePrice *= weekendMultiplier;

            // 15% chuyến có giá khuyến mãi nhẹ
            if (Random.Shared.NextDouble() < 0.15)
                basePrice *= 0.75 + Random.Shared.NextDouble() * 0.15;

            var price = (decimal)Math.Round(basePrice / 10000) * 10000;
            if (price < 80_000m) price = 80_000m;

            var arrivalTime = departureTime.AddMinutes(durationMinutes);

            var busCode = $"{company[..Math.Min(2, company.Length)].ToUpperInvariant()}{Random.Shared.Next(100, 999)}";
            var guard = 0;
            while (!usedCodes.Add(busCode))
            {
                busCode = $"{company[..Math.Min(2, company.Length)].ToUpperInvariant()}{Random.Shared.Next(100, 999)}";
                if (++guard > 20) { busCode = $"{company[..Math.Min(2, company.Length)].ToUpperInvariant()}{Random.Shared.Next(100, 999)}{Random.Shared.Next(10, 99)}"; break; }
            }

            var seats = coachClass switch
            {
                "VIP" => Random.Shared.Next(20, 41),
                "Limousine" => Random.Shared.Next(16, 30),
                "Giường nằm" => Random.Shared.Next(34, 46),
                _ => Random.Shared.Next(40, 50),
            };

            buses.Add(new Bus
            {
                BusCode = busCode,
                BusCompany = company,
                DepartureLocation = from,
                ArrivalLocation = to,
                DepartureTime = departureTime,
                ArrivalTime = arrivalTime,
                Price = price,
                Seats = seats,
                CoachClass = coachClass,
                PickupPoint = BusPickupPoints[Random.Shared.Next(BusPickupPoints.Length)],
                DropoffPoint = BusDropoffPoints[Random.Shared.Next(BusDropoffPoints.Length)],
                BusDate = date,
                CreatedAt = DateTime.UtcNow,
            });
        }
    }

    public async Task SeedBusesOnlyAsync()
    {
        try
        {
            var hasBuses = await _db.Buses.AnyAsync();
            if (hasBuses)
            {
                _logger.LogInformation("SeedBusesOnly skipped: database already has buses.");
                return;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SeedBusesOnly failed checking existing buses.");
            throw;
        }

        var today = DateOnly.FromDateTime(DateTime.Today);
        var endDate = new DateOnly(2026, 8, 30);
        var buses = new List<Bus>();
        var usedBusCodes = new HashSet<string>();

        for (var date = today; date <= endDate; date = date.AddDays(1))
        {
            var isWeekend = date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;
            var weekendMultiplier = isWeekend ? 1.05 + Random.Shared.NextDouble() * 0.1 : 1.0;
            GenerateBusesForDate(date, weekendMultiplier, buses, usedBusCodes);
        }

        await _db.Buses.AddRangeAsync(buses);
        await _db.SaveChangesAsync();
        _logger.LogInformation("SeedBusesOnly: {Count} buses added.", buses.Count);
    }

    private async Task SeedPriceHistoryAsync(DateOnly startDate, DateOnly endDate)    {
        var historyStart = startDate.AddDays(-30);
        var priceHistory = new List<PriceHistory>();

        for (var date = historyStart; date <= endDate; date = date.AddDays(1))
        {
            foreach (var (key, (min, max)) in RoutePriceRange)
            {
                var parts = key.Split('-');
                var from = parts[0];
                var to = parts[1];

                var basePrice = min + Random.Shared.NextDouble() * (max - min);

                // Weekend bump for historical realism
                var weekend = date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday
                    ? 1.05 + Random.Shared.NextDouble() * 0.15
                    : 1.0;

                // Mỗi ngày ghi nhiều mốc giá cho 3 phương tiện với mức giá hợp lý khác nhau:
                // máy bay cao nhất, tàu hỏa ~50-65%, xe khách ~30-45%.
                // Nhiều mốc/ngày = min/avg/max khác nhau, phản ánh nhiều chuyến giá khác nhau trong ngày.
                var flightBase = basePrice * weekend;
                var trainBase = basePrice * (0.50 + Random.Shared.NextDouble() * 0.15) * weekend;
                var busBase = basePrice * (0.30 + Random.Shared.NextDouble() * 0.15) * weekend;

                // 7 mốc/ngày/loại (như số chuyến trong ngày)
                for (var i = 0; i < 7; i++)
                {
                    var dailyVariation = 1 + (-0.20 + Random.Shared.NextDouble() * 0.40);
                    priceHistory.Add(new PriceHistory
                    {
                        Mode = "flight",
                        RouteFrom = from,
                        RouteTo = to,
                        Price = (decimal)Math.Round(flightBase * dailyVariation / 10000) * 10000,
                        RecordedDate = date,
                        CreatedAt = DateTime.UtcNow,
                    });
                    priceHistory.Add(new PriceHistory
                    {
                        Mode = "train",
                        RouteFrom = from,
                        RouteTo = to,
                        Price = (decimal)Math.Round(trainBase * dailyVariation / 10000) * 10000,
                        RecordedDate = date,
                        CreatedAt = DateTime.UtcNow,
                    });
                    priceHistory.Add(new PriceHistory
                    {
                        Mode = "bus",
                        RouteFrom = from,
                        RouteTo = to,
                        Price = (decimal)Math.Round(busBase * dailyVariation / 10000) * 10000,
                        RecordedDate = date,
                        CreatedAt = DateTime.UtcNow,
                    });
                }
            }
        }

        _logger.LogInformation("Generated {Count} price history records (flight/train/bus)", priceHistory.Count);
        await _db.PriceHistories.AddRangeAsync(priceHistory);
    }

    private static (string From, string To) PickWeighted((string From, string To, double Weight)[] routes)
    {
        var totalWeight = routes.Sum(r => r.Weight);
        var roll = Random.Shared.NextDouble() * totalWeight;
        var cumulative = 0.0;

        foreach (var (from, to, weight) in routes)
        {
            cumulative += weight;
            if (roll <= cumulative)
                return (from, to);
        }

        return (routes[^1].From, routes[^1].To);
    }

    private static (string Code, string Name) PickWeightedAirline()
    {
        var totalWeight = AirlineWeights.Sum();
        var roll = Random.Shared.NextDouble() * totalWeight;
        var cumulative = 0.0;

        for (var i = 0; i < Airlines.Length; i++)
        {
            cumulative += AirlineWeights[i];
            if (roll <= cumulative)
                return Airlines[i];
        }

        return Airlines[^1];
    }

    public async Task SeedCommunityTipsAsync()
    {
        if (await _db.CommunityTips.AnyAsync())
        {
            _logger.LogInformation("Seed CommunityTips skipped: table already has data.");
            return;
        }

        _logger.LogInformation("Seeding CommunityTips...");

        var flightRoutePairs = new (string From, string To)[]
        {
            ("HAN", "SGN"), ("SGN", "HAN"), ("HAN", "DAD"), ("DAD", "HAN"),
            ("SGN", "DAD"), ("DAD", "SGN"), ("SGN", "PQC"), ("PQC", "SGN"),
            ("HAN", "CXR"), ("CXR", "HAN"), ("SGN", "CXR"), ("CXR", "SGN"),
            ("HAN", "HPH"), ("HPH", "HAN"), ("SGN", "HPH"), ("HPH", "SGN"),
            ("HAN", "HUI"), ("HUI", "HAN"), ("SGN", "HUI"), ("HUI", "SGN"),
            ("DAD", "HPH"), ("HPH", "DAD"), ("SGN", "VII"), ("VII", "SGN"),
            ("HAN", "VII"), ("VII", "HAN"), ("DAD", "CXR"), ("CXR", "DAD"),
            ("SGN", "VCA"), ("VCA", "SGN"), ("SGN", "UIH"), ("UIH", "SGN"),
            ("HAN", "VCA"), ("VCA", "HAN"), ("DAD", "HUI"), ("HUI", "DAD"),
        };

        var trainRoutePairs = new (string From, string To)[]
        {
            ("HAN", "HCM"), ("HCM", "HAN"), ("DAD", "HCM"), ("HCM", "DAD"),
            ("HUI", "HCM"), ("HCM", "HUI"), ("VII", "HCM"), ("HCM", "VII"),
            ("DAD", "QNG"), ("QNG", "DAD"), ("CXR", "HCM"), ("HCM", "CXR"),
        };

        var categories = new[] { "thoi-gian", "gia", "di-chuyen", "an-uong", "khac" };

        var templateTips = new Dictionary<string, string[]>
        {
            ["thoi-gian"] = [
                "Bay sáng sớm rẻ hơn 20-30% so với giờ cao điểm.",
                "Thứ 3-4 hàng tuần thường có giá vé rẻ nhất trong tuần.",
                "Mùa cao điểm giá vé có thể đắt gấp đôi ngày thường.",
                "Bay chuyến tối muộn tiết kiệm được 30-40% chi phí.",
                "Đặt vé trước 2-3 tuần thường có giá tốt nhất.",
                "Tránh bay vào ngày lễ, Tết nếu không thực sự cần thiết.",
                "Khung giờ 6h-8h sáng và 18h-20h tối là cao điểm.",
                "Bay đêm muộn sau 22h thường rẻ hơn 40%.",
            ],
            ["gia"] = [
                "So sánh giá trên 3 app: Vietnam Airlines, VietJet, Bamboo trước khi đặt.",
                "Website chính thức của hãng thường rẻ hơn OTA 50-100k.",
                "Canh flash sale 99k-199k của VietJet và Bamboo vào thứ 6 hàng tuần.",
                "Combo bay + khách sạn tiết kiệm hơn đặt lẻ 15-20%.",
                "Vé khứ hồi luôn rẻ hơn mua 2 vé một chiều riêng lẻ.",
                "Đặt vé qua app tích điểm hoàn tiền được 3-5%.",
                "Mua vé nhóm 5-10 người được giảm thêm 5%.",
                "So sánh giá tàu hỏa và máy bay trước khi quyết định.",
            ],
            ["di-chuyen"] = [
                "Tàu hỏa tiết kiệm 40-60% so với vé máy bay cùng chặng.",
                "Grab từ sân bay nên đặt trước để có giá cố định, tránh kẹt xe.",
                "Xe bus sân bay rẻ hơn taxi 3-4 lần, phù hợp đi một mình.",
                "Check-in online trước 24h giúp chọn chỗ đẹp và tránh xếp hàng.",
                "Đến sân bay trước 2 tiếng với nội địa, 3 tiếng với quốc tế.",
                "Từ sân bay về trung tâm nên đi bus 109 giá chỉ 20k.",
                "Thuê xe máy tại điểm đến rẻ hơn taxi 5-6 lần.",
                "Xe công nghệ cạnh tranh hơn taxi truyền thống 20-30%.",
            ],
            ["an-uong"] = [
                "Quán ăn ven đường ngon và rẻ hơn nhà hàng trong trung tâm 50%.",
                "Nên mang theo đồ ăn nhẹ lên máy bay để tránh đói.",
                "Đồ ăn tại sân bay thường đắt gấp 3 lần bên ngoài.",
                "Thử đặc sản địa phương tại khu vực chợ hoặc quán bình dân.",
                "Mang chai nước rỗng qua soi rồi lấy nước ở khu vực chờ.",
                "Ăn nhẹ trước khi ra sân bay để tiết kiệm chi phí.",
                "Hỏi người địa phương để biết quán ngon giá rẻ.",
                "Tránh ăn uống ở khu vực sân bay và nhà ga du lịch.",
            ],
            ["khac"] = [
                "Luôn mang theo áo khoác mỏng vì máy lạnh trên tàu xe rất lạnh.",
                "Download app của hãng để check-in nhanh và nhận thông báo.",
                "Mang sạc dự phòng dung lượng lớn và tai nghe chống ồn.",
                "Kiểm tra visa transit nếu bay qua nước thứ ba.",
                "Nên mua bảo hiểm du lịch để đề phòng rủi ro.",
                "Chụp ảnh vé và passport để dự phòng khi mất giấy tờ.",
                "Phân loại hành lý xách tay và ký gửi đúng quy định.",
                "Mang dép đi trong chuyến bay đường dài cho thoải mái.",
            ],
        };

        var authors = new[]
        {
            "Minh Anh", "Hoàng Long", "Thu Thảo", "Đức Huy", "Phương Linh",
            "Tuấn Kiệt", "Bảo Ngọc", "Minh Quân", "Khánh Vy", "Đăng Khoa",
            "An Nhiên", "Gia Bảo", "Yến Nhi", "Công Thành", "Như Quỳnh",
            "Trí Dũng", "Lan Chi", "Hữu Phước", "Mỹ Tâm", "Thái Dương",
        };

        var tips = new List<CommunityTip>();
        var now = DateTime.UtcNow;
        var count = 0;

        foreach (var (from, to) in flightRoutePairs.Concat(trainRoutePairs))
        {
            foreach (var category in categories)
            {
                var numTips = Random.Shared.Next(1, 3);
                var templates = templateTips[category];
                var chosen = templates.OrderBy(_ => Random.Shared.Next()).Take(numTips).ToArray();

                foreach (var tipContent in chosen)
                {
                    var author = authors[Random.Shared.Next(authors.Length)];
                    var daysAgo = Random.Shared.Next(0, 30);
                    var hoursAgo = Random.Shared.Next(0, 24);
                    var minutesAgo = Random.Shared.Next(0, 60);

                    tips.Add(new CommunityTip
                    {
                        RouteFrom = from,
                        RouteTo = to,
                        Category = category,
                        Tip = tipContent,
                        AuthorName = author,
                        Email = $"{author.ToLowerInvariant().Replace(" ", ".")}@gmail.com",
                        Upvotes = Random.Shared.Next(0, 16),
                        CreatedAt = now.AddDays(-daysAgo).AddHours(-hoursAgo).AddMinutes(-minutesAgo),
                    });
                    count++;
                }
            }
        }

        await _db.CommunityTips.AddRangeAsync(tips);
        await _db.SaveChangesAsync();
        _logger.LogInformation("Seed CommunityTips: {Count} tips added for {Routes} routes.", count, flightRoutePairs.Length + trainRoutePairs.Length);
    }

    private static int GetWeightedHour()
    {
        var roll = Random.Shared.NextDouble();
        return roll switch
        {
            < 0.25 => Random.Shared.Next(6, 10),
            < 0.40 => Random.Shared.Next(10, 13),
            < 0.60 => Random.Shared.Next(13, 18),
            < 0.85 => Random.Shared.Next(18, 22),
            _      => Random.Shared.Next(22, 24),
        };
    }
}
