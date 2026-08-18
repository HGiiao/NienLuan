using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;
using FlightAggregatorApi.Services;
using FlightAggregatorApi.Hubs;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    // Mọi DateTime trả về luôn ở dạng UTC (kèm 'Z') để trình duyệt parse đúng
    options.JsonSerializerOptions.Converters.Add(new FlightAggregatorApi.Services.UtcDateTimeConverter());
});
builder.Services.AddOpenApi();

var connString = builder.Configuration.GetConnectionString("AzureSqlDb")
    ?? throw new InvalidOperationException("Connection string 'AzureSqlDb' not found.");
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(connString));

builder.Services.AddScoped<PriceAggregatorService>();
builder.Services.AddScoped<PriceHistoryService>();
builder.Services.AddScoped<PricePredictionService>();
builder.Services.AddScoped<RouteOptimizerService>();
builder.Services.AddScoped<EmailService>();
builder.Services.AddScoped<PriceAlertService>();
builder.Services.AddScoped<VnPayService>();
builder.Services.AddScoped<MoMoService>();
builder.Services.AddScoped<ZaloPayService>();
builder.Services.AddScoped<PayOSService>();
builder.Services.AddScoped<ChatBotService>();
builder.Services.AddScoped<SeedDataService>();
builder.Services.AddScoped<DatabaseInitializerService>();

builder.Services.Configure<VietQrOptions>(
    builder.Configuration.GetSection("VietQr"));
builder.Services.AddHttpClient<VietQrService>();

builder.Services.AddSignalR();
builder.Services.AddHostedService<PriceStreamService>();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
            builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["http://localhost:5173"])
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
});

builder.Services.AddMemoryCache();

var app = builder.Build();

// Create tables (if not exist) and seed database — logic nằm trong DatabaseInitializerService
using (var scope = app.Services.CreateScope())
{
    var initializer = scope.ServiceProvider.GetRequiredService<DatabaseInitializerService>();
    await initializer.InitializeAsync();
}

app.UseCors();
app.UseHttpsRedirection();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseResponseCompression();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapControllers();

app.MapHub<PriceHub>("/hubs/prices");

app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

app.MapGet("/share/{type}/{id:long}", async (string type, long id, ApplicationDbContext db) =>
{
    object? item = null;
    string title = "Vé247 - Đặt vé thông minh";
    string description = "Khám phá ưu đãi vé máy bay và tàu hỏa giá tốt nhất tại Vé247";
    decimal price = 0;

    if (type == "flight")
    {
        var f = await db.Flights.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (f != null) { item = f; price = f.Price; title = $"Vé máy bay {f.DepartureLocation} → {f.ArrivalLocation}"; description = $"Chỉ từ {f.Price:N0}₫ - Khởi hành {f.FlightDate:dd/MM/yyyy}"; }
    }
    else if (type == "train")
    {
        var t = await db.Trains.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (t != null) { item = t; price = t.Price; title = $"Vé tàu {t.DepartureLocation} → {t.ArrivalLocation}"; description = $"Chỉ từ {t.Price:N0}₫ - Khởi hành {t.TrainDate:dd/MM/yyyy}"; }
    }
    else if (type == "bus")
    {
        var b = await db.Buses.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (b != null) { item = b; price = b.Price; title = $"Vé xe khách {b.DepartureLocation} → {b.ArrivalLocation}"; description = $"Chỉ từ {b.Price:N0}₫ - Khởi hành {b.BusDate:dd/MM/yyyy}"; }
    }

    if (item == null)
        return Results.NotFound();

    var ogUrl = $"{builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()?.FirstOrDefault() ?? "http://localhost:5173"}/booking/{type}/{id}";
    var safeTitle = System.Net.WebUtility.HtmlEncode(title);
    var safeDescription = System.Net.WebUtility.HtmlEncode(description);
    var safeUrl = System.Net.WebUtility.HtmlEncode(ogUrl);

    var html = $$"""
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8" />
        <meta property="og:title" content="{{safeTitle}}" />
        <meta property="og:description" content="{{safeDescription}}" />
        <meta property="og:url" content="{{safeUrl}}" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Vé247" />
        <meta property="og:locale" content="vi_VN" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="{{safeTitle}}" />
        <meta name="twitter:description" content="{{safeDescription}}" />
        <title>{{safeTitle}} - Vé247</title>
        <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0F172A;color:#F1F5F9;} .card{background:#1E293B;border-radius:16px;padding:32px;max-width:400px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.3);} .price{font-size:32px;font-weight:900;color:#3B82F6;} .route{font-size:20px;font-weight:700;margin:12px 0;} .badge{display:inline-block;background:#3B82F6;color:white;padding:4px 12px;border-radius:8px;font-size:12px;font-weight:600;margin-bottom:12px;}</style>
    </head>
    <body>
        <div class="card">
            <div class="badge">{{(type == "flight" ? "✈️ Chuyến bay" : type == "train" ? "🚆 Tàu hỏa" : "🚌 Xe khách")}}</div>
            <div class="route">{{safeTitle.Replace("Vé máy bay ", "").Replace("Vé tàu ", "").Replace("Vé xe khách ", "")}}</div>
            <div class="price">{{price:N0}}₫</div>
            <p style="color:#94A3B8;margin-top:8px;font-size:14px">{{safeDescription}}</p>
            <div style="margin-top:20px;padding-top:16px;border-top:1px solid #334155;color:#64748B;font-size:12px">vé247.vn — Đặt vé thông minh</div>
        </div>
    </body>
    </html>
    """;
    return Results.Content(html, "text/html");
});

app.Run();
