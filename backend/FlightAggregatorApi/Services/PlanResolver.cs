using FlightAggregatorApi.Data;
using FlightAggregatorApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FlightAggregatorApi.Services;

/// <summary>
/// Xác định gói VIP của user theo email — dùng để buộc áp dụng đúng quyền lợi
/// đã đăng ký ở mọi nơi (giới hạn cảnh báo giá, so sánh hãng, cảnh báo sớm...).
/// Không có tài khoản hoặc gói đã hết hạn → gói Free mặc định.
/// </summary>
public static class PlanResolver
{
    public static async Task<SubscriptionPlan> GetPlanForEmailAsync(ApplicationDbContext db, string email)
    {
        var free = await db.SubscriptionPlans.AsNoTracking().FirstOrDefaultAsync(p => p.Name == "Free")
            ?? new SubscriptionPlan { Name = "Free", MaxAlertsPerDay = 3 };

        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == email);
        if (user == null) return free;

        var sub = await db.UserSubscriptions.AsNoTracking()
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.UserId == user.Id && s.Status == "active" && s.EndDate > DateTime.UtcNow);

        return sub?.Plan ?? free;
    }
}
