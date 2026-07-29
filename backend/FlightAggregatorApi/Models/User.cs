using System.ComponentModel.DataAnnotations;

namespace FlightAggregatorApi.Models;

public class User
{
    public long Id { get; set; }

    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(255)]
    public string FullName { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Phone { get; set; } = string.Empty;

    [MaxLength(255)]
    public string PasswordHash { get; set; } = string.Empty;

    [MaxLength(6)]
    public string? EmailVerificationCode { get; set; }

    public bool IsEmailVerified { get; set; } = false;

    [MaxLength(20)]
    public string Role { get; set; } = "User";

    public string? Address { get; set; }

    [MaxLength(50)]
    public string? PaymentMethod { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}
