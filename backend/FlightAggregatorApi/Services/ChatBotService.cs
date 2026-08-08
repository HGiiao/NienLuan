using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;

namespace FlightAggregatorApi.Services;

/// <summary>
/// Rule-based Vietnamese travel assistant: parses the customer's natural-language
/// message (locations, date, transport mode, budget), queries the database for
/// matching options across flights / buses / trains and returns clickable suggestions.
/// </summary>
public class ChatBotService
{
    private readonly ApplicationDbContext _db;

    public ChatBotService(ApplicationDbContext db)
    {
        _db = db;
    }

    // ---------- Location aliases (normalized WITHOUT diacritics) ----------

    private static readonly Dictionary<string, string> LocationAliases = new()
    {
        ["ha noi"] = "HAN", ["hanoi"] = "HAN", ["hn"] = "HAN", ["han"] = "HAN",
        ["sai gon"] = "SGN", ["saigon"] = "SGN", ["ho chi minh"] = "SGN", ["hcm"] = "SGN",
        ["tphcm"] = "SGN", ["tp hcm"] = "SGN", ["sgn"] = "SGN",
        ["da nang"] = "DAD", ["danang"] = "DAD", ["dad"] = "DAD",
        ["nha trang"] = "CXR", ["cxr"] = "CXR",
        ["phu quoc"] = "PQC", ["pqc"] = "PQC",
        ["hai phong"] = "HPH", ["hph"] = "HPH",
        ["hue"] = "HUI", ["hui"] = "HUI",
        ["vinh"] = "VII", ["vii"] = "VII",
        ["can tho"] = "VCA", ["vca"] = "VCA",
        ["quy nhon"] = "UIH", ["uih"] = "UIH",
        ["quang ngai"] = "QNG", ["qng"] = "QNG",
    };

    private static readonly Dictionary<string, string> CityNames = new()
    {
        ["HAN"] = "Hà Nội", ["SGN"] = "TP. Hồ Chí Minh", ["DAD"] = "Đà Nẵng",
        ["CXR"] = "Nha Trang", ["PQC"] = "Phú Quốc", ["HPH"] = "Hải Phòng",
        ["HUI"] = "Huế", ["VII"] = "Vinh", ["VCA"] = "Cần Thơ",
        ["UIH"] = "Quy Nhơn", ["QNG"] = "Quảng Ngãi",
    };

    // ---------- Vietnamese diacritic stripping ----------

    private static readonly Dictionary<char, char> Diacritics = BuildDiacriticMap();

    private static Dictionary<char, char> BuildDiacriticMap()
    {
        const string from = "àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ";
        const string to   = "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd";
        var map = new Dictionary<char, char>();
        for (var i = 0; i < from.Length; i++)
            map[from[i]] = to[i];
        return map;
    }

    internal static string Normalize(string s)
    {
        var sb = new System.Text.StringBuilder(s.Length);
        foreach (var ch in s)
        {
            var c = char.ToLowerInvariant(ch);
            sb.Append(Diacritics.TryGetValue(c, out var plain) ? plain : c);
        }
        return sb.ToString();
    }

    // ---------- Public entry ----------

    public async Task<ChatBotResult> RecommendAsync(string message)
    {
        var text = Normalize(message ?? "").Trim();

        // Greeting / empty
        if (string.IsNullOrWhiteSpace(text)
            || text.Contains("xin chao") || text == "hello" || text == "hi" || text == "chao"
            || text.Contains("giup") || text.Contains("ho tro") || text == "1")
        {
            return new ChatBotResult
            {
                Reply = "Chào bạn! 👋 Mình là trợ lý Vé247. Bạn đang phân vân chọn phương tiện? " +
                        "Hãy cho mình biết: bạn muốn đi từ đâu → đâu, đi ngày nào, và muốn đi bằng máy bay, tàu hỏa hay xe khách. " +
                        "Mình sẽ tra giá thực tế và gợi ý lựa chọn phù hợp nhất nhé!",
                Intent = new ChatIntent(),
                QuickReplies =
                [
                    "Tôi muốn đi Hà Nội - Đà Nẵng ngày mai",
                    "Phương tiện nào rẻ nhất từ Sài Gòn ra Đà Nẵng?",
                    "Có tàu hỏa Hà Nội đi Huế cuối tuần không?",
                    "Tìm xe khách Hà Nội - Sài Gòn dưới 500k",
                ],
            };
        }

        var intent = ParseIntent(message ?? "");

        // Missing locations
        if (intent.From == null || intent.To == null || intent.From == intent.To)
        {
            return new ChatBotResult
            {
                Reply = "Mình cần biết điểm đi và điểm đến của bạn. Bạn thử gõ lại kiểu này nhé: " +
                        "\"Tôi muốn đi Hà Nội đến Đà Nẵng ngày mai\" — hoặc chọn nhanh bên dưới 👇",
                Intent = intent,
                QuickReplies =
                [
                    "Tôi muốn đi Hà Nội - Đà Nẵng ngày mai",
                    "Phương tiện nào rẻ nhất từ Sài Gòn ra Đà Nẵng?",
                    "Đi Huế bằng tàu hỏa cuối tuần này",
                ],
            };
        }

        var options = await FindOptionsAsync(intent);
        intent.Options = options;

        var reply = BuildReply(intent, options);
        return new ChatBotResult
        {
            Reply = reply,
            Intent = intent,
            Options = options,
            QuickReplies = BuildFollowUpQuickReplies(intent, options),
        };
    }

