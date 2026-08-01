using Microsoft.EntityFrameworkCore;
using FlightAggregatorApi.Data;
using FlightAggregatorApi.Services;
using FlightAggregatorApi.Hubs;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(options =>
    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles);
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
builder.Services.AddScoped<VnPayService>();
builder.Services.AddScoped<MoMoService>();
builder.Services.AddScoped<ZaloPayService>();
builder.Services.AddScoped<SeedDataService>();

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

// Create tables (if not exist) and seed database using raw ADO.NET connection
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var conn = db.Database.GetDbConnection();
    await conn.OpenAsync();
    using var cmd = conn.CreateCommand();

    cmd.CommandText = @"
IF OBJECT_ID('Flights', 'U') IS NULL
BEGIN
CREATE TABLE Flights (Id BIGINT PRIMARY KEY IDENTITY(1,1), AirlineCode NVARCHAR(10) NOT NULL, AirlineName NVARCHAR(100) NOT NULL, DepartureLocation NVARCHAR(50) NOT NULL, ArrivalLocation NVARCHAR(50) NOT NULL, DepartureTime DATETIME2 NOT NULL, ArrivalTime DATETIME2 NOT NULL, Price DECIMAL(18,2) NOT NULL, Seats INT NOT NULL, SeatClass NVARCHAR(50) NOT NULL DEFAULT 'Economy', FlightDate DATE NOT NULL, RoundTripGroupId BIGINT NULL, CreatedAt DATETIME2 DEFAULT GETUTCDATE());
CREATE INDEX IX_Flights_Route_Date ON Flights (DepartureLocation, ArrivalLocation, FlightDate);
CREATE INDEX IX_Flights_Price ON Flights (Price);
END

IF OBJECT_ID('Trains', 'U') IS NULL
BEGIN
CREATE TABLE Trains (Id BIGINT PRIMARY KEY IDENTITY(1,1), TrainCode NVARCHAR(10) NOT NULL, TrainName NVARCHAR(100) NOT NULL, DepartureLocation NVARCHAR(50) NOT NULL, ArrivalLocation NVARCHAR(50) NOT NULL, DepartureTime DATETIME2 NOT NULL, ArrivalTime DATETIME2 NOT NULL, Price DECIMAL(18,2) NOT NULL, Seats INT NOT NULL, CoachClass NVARCHAR(50) NOT NULL DEFAULT '', TrainDate DATE NOT NULL, CreatedAt DATETIME2 DEFAULT GETUTCDATE());
CREATE INDEX IX_Trains_Route_Date ON Trains (DepartureLocation, ArrivalLocation, TrainDate);
CREATE INDEX IX_Trains_Price ON Trains (Price);
END

IF OBJECT_ID('Buses', 'U') IS NULL
BEGIN
CREATE TABLE Buses (Id BIGINT PRIMARY KEY IDENTITY(1,1), BusCode NVARCHAR(20) NOT NULL, BusCompany NVARCHAR(100) NOT NULL, DepartureLocation NVARCHAR(50) NOT NULL, ArrivalLocation NVARCHAR(50) NOT NULL, DepartureTime DATETIME2 NOT NULL, ArrivalTime DATETIME2 NOT NULL, Price DECIMAL(18,2) NOT NULL, Seats INT NOT NULL, CoachClass NVARCHAR(50) NOT NULL DEFAULT '', PickupPoint NVARCHAR(100) NOT NULL DEFAULT '', DropoffPoint NVARCHAR(100) NOT NULL DEFAULT '', BusDate DATE NOT NULL, ShareCount INT NOT NULL DEFAULT 0, CreatedAt DATETIME2 DEFAULT GETUTCDATE());
CREATE INDEX IX_Buses_Route_Date ON Buses (DepartureLocation, ArrivalLocation, BusDate);
CREATE INDEX IX_Buses_Price ON Buses (Price);
END

IF OBJECT_ID('PriceHistories', 'U') IS NULL
BEGIN
CREATE TABLE PriceHistories (Id BIGINT PRIMARY KEY IDENTITY(1,1), FlightId BIGINT NULL, TrainId BIGINT NULL, RouteFrom NVARCHAR(50) NOT NULL, RouteTo NVARCHAR(50) NOT NULL, Price DECIMAL(18,2) NOT NULL, RecordedDate DATE NOT NULL, CreatedAt DATETIME2 DEFAULT GETUTCDATE(), CONSTRAINT FK_PriceHistory_Flight FOREIGN KEY (FlightId) REFERENCES Flights(Id) ON DELETE SET NULL, CONSTRAINT FK_PriceHistory_Train FOREIGN KEY (TrainId) REFERENCES Trains(Id) ON DELETE SET NULL);
CREATE INDEX IX_PriceHistory_Route_Date ON PriceHistories (RouteFrom, RouteTo, RecordedDate);
CREATE INDEX IX_PriceHistory_Price ON PriceHistories (Price);
END

