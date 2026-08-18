using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using FlightAggregatorApi.Data;
using FlightAggregatorApi.Models;
using FlightAggregatorApi.Services;

namespace FlightAggregatorApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IMemoryCache _cache;
    private readonly EmailService _email;
    private readonly ILogger<AuthController> _logger;

    public AuthController(ApplicationDbContext db, IMemoryCache cache, EmailService email, ILogger<AuthController> logger)
    {
        _db = db;
        _cache = cache;
        _email = email;
        _logger = logger;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Email và mật khẩu không được để trống" });

        if (request.Password.Length < 6)
            return BadRequest(new { message = "Mật khẩu phải có ít nhất 6 ký tự" });

        var exists = await _db.Users.AnyAsync(u => u.Email == request.Email);
        if (exists)
            return Conflict(new { message = "Email đã được đăng ký" });

        var otp = new Random().Next(100000, 999999).ToString();

        try
        {
            await _email.SendOtpAsync(request.Email, otp);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Gửi OTP thất bại đến {Email}", request.Email);
            return StatusCode(500, new { message = "Không thể gửi mã xác thực. Vui lòng thử lại sau." });
        }

        var pending = new PendingRegistration
        {
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FullName = request.FullName ?? "",
            Phone = request.Phone ?? "",
            Otp = otp,
        };

        _cache.Set("pending_reg:" + request.Email, pending, TimeSpan.FromMinutes(10));

        return Ok(new
        {
            message = "Mã xác thực đã được gửi đến email " + request.Email,
            email = request.Email,
        });
    }

    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Code))
            return BadRequest(new { message = "Email và mã xác thực không được để trống" });

        var pending = _cache.Get<PendingRegistration>("pending_reg:" + request.Email);
        if (pending == null)
            return BadRequest(new { message = "Không tìm thấy yêu cầu đăng ký hoặc mã đã hết hạn" });

        if (pending.Otp != request.Code)
            return BadRequest(new { message = "Mã xác thực không đúng" });

        var user = new User
        {
            Email = pending.Email,
            FullName = pending.FullName,
            Phone = pending.Phone,
            PasswordHash = pending.PasswordHash,
            IsEmailVerified = true,
            EmailVerificationCode = null,
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        _cache.Remove("pending_reg:" + request.Email);

        return Ok(new
        {
            message = "Xác thực email thành công",
            email = user.Email,
        });
    }

    [HttpPost("clerk-sync")]
    public async Task<IActionResult> SyncClerkUser([FromBody] ClerkSyncRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "Email không được để trống" });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user == null)
        {
            user = new User
            {
                Email = request.Email,
                FullName = request.FullName ?? "",
                Phone = request.Phone ?? "",
                PasswordHash = "__clerk_managed__",
                IsEmailVerified = true,
            };
            _db.Users.Add(user);
        }
        else
        {
            if (!string.IsNullOrEmpty(request.FullName)) user.FullName = request.FullName;
            if (!string.IsNullOrEmpty(request.Phone)) user.Phone = request.Phone;
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            id = user.Id,
            email = user.Email,
            fullName = user.FullName,
            phone = user.Phone,
            role = user.Role,
        });
    }

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile([FromQuery] string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return BadRequest(new { message = "Email không được để trống" });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
            return NotFound(new { message = "Người dùng không tồn tại" });

        return Ok(new
        {
            id = user.Id,
            email = user.Email,
            fullName = user.FullName,
            phone = user.Phone,
            role = user.Role,
            isEmailVerified = user.IsEmailVerified,
            createdAt = user.CreatedAt,
        });
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "Email không được để trống" });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user == null)
            // Trả thành công để tránh lộ thông tin email nào tồn tại
            return Ok(new { message = "Nếu email tồn tại, mã xác thực đã được gửi. Vui lòng kiểm tra hộp thư." });

        if (user.PasswordHash == "__clerk_managed__")
            return BadRequest(new { message = "Tài khoản này dùng đăng nhập qua Google/Facebook. Vui lòng dùng SSO." });

        var otp = new Random().Next(100000, 999999).ToString();

        try
        {
            await _email.SendPasswordResetAsync(request.Email, otp);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Gửi OTP reset mật khẩu thất bại đến {Email}", request.Email);
            return StatusCode(500, new { message = "Không thể gửi mã xác thực. Vui lòng thử lại sau." });
        }

        _cache.Set("pwd_reset:" + request.Email, otp, TimeSpan.FromMinutes(10));

        return Ok(new { message = "Nếu email tồn tại, mã xác thực đã được gửi. Vui lòng kiểm tra hộp thư." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.NewPassword))
            return BadRequest(new { message = "Email, mã xác thực và mật khẩu mới không được để trống" });

        if (request.NewPassword.Length < 6)
            return BadRequest(new { message = "Mật khẩu mới phải có ít nhất 6 ký tự" });

        var cachedOtp = _cache.Get<string>("pwd_reset:" + request.Email);
        if (cachedOtp == null)
            return BadRequest(new { message = "Yêu cầu đặt lại mật khẩu đã hết hạn hoặc không tồn tại. Vui lòng thử lại." });

        if (cachedOtp != request.Code)
            return BadRequest(new { message = "Mã xác thực không đúng" });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user == null)
            return NotFound(new { message = "Người dùng không tồn tại" });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await _db.SaveChangesAsync();

        _cache.Remove("pwd_reset:" + request.Email);

        return Ok(new { message = "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại." });
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "Email không được để trống" });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user == null)
            return NotFound(new { message = "Người dùng không tồn tại" });

        if (!string.IsNullOrWhiteSpace(request.FullName))
            user.FullName = request.FullName;
        if (!string.IsNullOrWhiteSpace(request.Phone))
            user.Phone = request.Phone;

        await _db.SaveChangesAsync();

        return Ok(new
        {
            id = user.Id,
            email = user.Email,
            fullName = user.FullName,
            phone = user.Phone,
            role = user.Role,
            isEmailVerified = user.IsEmailVerified,
            createdAt = user.CreatedAt,
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Email và mật khẩu không được để trống" });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user == null)
            return Unauthorized(new { message = "Email hoặc mật khẩu không đúng" });

        if (user.PasswordHash == "__clerk_managed__")
            return BadRequest(new { message = "Tài khoản này dùng đăng nhập qua Google/Facebook. Vui lòng dùng SSO." });

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new { message = "Email hoặc mật khẩu không đúng" });

        if (!user.IsEmailVerified)
            return Unauthorized(new { message = "Vui lòng xác thực email trước khi đăng nhập" });

        return Ok(new
        {
            id = user.Id,
            email = user.Email,
            fullName = user.FullName,
            phone = user.Phone,
            role = user.Role,
        });
    }
}

public class PendingRegistration
{
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Otp { get; set; } = string.Empty;
}

public class RegisterRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public string? Phone { get; set; }
}

public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class VerifyEmailRequest
{
    public string Email { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
}

public class ClerkSyncRequest
{
    public string Email { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public string? Phone { get; set; }
}

public class UpdateProfileRequest
{
    public string Email { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public string? Phone { get; set; }
}

public class ForgotPasswordRequest
{
    public string Email { get; set; } = string.Empty;
}

public class ResetPasswordRequest
{
    public string Email { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}