    // ---------- Intent parsing (pure, unit-testable) ----------

    public static ChatIntent ParseIntent(string message)
    {
        var text = Normalize(message ?? "");
        var intent = new ChatIntent();

        // Locations in order of appearance
        var locations = new List<(int Pos, string Code)>();
        foreach (var (alias, code) in LocationAliases)
        {
            var idx = text.IndexOf(alias, StringComparison.Ordinal);
            while (idx >= 0)
            {
                // Avoid matching inside another word (e.g. "thanh" inside "thanh hoa")
                if (IsWordBoundary(text, idx, alias.Length))
                    locations.Add((idx, code));
                idx = text.IndexOf(alias, idx + alias.Length, StringComparison.Ordinal);
            }
        }

        if (locations.Count > 0)
        {
            // If "đến" appears, the location after it is the destination
            // (occurrence order handles the rest; "toi " and " ve " are too ambiguous with "tôi"/"vé")
            var destMarker = FindFirstMarker(text, ["den "]);
            var fromPos = -1; var toPos = -1;
            foreach (var (pos, code) in locations.OrderBy(l => l.Pos))
            {
                if (destMarker >= 0 && pos > destMarker && toPos < 0) { toPos = pos; continue; }
                if (fromPos < 0) fromPos = pos;
                else if (toPos < 0) toPos = pos;
            }

            var ordered = locations.OrderBy(l => l.Pos).ToList();
            intent.From = ordered[0].Code;
            intent.To = ordered.Count > 1 ? ordered[^1].Code : null;

            // "đến/tới/về X" overrides destination
            if (destMarker >= 0 && toPos >= 0)
            {
                var toCode = locations.First(l => l.Pos == toPos).Code;
                intent.To = toCode;
                if (toPos == ordered[0].Pos) intent.From = null; // only one city mentioned after marker
            }

            if (intent.From == intent.To) intent.To = null;
            if (intent.From == null && intent.To != null) { intent.From = intent.To; intent.To = null; }
        }

        // Transport mode
        if (ContainsAny(text, ["may bay", "ve bay", "hang khong"])) intent.Mode = "flight";
        else if (ContainsAny(text, ["tau hoa", "tau lua", " di tau", "ve tau", "duong sat"])) intent.Mode = "train";
        else if (ContainsAny(text, ["xe khach", " xe ", " xe buyt", "limousine", "bus", "nha xe"])) intent.Mode = "bus";

        // Preference
        if (ContainsAny(text, ["re nhat", "gia re", " tiet kiem", "roi nhat", "dang re"])) intent.Preference = "cheap";
        else if (ContainsAny(text, ["nhanh nhat", " nhanh ", "mat it thoi gian"])) intent.Preference = "fast";

        // Budget (e.g. "dưới 500k", "tối đa 1 triệu", "2tr")
        intent.MaxBudget = ParseBudget(text);

        // Date
        intent.Date = ParseDate(text);
        intent.DateLabel = intent.Date?.ToString("dd/MM/yyyy");
        intent.TimeFrom = ParseTimeOfDay(text, out var timeTo) ? "06:00" : null;
        if (intent.TimeFrom != null && timeTo != null) intent.TimeTo = timeTo;

        return intent;
    }