IF OBJECT_ID('Users', 'U') IS NULL
BEGIN
CREATE TABLE Users (Id BIGINT PRIMARY KEY IDENTITY(1,1), Email NVARCHAR(255) NOT NULL, FullName NVARCHAR(255) NOT NULL, Phone NVARCHAR(20) NOT NULL DEFAULT '', PasswordHash NVARCHAR(255) NOT NULL DEFAULT '', EmailVerificationCode NVARCHAR(6) NULL, IsEmailVerified BIT NOT NULL DEFAULT 0, Role NVARCHAR(20) NOT NULL DEFAULT 'User', Address NVARCHAR(500) NULL, PaymentMethod NVARCHAR(50) NULL, CreatedAt DATETIME2 DEFAULT GETUTCDATE());
CREATE UNIQUE INDEX IX_Users_Email ON Users (Email);
END

IF OBJECT_ID('Bookings', 'U') IS NULL
BEGIN
CREATE TABLE Bookings (Id BIGINT PRIMARY KEY IDENTITY(1,1), UserId BIGINT NOT NULL, FlightId BIGINT NULL, TrainId BIGINT NULL, BusId BIGINT NULL, BookingDate DATETIME2 DEFAULT GETUTCDATE(), Status NVARCHAR(50) NOT NULL DEFAULT 'Pending', TotalPrice DECIMAL(18,2) NOT NULL, Passengers INT NOT NULL DEFAULT 1, Address NVARCHAR(500) NULL, PaymentMethod NVARCHAR(50) NULL, TransactionId NVARCHAR(100) NULL, VnPayTransactionNo NVARCHAR(50) NULL, CONSTRAINT FK_Bookings_User FOREIGN KEY (UserId) REFERENCES Users(Id), CONSTRAINT FK_Bookings_Flight FOREIGN KEY (FlightId) REFERENCES Flights(Id) ON DELETE SET NULL, CONSTRAINT FK_Bookings_Train FOREIGN KEY (TrainId) REFERENCES Trains(Id) ON DELETE SET NULL, CONSTRAINT FK_Bookings_Bus FOREIGN KEY (BusId) REFERENCES Buses(Id) ON DELETE SET NULL);
CREATE INDEX IX_Bookings_UserId ON Bookings (UserId);
CREATE INDEX IX_Bookings_Status ON Bookings (Status);
END

IF OBJECT_ID('PriceAlerts', 'U') IS NULL
CREATE TABLE PriceAlerts (Id BIGINT PRIMARY KEY IDENTITY(1,1), Email NVARCHAR(255) NOT NULL, RouteFrom NVARCHAR(50) NOT NULL, RouteTo NVARCHAR(50) NOT NULL, TargetPrice DECIMAL(18,2) NOT NULL, CurrentPrice DECIMAL(18,2) NULL, IsActive BIT NOT NULL DEFAULT 1, CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(), NotifiedAt DATETIME2 NULL);

DROP TABLE IF EXISTS PriceFreezes;

-- Add missing columns (safe to run multiple times)
IF COL_LENGTH('InsurancePackages', 'Coverage') = 100 ALTER TABLE InsurancePackages ALTER COLUMN Coverage NVARCHAR(500) NOT NULL;

