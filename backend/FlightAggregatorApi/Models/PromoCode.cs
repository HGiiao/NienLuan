using System.ComponentModel.DataAnnotations;

namespace FlightAggregatorApi.Models;

public class PromoCode
{
    public long Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal DiscountPercent { get; set; }
    public decimal MaxDiscount { get; set; }
    public decimal MinOrderValue { get; set; }
    public int UsageLimit { get; set; } = 100;
    public int UsedCount { get; set; } = 0;
    public DateOnly ValidFrom { get; set; }
    public DateOnly ValidTo { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
