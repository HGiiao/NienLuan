using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;
using FlightAggregatorApi.Models;

namespace FlightAggregatorApi.Controllers;

[ApiController]
[Route("api/lucky-wheel")]
public class LuckyWheelController : ControllerBase
{
    private const int SpinsPerWindow = 3;
    private static readonly TimeSpan Window = TimeSpan.FromHours(3);
    private const double WinRate = 0.18; // tỉ lệ trúng mã giảm giá — cố tình thấp

    // Vị trí các ô trên vòng quay (8 ô): ô 1 và 5 là "Giảm giá", còn lại "May mắn lần sau"
    private static readonly int[] WinSegments = [1, 5];
    private static readonly int[] LoseSegments = [0, 2, 3, 4, 6, 7];

    private static readonly Random _rng = new();

    private readonly ApplicationDbContext _db;
    private readonly ILogger<LuckyWheelController> _logger;

    public LuckyWheelController(ApplicationDbContext db, ILogger<LuckyWheelController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>Số lượt quay còn lại + thời điểm reset (cửa sổ 3 tiếng gần nhất).</summary>
    [HttpGet("status")]
    public async Task<IActionResult> Status([FromQuery] string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return BadRequest(new { message = "Email không được để trống" });

        var (used, resetAt) = await GetUsageAsync(email);

        return Ok(new
        {
            spinsLeft = Math.Max(0, SpinsPerWindow - used),
            used,
            resetAt,
        });
    }

    [HttpPost("spin")]
    public async Task<IActionResult> Spin([FromBody] SpinRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "Email không được để trống" });

        var (used, resetAt) = await GetUsageAsync(request.Email);
        if (used >= SpinsPerWindow)
        {
            return BadRequest(new
            {
                message = "Bạn đã dùng hết lượt quay trong 3 tiếng — hãy quay lại sau",
                spinsLeft = 0,
                resetAt,
            });
        }

        var win = _rng.NextDouble() < WinRate;
        string? code = null;
        string? description = null;
        decimal? discountPercent = null;
        decimal? maxDiscount = null;
        decimal? minOrderValue = null;
        int prizeIndex;

        if (win)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var promo = await _db.PromoCodes
                .Where(p => p.IsActive && today >= p.ValidFrom && today <= p.ValidTo && p.UsedCount < p.UsageLimit)
                .OrderBy(p => Guid.NewGuid()) // random — EF dịch thành NEWID() trên SQL Server
                .FirstOrDefaultAsync();

            if (promo != null)
            {
                code = promo.Code;
                description = promo.Description;
                discountPercent = promo.DiscountPercent;
                maxDiscount = promo.MaxDiscount;
                minOrderValue = promo.MinOrderValue;
                prizeIndex = WinSegments[_rng.Next(WinSegments.Length)];
            }
            else
            {
                // Không còn mã khả dụng → coi như không trúng
                win = false;
                prizeIndex = LoseSegments[_rng.Next(LoseSegments.Length)];
            }
        }
        else
        {
            prizeIndex = LoseSegments[_rng.Next(LoseSegments.Length)];
        }

        _db.LuckyWheelSpins.Add(new LuckyWheelSpin { Email = request.Email, Won = win, Code = code });
        await _db.SaveChangesAsync();

        var (newUsed, newResetAt) = await GetUsageAsync(request.Email);
        _logger.LogInformation("Lucky wheel: {Email} spin -> win={Win} code={Code}", request.Email, win, code);

        return Ok(new
        {
            win,
            code,
            description,
            discountPercent,
            maxDiscount,
            minOrderValue,
            prizeIndex,
            spinsLeft = Math.Max(0, SpinsPerWindow - newUsed),
            used = newUsed,
            resetAt = newResetAt,
        });
    }

    /// <summary>
    /// Danh sách mã giảm giá đã trúng của user (join với PromoCodes để có đủ thông tin
    /// discount/minOrder — dùng cho trang đặt vé hiển thị đúng mã theo từng tài khoản).
    /// </summary>
    [HttpGet("history")]
    public async Task<IActionResult> History([FromQuery] string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return BadRequest(new { message = "Email không được để trống" });

        var items = await _db.LuckyWheelSpins
            .Where(s => s.Email == email && s.Won && s.Code != null)
            .OrderByDescending(s => s.CreatedAt)
            .Join(_db.PromoCodes,
                s => s.Code,
                p => p.Code,
                (s, p) => new
                {
                    s.Code,
                    s.CreatedAt,
                    p.Description,
                    p.DiscountPercent,
                    p.MaxDiscount,
                    p.MinOrderValue,
                    p.ValidTo,
                    p.IsActive,
                })
            .ToListAsync();

        return Ok(items);
    }

    private async Task<(int Used, DateTime ResetAt)> GetUsageAsync(string email)
    {
        var windowStart = DateTime.UtcNow - Window;
        var spins = await _db.LuckyWheelSpins
            .Where(s => s.Email == email && s.CreatedAt >= windowStart)
            .OrderBy(s => s.CreatedAt)
            .ToListAsync();

        if (spins.Count == 0)
            return (0, DateTime.UtcNow.Add(Window));

        return (spins.Count, spins.Min(s => s.CreatedAt).Add(Window));
    }
}

public class SpinRequest
{
    public string Email { get; set; } = string.Empty;
}