IF COL_LENGTH('Bookings', 'TransactionId') IS NULL ALTER TABLE Bookings ADD TransactionId NVARCHAR(100) NULL;
IF COL_LENGTH('Bookings', 'BusId') IS NULL
BEGIN
ALTER TABLE Bookings ADD BusId BIGINT NULL;
ALTER TABLE Bookings ADD CONSTRAINT FK_Bookings_Bus FOREIGN KEY (BusId) REFERENCES Buses(Id) ON DELETE SET NULL;
END
IF COL_LENGTH('Bookings', 'VnPayTransactionNo') IS NULL ALTER TABLE Bookings ADD VnPayTransactionNo NVARCHAR(50) NULL;
IF COL_LENGTH('Bookings', 'PaymentProvider') IS NULL ALTER TABLE Bookings ADD PaymentProvider NVARCHAR(50) NULL;
IF COL_LENGTH('Users', 'PasswordHash') IS NULL ALTER TABLE Users ADD PasswordHash NVARCHAR(255) NOT NULL DEFAULT '';
IF COL_LENGTH('Users', 'EmailVerificationCode') IS NULL ALTER TABLE Users ADD EmailVerificationCode NVARCHAR(6) NULL;
IF COL_LENGTH('Users', 'IsEmailVerified') IS NULL ALTER TABLE Users ADD IsEmailVerified BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('Users', 'Address') IS NULL ALTER TABLE Users ADD Address NVARCHAR(500) NULL;
IF COL_LENGTH('Users', 'PaymentMethod') IS NULL ALTER TABLE Users ADD PaymentMethod NVARCHAR(50) NULL;
IF COL_LENGTH('Flights', 'RoundTripGroupId') IS NULL ALTER TABLE Flights ADD RoundTripGroupId BIGINT NULL;IF COL_LENGTH('Flights', 'ShareCount') IS NULL ALTER TABLE Flights ADD ShareCount INT NOT NULL DEFAULT 0;
IF COL_LENGTH('Flights', 'SeatClass') IS NULL ALTER TABLE Flights ADD SeatClass NVARCHAR(50) NOT NULL DEFAULT 'Economy';
IF COL_LENGTH('Trains', 'ShareCount') IS NULL ALTER TABLE Trains ADD ShareCount INT NOT NULL DEFAULT 0;
IF COL_LENGTH('Buses', 'ShareCount') IS NULL ALTER TABLE Buses ADD ShareCount INT NOT NULL DEFAULT 0;
IF COL_LENGTH('Bookings', 'DateOfBirth') IS NULL ALTER TABLE Bookings ADD DateOfBirth DATETIME2 NULL;
IF COL_LENGTH('Bookings', 'Gender') IS NULL ALTER TABLE Bookings ADD Gender NVARCHAR(10) NULL;
IF COL_LENGTH('Bookings', 'Nationality') IS NULL ALTER TABLE Bookings ADD Nationality NVARCHAR(100) NULL;
IF COL_LENGTH('Bookings', 'IdNumber') IS NULL ALTER TABLE Bookings ADD IdNumber NVARCHAR(50) NULL;
IF COL_LENGTH('Bookings', 'EmergencyContactName') IS NULL ALTER TABLE Bookings ADD EmergencyContactName NVARCHAR(100) NULL;
IF COL_LENGTH('Bookings', 'EmergencyContactPhone') IS NULL ALTER TABLE Bookings ADD EmergencyContactPhone NVARCHAR(20) NULL;
IF COL_LENGTH('Bookings', 'SpecialRequests') IS NULL ALTER TABLE Bookings ADD SpecialRequests NVARCHAR(500) NULL;
IF COL_LENGTH('Bookings', 'PromoCode') IS NULL ALTER TABLE Bookings ADD PromoCode NVARCHAR(50) NULL;
IF COL_LENGTH('Bookings', 'DiscountAmount') IS NULL ALTER TABLE Bookings ADD DiscountAmount DECIMAL(18,2) NULL;

IF OBJECT_ID('Reviews', 'U') IS NULL
CREATE TABLE Reviews (Id BIGINT PRIMARY KEY IDENTITY(1,1), FlightId BIGINT NULL, TrainId BIGINT NULL, UserId BIGINT NULL, Email NVARCHAR(255) NOT NULL, AuthorName NVARCHAR(255) NOT NULL, Rating INT NOT NULL, Comment NVARCHAR(2000) NOT NULL, CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(), CONSTRAINT FK_Reviews_Flight FOREIGN KEY (FlightId) REFERENCES Flights(Id) ON DELETE SET NULL, CONSTRAINT FK_Reviews_Train FOREIGN KEY (TrainId) REFERENCES Trains(Id) ON DELETE SET NULL);

IF OBJECT_ID('CommunityTips', 'U') IS NULL
CREATE TABLE CommunityTips (Id BIGINT PRIMARY KEY IDENTITY(1,1), RouteFrom NVARCHAR(50) NOT NULL, RouteTo NVARCHAR(50) NOT NULL, Tip NVARCHAR(2000) NOT NULL, Category NVARCHAR(50) NOT NULL DEFAULT '', AuthorName NVARCHAR(255) NOT NULL, Email NVARCHAR(255) NOT NULL, Upvotes INT NOT NULL DEFAULT 0, CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE());

