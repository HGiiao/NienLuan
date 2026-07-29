using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FlightAggregatorApi.Models;

[Table("Invoices")]
public class Invoice
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    public long CorporateAccountId { get; set; }

    [MaxLength(50)]
    public string InvoiceNumber { get; set; } = string.Empty;

    public long BookingId { get; set; }

    public decimal SubTotal { get; set; }

    public decimal VatRate { get; set; } = 0.1m;

    public decimal VatAmount => SubTotal * VatRate;

    public decimal Total => SubTotal + VatAmount;

    [MaxLength(50)]
    public string Status { get; set; } = "issued";

    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;

    public DateTime? PaidAt { get; set; }

    [ForeignKey(nameof(CorporateAccountId))]
    public CorporateAccount? CorporateAccount { get; set; }
}
