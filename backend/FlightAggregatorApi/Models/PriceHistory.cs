using System.ComponentModel.DataAnnotations;

namespace FlightAggregatorApi.Models;

public class PriceHistory
{
    public long Id { get; set; }
    public long? FlightId { get; set; }
    public long? TrainId { get; set; }

    [MaxLength(50)]
    public string RouteFrom { get; set; } = string.Empty;

    [MaxLength(50)]
    public string RouteTo { get; set; } = string.Empty;

    public decimal Price { get; set; }
    public DateOnly RecordedDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Flight? Flight { get; set; }
    public Train? Train { get; set; }
}
