using System.ComponentModel.DataAnnotations;

namespace FlightAggregatorApi.Models;

public class Flight
{
    public long Id { get; set; }

    [MaxLength(10)]
    public string AirlineCode { get; set; } = string.Empty;

    [MaxLength(100)]
    public string AirlineName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string DepartureLocation { get; set; } = string.Empty;

    [MaxLength(50)]
    public string ArrivalLocation { get; set; } = string.Empty;

    public DateTime DepartureTime { get; set; }
    public DateTime ArrivalTime { get; set; }
    public decimal Price { get; set; }
    public int Seats { get; set; }

    [MaxLength(50)]
    public string SeatClass { get; set; } = "Economy";

    public DateOnly FlightDate { get; set; }
    public long? RoundTripGroupId { get; set; }
    public int ShareCount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}
