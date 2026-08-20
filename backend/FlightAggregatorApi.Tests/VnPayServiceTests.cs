using System.Collections.Specialized;
using FlightAggregatorApi.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Xunit;

namespace FlightAggregatorApi.Tests;

public class VnPayServiceTests
{
    private static VnPayService CreateService(Action<Dictionary<string, string?>>? configure = null)
    {
        var values = new Dictionary<string, string?>
        {
            ["VnPay:TmnCode"] = "P6U7OO6U",
            ["VnPay:HashSecret"] = "JUCKRSJYPIHJJYNERATZPMAAEWJWUGZI",
            ["VnPay:SandboxUrl"] = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
            ["VnPay:ReturnUrl"] = "http://localhost:5173/payment/vnpay-return",
            ["VnPay:IpnUrl"] = "http://localhost:5000/api/payments/vnpay-ipn",
        };
        configure?.Invoke(values);
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(values!)
            .Build();
        return new VnPayService(config, NullLogger<VnPayService>.Instance);
    }

    // ---------- IP normalization ----------

    [Theory]
    [InlineData("::1", "127.0.0.1")]
    [InlineData("127.0.0.1", "127.0.0.1")]
    [InlineData("192.168.1.5", "192.168.1.5")]
    [InlineData("0:0:0:0:0:0:0:1", "127.0.0.1")]
    [InlineData("", "127.0.0.1")]
    [InlineData(null, "127.0.0.1")]
    public void NormalizeIpv4_Converts_Loopback_And_Empty_To_V4(string? input, string expected)
    {
        Assert.Equal(expected, VnPayService.NormalizeIpv4(input));
    }

    [Fact]
    public void ResolveClientIp_Uses_XForwardedFor_First()
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.Headers["X-Forwarded-For"] = "203.0.113.9, 10.0.0.1";
        ctx.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("::1");

        Assert.Equal("203.0.113.9", VnPayService.ResolveClientIp(ctx));
    }

    [Fact]
    public void ResolveClientIp_Falls_Back_To_Loopback_When_No_Header()
    {
        var ctx = new DefaultHttpContext();
        ctx.Connection.RemoteIpAddress = System.Net.IPAddress.IPv6Loopback;

        Assert.Equal("127.0.0.1", VnPayService.ResolveClientIp(ctx));
    }

    // ---------- Payment URL & signature ----------

    [Fact]
    public void CreatePaymentUrl_Contains_All_Required_Params_With_Ipv4()
    {
        var svc = CreateService();
        var url = svc.CreatePaymentUrl(42, 1_350_000m, "Ve247 booking #42", "::1");

        Assert.StartsWith("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?", url);

        var qs = new Uri(url).Query.TrimStart('?');
        var nvc = ParseQuery(qs);
        Assert.Equal("2.1.0", nvc["vnp_Version"]);
        Assert.Equal("pay", nvc["vnp_Command"]);
        Assert.Equal("P6U7OO6U", nvc["vnp_TmnCode"]);
        Assert.Equal("135000000", nvc["vnp_Amount"]); // 1.350.000 VND × 100
        Assert.Equal("VND", nvc["vnp_CurrCode"]);
        Assert.Equal("42", nvc["vnp_TxnRef"]);
        Assert.Equal("other", nvc["vnp_OrderType"]);
        Assert.Equal("vn", nvc["vnp_Locale"]);
        Assert.Equal("127.0.0.1", nvc["vnp_IpAddr"]); // ::1 → IPv4
        Assert.Matches(@"^\d{14}$", nvc["vnp_CreateDate"]);
        Assert.Matches(@"^\d{14}$", nvc["vnp_ExpireDate"]);
        Assert.False(string.IsNullOrEmpty(nvc["vnp_SecureHash"]));
        Assert.Equal(128, nvc["vnp_SecureHash"]!.Length); // HMAC-SHA512 hex
    }

    [Fact]
    public void CreatePaymentUrl_Amount_Is_Rounded_To_Integer()
    {
        var svc = CreateService();
        var url = svc.CreatePaymentUrl(7, 49_500.5m, "test", "127.0.0.1");

        var qs = new Uri(url).Query.TrimStart('?');
        var nvc = ParseQuery(qs);
        Assert.Equal("4950050", nvc["vnp_Amount"]);
    }

    [Fact]
    public void Signature_Generated_Matches_Verification_RoundTrip()
    {
        var svc = CreateService();
        var url = svc.CreatePaymentUrl(99, 500_000m, "Ve247 booking #99", "203.0.113.7");

        var qs = new Uri(url).Query.TrimStart('?');
        var nvc = ParseQuery(qs);

        var incoming = nvc.AllKeys
            .Where(k => k!.StartsWith("vnp_"))
            .ToDictionary(k => k!, k => nvc[k]!);

        var result = svc.VerifyReturnQuery(incoming);
        Assert.True(result.SignatureValid);
    }

    [Fact]
    public void Throws_When_Credentials_Missing()
    {
        var svc = CreateService(c => { c["VnPay:TmnCode"] = ""; c["VnPay:HashSecret"] = ""; });
        Assert.Throws<InvalidOperationException>(() => svc.CreatePaymentUrl(1, 100, "test", "127.0.0.1"));
    }

    private static NameValueCollection ParseQuery(string query)
    {
        var nvc = new NameValueCollection();
        foreach (var pair in query.Split('&'))
        {
            var idx = pair.IndexOf('=');
            if (idx < 0) continue;
            var key = Uri.UnescapeDataString(pair[..idx].Replace('+', ' '));
            var val = Uri.UnescapeDataString(pair[(idx + 1)..].Replace('+', ' '));
            nvc.Add(key, val);
        }
        return nvc;
    }
}