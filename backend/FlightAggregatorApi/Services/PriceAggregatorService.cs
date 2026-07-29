using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;
using FlightAggregatorApi.Models;

namespace FlightAggregatorApi.Services;

public class PriceAggregatorService
{
    private readonly ApplicationDbContext _db;

    public PriceAggregatorService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<List<Flight>> FetchFlightPrices(string from, string to, DateOnly date)
    {
        return await _db.Flights
            .AsNoTracking()
            .Where(f => f.DepartureLocation == from && f.ArrivalLocation == to && f.FlightDate == date)
            .OrderBy(f => f.Price)
            .ToListAsync();
    }

    public async Task<List<Train>> FetchTrainPrices(string from, string to, DateOnly date)
    {
        return await _db.Trains
            .AsNoTracking()
            .Where(t => t.DepartureLocation == from && t.ArrivalLocation == to && t.TrainDate == date)
            .OrderBy(t => t.Price)
            .ToListAsync();
    }
}
