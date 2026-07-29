using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;

namespace FlightAggregatorApi.Services;

public class PricePredictionService
{
    private readonly ApplicationDbContext _db;

    public PricePredictionService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<PricePredictionResult> Predict(string from, string to, int daysAhead = 7)
    {
        var since = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
        var data = await _db.PriceHistories
            .AsNoTracking()
            .Where(p => p.RouteFrom == from && p.RouteTo == to && p.RecordedDate >= since)
            .GroupBy(p => p.RecordedDate)
            .Select(g => new { Date = g.Key, AvgPrice = g.Average(p => p.Price) })
            .OrderBy(d => d.Date)
            .ToListAsync();

        if (data.Count < 3)
            return new PricePredictionResult { Confidence = 0, Recommendation = "insufficient_data" };

        var n = data.Count;
        var sumX = 0d; var sumY = 0d; var sumXY = 0d; var sumX2 = 0d;

        for (int i = 0; i < n; i++)
        {
            var x = i + 1d;
            var y = (double)data[i].AvgPrice;
            sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x;
        }

        var slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        var intercept = (sumY - slope * sumX) / n;
        var meanY = sumY / n;
        var ssTot = 0d; var ssRes = 0d;

        for (int i = 0; i < n; i++)
        {
            var x = i + 1d;
            var y = (double)data[i].AvgPrice;
            var yPred = intercept + slope * x;
            ssTot += (y - meanY) * (y - meanY);
            ssRes += (y - yPred) * (y - yPred);
        }

        var r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

        var predictions = new List<DayPrediction>();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        for (int i = 1; i <= daysAhead; i++)
        {
            var x = n + i;
            var predictedPrice = (decimal)(intercept + slope * x);
            predictions.Add(new DayPrediction
            {
                Date = today.AddDays(i),
                PredictedPrice = predictedPrice < 0 ? 0 : predictedPrice
            });
        }

        var lastPrice = data.Last().AvgPrice;
        var futureMin = predictions.Min(p => p.PredictedPrice);
        var futureMax = predictions.Max(p => p.PredictedPrice);
        var trendStr = futureMax > futureMin ? "up" : futureMax < futureMin ? "down" : "stable";
        var changePercent = lastPrice > 0 ? ((futureMin - lastPrice) / lastPrice) * 100 : 0;

        string recommendation;
        if (r2 < 0.3)
            recommendation = "uncertain";
        else if (trendStr == "up" && r2 >= 0.3)
            recommendation = "buy_now";
        else if (trendStr == "down" && r2 >= 0.3)
            recommendation = "wait";
        else
            recommendation = "neutral";

        return new PricePredictionResult
        {
            CurrentPrice = lastPrice,
            PredictedPrice = predictions.First().PredictedPrice,
            Confidence = r2,
            Trend = trendStr,
            ChangePercent = changePercent,
            Recommendation = recommendation,
            Predictions = predictions
        };
    }

    public async Task<PricePredictionResult> PredictForFlight(long flightId)
    {
        var flight = await _db.Flights.AsNoTracking().FirstOrDefaultAsync(f => f.Id == flightId);
        if (flight == null) return new PricePredictionResult { Confidence = 0, Recommendation = "insufficient_data" };
        return await Predict(flight.DepartureLocation, flight.ArrivalLocation);
    }

    public async Task<PricePredictionResult> PredictForTrain(long trainId)
    {
        var train = await _db.Trains.AsNoTracking().FirstOrDefaultAsync(t => t.Id == trainId);
        if (train == null) return new PricePredictionResult { Confidence = 0, Recommendation = "insufficient_data" };
        return await Predict(train.DepartureLocation, train.ArrivalLocation);
    }
}

public class PricePredictionResult
{
    public decimal CurrentPrice { get; set; }
    public decimal PredictedPrice { get; set; }
    public double Confidence { get; set; }
    public string Trend { get; set; } = "stable";
    public decimal ChangePercent { get; set; }
    public string Recommendation { get; set; } = "neutral";
    public List<DayPrediction> Predictions { get; set; } = new();
}

public class DayPrediction
{
    public DateOnly Date { get; set; }
    public decimal PredictedPrice { get; set; }
}