IF OBJECT_ID('Notifications', 'U') IS NULL
BEGIN
CREATE TABLE Notifications (Id BIGINT PRIMARY KEY IDENTITY(1,1), Email NVARCHAR(255) NOT NULL, Type NVARCHAR(50) NOT NULL, Title NVARCHAR(500) NOT NULL, Message NVARCHAR(2000) NOT NULL, Link NVARCHAR(500) NULL, IsRead BIT NOT NULL DEFAULT 0, CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE());
CREATE INDEX IX_Notifications_Email ON Notifications (Email);
CREATE INDEX IX_Notifications_Email_IsRead ON Notifications (Email, IsRead);
END
IF OBJECT_ID('InsurancePackages', 'U') IS NULL
CREATE TABLE InsurancePackages (Id BIGINT PRIMARY KEY IDENTITY(1,1), Name NVARCHAR(255) NOT NULL, Provider NVARCHAR(100) NOT NULL, Description NVARCHAR(2000) NOT NULL, Price DECIMAL(18,2) NOT NULL, Coverage NVARCHAR(500) NOT NULL, MaxCoverageDays INT NOT NULL DEFAULT 30, IsActive BIT NOT NULL DEFAULT 1, CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE());

IF OBJECT_ID('BookingInsurances', 'U') IS NULL
BEGIN
CREATE TABLE BookingInsurances (Id BIGINT PRIMARY KEY IDENTITY(1,1), BookingId BIGINT NOT NULL, PackageId BIGINT NOT NULL, Price DECIMAL(18,2) NOT NULL, Status NVARCHAR(50) NOT NULL DEFAULT 'active', CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(), CONSTRAINT FK_BI_Booking FOREIGN KEY (BookingId) REFERENCES Bookings(Id) ON DELETE CASCADE, CONSTRAINT FK_BI_Package FOREIGN KEY (PackageId) REFERENCES InsurancePackages(Id) ON DELETE CASCADE);
CREATE INDEX IX_BI_BookingId ON BookingInsurances (BookingId);
END

IF OBJECT_ID('CorporateAccounts', 'U') IS NULL
BEGIN
CREATE TABLE CorporateAccounts (Id BIGINT PRIMARY KEY IDENTITY(1,1), CompanyName NVARCHAR(255) NOT NULL, TaxCode NVARCHAR(100) NOT NULL, Address NVARCHAR(500) NOT NULL, ContactEmail NVARCHAR(255) NOT NULL, ContactPhone NVARCHAR(20) NOT NULL, CreditLimit DECIMAL(18,2) NOT NULL DEFAULT 50000000, UsedCredit DECIMAL(18,2) NOT NULL DEFAULT 0, RequiresApproval BIT NOT NULL DEFAULT 1, IsActive BIT NOT NULL DEFAULT 1, CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE());
CREATE UNIQUE INDEX IX_CA_TaxCode ON CorporateAccounts (TaxCode);
END

IF OBJECT_ID('CorporateEmployees', 'U') IS NULL
BEGIN
CREATE TABLE CorporateEmployees (Id BIGINT PRIMARY KEY IDENTITY(1,1), CorporateAccountId BIGINT NOT NULL, FullName NVARCHAR(255) NOT NULL, Email NVARCHAR(255) NOT NULL, Phone NVARCHAR(20) NOT NULL, Department NVARCHAR(50) NOT NULL, Role NVARCHAR(50) NOT NULL DEFAULT 'member', CanBookWithoutApproval BIT NOT NULL DEFAULT 0, MonthlyBookingLimit DECIMAL(18,2) NOT NULL DEFAULT 10000000, IsActive BIT NOT NULL DEFAULT 1, CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(), CONSTRAINT FK_CE_Account FOREIGN KEY (CorporateAccountId) REFERENCES CorporateAccounts(Id) ON DELETE CASCADE);
CREATE INDEX IX_CE_AccountId ON CorporateEmployees (CorporateAccountId);
END

IF OBJECT_ID('Invoices', 'U') IS NULL
BEGIN
CREATE TABLE Invoices (Id BIGINT PRIMARY KEY IDENTITY(1,1), CorporateAccountId BIGINT NOT NULL, InvoiceNumber NVARCHAR(50) NOT NULL, BookingId BIGINT NOT NULL, SubTotal DECIMAL(18,2) NOT NULL, VatRate DECIMAL(18,2) NOT NULL DEFAULT 0.1, Status NVARCHAR(50) NOT NULL DEFAULT 'issued', IssuedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(), PaidAt DATETIME2 NULL, CONSTRAINT FK_Inv_Account FOREIGN KEY (CorporateAccountId) REFERENCES CorporateAccounts(Id) ON DELETE CASCADE);
CREATE INDEX IX_Inv_AccountId ON Invoices (CorporateAccountId);
END

