using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;
using FlightAggregatorApi.Models;

namespace FlightAggregatorApi.Controllers;

[ApiController]
[Route("api/hotels")]
public class HotelController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public HotelController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string location, [FromQuery] DateTime? checkIn, [FromQuery] DateTime? checkOut, [FromQuery] int guests = 2, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var query = _db.Hotels.AsNoTracking().Where(h => h.IsActive);

        if (!string.IsNullOrEmpty(location))
            query = query.Where(h => h.Location == location.ToUpper());

        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        if (items.Count == 0 && !string.IsNullOrEmpty(location))
        {
            items = SeedHotels(location.ToUpper());
            _db.Hotels.AddRange(items);
            await _db.SaveChangesAsync();
        }

        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetHotel(long id)
    {
        var hotel = await _db.Hotels.AsNoTracking().FirstOrDefaultAsync(h => h.Id == id);
        if (hotel == null) return NotFound();
        return Ok(hotel);
    }

    [HttpPost("book")]
    public async Task<IActionResult> BookHotel([FromBody] BookHotelRequest request)
    {
        var hotel = await _db.Hotels.FindAsync(request.HotelId);
        if (hotel == null) return NotFound(new { message = "Không tìm thấy khách sạn" });
        if (hotel.AvailableRooms < request.Rooms)
            return BadRequest(new { message = "Không đủ phòng trống" });

        hotel.AvailableRooms -= request.Rooms;
        var nights = (request.CheckOut - request.CheckIn).Days;
        var totalPrice = hotel.PricePerNight * nights * request.Rooms;

        var booking = new HotelBooking
        {
            HotelId = request.HotelId,
            BookingId = request.BookingId,
            CheckIn = request.CheckIn,
            CheckOut = request.CheckOut,
            Rooms = request.Rooms,
            Guests = request.Guests,
            TotalPrice = totalPrice,
            Status = "confirmed",
        };

        _db.HotelBookings.Add(booking);
        await _db.SaveChangesAsync();
        return Ok(new { success = true, booking });
    }

    private static List<Hotel> SeedHotels(string location)
    {
        var locationName = location switch
        {
            "HAN" => "Hà Nội", "SGN" => "TP. Hồ Chí Minh", "DAD" => "Đà Nẵng",
            "CXR" => "Nha Trang", "PQC" => "Phú Quốc", "HUI" => "Huế",
            _ => location
        };

        return new List<Hotel>
        {
            new Hotel { Name = $"Khách sạn {locationName} Central", Location = location, StarRating = 4, PricePerNight = 1200000, Description = $"Khách sạn 4 sao trung tâm {locationName}, gần các điểm tham quan chính.", Amenities = "WiFi miễn phí, Hồ bơi, Gym, Nhà hàng", AvailableRooms = 15 },
            new Hotel { Name = $"Hotel {locationName} Boutique", Location = location, StarRating = 3, PricePerNight = 750000, Description = $"Khách sạn boutique phong cách tại {locationName}, phù hợp cho kỳ nghỉ ngắn ngày.", Amenities = "WiFi miễn phí, Bữa sáng, Điều hòa", AvailableRooms = 10 },
            new Hotel { Name = $"{locationName} Palace Hotel", Location = location, StarRating = 5, PricePerNight = 2500000, Description = $"Khách sạn 5 sao sang trọng tại {locationName} với đầy đủ tiện nghi cao cấp.", Amenities = "WiFi, Hồ bơi, Spa, Gym, Nhà hàng, Bar, Đưa đón sân bay", AvailableRooms = 25 },
            new Hotel { Name = $"{locationName} Budget Inn", Location = location, StarRating = 2, PricePerNight = 350000, Description = $"Nhà nghỉ giá rẻ tại {locationName}, tiện nghi cơ bản cho chuyến công tác.", Amenities = "WiFi miễn phí, Điều hòa, Nước nóng", AvailableRooms = 8 },
        };
    }
}

public class BookHotelRequest
{
    public long HotelId { get; set; }
    public long? BookingId { get; set; }
    public DateTime CheckIn { get; set; }
    public DateTime CheckOut { get; set; }
    public int Rooms { get; set; } = 1;
    public int Guests { get; set; } = 2;
}
