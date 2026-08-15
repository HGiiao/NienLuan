using System.ComponentModel.DataAnnotations;

namespace FlightAggregatorApi.Models;

/// <summary>
/// Một chặng trong booking gộp nhiều chuyến (lộ trình kết hợp).
/// Ví dụ: booking "Lộ trình kết hợp" có 2 chặng — bay HAN→DAD + xe DAD→SGN.
/// </summary>
public class BookingSegment
{
    public long Id { get; set; }
    public long BookingId { get; set; }

    /// <summary>Loại chặng: "flight" | "train" | "bus".</summary>
    [MaxLength(20)]
    public string Mode { get; set; } = "flight";

    /// <summary>Id của chuyến tương ứng (Flights/Trains/Buses.Id).</summary>
    public long ItemId { get; set; }

    /// <summary>Mã chuyến snapshot lúc đặt (AirlineCode/TrainCode/BusCode).</summary>
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty;

    /// <summary>Tên hãng/nhà xe snapshot (AirlineName/TrainName/BusCompany).</summary>
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(50)]
    public string DepartureLocation { get; set; } = string.Empty;

    [MaxLength(50)]
    public string ArrivalLocation { get; set; } = string.Empty;

    public DateTime DepartureTime { get; set; }
    public DateTime ArrivalTime { get; set; }

    /// <summary>Đơn giá 1 vé (1 khách) của chặng này lúc đặt.</summary>
    public decimal Price { get; set; }

    /// <summary>Hạng vé snapshot (SeatClass/CoachClass).</summary>
    [MaxLength(50)]
    public string? SeatClass { get; set; }

    public Booking Booking { get; set; } = null!;
}
