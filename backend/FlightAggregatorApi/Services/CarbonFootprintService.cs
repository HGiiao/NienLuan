namespace FlightAggregatorApi.Services;

public class CarbonFootprintResult
{
    public double FlightKgCO2 { get; set; }
    public double TrainKgCO2 { get; set; }
    public string RouteFrom { get; set; } = string.Empty;
    public string RouteTo { get; set; } = string.Empty;
    public double DistanceKm { get; set; }
    public bool TrainIsGreener => TrainKgCO2 < FlightKgCO2;
    public double SavedKgCO2 => Math.Round(FlightKgCO2 - TrainKgCO2, 1);
    public string Recommendation { get; set; } = string.Empty;
}

public class CarbonFootprintService
{
    private static readonly Dictionary<(string, string), double> RouteDistances = new()
    {
        { ("HAN", "SGN"), 1610 }, { ("SGN", "HAN"), 1610 },
        { ("HAN", "DAD"), 760 },  { ("DAD", "HAN"), 760 },
        { ("HAN", "CXR"), 1280 }, { ("CXR", "HAN"), 1280 },
        { ("HAN", "PQC"), 1100 }, { ("PQC", "HAN"), 1100 },
        { ("SGN", "DAD"), 960 },  { ("DAD", "SGN"), 960 },
        { ("SGN", "CXR"), 400 },  { ("CXR", "SGN"), 400 },
        { ("SGN", "PQC"), 300 },  { ("PQC", "SGN"), 300 },
        { ("DAD", "CXR"), 500 },  { ("CXR", "DAD"), 500 },
        { ("DAD", "PQC"), 650 },  { ("PQC", "DAD"), 650 },
        { ("HAN", "HPH"), 100 },  { ("HPH", "HAN"), 100 },
        { ("HAN", "VII"), 290 },  { ("VII", "HAN"), 290 },
        { ("SGN", "VCA"), 170 },  { ("VCA", "SGN"), 170 },
        { ("SGN", "UIH"), 350 },  { ("UIH", "SGN"), 350 },
        { ("DAD", "HUI"), 100 },  { ("HUI", "DAD"), 100 },
    };

    public static double FlightCO2PerKmKg => 0.255;

    public static double TrainCO2PerKmKg => 0.041;

    public static CarbonFootprintResult Calculate(string from, string to)
    {
        var dist = RouteDistances.GetValueOrDefault((from, to), 500.0);
        var flightCO2 = Math.Round(dist * FlightCO2PerKmKg, 1);
        var trainCO2 = Math.Round(dist * TrainCO2PerKmKg, 1);

        string recommendation;
        if (trainCO2 < flightCO2 * 0.5)
            recommendation = $"Tàu hỏa thải ra ít hơn {(flightCO2 - trainCO2):F0}kg CO₂ so với máy bay. Lựa chọn xanh cho môi trường!";
        else if (dist < 300)
            recommendation = "Tuyến ngắn, tàu hỏa là lựa chọn thân thiện với môi trường nhất.";
        else
            recommendation = $"Máy bay thải {(flightCO2 / trainCO2):F1}x CO₂ so với tàu hỏa trên tuyến này.";

        return new CarbonFootprintResult
        {
            FlightKgCO2 = flightCO2,
            TrainKgCO2 = trainCO2,
            RouteFrom = from,
            RouteTo = to,
            DistanceKm = dist,
            Recommendation = recommendation
        };
    }
}
