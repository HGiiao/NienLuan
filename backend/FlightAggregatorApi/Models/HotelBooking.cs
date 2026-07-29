using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FlightAggregatorApi.Models;

[Table("HotelBookings")]
public class HotelBooking
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    public long HotelId { get; set; }

    public long? BookingId { get; set; }

    public DateTime CheckIn { get; set; }

    public DateTime CheckOut { get; set; }

    public int Rooms { get; set; } = 1;

    public int Guests { get; set; } = 2;

    public decimal TotalPrice { get; set; }

    [MaxLength(50)]
    public string Status { get; set; } = "pending";

    [ForeignKey(nameof(HotelId))]
    public Hotel? Hotel { get; set; }

    [ForeignKey(nameof(BookingId))]
    public Booking? Booking { get; set; }
}
