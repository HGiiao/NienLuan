using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FlightAggregatorApi.Models;

[Table("UserSubscriptions")]
public class UserSubscription
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    public long UserId { get; set; }

    public long PlanId { get; set; }

    [MaxLength(20)]
    public string BillingCycle { get; set; } = "monthly";

    public DateTime StartDate { get; set; } = DateTime.UtcNow;

    public DateTime EndDate { get; set; }

    [MaxLength(20)]
    public string Status { get; set; } = "active";

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }

    [ForeignKey(nameof(PlanId))]
    public SubscriptionPlan? Plan { get; set; }
}
