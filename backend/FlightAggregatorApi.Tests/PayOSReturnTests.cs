using System.Net.Http;
using FlightAggregatorApi.Controllers;
using FlightAggregatorApi.Data;
using FlightAggregatorApi.Models;
using FlightAggregatorApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace FlightAggregatorApi.Tests;

/// <summary>
/// Tests for the PayOS return handler lookup logic (retry-safe orderCode fix).
/// Uses InMemory DB + services with empty config; the return handler is only
/// exercised WITHOUT a paymentLinkId so no real PayOS HTTP call is made.
/// </summary>
public class PayOSReturnTests
{
    private sealed class FakeHttpClientFactory : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new HttpClient();
    }

    private static (ApplicationDbContext Db, PaymentsController Controller) Create()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"payos-return-{Guid.NewGuid()}")
            .Options;
        var db = new ApplicationDbContext(options);
        var config = new ConfigurationBuilder().Build();
        var logger = NullLogger.Instance;

        var http = new FakeHttpClientFactory();
        var controller = new PaymentsController(
            db,
            new VnPayService(config, NullLogger<VnPayService>.Instance),
            new MoMoService(config, NullLogger<MoMoService>.Instance, http),
            new ZaloPayService(config, NullLogger<ZaloPayService>.Instance, http),
            new PayOSService(config, NullLogger<PayOSService>.Instance, http),
            NullLogger<PaymentsController>.Instance);

        return (db, controller);
    }

    private static async Task<Booking> SeedBookingAsync(
        ApplicationDbContext db, int? payOSOrderCode = null, string status = "Pending")
    {
        var user = new User
        {
            Email = $"u{Guid.NewGuid():N}@test.vn",
            FullName = "Test",
            Phone = "0900000000",
            PasswordHash = "",
            IsEmailVerified = true,
            Role = "User",
        };
        db.Users.Add(user);

        var booking = new Booking
        {
            User = user,
            UserId = user.Id,
            TotalPrice = 500_000m,
            Passengers = 1,
            Status = status,
            PayOSOrderCode = payOSOrderCode,
        };
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();
        return booking;
    }

    private static async Task<(bool Success, string? Message)> CallReturnAsync(
        PaymentsController controller, Dictionary<string, string> query)
    {
        var result = await controller.PayOSReturn(query);
        var ok = Assert.IsType<OkObjectResult>(result);
        var value = ok.Value!;
        var type = value.GetType();
        var success = (bool)type.GetProperty("success")!.GetValue(value)!;
        var message = (string?)type.GetProperty("message")?.GetValue(value);
        return (success, message);
    }

    [Fact]
    public async Task Confirms_By_Stored_PayOSOrderCode()
    {
        var (db, controller) = Create();
        var booking = await SeedBookingAsync(db, payOSOrderCode: 555_123_456);

        var res = await CallReturnAsync(controller, new Dictionary<string, string>
        {
            ["status"] = "PAID",
            ["code"] = "00",
            ["orderCode"] = "555123456",
        });

        Assert.True(res.Success);
        var reloaded = await db.Bookings.FindAsync(booking.Id);
        Assert.Equal("Confirmed", reloaded!.Status);
        Assert.StartsWith("PAYOS_", reloaded.TransactionId);
        Assert.Equal("payos", reloaded.PaymentProvider);
    }

    [Fact]
    public async Task Confirms_Legacy_Link_By_BookingId()
    {
        // Pre-fix links used orderCode = booking.Id and never stored PayOSOrderCode.
        var (db, controller) = Create();
        var booking = await SeedBookingAsync(db, payOSOrderCode: null);
        var legacyOrderCode = (int)booking.Id;

        var res = await CallReturnAsync(controller, new Dictionary<string, string>
        {
            ["status"] = "PAID",
            ["code"] = "00",
            ["orderCode"] = legacyOrderCode.ToString(),
        });

        Assert.True(res.Success);
        var reloaded = await db.Bookings.FindAsync(booking.Id);
        Assert.Equal("Confirmed", reloaded!.Status);
    }

    [Fact]
    public async Task Returns_Failure_When_No_Booking_Matches()
    {
        var (db, controller) = Create();
        var booking = await SeedBookingAsync(db, payOSOrderCode: 111_222_333);

        var res = await CallReturnAsync(controller, new Dictionary<string, string>
        {
            ["status"] = "PAID",
            ["code"] = "00",
            ["orderCode"] = "999999999", // no matching booking
        });

        Assert.False(res.Success);
        var reloaded = await db.Bookings.FindAsync(booking.Id);
        Assert.Equal("Pending", reloaded!.Status);
    }

    [Fact]
    public async Task Does_Not_Confirm_When_Not_Paid()
    {
        var (db, controller) = Create();
        var booking = await SeedBookingAsync(db, payOSOrderCode: 123_456_789);

        var res = await CallReturnAsync(controller, new Dictionary<string, string>
        {
            ["status"] = "PENDING",
            ["code"] = "03",
            ["orderCode"] = "123456789",
        });

        Assert.False(res.Success);
        var reloaded = await db.Bookings.FindAsync(booking.Id);
        Assert.Equal("Pending", reloaded!.Status);
    }
}
