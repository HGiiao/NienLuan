using System.ComponentModel.DataAnnotations;

namespace FlightAggregatorApi.Models;

public class PriceHistory
{
    public long Id { get; set; }
    public long? FlightId { get; set; }
    public long? TrainId { get; set; }
    public long? BusId { get; set; }

    /// <summary>Loại phương tiện: "flight" | "train" | "bus".</summary>
    [MaxLength(20)]
    public string Mode { get; set; } = "flight";

    [MaxLength(50)]
    public string RouteFrom { get; set; } = string.Empty;

    [MaxLength(50)]
    public string RouteTo { get; set; } = string.Empty;

    public decimal Price { get; set; }
    public DateOnly RecordedDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Flight? Flight { get; set; }
    public Train? Train { get; set; }
    public Bus? Bus { get; set; }
}
