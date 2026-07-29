using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;
using FlightAggregatorApi.Models;

namespace FlightAggregatorApi.Controllers;

[ApiController]
[Route("api/subscriptions")]
public class SubscriptionController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public SubscriptionController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet("plans")]
    public async Task<IActionResult> GetPlans()
    {
        var plans = await _db.SubscriptionPlans.AsNoTracking().Where(p => p.IsActive).ToListAsync();
        if (plans.Count == 0)
        {
            plans = SeedPlans();
            _db.SubscriptionPlans.AddRange(plans);
            await _db.SaveChangesAsync();
        }
        return Ok(plans);
    }

    [HttpGet("user/{userId:long}")]
    public async Task<IActionResult> GetUserSubscription(long userId)
    {
        var sub = await _db.UserSubscriptions.AsNoTracking()
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.UserId == userId && s.Status == "active");
        if (sub == null)
        {
            var freePlan = await _db.SubscriptionPlans.AsNoTracking().FirstOrDefaultAsync(p => p.Name == "Free");
            return Ok(new { plan = freePlan, isActive = false });
        }
        return Ok(new { plan = sub.Plan, isActive = true, sub.BillingCycle, sub.EndDate });
    }

    [HttpPost("subscribe")]
    public async Task<IActionResult> Subscribe([FromBody] SubscribeRequest request)
    {
        var user = await _db.Users.FindAsync(request.UserId);
        if (user == null) return NotFound(new { message = "Người dùng không tồn tại" });

        var plan = await _db.SubscriptionPlans.FindAsync(request.PlanId);
        if (plan == null) return NotFound(new { message = "Gói không tồn tại" });

        // Cancel existing active subscription
        var existing = await _db.UserSubscriptions.Where(s => s.UserId == request.UserId && s.Status == "active").ToListAsync();
        foreach (var e in existing) e.Status = "cancelled";

        var endDate = request.BillingCycle == "yearly" ? DateTime.UtcNow.AddYears(1) : DateTime.UtcNow.AddMonths(1);
        var sub = new UserSubscription
        {
            UserId = request.UserId,
            PlanId = request.PlanId,
            BillingCycle = request.BillingCycle,
            EndDate = endDate,
            Status = "active",
        };
        _db.UserSubscriptions.Add(sub);
        await _db.SaveChangesAsync();

        return Ok(new { success = true, subscription = sub });
    }

    [HttpPost("cancel/{userId:long}")]
    public async Task<IActionResult> Cancel(long userId)
    {
        var subs = await _db.UserSubscriptions.Where(s => s.UserId == userId && s.Status == "active").ToListAsync();
        foreach (var s in subs) s.Status = "cancelled";
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    private static List<SubscriptionPlan> SeedPlans()
    {
        return new List<SubscriptionPlan>
        {
            new SubscriptionPlan
            {
                Name = "Free", Description = "Gói cơ bản miễn phí",
                MonthlyPrice = 0, YearlyPrice = 0,
                MaxAlertsPerDay = 3, EarlyPriceAlerts = false, MultiAirlineCompare = false,
                PrioritySupport = false, FastRefund = false, SeatSelection = false, PriorityLevel = 0,
            },
            new SubscriptionPlan
            {
                Name = "VIP", Description = "Cảnh báo giá sớm hơn, so sánh nhiều hãng, ưu tiên hỗ trợ",
                MonthlyPrice = 99000, YearlyPrice = 990000,
                MaxAlertsPerDay = 20, EarlyPriceAlerts = true, MultiAirlineCompare = true,
                PrioritySupport = true, FastRefund = true, SeatSelection = true, PriorityLevel = 1,
            },
            new SubscriptionPlan
            {
                Name = "Premium", Description = "Tất cả quyền lợi VIP + hoàn tiền nhanh 24h, chọn ghế miễn phí",
                MonthlyPrice = 199000, YearlyPrice = 1990000,
                MaxAlertsPerDay = 50, EarlyPriceAlerts = true, MultiAirlineCompare = true,
                PrioritySupport = true, FastRefund = true, SeatSelection = true, PriorityLevel = 2,
            },
        };
    }
}

public class SubscribeRequest
{
    public long UserId { get; set; }
    public long PlanId { get; set; }
    public string BillingCycle { get; set; } = "monthly";
}
