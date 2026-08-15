namespace FlightAggregatorApi.Services;

/// <summary>
/// Chính sách hủy chuyến ("Hủy chuyến" trong phần "Chính sách hoàn & đổi" của chi tiết vé).
/// PHẢI mirror chính xác hàm getFareRules() trong frontend/src/components/TicketDetailModal.jsx:
///   - Business (hoặc giá >= 2.500.000đ): "Hoàn 100% trước 48h"
///   - Premium Economy (hoặc giá >= 1.200.000đ): "Hoàn 50% trước 24h"
///   - Còn lại: "Không được hoàn"
/// Backend dùng class này để tính hoàn tiền khi hủy — đảm bảo 100% khớp với những gì
/// khách đã xem trong chi tiết vé lúc mua.
/// </summary>
public static class FarePolicy
{
    public const decimal BusinessPriceThreshold = 2_500_000m;
    public const decimal PremiumPriceThreshold = 1_200_000m;

    public sealed record CancelPolicy(string Label, int RefundPercent, int DeadlineHours);

    public static CancelPolicy GetCancelPolicy(string? seatClass, decimal price)
    {
        if (seatClass == "Business" || price >= BusinessPriceThreshold)
            return new CancelPolicy("Hoàn 100% trước 48h", 100, 48);

        if (IsPremium(seatClass) || price >= PremiumPriceThreshold)
            return new CancelPolicy("Hoàn 50% trước 24h", 50, 24);

        return new CancelPolicy("Không được hoàn", 0, 0);
    }

    public static bool IsPremium(string? seatClass) =>
        seatClass == "PremiumEconomy" || seatClass == "Premium Economy";
}
