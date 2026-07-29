using System.ComponentModel.DataAnnotations;

namespace FlightAggregatorApi.Models;

public class Train
{
    public long Id { get; set; }

    [MaxLength(10)]
    public string TrainCode { get; set; } = string.Empty;

    [MaxLength(100)]
    public string TrainName { get; set; } = string.Empty;

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

    public DateOnly TrainDate { get; set; }
    public int ShareCount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}
