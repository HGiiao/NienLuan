using FlightAggregatorApi.Data;
using FlightAggregatorApi.Models;
using FlightAggregatorApi.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace FlightAggregatorApi.Tests;

public class ChatBotServiceTests
{
    [Fact]
    public void Parses_Locations_And_Tomorrow()
    {
        var intent = ChatBotService.ParseIntent("Tôi muốn đi Hà Nội đến Đà Nẵng ngày mai");

        Assert.Equal("HAN", intent.From);
        Assert.Equal("DAD", intent.To);
        Assert.Equal(DateOnly.FromDateTime(DateTime.UtcNow).AddDays(1), intent.Date);
    }

    [Fact]
    public void Parses_Cheap_Preference_And_Reverse_Order()
    {
        var intent = ChatBotService.ParseIntent("Phương tiện nào rẻ nhất từ Sài Gòn ra Đà Nẵng?");

        Assert.Equal("SGN", intent.From);
        Assert.Equal("DAD", intent.To);
        Assert.Equal("cheap", intent.Preference);
    }

    [Fact]
    public void Parses_Train_Mode_And_Weekend()
    {
        var intent = ChatBotService.ParseIntent("Có tàu hỏa Hà Nội đi Huế cuối tuần không?");

        Assert.Equal("train", intent.Mode);
        Assert.Equal("HAN", intent.From);
        Assert.Equal("HUI", intent.To);
        // next Saturday
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var expected = today.AddDays(((int)DayOfWeek.Saturday - (int)today.DayOfWeek + 7) % 7);
        Assert.Equal(expected, intent.Date);
    }

    [Fact]
    public void Parses_Bus_Mode_And_Budget()
    {
        var intent = ChatBotService.ParseIntent("Tìm xe khách Hà Nội - Sài Gòn dưới 500k");

        Assert.Equal("bus", intent.Mode);
        Assert.Equal("HAN", intent.From);
        Assert.Equal("SGN", intent.To);
        Assert.Equal(500_000m, intent.MaxBudget);
    }

    [Fact]
    public void Parses_Decimal_Million_Budget()
    {
        var intent = ChatBotService.ParseIntent("tôi cần vé máy bay dưới 1.5tr");

        Assert.Equal("flight", intent.Mode);
        Assert.Equal(1_500_000m, intent.MaxBudget);
    }

    [Fact]
    public void Parses_Reverse_Order_Locations()
    {
        var intent = ChatBotService.ParseIntent("Sài Gòn Hà Nội ngày mai");

        Assert.Equal("SGN", intent.From);
        Assert.Equal("HAN", intent.To);
    }

    [Fact]
    public void Parses_City_Alias()
    {
        var intent = ChatBotService.ParseIntent("đi từ tphcm ra Đà Nẵng");

        Assert.Equal("SGN", intent.From);
        Assert.Equal("DAD", intent.To);
    }

    [Fact]
    public void Missing_Destination_Leaves_To_Null()
    {
        var intent = ChatBotService.ParseIntent("tôi muốn đi Hà Nội");

        Assert.Equal("HAN", intent.From);
        Assert.Null(intent.To);
    }

    [Fact]
    public void Parses_Specific_Date()
    {
        var intent = ChatBotService.ParseIntent("tìm chuyến bay Hà Nội - Sài Gòn ngày 15/8");

        Assert.Equal("HAN", intent.From);
        Assert.Equal("SGN", intent.To);
        Assert.Equal(15, intent.Date?.Day);
        Assert.Equal(8, intent.Date?.Month);
        Assert.Equal(DateTime.UtcNow.Year, intent.Date?.Year);
    }

    [Fact]
    public void Greeting_Does_Not_Extract_Locations()
    {
        var intent = ChatBotService.ParseIntent("xin chào, giúp tôi với");

        Assert.Null(intent.From);
        Assert.Null(intent.To);
    }

    [Fact]
    public void Parses_Time_Of_Day()
    {
        var intent = ChatBotService.ParseIntent("chuyến bay Hà Nội Sài Gòn sáng sớm");

        Assert.Equal("06:00", intent.TimeFrom);
        Assert.Equal("12:00", intent.TimeTo);
    }

    [Fact]
    public void Toi_And_Sang_Do_Not_Set_False_Time_Filter()
    {
        // "tôi" (I) must not be parsed as "tối" (evening); "đổi sang" must not be "sáng" (morning)
        var intent = ChatBotService.ParseIntent("Tôi muốn đi Hà Nội - Đà Nẵng ngày mai");
        Assert.Null(intent.TimeFrom);
        Assert.Null(intent.TimeTo);

        var intent2 = ChatBotService.ParseIntent("Tôi muốn đổi sang tàu hỏa Hà Nội - Huế");
        Assert.Null(intent2.TimeFrom);
        Assert.Null(intent2.TimeTo);
        Assert.Equal("train", intent2.Mode);
    }

    [Fact]
    public void Budget_Decimal_Does_Not_Set_Wrong_Date()
    {
        var intent = ChatBotService.ParseIntent("tôi cần vé máy bay dưới 1.5tr");

        Assert.Equal(1_500_000m, intent.MaxBudget);
        // Not misparsed as 01/05 — defaults to today instead
        Assert.Equal(DateOnly.FromDateTime(DateTime.UtcNow), intent.Date);
    }

    [Fact]
    public async Task Train_Recommendation_For_SaiGon_Uses_HCM_Station_Code()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        using var db = new ApplicationDbContext(options);
        var tomorrow = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(1);
        db.Trains.Add(new Train
        {
            Id = 1,
            TrainCode = "SE3",
            TrainName = "SE3",
            DepartureLocation = "HAN",
            ArrivalLocation = "HCM",
            DepartureTime = tomorrow.ToDateTime(new TimeOnly(6, 0)),
            ArrivalTime = tomorrow.ToDateTime(new TimeOnly(12, 0)),
            Price = 800_000,
            Seats = 100,
            TrainDate = tomorrow,
            CoachClass = "Soft Seat",
        });
        await db.SaveChangesAsync();

        var svc = new ChatBotService(db);
        var result = await svc.RecommendAsync("Tôi muốn đi tàu hỏa Hà Nội Sài Gòn ngày mai");

        var trainOpt = Assert.Single(result.Options);
        Assert.Equal("train", trainOpt.Mode);
        Assert.Contains("/trains?from=HAN&to=HCM", trainOpt.Nav);
    }
}
