using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FlightAggregatorApi.Models;

[Table("SubscriptionPlans")]
public class SubscriptionPlan
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    public decimal MonthlyPrice { get; set; }

    public decimal YearlyPrice { get; set; }

    public int MaxAlertsPerDay { get; set; } = 5;

    public bool EarlyPriceAlerts { get; set; } = false;

    public bool MultiAirlineCompare { get; set; } = false;

    public bool PrioritySupport { get; set; } = false;

    public bool FastRefund { get; set; } = false;

    public bool SeatSelection { get; set; } = false;

    public int PriorityLevel { get; set; } = 0;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
