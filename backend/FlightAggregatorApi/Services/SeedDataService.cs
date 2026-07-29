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

    private static readonly string[] TrainCodePrefixes = ["SE", "TN", "LP"];

    private static readonly Dictionary<string, (int Min, int Max)> RoutePriceRange = new()
    {
        ["HAN-SGN"] = (1_800_000, 3_500_000), ["SGN-HAN"] = (1_800_000, 3_500_000),
        ["HAN-DAD"] = (1_000_000, 2_200_000), ["DAD-HAN"] = (1_000_000, 2_200_000),
        ["SGN-DAD"] = (1_000_000, 2_200_000), ["DAD-SGN"] = (1_000_000, 2_200_000),
        ["SGN-PQC"] = (1_200_000, 2_800_000), ["PQC-SGN"] = (1_200_000, 2_800_000),
        ["HAN-CXR"] = (1_500_000, 3_000_000), ["CXR-HAN"] = (1_500_000, 3_000_000),
    };

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
        var usedTrainCodes = new HashSet<string>();

        for (var date = today; date <= endDate; date = date.AddDays(1))
        {
            var isWeekend = date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;
            var weekendMultiplier = isWeekend ? 1.1 + Random.Shared.NextDouble() * 0.2 : 1.0;

            GenerateFlightsForDate(date, weekendMultiplier, flights);
            GenerateTrainsForDate(date, weekendMultiplier, trains, usedTrainCodes);
        }

        _logger.LogInformation("Generated {Flights} flights and {Trains} trains", flights.Count, trains.Count);

        await _db.Flights.AddRangeAsync(flights);
        await _db.Trains.AddRangeAsync(trains);

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

        // 5 cặp khứ hồi (10 chuyến) — chung 1 hãng bay cho cả ngày
        var rtAirline = PickWeightedAirline();
        var pairIdx = 0;

        foreach (var (from, to) in RoundTripPairs)
        {
            var groupId = date.DayNumber * 10L + pairIdx;

            // Chuyến đi (outbound) — buổi sáng
            var outboundHour = Random.Shared.Next(6, 11);
            var outboundMinute = Random.Shared.Next(0, 12) * 5;
            var outboundDeparture = date.ToDateTime(new TimeOnly(outboundHour, outboundMinute));
            var outboundDuration = Random.Shared.Next(50, 181);
            var outboundArrival = outboundDeparture.AddMinutes(outboundDuration);

            var outboundBasePrice = 800_000 + Random.Shared.NextDouble() * (4_500_000 - 800_000);
            outboundBasePrice *= weekendMultiplier;
            var outboundPrice = (decimal)Math.Round(outboundBasePrice / 10000) * 10000;
            if (outboundPrice < 500_000m) outboundPrice = 500_000m;

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
                FlightDate = date,
                RoundTripGroupId = groupId,
                CreatedAt = DateTime.UtcNow,
            });

            // Chuyến về (return) — buổi chiều
            var returnHour = Random.Shared.Next(14, 20);
            var returnMinute = Random.Shared.Next(0, 12) * 5;
            var returnDeparture = date.ToDateTime(new TimeOnly(returnHour, returnMinute));
            var returnDuration = Random.Shared.Next(50, 181);
            var returnArrival = returnDeparture.AddMinutes(returnDuration);

            var returnBasePrice = 800_000 + Random.Shared.NextDouble() * (4_500_000 - 800_000);
            returnBasePrice *= weekendMultiplier;
            if (Random.Shared.NextDouble() < 0.18)
                returnBasePrice *= 0.7 + Random.Shared.NextDouble() * 0.15;
            var returnPrice = (decimal)Math.Round(returnBasePrice / 10000) * 10000;
            if (returnPrice < 500_000m) returnPrice = 500_000m;

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
                FlightDate = date,
                RoundTripGroupId = groupId,
                CreatedAt = DateTime.UtcNow,
            });

            pairIdx++;
        }

        // 10 chuyến 1 chiều ngẫu nhiên
        for (var i = 0; i < 10; i++)
        {
            var (from, to) = PickWeighted(FlightRoutes);
            var airline = PickWeightedAirline();

            var hour = GetWeightedHour();
            var minute = Random.Shared.Next(0, 12) * 5;
            var departureTime = date.ToDateTime(new TimeOnly(hour, minute));

            var durationMinutes = Random.Shared.Next(50, 181);
            var arrivalTime = departureTime.AddMinutes(durationMinutes);

            var basePrice = 800_000 + Random.Shared.NextDouble() * (4_500_000 - 800_000);
            basePrice *= weekendMultiplier;

            var isDeal = Random.Shared.NextDouble() < 0.18;
            if (isDeal)
                basePrice *= 0.7 + Random.Shared.NextDouble() * 0.15;

            var price = (decimal)Math.Round(basePrice / 10000) * 10000;
            if (price < 500_000m) price = 500_000m;

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

            var hour = Random.Shared.Next(0, 24);
            var minute = Random.Shared.Next(0, 12) * 5;
            var departureTime = date.ToDateTime(new TimeOnly(hour, minute));

            var durationMinutes = Random.Shared.Next(180, 1201);
            var arrivalTime = departureTime.AddMinutes(durationMinutes);

            var basePrice = 250_000 + Random.Shared.NextDouble() * (1_800_000 - 250_000);
            basePrice *= weekendMultiplier;

            if (Random.Shared.NextDouble() < 0.15)
                basePrice *= 0.75 + Random.Shared.NextDouble() * 0.15;

            var price = (decimal)Math.Round(basePrice / 10000) * 10000;
            if (price < 150_000m) price = 150_000m;

            var prefix = TrainCodePrefixes[Random.Shared.Next(TrainCodePrefixes.Length)];
            var number = Random.Shared.Next(1, 100);
            var trainCode = $"{prefix}{number}";
            while (!usedCodes.Add(trainCode))
            {
                number = Random.Shared.Next(1, 100);
                trainCode = $"{prefix}{number}";
            }

            var coachClass = CoachClasses[Random.Shared.Next(CoachClasses.Length)];

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

    private async Task SeedPriceHistoryAsync(DateOnly startDate, DateOnly endDate)
    {
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
                var variation = -0.15 + Random.Shared.NextDouble() * 0.30;
                var price = basePrice * (1 + variation);
                price = Math.Round(price / 10000) * 10000;

                // Weekend bump for historical realism
                if (date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
                    price *= 1.05 + Random.Shared.NextDouble() * 0.15;

                priceHistory.Add(new PriceHistory
                {
                    RouteFrom = from,
                    RouteTo = to,
                    Price = (decimal)price,
                    RecordedDate = date,
                    CreatedAt = DateTime.UtcNow,
                });
            }
        }

        _logger.LogInformation("Generated {Count} price history records", priceHistory.Count);
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