    private static bool IsWordBoundary(string text, int idx, int len)
    {
        var before = idx > 0 ? text[idx - 1] : ' ';
        var after = idx + len < text.Length ? text[idx + len] : ' ';
        return !char.IsLetterOrDigit(before) && !char.IsLetterOrDigit(after);
    }

    private static int FindFirstMarker(string text, string[] markers)
    {
        var best = -1;
        foreach (var m in markers)
        {
            var idx = text.IndexOf(m, StringComparison.Ordinal);
            if (idx >= 0 && (best < 0 || idx < best)) best = idx;
        }
        return best;
    }

    private static bool ContainsAny(string text, string[] words)
        => words.Any(w => text.Contains(w, StringComparison.Ordinal));

    private static decimal? ParseBudget(string text)
    {
        // patterns: "duoi 500k", "toi da 1 trieu", "500 nghin", "1.5tr", "2tr", "duoi 2tr"
        var m = System.Text.RegularExpressions.Regex.Match(text,
            @"(?:duoi|toi da|trong khoang|max)\s*([\d][\d.,]*)\s*(tr|trieu|m\b|nghin|k\b)?");
        decimal? amount = null;
        if (m.Success)
        {
            amount = ParseAmount(m.Groups[1].Value, m.Groups[2].Value);
        }
        else
        {
            var m2 = System.Text.RegularExpressions.Regex.Match(text,
                @"([\d][\d.,]*)\s*(tr|trieu|m\b|nghin|k\b)");
            if (m2.Success) amount = ParseAmount(m2.Groups[1].Value, m2.Groups[2].Value);
        }
        return amount;
    }

    private static decimal ParseAmount(string num, string unit)
    {
        var s = num.Trim().Replace(" ", "");
        // "1.5" → 1.5 (decimal); "1.500.000" → 1500000 (thousands); "500" → 500
        if (s.Contains('.') && !s.Contains(','))
        {
            var parts = s.Split('.');
            if (parts.Length == 2 && parts[1].Length <= 2)
                return decimal.Parse(s, System.Globalization.CultureInfo.InvariantCulture) * Multiplier(unit);
            s = s.Replace(".", "");
        }
        s = s.Replace(",", ".");
        return decimal.Parse(s, System.Globalization.CultureInfo.InvariantCulture) * Multiplier(unit);
    }

    private static decimal Multiplier(string unit) => unit switch
    {
        "tr" or "trieu" or "m" => 1_000_000m,
        "nghin" or "k" => 1_000m,
        _ => 1m,
    };

    private static DateOnly? ParseDate(string text)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (text.Contains("hom nay")) return today;
        if (text.Contains("ngay mai") || text.Contains("mai ")) return today.AddDays(1);
        if (text.Contains("ngay kia") || text.Contains("ngay mo") || text.Contains(" ngay mot")) return today.AddDays(2);
        if (text.Contains("cuoi tuan")) return today.AddDays(((int)DayOfWeek.Saturday - (int)today.DayOfWeek + 7) % 7);
        if (text.Contains("tuan sau")) return today.AddDays(7);

        // "thứ hai".."chủ nhật"
        var dayNames = new[] { "chu nhat", "thu hai", "thu ba", "thu tu", "thu nam", "thu sau", "thu bay" };
        for (var i = 0; i < dayNames.Length; i++)
        {
            if (text.Contains(dayNames[i]))
            {
                var target = i == 0 ? DayOfWeek.Sunday : (DayOfWeek)i;
                var diff = ((int)target - (int)today.DayOfWeek + 7) % 7;
                return diff == 0 ? today.AddDays(7) : today.AddDays(diff);
            }
        }

        // "ngay 15", "15/8", "15-8", "15 thang 8", "15.8" — but NOT a budget like "1.5tr"
        var m = System.Text.RegularExpressions.Regex.Match(text,
            @"(?:ngay\s*)?(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?(?!\s*(?:tr|trieu|nghin|k|m)\b)");
        if (m.Success)
        {
            var day = int.Parse(m.Groups[1].Value);
            var month = int.Parse(m.Groups[2].Value);
            var year = m.Groups[3].Success ? int.Parse(m.Groups[3].Value) : today.Year;
            if (year < 100) year += 2000;
            try { return new DateOnly(year, month, day); }
            catch { return null; }
        }

