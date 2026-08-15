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

    /// <summary>Id của chuyến cụ thể được theo dõi (Flight/Train/Bus) — null = theo dõi theo tuyến (cũ).</summary>
    public long? ItemId { get; set; }

    /// <summary>Loại phương tiện của item được theo dõi: flight / train / bus.</summary>
    [MaxLength(20)]
    public string? Mode { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? NotifiedAt { get; set; }
}
