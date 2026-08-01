using System.ComponentModel.DataAnnotations;

namespace FlightAggregatorApi.Models;

public class Booking
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public long? FlightId { get; set; }
    public long? TrainId { get; set; }
    public long? BusId { get; set; }

    public DateTime BookingDate { get; set; } = DateTime.UtcNow;

    [MaxLength(50)]
    public string Status { get; set; } = "Pending";

    public decimal TotalPrice { get; set; }
    public int Passengers { get; set; } = 1;

    [MaxLength(500)]
    public string? Address { get; set; }

    [MaxLength(50)]
    public string? PaymentMethod { get; set; }

    [MaxLength(100)]
    public string? TransactionId { get; set; }

    [MaxLength(50)]
    public string? VnPayTransactionNo { get; set; }

    [MaxLength(50)]
    public string? PaymentProvider { get; set; }

    [MaxLength(50)]
    public string? PromoCode { get; set; }

    public decimal? DiscountAmount { get; set; }

    public DateTime? DateOfBirth { get; set; }

    [MaxLength(10)]
    public string? Gender { get; set; }

    [MaxLength(100)]
    public string? Nationality { get; set; }

    [MaxLength(50)]
    public string? IdNumber { get; set; }

    [MaxLength(100)]
    public string? EmergencyContactName { get; set; }

    [MaxLength(20)]
    public string? EmergencyContactPhone { get; set; }

    [MaxLength(500)]
    public string? SpecialRequests { get; set; }

    public User User { get; set; } = null!;
    public Flight? Flight { get; set; }
    public Train? Train { get; set; }
    public Bus? Bus { get; set; }
}
