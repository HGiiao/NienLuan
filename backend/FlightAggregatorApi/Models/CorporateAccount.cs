using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FlightAggregatorApi.Models;

[Table("CorporateAccounts")]
public class CorporateAccount
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [MaxLength(255)]
    public string CompanyName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string TaxCode { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Address { get; set; } = string.Empty;

    [MaxLength(255)]
    public string ContactEmail { get; set; } = string.Empty;

    [MaxLength(20)]
    public string ContactPhone { get; set; } = string.Empty;

    public decimal CreditLimit { get; set; } = 50000000;

    public decimal UsedCredit { get; set; } = 0;

    public bool RequiresApproval { get; set; } = true;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
