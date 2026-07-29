using FlightAggregatorApi.Data;
using FlightAggregatorApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FlightAggregatorApi.Services;

public class SeatMapService
{
    private readonly ApplicationDbContext _db;

    public SeatMapService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<List<Seat>> GetOrGenerateSeatMap(string type, long referenceId)
    {
        var existing = await _db.Seats.Where(s => s.ReferenceType == type && s.ReferenceId == referenceId).ToListAsync();
        if (existing.Count > 0) return existing;

        var seats = GenerateSeats(type, referenceId);
        _db.Seats.AddRange(seats);
        await _db.SaveChangesAsync();
        return seats;
    }

    private static List<Seat> GenerateSeats(string type, long referenceId)
    {
        var seats = new List<Seat>();

        if (type == "flight")
        {
            string[] cols = ["A", "B", "C", "D", "E", "F"];
            int totalRows = 30;
            int businessRows = 4;

            for (int row = 1; row <= totalRows; row++)
            {
                string deck = row <= businessRows ? "business" : "economy";
                decimal priceMultiplier = deck == "business" ? 2.5m : 1.0m;

                for (int ci = 0; ci < cols.Length; ci++)
                {
                    string col = cols[ci];
                    bool isWindow = col == "A" || col == "F";
                    bool isAisle = col == "C" || col == "D";
                    bool isExitRow = row == 1 || row == businessRows + 1 || row == 12 || row == 20;

                    var seat = new Seat
                    {
                        ReferenceType = type,
                        ReferenceId = referenceId,
                        SeatNumber = $"{row}{col}",
                        Row = row.ToString(),
                        Column = col,
                        Deck = deck,
                        Class = deck == "business" ? "business" : "economy",
                        Status = "available",
                        IsExitRow = isExitRow,
                        IsWindow = isWindow,
                        IsAisle = isAisle,
                        Price = (decimal)(deck == "business" ? 500000 : 200000) + (isWindow || isAisle ? 50000 : 0),
                    };
                    seats.Add(seat);
                }
            }
        }
        else if (type == "train")
        {
            string[] compartments = ["1", "2", "3", "4", "5", "6", "7", "8"];
            foreach (var comp in compartments)
            {
                for (int berth = 1; berth <= 6; berth++)
                {
                    string col = berth <= 3 ? "lower" : "upper";
                    bool isWindow = berth == 1 || berth == 4;
                    bool isAisle = berth == 3 || berth == 6;

                    var seat = new Seat
                    {
                        ReferenceType = type,
                        ReferenceId = referenceId,
                        SeatNumber = $"Khoang {comp}-Giường {berth}",
                        Row = comp,
                        Column = berth.ToString(),
                        Deck = "main",
                        Class = "sleeper",
                        Status = "available",
                        IsExitRow = false,
                        IsWindow = isWindow,
                        IsAisle = isAisle,
                        Price = 150000,
                    };
                    seats.Add(seat);
                }
            }
        }

        return seats;
    }
}
