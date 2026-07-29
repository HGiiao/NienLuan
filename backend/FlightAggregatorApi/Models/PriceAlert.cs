using System.ComponentModel.DataAnnotations;

namespace FlightAggregatorApi.Models;

public class PriceAlert
{
    public long Id { get; set; }

    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(50)]
    public string RouteFrom { get; set; } = string.Empty;

    [MaxLength(50)]
    public string RouteTo { get; set; } = string.Empty;

    public decimal TargetPrice { get; set; }

    public decimal? CurrentPrice { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? NotifiedAt { get; set; }
}
