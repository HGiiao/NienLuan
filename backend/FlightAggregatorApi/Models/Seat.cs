using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FlightAggregatorApi.Models;

[Table("Seats")]
public class Seat
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [MaxLength(10)]
    public string ReferenceType { get; set; } = string.Empty;

    public long ReferenceId { get; set; }

    [MaxLength(10)]
    public string SeatNumber { get; set; } = string.Empty;

    [MaxLength(10)]
    public string Row { get; set; } = string.Empty;

    [MaxLength(10)]
    public string Column { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Deck { get; set; } = "main";

    [MaxLength(20)]
    public string Class { get; set; } = "economy";

    [MaxLength(20)]
    public string Status { get; set; } = "available";

    public long? BookedBy { get; set; }

    public bool IsExitRow { get; set; } = false;

    public bool IsWindow { get; set; } = false;

    public bool IsAisle { get; set; } = false;

    public decimal Price { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