IF OBJECT_ID('SubscriptionPlans', 'U') IS NULL
CREATE TABLE SubscriptionPlans (Id BIGINT PRIMARY KEY IDENTITY(1,1), Name NVARCHAR(100) NOT NULL, Description NVARCHAR(500) NOT NULL, MonthlyPrice DECIMAL(18,2) NOT NULL, YearlyPrice DECIMAL(18,2) NOT NULL, MaxAlertsPerDay INT NOT NULL DEFAULT 5, EarlyPriceAlerts BIT NOT NULL DEFAULT 0, MultiAirlineCompare BIT NOT NULL DEFAULT 0, PrioritySupport BIT NOT NULL DEFAULT 0, FastRefund BIT NOT NULL DEFAULT 0, SeatSelection BIT NOT NULL DEFAULT 0, PriorityLevel INT NOT NULL DEFAULT 0, IsActive BIT NOT NULL DEFAULT 1, CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE());

IF OBJECT_ID('UserSubscriptions', 'U') IS NULL
BEGIN
CREATE TABLE UserSubscriptions (Id BIGINT PRIMARY KEY IDENTITY(1,1), UserId BIGINT NOT NULL, PlanId BIGINT NOT NULL, BillingCycle NVARCHAR(20) NOT NULL DEFAULT 'monthly', StartDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(), EndDate DATETIME2 NOT NULL, Status NVARCHAR(20) NOT NULL DEFAULT 'active', CONSTRAINT FK_US_Plan FOREIGN KEY (PlanId) REFERENCES SubscriptionPlans(Id) ON DELETE CASCADE);
CREATE INDEX IX_US_UserId ON UserSubscriptions (UserId);
END

IF OBJECT_ID('Hotels', 'U') IS NULL
BEGIN
CREATE TABLE Hotels (Id BIGINT PRIMARY KEY IDENTITY(1,1), Name NVARCHAR(255) NOT NULL, Location NVARCHAR(50) NOT NULL, StarRating INT NOT NULL DEFAULT 3, PricePerNight DECIMAL(18,2) NOT NULL, Description NVARCHAR(2000) NOT NULL, Amenities NVARCHAR(500) NOT NULL DEFAULT '', AvailableRooms INT NOT NULL DEFAULT 20, IsActive BIT NOT NULL DEFAULT 1, CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE());
CREATE INDEX IX_Hotels_Location ON Hotels (Location);
END

IF OBJECT_ID('HotelBookings', 'U') IS NULL
BEGIN
CREATE TABLE HotelBookings (Id BIGINT PRIMARY KEY IDENTITY(1,1), HotelId BIGINT NOT NULL, BookingId BIGINT NULL, CheckIn DATETIME2 NOT NULL, CheckOut DATETIME2 NOT NULL, Rooms INT NOT NULL DEFAULT 1, Guests INT NOT NULL DEFAULT 2, TotalPrice DECIMAL(18,2) NOT NULL, Status NVARCHAR(50) NOT NULL DEFAULT 'pending', CONSTRAINT FK_HB_Hotel FOREIGN KEY (HotelId) REFERENCES Hotels(Id) ON DELETE CASCADE, CONSTRAINT FK_HB_Booking FOREIGN KEY (BookingId) REFERENCES Bookings(Id) ON DELETE SET NULL);
CREATE INDEX IX_HB_BookingId ON HotelBookings (BookingId);
END

IF OBJECT_ID('PriceConfigs', 'U') IS NULL
BEGIN
CREATE TABLE PriceConfigs (Id BIGINT PRIMARY KEY IDENTITY(1,1), RouteFrom NVARCHAR(50) NOT NULL, RouteTo NVARCHAR(50) NOT NULL, Month INT NOT NULL, Multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.0, BaseVolatilityPct INT NOT NULL DEFAULT 5, IsActive BIT NOT NULL DEFAULT 1, CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE());
CREATE INDEX IX_PriceConfigs_Route ON PriceConfigs (RouteFrom, RouteTo, Month);
END

IF OBJECT_ID('PromoCodes', 'U') IS NULL
BEGIN
CREATE TABLE PromoCodes (Id BIGINT PRIMARY KEY IDENTITY(1,1), Code NVARCHAR(50) NOT NULL, Description NVARCHAR(500) NOT NULL, DiscountPercent DECIMAL(5,2) NOT NULL, MaxDiscount DECIMAL(18,2) NOT NULL, MinOrderValue DECIMAL(18,2) NOT NULL DEFAULT 0, UsageLimit INT NOT NULL DEFAULT 100, UsedCount INT NOT NULL DEFAULT 0, ValidFrom DATE NOT NULL, ValidTo DATE NOT NULL, IsActive BIT NOT NULL DEFAULT 1, CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE());
CREATE UNIQUE INDEX IX_PromoCodes_Code ON PromoCodes (Code);
END";
    cmd.ExecuteNonQuery();

    // Migrate old insurance package names to new short names
    cmd.CommandText = @"
