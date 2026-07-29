using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;
using FlightAggregatorApi.Models;

namespace FlightAggregatorApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LocationsController : ControllerBase
{
    private static readonly Dictionary<string, string> CityNames = new()
    {
        ["HAN"] = "Hà Nội",
        ["SGN"] = "TP. Hồ Chí Minh",
        ["DAD"] = "Đà Nẵng",
        ["CXR"] = "Nha Trang",
        ["PQC"] = "Phú Quốc",
        ["HCM"] = "TP. Hồ Chí Minh",
        ["HPH"] = "Hải Phòng",
        ["HUI"] = "Huế",
        ["VII"] = "Vinh",
        ["VCA"] = "Cần Thơ",
        ["UIH"] = "Quy Nhơn",
        ["QNG"] = "Quảng Ngãi",
    };

    private readonly ApplicationDbContext _db;

    public LocationsController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string? q)
    {
        var codes = await _db.Flights.AsNoTracking()
            .Select(f => f.DepartureLocation)
            .Union(_db.Flights.Select(f => f.ArrivalLocation))
            .Union(_db.Trains.Select(t => t.DepartureLocation))
            .Union(_db.Trains.Select(t => t.ArrivalLocation))
            .Distinct()
            .ToListAsync();

        var locations = codes
            .Select(c => new Location
            {
                Code = c,
                Name = CityNames.GetValueOrDefault(c, c)
            })
            .OrderBy(l => l.Name)
            .ToList();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var qn = q.Trim().ToUpperInvariant();
            locations = locations
                .Where(l => l.Code.Contains(qn) || l.Name.Contains(qn, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        return Ok(locations);
    }
}
