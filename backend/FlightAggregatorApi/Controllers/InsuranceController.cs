using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;
using FlightAggregatorApi.Models;

namespace FlightAggregatorApi.Controllers;

[ApiController]
[Route("api/insurance")]
public class InsuranceController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public InsuranceController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet("packages")]
    public async Task<IActionResult> GetPackages()
    {
        var packages = await _db.InsurancePackages.AsNoTracking().Where(p => p.IsActive).ToListAsync();
        if (packages.Count == 0)
        {
            packages = SeedPackages();
            _db.InsurancePackages.AddRange(packages);
            await _db.SaveChangesAsync();
        }
        return Ok(packages);
    }

    [HttpGet("booking/{bookingId:long}")]
    public async Task<IActionResult> GetBookingInsurance(long bookingId)
    {
        var ins = await _db.BookingInsurances.AsNoTracking()
            .Include(i => i.Package)
            .FirstOrDefaultAsync(i => i.BookingId == bookingId);
        return Ok(ins);
    }

    [HttpPost("booking/{bookingId:long}")]
    public async Task<IActionResult> AddInsurance(long bookingId, [FromBody] AddInsuranceRequest request)
    {
        var booking = await _db.Bookings
            .Include(b => b.Segments)
            .FirstOrDefaultAsync(b => b.Id == bookingId);
        if (booking == null) return NotFound(new { message = "Không tìm thấy đặt chỗ" });

        // Bảo hiểm chuyến đi chỉ áp dụng khi toàn bộ chặng di chuyển bằng máy bay
        var isFlightOnly = booking.FlightId.HasValue && !booking.TrainId.HasValue && !booking.BusId.HasValue;
        if (booking.Segments is { Count: > 0 })
            isFlightOnly = booking.Segments.All(s => (s.Mode ?? "").Equals("flight", StringComparison.OrdinalIgnoreCase));
        if (!isFlightOnly)
            return BadRequest(new { message = "Bảo hiểm chuyến đi chỉ áp dụng cho vé máy bay" });

        var existing = await _db.BookingInsurances.FirstOrDefaultAsync(i => i.BookingId == bookingId);
        if (existing != null) return BadRequest(new { message = "Đã có bảo hiểm cho đặt chỗ này" });

        var pkg = await _db.InsurancePackages.FindAsync(request.PackageId);
        if (pkg == null) return NotFound(new { message = "Không tìm thấy gói bảo hiểm" });

        var insurance = new BookingInsurance
        {
            BookingId = bookingId,
            PackageId = request.PackageId,
            Price = pkg.Price,
            Status = "active"
        };

        _db.BookingInsurances.Add(insurance);
        booking.TotalPrice += pkg.Price;
        await _db.SaveChangesAsync();

        return Ok(new { success = true, insurance });
    }

    [HttpDelete("booking/{bookingId:long}")]
    public async Task<IActionResult> RemoveInsurance(long bookingId)
    {
        var ins = await _db.BookingInsurances.FirstOrDefaultAsync(i => i.BookingId == bookingId);
        if (ins == null) return NotFound();

        var booking = await _db.Bookings.FindAsync(bookingId);
        if (booking != null) booking.TotalPrice -= ins.Price;

        _db.BookingInsurances.Remove(ins);
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    private static List<InsurancePackage> SeedPackages()
    {
        return new List<InsurancePackage>
        {
            new InsurancePackage
            {
                Name = "Cơ Bản",
                Provider = "Bảo Việt",
                Description = "Bảo vệ trước các rủi ro hủy chuyến, mất hành lý, tai nạn cá nhân trong suốt chuyến đi.",
                Price = 45000,
                Coverage = "Hủy chuyến, mất hành lý, tai nạn",
                MaxCoverageDays = 7
            },
            new InsurancePackage
            {
                Name = "Cao Cấp",
                Provider = "Bảo Minh",
                Description = "Bảo vệ toàn diện: hủy chuyến, thất lạc hành lý, tai nạn, chi phí y tế khẩn cấp, hỗ trợ 24/7.",
                Price = 99000,
                Coverage = "Hủy chuyến, thất lạc hành lý, tai nạn, y tế, hỗ trợ 24/7",
                MaxCoverageDays = 30
            },
            new InsurancePackage
            {
                Name = "Toàn Diện",
                Provider = "BIC",
                Description = "Bảo vệ toàn diện với chi phí y tế tối đa 200 triệu đồng, hủy chuyến, thất lạc hành lý và hỗ trợ 24/7.",
                Price = 199000,
                Coverage = "Y tế 200tr, hủy chuyến, thất lạc hành lý, hỗ trợ 24/7",
                MaxCoverageDays = 30
            },
        };
    }
}

public class AddInsuranceRequest
{
    public long PackageId { get; set; }
}