IF EXISTS (SELECT 1 FROM InsurancePackages WHERE Name = N'Bảo hiểm chuyến đi Cơ bản')
BEGIN
    UPDATE InsurancePackages SET Name = N'Cơ Bản' WHERE Name = N'Bảo hiểm chuyến đi Cơ bản';
    UPDATE InsurancePackages SET Name = N'Cao Cấp' WHERE Name = N'Bảo hiểm chuyến đi Cao cấp';
    UPDATE InsurancePackages SET Name = N'Toàn Diện' WHERE Name = N'Bảo hiểm toàn diện Gia đình';
    UPDATE InsurancePackages SET Description = N'Bảo vệ toàn diện với chi phí y tế tối đa 200 triệu đồng, hủy chuyến, thất lạc hành lý và hỗ trợ 24/7.' WHERE Name = N'Toàn Diện';
END";
    cmd.ExecuteNonQuery();

    // Seed only if Users table is empty
    cmd.CommandText = "SELECT COUNT(1) FROM Users";
    var userCount = (int)cmd.ExecuteScalar()!;

    if (userCount == 0)
    {
        var hash = BCrypt.Net.BCrypt.HashPassword("123456");
        cmd.CommandText = "INSERT INTO Users (Email, FullName, Phone, PasswordHash, IsEmailVerified, Role) VALUES (N'user@example.com', N'Nguyễn Văn A', N'0901234567', @p0, 1, 'User')";
        var param = cmd.CreateParameter();
        param.ParameterName = "@p0";
        param.Value = hash;
        cmd.Parameters.Add(param);
        cmd.ExecuteNonQuery();
    }

    // Ensure admin user exists (even if Users table is not empty)
    cmd.Parameters.Clear();
    cmd.CommandText = "SELECT COUNT(1) FROM Users WHERE Email = N'admin@ve247.vn'";
    var adminExists = (int)cmd.ExecuteScalar()!;
    if (adminExists == 0)
    {
        var adminHash = BCrypt.Net.BCrypt.HashPassword("Admin123");
        cmd.CommandText = "INSERT INTO Users (Email, FullName, Phone, PasswordHash, IsEmailVerified, Role) VALUES (N'admin@ve247.vn', N'Quản trị viên', N'0987654321', @p0, 1, 'Admin')";
        var adminParam = cmd.CreateParameter();
        adminParam.ParameterName = "@p0";
        adminParam.Value = adminHash;
        cmd.Parameters.Add(adminParam);
        cmd.ExecuteNonQuery();
    }

    // Seed demo notifications
    cmd.Parameters.Clear();
    cmd.CommandText = "SELECT COUNT(1) FROM Notifications";
    var notiCount = (int)cmd.ExecuteScalar()!;
    if (notiCount == 0)
    {
        cmd.CommandText = @"INSERT INTO Notifications (Email, Type, Title, Message, Link, IsRead, CreatedAt) VALUES 
            (N'user@example.com', N'price_drop', N'Giá vé HAN → SGN giảm!', N'Vé máy bay hiện tại 1,890,000đ, giảm 15%.', N'/flights?from=HAN&to=SGN', 0, DATEADD(day, -2, GETUTCDATE())),
            (N'user@example.com', N'low_seats', N'Sắp hết ghế!', N'Chuyến bay HAN → DAD ngày mai chỉ còn 3 ghế.', N'/flights?from=HAN&to=DAD', 0, DATEADD(day, -1, GETUTCDATE())),
            (N'user@example.com', N'weather', N'Thời tiết Hà Nội', N'Ngày mai 32°C, nắng nóng. Mang kem chống nắng!', N'', 1, DATEADD(day, -3, GETUTCDATE())),
            (N'user@example.com', N'price_drop', N'Tàu hỏa SG → Đà Nẵng rẻ!', N'Giá tàu SE2 chỉ 480,000đ — rẻ nhất 30 ngày.', N'/trains?from=SGN&to=DAD', 0, GETUTCDATE())";
        cmd.ExecuteNonQuery();
    }

    // Re-seed: clear old price data so new per-route/seat class seed runs
    cmd.Parameters.Clear();
    cmd.CommandText = @"
