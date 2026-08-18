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

    /// <summary>Unique PayOS order code per payment attempt (retry-safe).</summary>
    public int? PayOSOrderCode { get; set; }

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

    // ---- Snapshot vé tại thời điểm đặt (dùng cho chính sách hoàn đổi & trạng thái đã đi) ----

    /// <summary>Hạng vé snapshot: Flight.SeatClass / Train.CoachClass / Bus.CoachClass lúc đặt.</summary>
    [MaxLength(50)]
    public string? SeatClass { get; set; }

    /// <summary>Đơn giá snapshot lúc đặt (trước thuế/phí) — dùng để tính mức hoàn theo chính sách.</summary>
    public decimal? UnitPrice { get; set; }

    /// <summary>Giờ khởi hành snapshot — xác định trạng thái "đã đi" (đánh giá chuyến đi) và hạn hoàn đổi.</summary>
    public DateTime? DepartureTime { get; set; }

    /// <summary>Số tiền hoàn trả thực tế khi hủy (tính theo chính sách "Hủy chuyến" trong chi tiết vé).</summary>
    public decimal? RefundAmount { get; set; }

    // ---- Computed (không lưu DB) — backend điền khi trả API để frontend hiển thị chính xác ----

    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public bool? HasDeparted { get; set; }

    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public bool? CanCancel { get; set; }

    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public bool? CanReview { get; set; }

    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public int? RefundPercent { get; set; }

    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public decimal? RefundPreview { get; set; }

    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public string? CancelPolicyLabel { get; set; }

    [System.ComponentModel.DataAnnotations.Schema.NotMapped]
    public double? HoursToDeparture { get; set; }

    public User User { get; set; } = null!;
    public Flight? Flight { get; set; }
    public Train? Train { get; set; }
    public Bus? Bus { get; set; }

    /// <summary>Các chặng của booking gộp (lộ trình kết hợp). Rỗng với booking 1 chuyến thông thường.</summary>
    public List<BookingSegment> Segments { get; set; } = new();

    /// <summary>Danh sách hành khách của booking (mỗi hành khách = 1 vé). Rỗng với booking cũ trước khi có tính năng đặt nhiều vé.</summary>
    public List<BookingPassenger> PassengerDetails { get; set; } = new();

    /// <summary>Gói bảo hiểm chuyến đi của booking (tối đa 1 gói, giá đã nhân theo số hành khách).</summary>
    public List<BookingInsurance> Insurances { get; set; } = new();
}
