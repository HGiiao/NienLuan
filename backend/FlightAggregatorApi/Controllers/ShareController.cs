using System.Net;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;

namespace FlightAggregatorApi.Controllers;

[ApiController]
[Route("share")]
public class ShareController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public ShareController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet("{type}/{id:long}")]
    public async Task<IActionResult> Share(string type, long id)
    {
        string title = "", description = "", image = "", url = "";
        var baseUrl = $"{Request.Scheme}://{Request.Host}";

        if (type == "flight")
        {
            var flight = await _db.Flights.AsNoTracking().FirstOrDefaultAsync(f => f.Id == id);
            if (flight == null) return NotFound();
            title = $"Vé247 — {flight.AirlineName} {flight.DepartureLocation} → {flight.ArrivalLocation}";
            description = $"Chỉ từ {flight.Price:N0}₫ · {flight.DepartureTime:HH:mm} → {flight.ArrivalTime:HH:mm}";
            image = $"{baseUrl}/images/og-flight.png";
            url = $"{baseUrl}/booking/flight/{id}";
        }
        else if (type == "train")
        {
            var train = await _db.Trains.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
            if (train == null) return NotFound();
            title = $"Vé247 — {train.TrainName} {train.DepartureLocation} → {train.ArrivalLocation}";
            description = $"Chỉ từ {train.Price:N0}₫ · {train.DepartureTime:HH:mm} → {train.ArrivalTime:HH:mm}";
            image = $"{baseUrl}/images/og-train.png";
            url = $"{baseUrl}/booking/train/{id}";
        }
        else
        {
            return NotFound();
        }

        var safeTitle = System.Net.WebUtility.HtmlEncode(title);
        var safeDesc = System.Net.WebUtility.HtmlEncode(description);
        var safeUrl = System.Net.WebUtility.HtmlEncode(url);

        var html = $@"<!DOCTYPE html>
<html lang=""vi"">
<head>
<meta charset=""UTF-8"">
<meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
<meta property=""og:title"" content=""{safeTitle}"">
<meta property=""og:description"" content=""{safeDesc}"">
<meta property=""og:image"" content=""{image}"">
<meta property=""og:url"" content=""{safeUrl}"">
<meta property=""og:type"" content=""website"">
<meta property=""og:locale"" content=""vi_VN"">
<meta name=""twitter:card"" content=""summary_large_image"">
<meta name=""twitter:title"" content=""{safeTitle}"">
<meta name=""twitter:description"" content=""{safeDesc}"">
<meta name=""twitter:image"" content=""{image}"">
<meta http-equiv=""refresh"" content=""3;url={safeUrl}"">
<title>{safeTitle}</title>
<style>
body {{ font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0F172A; color: #F1F5F9; }}
.card {{ text-align: center; padding: 2rem; }}
.logo {{ font-size: 2rem; font-weight: 800; color: #38BDF8; }}
p {{ color: #94A3B8; margin-top: 0.5rem; }}
a {{ color: #38BDF8; }}
</style>
</head>
<body>
<div class=""card"">
<div class=""logo"">Vé247</div>
<p>{safeDesc}</p>
<p>Đang chuyển hướng đến trang đặt vé…</p>
<p><a href=""{safeUrl}"">Nhấn vào đây nếu không tự động chuyển</a></p>
</div>
</body>
</html>";

        return Content(html, "text/html; charset=utf-8");
    }
}
