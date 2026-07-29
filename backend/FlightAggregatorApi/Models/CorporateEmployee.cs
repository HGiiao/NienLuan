using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FlightAggregatorApi.Models;

[Table("CorporateEmployees")]
public class CorporateEmployee
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    public long CorporateAccountId { get; set; }

    [MaxLength(255)]
    public string FullName { get; set; } = string.Empty;

    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Phone { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Department { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Role { get; set; } = "member";

    public bool CanBookWithoutApproval { get; set; } = false;

    public decimal MonthlyBookingLimit { get; set; } = 10000000;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(CorporateAccountId))]
    public CorporateAccount? CorporateAccount { get; set; }
}