        return today;
    }

    private static bool ParseTimeOfDay(string text, out string? timeTo)
    {
        // Use explicit phrases to avoid "sang" (đổi sang) and "tôi" (tối) false positives
        timeTo = null;
        if (ContainsAny(text, ["buoi sang", "sang som", "sang nay", " luc sang"])) { timeTo = "12:00"; return true; }
        if (ContainsAny(text, ["buoi trua", " luc trua"])) { timeTo = "14:00"; return true; }
        if (ContainsAny(text, ["buoi chieu", " luc chieu", "chieu nay"])) { timeTo = "18:00"; return true; }
        if (ContainsAny(text, ["buoi toi", " luc toi", "toi nay"])) { timeTo = "24:00"; return true; }
        return false;
    }

    // ---------- Database lookup ----------

    private async Task<List<ChatOption>> FindOptionsAsync(ChatIntent intent)
    {
        var from = intent.From!;
        var to = intent.To!;
        var date = intent.Date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var options = new List<ChatOption>();

        async Task AddModeAsync(string mode, Func<Task<ModeAgg?>> query)
        {
            if (intent.Mode != null && intent.Mode != mode) return;
            var agg = await query();
            if (agg == null || agg.Count == 0) return;
            if (intent.MaxBudget.HasValue && agg.MinPrice > intent.MaxBudget.Value) return;
            options.Add(new ChatOption
            {
                Mode = mode,
                Label = mode switch { "flight" => "Máy bay", "bus" => "Xe khách", _ => "Tàu hỏa" },
                Count = agg.Count,
                MinPrice = agg.MinPrice,
                MinDurationMinutes = agg.MinDuration.TotalMinutes,
                Nav = BuildNav(mode, from, to, date, intent),
            });
        }

        // NOTE: duration is aggregated in C# (projecting 3 columns) — SQL Server
        // cannot translate Min(ArrivalTime - DepartureTime) into a query.
        if (intent.Mode == null || intent.Mode == "flight")
            await AddModeAsync("flight", () => QueryFlightsAsync(from, to, date));
        if (intent.Mode == null || intent.Mode == "train")
            await AddModeAsync("train", () => QueryTrainsAsync(from, to, date));
        if (intent.Mode == null || intent.Mode == "bus")
            await AddModeAsync("bus", () => QueryBusesAsync(from, to, date));

        // Preference: cheap → ascending, fast → by duration
        options = intent.Preference switch
        {
            "fast" => [.. options.OrderBy(o => o.MinDurationMinutes)],
            _ => [.. options.OrderBy(o => o.MinPrice)],
        };
        return options;
    }

    private async Task<ModeAgg?> QueryFlightsAsync(string from, string to, DateOnly date)
        => Aggregate(await _db.Flights.AsNoTracking()
            .Where(f => f.DepartureLocation == from && f.ArrivalLocation == to && f.FlightDate == date)
            .Select(f => new ModeRow(f.Price, f.DepartureTime, f.ArrivalTime))
            .ToListAsync());

    // Trains use station code "HCM" (not airport code "SGN")
    private async Task<ModeAgg?> QueryTrainsAsync(string from, string to, DateOnly date)
        => Aggregate(await _db.Trains.AsNoTracking()
            .Where(t => t.DepartureLocation == TrainCode(from) && t.ArrivalLocation == TrainCode(to) && t.TrainDate == date)
            .Select(t => new ModeRow(t.Price, t.DepartureTime, t.ArrivalTime))
            .ToListAsync());

    private async Task<ModeAgg?> QueryBusesAsync(string from, string to, DateOnly date)
        => Aggregate(await _db.Buses.AsNoTracking()
            .Where(b => b.DepartureLocation == from && b.ArrivalLocation == to && b.BusDate == date)
            .Select(b => new ModeRow(b.Price, b.DepartureTime, b.ArrivalTime))
            .ToListAsync());

    private static ModeAgg? Aggregate(IEnumerable<ModeRow> rows)
    {
        var list = rows.ToList();
        if (list.Count == 0) return null;
        return new ModeAgg
        {
            Count = list.Count,
            MinPrice = list.Min(r => r.Price),
            MinDuration = list.Min(r => r.Arr - r.Dep),
        };
    }

    private sealed record ModeRow(decimal Price, DateTime Dep, DateTime Arr);

    private static string BuildNav(string mode, string from, string to, DateOnly date, ChatIntent intent)
    {
        var path = mode switch { "flight" => "/flights", "bus" => "/buses", _ => "/trains" };
        var f = mode == "train" ? TrainCode(from) : from;
        var t = mode == "train" ? TrainCode(to) : to;
        var q = $"from={f}&to={t}&date={date:yyyy-MM-dd}&tripType=one-way";
        if (intent.TimeFrom != null) q += $"&timeFrom={intent.TimeFrom}";
        if (intent.TimeTo != null) q += $"&timeTo={intent.TimeTo}";
        return $"{path}?{q}";
    }

    private static string TrainCode(string code) => code == "SGN" ? "HCM" : code;

    // ---------- Reply generation ----------

    private static string BuildReply(ChatIntent intent, List<ChatOption> options)
    {
        var fromName = CityNames.GetValueOrDefault(intent.From!, intent.From!);
        var toName = CityNames.GetValueOrDefault(intent.To!, intent.To!);
        var dateLabel = intent.DateLabel ?? DateOnly.FromDateTime(DateTime.UtcNow).ToString("dd/MM/yyyy");

        if (options.Count == 0)
        {
            return $"Mình không tìm thấy phương tiện nào cho tuyến {fromName} → {toName} ngày {dateLabel}. " +
                   "Bạn thử đổi ngày khác hoặc chọn tuyến phổ biến khác nhé? 😊";
        }

        var best = options[0];
        var parts = new List<string>
        {
            $"Mình tìm thấy {options.Count} lựa chọn cho tuyến {fromName} → {toName} ngày {dateLabel}:"
        };

        var priceLines = options.Select(o =>
            $"{o.Label}: từ {o.MinPrice:N0}đ ({o.Count} chuyến)");
        parts.Add(string.Join(" | ", priceLines));

        parts.Add(best.Mode switch
        {
            "flight" => "✈️ Máy bay nhanh nhất và đang là lựa chọn tiết kiệm thời gian nhất.",
            "bus" => "🚌 Xe khách đang rẻ nhất — phù hợp nếu bạn muốn tiết kiệm chi phí.",
            _ => "🚆 Tàu hỏa đang có mức giá tốt — thoải mái và an toàn.",
        });

        parts.Add("Bấm vào 1 gợi ý bên dưới để xem chi tiết chuyến nhé! 👇");
        return string.Join("\n", parts);
    }

    private static List<string> BuildFollowUpQuickReplies(ChatIntent intent, List<ChatOption> options)
    {
        var fromName = CityNames.GetValueOrDefault(intent.From!, intent.From!);
        var toName = CityNames.GetValueOrDefault(intent.To!, intent.To!);
        var list = new List<string>();
        if (options.Count == 0)
        {
            list.Add("Tôi muốn đi Hà Nội - Đà Nẵng ngày mai");
            list.Add("Phương tiện nào rẻ nhất từ Sài Gòn ra Đà Nẵng?");
            return list;
        }
        // Self-contained chips (bot is stateless — always embed the route)
        if (options.Any(o => o.Mode == "flight"))
            list.Add($"Chuyến bay nào rẻ nhất {fromName} - {toName}?");
        if (options.Any(o => o.Mode == "bus"))
            list.Add($"So sánh giá 3 phương tiện {fromName} - {toName}");
        list.Add("Tôi muốn đi Hà Nội - Sài Gòn cuối tuần");
        return list.Take(3).ToList();
    }

    private sealed class ModeAgg
    {
        public int Count { get; set; }
        public decimal MinPrice { get; set; }
        public TimeSpan MinDuration { get; set; }
    }
}

public class ChatIntent
{
    public string? From { get; set; }
    public string? To { get; set; }
    public DateOnly? Date { get; set; }
    public string? DateLabel { get; set; }
    public string? Mode { get; set; }
    public string? Preference { get; set; }
    public decimal? MaxBudget { get; set; }
    public string? TimeFrom { get; set; }
    public string? TimeTo { get; set; }
    public List<ChatOption> Options { get; set; } = new();
}

public class ChatOption
{
    public string Mode { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal MinPrice { get; set; }
    public double MinDurationMinutes { get; set; }
    public string Nav { get; set; } = string.Empty;
}

public class ChatBotResult
{
    public string Reply { get; set; } = string.Empty;
    public ChatIntent Intent { get; set; } = new();
    public List<ChatOption> Options { get; set; } = new();
    public List<string> QuickReplies { get; set; } = new();
}
