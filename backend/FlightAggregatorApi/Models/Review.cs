namespace FlightAggregatorApi.Models;

public class Review
{
    public long Id { get; set; }
    public long? FlightId { get; set; }
    public long? TrainId { get; set; }
    public long? BusId { get; set; }
    public long? BookingId { get; set; }
    public long? UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Flight? Flight { get; set; }
    public Train? Train { get; set; }
}
