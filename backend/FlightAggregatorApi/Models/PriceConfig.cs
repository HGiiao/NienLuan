using System.ComponentModel.DataAnnotations;

namespace FlightAggregatorApi.Models;

public class PriceConfig
{
    public long Id { get; set; }
    public string RouteFrom { get; set; } = string.Empty;
    public string RouteTo { get; set; } = string.Empty;
    public int Month { get; set; }
    public decimal Multiplier { get; set; } = 1.0m;
    public int BaseVolatilityPct { get; set; } = 5;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
