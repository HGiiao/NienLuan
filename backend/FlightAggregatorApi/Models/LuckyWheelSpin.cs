namespace FlightAggregatorApi.Models;

public class LuckyWheelSpin
{
    public long Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public bool Won { get; set; }
    public string? Code { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
