using Microsoft.AspNetCore.Mvc;
using FlightAggregatorApi.Services;

namespace FlightAggregatorApi.Controllers;

public class VietQrGenerateRequest
{
    public string AccountNo { get; set; } = "";
    public string? AccountName { get; set; }
    public string AcqId { get; set; } = "";
    public long Amount { get; set; }
    public string? AddInfo { get; set; }
}

[ApiController]
[Route("api/[controller]")]
public class VietQrController : ControllerBase
{
    private readonly VietQrService _vietQr;
    private readonly ILogger<VietQrController> _logger;

    public VietQrController(VietQrService vietQr, ILogger<VietQrController> logger)
    {
        _vietQr = vietQr;
        _logger = logger;
    }

    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromBody] VietQrGenerateRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.AccountNo) || request.AccountNo.Length < 6 || request.AccountNo.Length > 19)
            return BadRequest(new { success = false, message = "Số tài khoản không hợp lệ" });

        if (string.IsNullOrWhiteSpace(request.AcqId) || request.AcqId.Length != 6)
            return BadRequest(new { success = false, message = "Mã ngân hàng (BIN) không hợp lệ" });

        if (request.Amount <= 0)
            return BadRequest(new { success = false, message = "Số tiền không hợp lệ" });

        var addInfo = string.IsNullOrWhiteSpace(request.AddInfo)
            ? "VE247 " + DateTime.Now.ToString("yyyyMMddHHmmss")
            : request.AddInfo!.Trim();

        var result = await _vietQr.GenerateAsync(
            request.AccountNo.Trim(),
            (request.AccountName ?? "").Trim(),
            request.AcqId.Trim(),
            request.Amount,
            addInfo);

        if (result == null)
        {
            if (!_vietQr.IsConfigured)
                return Ok(new { success = false, message = "VietQR chưa được cấu hình (thiếu ClientId/ApiKey)" });

            return Ok(new { success = false, message = "Không tạo được mã VietQR từ nhà cung cấp. Vui lòng kiểm tra số tài khoản/tên tài khoản/BIN" });
        }

        return Ok(new
        {
            success = true,
            qrDataURL = result.QrDataUrl,
            qrCode = result.QrCode,
            acqId = result.AcqId,
            accountName = result.AccountName,
        });
    }
}