DELETE FROM PriceHistories;
DELETE FROM Reviews;
UPDATE Bookings SET FlightId = NULL, TrainId = NULL, BusId = NULL;
DELETE FROM Flights;
DELETE FROM Trains;
DELETE FROM Buses;";
    cmd.ExecuteNonQuery();

    // Check if flights exist, seed if empty
    cmd.Parameters.Clear();
    cmd.CommandText = "SELECT COUNT(1) FROM Flights";
    var flightCount = (int)cmd.ExecuteScalar()!;

    if (flightCount == 0)
    {
        var seeder = scope.ServiceProvider.GetRequiredService<SeedDataService>();
        await seeder.SeedAsync();
    }

    // Seed buses if empty (in case flights were already present but buses are not)
    cmd.Parameters.Clear();
    cmd.CommandText = "SELECT COUNT(1) FROM Buses";
    var busCount = (int)cmd.ExecuteScalar()!;

    if (busCount == 0)
    {
        var busSeeder = scope.ServiceProvider.GetRequiredService<SeedDataService>();
        await busSeeder.SeedBusesOnlyAsync();
    }

    // Seed community tips (always check, separate from flight seed)
    using var tipScope = app.Services.CreateScope();
    var tipSeeder = tipScope.ServiceProvider.GetRequiredService<SeedDataService>();
    await tipSeeder.SeedCommunityTipsAsync();

    // Seed PriceConfigs
    cmd.Parameters.Clear();
    cmd.CommandText = "SELECT COUNT(1) FROM PriceConfigs";
    var pcCount = (int)cmd.ExecuteScalar()!;
    if (pcCount == 0)
    {
        cmd.CommandText = @"
INSERT INTO PriceConfigs (RouteFrom, RouteTo, Month, Multiplier, BaseVolatilityPct) VALUES
-- HAN->SGN
('HAN','SGN',1,2.0,8),('HAN','SGN',2,1.8,8),('HAN','SGN',3,1.0,5),('HAN','SGN',4,0.95,5),('HAN','SGN',5,0.9,5),('HAN','SGN',6,1.3,6),('HAN','SGN',7,1.2,6),('HAN','SGN',8,1.2,6),('HAN','SGN',9,0.9,5),('HAN','SGN',10,0.85,5),('HAN','SGN',11,0.85,5),('HAN','SGN',12,1.1,6),
-- HAN->DAD
('HAN','DAD',1,1.8,8),('HAN','DAD',2,1.6,8),('HAN','DAD',3,0.9,5),('HAN','DAD',4,0.85,5),('HAN','DAD',5,0.85,5),('HAN','DAD',6,1.2,6),('HAN','DAD',7,1.1,6),('HAN','DAD',8,1.1,6),('HAN','DAD',9,0.85,5),('HAN','DAD',10,0.8,5),('HAN','DAD',11,0.8,5),('HAN','DAD',12,1.0,6),
-- SGN->DAD
('SGN','DAD',1,1.8,8),('SGN','DAD',2,1.6,8),('SGN','DAD',3,0.9,5),('SGN','DAD',4,0.85,5),('SGN','DAD',5,0.85,5),('SGN','DAD',6,1.2,6),('SGN','DAD',7,1.1,6),('SGN','DAD',8,1.1,6),('SGN','DAD',9,0.85,5),('SGN','DAD',10,0.8,5),('SGN','DAD',11,0.8,5),('SGN','DAD',12,1.0,6),
-- SGN->CXR
('SGN','CXR',1,1.6,8),('SGN','CXR',2,1.8,8),('SGN','CXR',3,0.9,5),('SGN','CXR',4,0.85,5),('SGN','CXR',5,0.85,5),('SGN','CXR',6,1.3,6),('SGN','CXR',7,1.4,6),('SGN','CXR',8,1.2,6),('SGN','CXR',9,0.85,5),('SGN','CXR',10,0.8,5),('SGN','CXR',11,0.8,5),('SGN','CXR',12,1.0,6),
-- HAN->PQC
('HAN','PQC',1,1.6,8),('HAN','PQC',2,1.8,8),('HAN','PQC',3,0.9,5),('HAN','PQC',4,0.85,5),('HAN','PQC',5,0.85,5),('HAN','PQC',6,1.3,6),('HAN','PQC',7,1.4,6),('HAN','PQC',8,1.2,6),('HAN','PQC',9,0.85,5),('HAN','PQC',10,0.8,5),('HAN','PQC',11,0.8,5),('HAN','PQC',12,1.0,6),
-- DAD->SGN
('DAD','SGN',1,1.8,8),('DAD','SGN',2,1.6,8),('DAD','SGN',3,0.9,5),('DAD','SGN',4,0.85,5),('DAD','SGN',5,0.85,5),('DAD','SGN',6,1.2,6),('DAD','SGN',7,1.1,6),('DAD','SGN',8,1.1,6),('DAD','SGN',9,0.85,5),('DAD','SGN',10,0.8,5),('DAD','SGN',11,0.8,5),('DAD','SGN',12,1.0,6),
-- HAN->CXR
('HAN','CXR',1,1.6,8),('HAN','CXR',2,1.8,8),('HAN','CXR',3,0.9,5),('HAN','CXR',4,0.85,5),('HAN','CXR',5,0.85,5),('HAN','CXR',6,1.3,6),('HAN','CXR',7,1.4,6),('HAN','CXR',8,1.2,6),('HAN','CXR',9,0.85,5),('HAN','CXR',10,0.8,5),('HAN','CXR',11,0.8,5),('HAN','CXR',12,1.0,6),
-- SGN->HAN
('SGN','HAN',1,2.0,8),('SGN','HAN',2,1.8,8),('SGN','HAN',3,1.0,5),('SGN','HAN',4,0.95,5),('SGN','HAN',5,0.9,5),('SGN','HAN',6,1.3,6),('SGN','HAN',7,1.2,6),('SGN','HAN',8,1.2,6),('SGN','HAN',9,0.9,5),('SGN','HAN',10,0.85,5),('SGN','HAN',11,0.85,5),('SGN','HAN',12,1.1,6)";
        cmd.ExecuteNonQuery();
    }

    // Seed PromoCodes
    cmd.Parameters.Clear();
    cmd.CommandText = "SELECT COUNT(1) FROM PromoCodes";
    var promoCount = (int)cmd.ExecuteScalar()!;
    if (promoCount == 0)
    {
        cmd.CommandText = @"
INSERT INTO PromoCodes (Code, Description, DiscountPercent, MaxDiscount, MinOrderValue, UsageLimit, UsedCount, ValidFrom, ValidTo, IsActive) VALUES
('WELCOME10', N'Giảm 10% cho lần đầu đặt vé, tối đa 200,000đ', 10, 200000, 500000, 100, 0, '2026-01-01', '2027-01-01', 1),
('SUMMER25', N'Giảm 25% cho vé mùa hè, tối đa 500,000đ', 25, 500000, 1000000, 50, 0, '2026-06-01', '2026-09-30', 1),
('VIP20', N'Giảm 20% cho khách hàng VIP, tối đa 1,000,000đ', 20, 1000000, 500000, 200, 0, '2026-01-01', '2027-01-01', 1)";
        cmd.ExecuteNonQuery();
    }
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

    var ogUrl = $"{builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()?.FirstOrDefault() ?? "http://localhost:5173"}/booking/{type}/{id}";

    var html = $$"""
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8" />
        <meta property="og:title" content="{{title}}" />
        <meta property="og:description" content="{{description}}" />
        <meta property="og:url" content="{{ogUrl}}" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Vé247" />
        <meta property="og:locale" content="vi_VN" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="{{title}}" />
        <meta name="twitter:description" content="{{description}}" />
        <title>{{title}} - Vé247</title>
        <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0F172A;color:#F1F5F9;} .card{background:#1E293B;border-radius:16px;padding:32px;max-width:400px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.3);} .price{font-size:32px;font-weight:900;color:#3B82F6;} .route{font-size:20px;font-weight:700;margin:12px 0;} .badge{display:inline-block;background:#3B82F6;color:white;padding:4px 12px;border-radius:8px;font-size:12px;font-weight:600;margin-bottom:12px;}</style>
    </head>
    <body>
        <div class="card">
            <div class="badge">{{(type == "flight" ? "✈️ Chuyến bay" : type == "train" ? "🚆 Tàu hỏa" : "🚌 Xe khách")}}</div>
            <div class="route">{{title.Replace("Vé máy bay ", "").Replace("Vé tàu ", "").Replace("Vé xe khách ", "")}}</div>
            <div class="price">{{price:N0}}₫</div>
            <p style="color:#94A3B8;margin-top:8px;font-size:14px">{{description}}</p>
            <div style="margin-top:20px;padding-top:16px;border-top:1px solid #334155;color:#64748B;font-size:12px">vé247.vn — Đặt vé thông minh</div>
        </div>
    </body>
    </html>
    """;
    return Results.Content(html, "text/html");
});

app.Run();
