using System.Net;
using System.Net.Mail;

namespace FlightAggregatorApi.Services;

public class EmailService
{
    private readonly IConfiguration _config;
    private static readonly Dictionary<string, string> CityNames = new()
    {
        ["HAN"] = "Hà Nội", ["SGN"] = "TP. Hồ Chí Minh", ["DAD"] = "Đà Nẵng",
        ["CXR"] = "Nha Trang", ["PQC"] = "Phú Quốc", ["HUI"] = "Huế",
        ["HPH"] = "Hải Phòng", ["VII"] = "Vinh", ["UIH"] = "Quy Nhơn",
        ["DLI"] = "Đà Lạt", ["VCS"] = "Côn Đảo", ["CAH"] = "Cà Mau",
    };

    public EmailService(IConfiguration config)
    {
        _config = config;
    }

    public async Task SendOtpAsync(string toEmail, string otp)
    {
        var smtpHost = _config["Email:SmtpHost"]!;
        var smtpPort = int.Parse(_config["Email:SmtpPort"]!);
        var username = _config["Email:Username"]!;
        var password = _config["Email:Password"]!;
        var fromName = _config["Email:FromName"]!;

        using (var client = new SmtpClient(smtpHost, smtpPort))
        {
            client.EnableSsl = true;
            client.UseDefaultCredentials = false;
            client.Credentials = new NetworkCredential(username, password);
            client.Timeout = 30000;

            using (var mail = new MailMessage())
            {
                mail.From = new MailAddress(username, fromName);
                mail.Subject = "Xác thực tài khoản Vé247";
                mail.IsBodyHtml = true;
                mail.BodyEncoding = System.Text.Encoding.UTF8;
                mail.Body = $@"
<!DOCTYPE html>
<html lang=""vi"">
<head><meta charset=""UTF-8"">
<meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
</head>
<body style=""margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif"">
  <table width=""100%"" cellpadding=""0"" cellspacing=""0"">
    <tr><td style=""padding:40px 16px;text-align:center"">
      <table style=""max-width:480px;margin:auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08)"" cellpadding=""0"" cellspacing=""0"">

        <tr><td style=""background:linear-gradient(135deg,#003580,#2563EB);padding:36px 32px;text-align:center"">
          <span style=""font-size:28px;font-weight:800;color:#ffffff;letter-spacing:2px;text-shadow:0 2px 4px rgba(0,0,0,0.15)"">VÉ247</span>
          <p style=""margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.7);letter-spacing:0.3px"">NỀN TẢNG ĐẶT VÉ HÀNG ĐẦU VIỆT NAM</p>
        </td></tr>

        <tr><td style=""padding:40px 32px 32px;text-align:center"">
          <div style=""width:56px;height:56px;background:#EEF2FF;border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 24px"">
            <svg width=""28"" height=""28"" viewBox=""0 0 24 24"" fill=""none"" stroke=""#2563EB"" stroke-width=""2"" stroke-linecap=""round"" stroke-linejoin=""round"">
              <path d=""M22 12h-4l-3 9L9 3l-3 9H2""/>
            </svg>
          </div>
          <h2 style=""margin:0 0 6px;font-size:22px;font-weight:700;color:#1a1a2e"">Xác thực email của bạn</h2>
          <p style=""margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.6"">
            Cảm ơn bạn đã đăng ký tài khoản Vé247.<br>
            Vui lòng nhập mã bên dưới để hoàn tất đăng ký.
          </p>

          <div style=""background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin:0 0 24px;display:inline-block"">
            <p style=""margin:0 0 6px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;font-weight:600"">Mã xác thực của bạn</p>
            <div style=""letter-spacing:12px;font-size:40px;font-weight:800;color:#2563EB;font-family:monospace"">{otp}</div>
          </div>

          <p style=""margin:0 0 32px;font-size:12px;color:#94a3b8"">
            Mã có hiệu lực trong <strong style=""color:#64748b"">10 phút</strong>.
            Nếu bạn không yêu cầu, vui lòng bỏ qua email này.
          </p>

          <table cellpadding=""0"" cellspacing=""0"" style=""margin:0 auto"">
            <tr><td style=""background:#2563EB;border-radius:10px;padding:12px 28px"">
              <a href=""#"" style=""color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block"">
                Xác thực ngay &rarr;
              </a>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style=""background:#f8fafc;padding:24px 32px;text-align:center;border-top:1px solid #e2e8f0"">
          <p style=""margin:0 0 4px;font-size:12px;color:#94a3b8"">
            <strong style=""color:#64748b"">Vé247</strong> &mdash; So sánh giá vé máy bay &amp; tàu hỏa
          </p>
          <p style=""margin:0;font-size:11px;color:#b0b8c4"">
            Hotline: <span style=""color:#2563EB;font-weight:600"">1900 6468</span>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>";

                mail.To.Add(toEmail);
                await client.SendMailAsync(mail);
            }
        }
    }

    public async Task SendPriceAlertAsync(string toEmail, string routeFrom, string routeTo, decimal targetPrice, decimal currentPrice)
    {
        var smtpHost = _config["Email:SmtpHost"]!;
        var smtpPort = int.Parse(_config["Email:SmtpPort"]!);
        var username = _config["Email:Username"]!;
        var password = _config["Email:Password"]!;
        var fromName = _config["Email:FromName"]!;

        var fromNameDisplay = CityNames.GetValueOrDefault(routeFrom, routeFrom);
        var toNameDisplay = CityNames.GetValueOrDefault(routeTo, routeTo);

        using (var client = new SmtpClient(smtpHost, smtpPort))
        {
            client.EnableSsl = true;
            client.UseDefaultCredentials = false;
            client.Credentials = new NetworkCredential(username, password);
            client.Timeout = 30000;

            using (var mail = new MailMessage())
            {
                mail.From = new MailAddress(username, fromName);
                mail.Subject = $"Giá vé {fromNameDisplay} → {toNameDisplay} đã giảm! - Vé247";
                mail.IsBodyHtml = true;
                mail.BodyEncoding = System.Text.Encoding.UTF8;
                mail.Body = $@"
<!DOCTYPE html>
<html lang=""vi"">
<head><meta charset=""UTF-8"">
<meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
</head>
<body style=""margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif"">
  <table width=""100%"" cellpadding=""0"" cellspacing=""0"">
    <tr><td style=""padding:40px 16px;text-align:center"">
      <table style=""max-width:480px;margin:auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08)"" cellpadding=""0"" cellspacing=""0"">

        <tr><td style=""background:linear-gradient(135deg,#059669,#10B981);padding:36px 32px;text-align:center"">
          <span style=""font-size:28px;font-weight:800;color:#ffffff;letter-spacing:2px;text-shadow:0 2px 4px rgba(0,0,0,0.15)"">VÉ247</span>
          <p style=""margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.7);letter-spacing:0.3px"">CẢNH BÁO GIÁ</p>
        </td></tr>

        <tr><td style=""padding:40px 32px 32px;text-align:center"">
          <div style=""width:56px;height:56px;background:#ECFDF5;border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 24px"">
            <svg width=""28"" height=""28"" viewBox=""0 0 24 24"" fill=""none"" stroke=""#059669"" stroke-width=""2"" stroke-linecap=""round"" stroke-linejoin=""round"">
              <path d=""M22 17h-3l-2-9H7L5 17H2M6 17a2 2 0 1 0 4 0M14 17a2 2 0 1 0 4 0""/>
              <path d=""M12 6V2M8 4h8""/>
            </svg>
          </div>
          <h2 style=""margin:0 0 6px;font-size:22px;font-weight:700;color:#1a1a2e"">Giá vé đã giảm!</h2>
          <p style=""margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6"">
            Giá vé tuyến đường bạn theo dõi đã giảm xuống dưới mức mục tiêu.
            Đây là cơ hội tốt để bạn đặt vé ngay!
          </p>

          <div style=""background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin:0 0 24px"">
            <table width=""100%"" cellpadding=""0"" cellspacing=""0"">
              <tr>
                <td style=""text-align:center;padding:0 8px"">
                  <p style=""margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600"">Điểm đi</p>
                  <p style=""margin:0;font-size:16px;font-weight:700;color:#1a1a2e"">{fromNameDisplay}</p>
                  <p style=""margin:2px 0 0;font-size:11px;color:#94a3b8"">{routeFrom}</p>
                </td>
                <td style=""text-align:center;padding:0 8px"">
                  <p style=""margin:0 0 8px;font-size:20px;color:#cbd5e1"">&rarr;</p>
                </td>
                <td style=""text-align:center;padding:0 8px"">
                  <p style=""margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600"">Điểm đến</p>
                  <p style=""margin:0;font-size:16px;font-weight:700;color:#1a1a2e"">{toNameDisplay}</p>
                  <p style=""margin:2px 0 0;font-size:11px;color:#94a3b8"">{routeTo}</p>
                </td>
              </tr>
            </table>
            <div style=""height:1px;background:#e2e8f0;margin:20px 0"" />
            <table width=""100%"" cellpadding=""0"" cellspacing=""0"">
              <tr>
                <td style=""text-align:center;width:50%"">
                  <p style=""margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600"">Giá mục tiêu</p>
                  <p style=""margin:0;font-size:18px;font-weight:700;color:#64748b"">{targetPrice:N0}đ</p>
                </td>
                <td style=""text-align:center;width:50%"">
                  <p style=""margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600"">Giá hiện tại</p>
                  <p style=""margin:0;font-size:24px;font-weight:800;color:#059669"">{currentPrice:N0}đ</p>
                </td>
              </tr>
            </table>
          </div>

          <table cellpadding=""0"" cellspacing=""0"" style=""margin:0 auto"">
            <tr><td style=""background:#059669;border-radius:10px;padding:14px 32px"">
              <a href=""#"" style=""color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block"">
                Đặt vé ngay &rarr;
              </a>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style=""background:#f8fafc;padding:24px 32px;text-align:center;border-top:1px solid #e2e8f0"">
          <p style=""margin:0 0 4px;font-size:12px;color:#94a3b8"">
            <strong style=""color:#64748b"">Vé247</strong> &mdash; So sánh giá vé máy bay &amp; tàu hỏa
          </p>
          <p style=""margin:0;font-size:11px;color:#b0b8c4"">
            Hotline: <span style=""color:#059669;font-weight:600"">1900 6468</span>
          </p>
          <p style=""margin:6px 0 0;font-size:10px;color:#cbd5e1"">
            Bạn nhận được email này vì đã đăng ký cảnh báo giá trên Vé247.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>";

                mail.To.Add(toEmail);
                await client.SendMailAsync(mail);
            }
        }
    }
}
