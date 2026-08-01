using System.ComponentModel.DataAnnotations;

namespace FlightAggregatorApi.Models;

public class Bus
{
    public long Id { get; set; }

    [MaxLength(20)]
    public string BusCode { get; set; } = string.Empty;

    [MaxLength(100)]
    public string BusCompany { get; set; } = string.Empty;

    [MaxLength(50)]
    public string DepartureLocation { get; set; } = string.Empty;

    [MaxLength(50)]
    public string ArrivalLocation { get; set; } = string.Empty;

    public DateTime DepartureTime { get; set; }
    public DateTime ArrivalTime { get; set; }
    public decimal Price { get; set; }
    public int Seats { get; set; }

    [MaxLength(50)]
    public string CoachClass { get; set; } = string.Empty;

    [MaxLength(100)]
    public string PickupPoint { get; set; } = string.Empty;

    [MaxLength(100)]
    public string DropoffPoint { get; set; } = string.Empty;

    public DateOnly BusDate { get; set; }
    public int ShareCount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}
