using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;
using FlightAggregatorApi.Models;
using FlightAggregatorApi.Helpers;

namespace FlightAggregatorApi.Controllers;

[ApiController]
[Route("api/promo-codes")]
public class PromoCodesController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public PromoCodesController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet("public")]
    public async Task<IActionResult> GetPublic()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var promos = await _db.PromoCodes
            .Where(p => p.IsActive && today >= p.ValidFrom && today <= p.ValidTo && p.UsedCount < p.UsageLimit)
            .OrderBy(p => p.MinOrderValue)
            .Select(p => new
            {
                p.Code,
                p.Description,
                p.DiscountPercent,
                p.MaxDiscount,
                p.MinOrderValue,
                p.ValidTo,
            })
            .ToListAsync();

        return Ok(promos);
    }

    [HttpPost("validate")]
    public async Task<IActionResult> Validate([FromBody] ValidatePromoCodeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
            return BadRequest(new { valid = false, error = "Mã khuyến mãi không được để trống" });

        var promo = await _db.PromoCodes
            .FirstOrDefaultAsync(p => p.Code == request.Code.ToUpper());

        if (promo == null)
            return Ok(new { valid = false, error = "Mã khuyến mãi không tồn tại" });

        if (!promo.IsActive)
            return Ok(new { valid = false, error = "Mã khuyến mãi đã bị vô hiệu hóa" });

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (today < promo.ValidFrom || today > promo.ValidTo)
            return Ok(new { valid = false, error = "Mã khuyến mãi đã hết hạn" });

        if (promo.UsedCount >= promo.UsageLimit)
            return Ok(new { valid = false, error = "Mã khuyến mãi đã hết lượt sử dụng" });

        if (request.OrderValue < promo.MinOrderValue)
            return Ok(new { valid = false, error = $"Giá trị đơn hàng tối thiểu {promo.MinOrderValue:N0}đ" });

        var discount = Math.Min(request.OrderValue * promo.DiscountPercent / 100, promo.MaxDiscount);

        return Ok(new
        {
            valid = true,
            discountAmount = Math.Round(discount, 0),
            discountPercent = promo.DiscountPercent,
            maxDiscount = promo.MaxDiscount,
            minOrderValue = promo.MinOrderValue,
            description = promo.Description,
            code = promo.Code,
        });
    }

    [HttpGet]
    [RequireAdmin]
    public async Task<IActionResult> GetAll()
    {
        var promos = await _db.PromoCodes
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new
            {
                p.Id,
                p.Code,
                p.Description,
                p.DiscountPercent,
                p.MaxDiscount,
                p.MinOrderValue,
                p.UsageLimit,
                p.UsedCount,
                p.ValidFrom,
                p.ValidTo,
                p.IsActive,
                p.CreatedAt,
            })
            .ToListAsync();

        return Ok(promos);
    }

    [HttpPost]
    [RequireAdmin]
    public async Task<IActionResult> Create([FromBody] CreatePromoCodeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
            return BadRequest(new { message = "Mã khuyến mãi không được để trống" });

        var existing = await _db.PromoCodes.AnyAsync(p => p.Code == request.Code.ToUpper());
        if (existing)
            return BadRequest(new { message = "Mã khuyến mãi đã tồn tại" });

        var promo = new PromoCode
        {
            Code = request.Code.ToUpper(),
            Description = request.Description,
            DiscountPercent = request.DiscountPercent,
            MaxDiscount = request.MaxDiscount,
            MinOrderValue = request.MinOrderValue,
            UsageLimit = request.UsageLimit,
            ValidFrom = request.ValidFrom,
            ValidTo = request.ValidTo,
            IsActive = true,
        };

        _db.PromoCodes.Add(promo);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            promo.Id,
            promo.Code,
            promo.Description,
            promo.DiscountPercent,
            promo.MaxDiscount,
            promo.MinOrderValue,
            promo.UsageLimit,
            promo.ValidFrom,
            promo.ValidTo,
            promo.IsActive,
            promo.CreatedAt,
        });
    }

    [HttpDelete("{id:long}")]
    [RequireAdmin]
    public async Task<IActionResult> Delete(long id)
    {
        var promo = await _db.PromoCodes.FindAsync(id);
        if (promo == null)
            return NotFound(new { message = "Mã khuyến mãi không tồn tại" });

        _db.PromoCodes.Remove(promo);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Đã xóa mã khuyến mãi" });
    }
}

public class ValidatePromoCodeRequest
{
    public string Code { get; set; } = string.Empty;
    public decimal OrderValue { get; set; }
}

public class CreatePromoCodeRequest
{
    public string Code { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal DiscountPercent { get; set; }
    public decimal MaxDiscount { get; set; }
    public decimal MinOrderValue { get; set; }
    public int UsageLimit { get; set; } = 100;
    public DateOnly ValidFrom { get; set; }
    public DateOnly ValidTo { get; set; }
}
