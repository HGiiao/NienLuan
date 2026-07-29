using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;
using FlightAggregatorApi.Models;

namespace FlightAggregatorApi.Controllers;

[ApiController]
[Route("api/corporate")]
public class CorporateController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public CorporateController(ApplicationDbContext db)
    {
        _db = db;
    }

    // Account
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterCorporateRequest request)
    {
        var existing = await _db.CorporateAccounts.FirstOrDefaultAsync(c => c.TaxCode == request.TaxCode || c.ContactEmail == request.ContactEmail);
        if (existing != null) return BadRequest(new { message = "Doanh nghiệp đã tồn tại" });

        var account = new CorporateAccount
        {
            CompanyName = request.CompanyName,
            TaxCode = request.TaxCode,
            Address = request.Address,
            ContactEmail = request.ContactEmail,
            ContactPhone = request.ContactPhone,
        };
        _db.CorporateAccounts.Add(account);
        await _db.SaveChangesAsync();

        return Ok(new { success = true, account });
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetAccount(long id)
    {
        var account = await _db.CorporateAccounts.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id);
        if (account == null) return NotFound();
        return Ok(account);
    }

    // Employees
    [HttpGet("{id:long}/employees")]
    public async Task<IActionResult> GetEmployees(long id)
    {
        var employees = await _db.CorporateEmployees.AsNoTracking()
            .Where(e => e.CorporateAccountId == id && e.IsActive).ToListAsync();
        return Ok(employees);
    }

    [HttpPost("{id:long}/employees")]
    public async Task<IActionResult> AddEmployee(long id, [FromBody] AddEmployeeRequest request)
    {
        var account = await _db.CorporateAccounts.FindAsync(id);
        if (account == null) return NotFound();

        var employee = new CorporateEmployee
        {
            CorporateAccountId = id,
            FullName = request.FullName,
            Email = request.Email,
            Phone = request.Phone,
            Department = request.Department,
            Role = request.Role ?? "member",
            CanBookWithoutApproval = request.CanBookWithoutApproval,
            MonthlyBookingLimit = request.MonthlyBookingLimit,
        };
        _db.CorporateEmployees.Add(employee);
        await _db.SaveChangesAsync();
        return Ok(new { success = true, employee });
    }

    [HttpDelete("employees/{employeeId:long}")]
    public async Task<IActionResult> RemoveEmployee(long employeeId)
    {
        var emp = await _db.CorporateEmployees.FindAsync(employeeId);
        if (emp == null) return NotFound();
        emp.IsActive = false;
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // Approval workflow
    [HttpPost("bookings/{bookingId:long}/approve")]
    public async Task<IActionResult> ApproveBooking(long bookingId)
    {
        var booking = await _db.Bookings.FindAsync(bookingId);
        if (booking == null) return NotFound();
        booking.Status = "Confirmed";
        await _db.SaveChangesAsync();
        return Ok(new { success = true, message = "Đã phê duyệt" });
    }

    [HttpPost("bookings/{bookingId:long}/reject")]
    public async Task<IActionResult> RejectBooking(long bookingId)
    {
        var booking = await _db.Bookings.FindAsync(bookingId);
        if (booking == null) return NotFound();
        booking.Status = "Cancelled";
        await _db.SaveChangesAsync();
        return Ok(new { success = true, message = "Đã từ chối" });
    }

    // Invoice
    [HttpPost("{id:long}/invoice")]
    public async Task<IActionResult> CreateInvoice(long id, [FromBody] CreateInvoiceRequest request)
    {
        var account = await _db.CorporateAccounts.FindAsync(id);
        if (account == null) return NotFound();

        var booking = await _db.Bookings.FindAsync(request.BookingId);
        if (booking == null) return NotFound();

        var count = await _db.Invoices.CountAsync(i => i.CorporateAccountId == id);
        var invoice = new Invoice
        {
            CorporateAccountId = id,
            InvoiceNumber = $"INV-{DateTime.UtcNow:yyyyMMdd}-{count + 1:D4}",
            BookingId = request.BookingId,
            SubTotal = booking.TotalPrice,
            Status = "issued",
        };
        _db.Invoices.Add(invoice);
        await _db.SaveChangesAsync();
        return Ok(new { success = true, invoice });
    }

    [HttpGet("{id:long}/invoices")]
    public async Task<IActionResult> GetInvoices(long id)
    {
        var invoices = await _db.Invoices.AsNoTracking()
            .Where(i => i.CorporateAccountId == id)
            .OrderByDescending(i => i.IssuedAt)
            .ToListAsync();
        return Ok(invoices);
    }

    [HttpGet("invoice/{invoiceId:long}")]
    public async Task<IActionResult> GetInvoiceDetail(long invoiceId)
    {
        var invoice = await _db.Invoices.AsNoTracking()
            .Include(i => i.CorporateAccount)
            .FirstOrDefaultAsync(i => i.Id == invoiceId);
        if (invoice == null) return NotFound();
        return Ok(invoice);
    }
}

public class RegisterCorporateRequest
{
    public string CompanyName { get; set; } = string.Empty;
    public string TaxCode { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string ContactEmail { get; set; } = string.Empty;
    public string ContactPhone { get; set; } = string.Empty;
}

public class AddEmployeeRequest
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string? Role { get; set; }
    public bool CanBookWithoutApproval { get; set; }
    public decimal MonthlyBookingLimit { get; set; }
}

public class CreateInvoiceRequest
{
    public long BookingId { get; set; }
}
