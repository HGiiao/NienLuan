using System.Data.Common;
using FlightAggregatorApi.Data;
using Microsoft.EntityFrameworkCore;

namespace FlightAggregatorApi.Services;

/// <summary>
/// Khởi tạo database khi app start: đảm bảo schema tồn tại và seed dữ liệu demo.
/// Seed là idempotent — chỉ chạy khi bảng rỗng, KHÔNG bao giờ xóa dữ liệu có sẵn
/// (trước đây Program.cs xóa Flights/Trains/Buses/Reviews mỗi lần restart, làm mất
/// đánh giá và liên kết chuyến bay của booking).
/// </summary>
public class DatabaseInitializerService
{
    private readonly ApplicationDbContext _db;
    private readonly SeedDataService _seedDataService;
    private readonly ILogger<DatabaseInitializerService> _logger;

    public DatabaseInitializerService(ApplicationDbContext db, SeedDataService seedDataService, ILogger<DatabaseInitializerService> logger)
    {
        _db = db;
        _seedDataService = seedDataService;
        _logger = logger;
    }

    public async Task InitializeAsync()
    {
        var conn = _db.Database.GetDbConnection();
        await conn.OpenAsync();
        try
        {
            await EnsureSchemaAsync(conn);
            await SeedAsync(conn);
        }
        finally
        {
            await conn.CloseAsync();
        }
    }

    private async Task EnsureSchemaAsync(DbConnection conn)
    {
        _logger.LogInformation("Ensuring database schema exists...");

        await ExecuteSqlAsync(conn, @"
IF OBJECT_ID('Flights', 'U') IS NULL
BEGIN
CREATE TABLE Flights (Id BIGINT PRIMARY KEY IDENTITY(1,1), AirlineCode NVARCHAR(10) NOT NULL, AirlineName NVARCHAR(100) NOT NULL, FlightNumber NVARCHAR(10) NOT NULL DEFAULT '', DepartureLocation NVARCHAR(50) NOT NULL, ArrivalLocation NVARCHAR(50) NOT NULL, DepartureTime DATETIME2 NOT NULL, ArrivalTime DATETIME2 NOT NULL, Price DECIMAL(18,2) NOT NULL, Seats INT NOT NULL, SeatClass NVARCHAR(50) NOT NULL DEFAULT 'Economy', FlightDate DATE NOT NULL, RoundTripGroupId BIGINT NULL, CreatedAt DATETIME2 DEFAULT GETUTCDATE());
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
CREATE TABLE PriceHistories (Id BIGINT PRIMARY KEY IDENTITY(1,1), FlightId BIGINT NULL, TrainId BIGINT NULL, BusId BIGINT NULL, Mode NVARCHAR(20) NOT NULL DEFAULT 'flight', RouteFrom NVARCHAR(50) NOT NULL, RouteTo NVARCHAR(50) NOT NULL, Price DECIMAL(18,2) NOT NULL, RecordedDate DATE NOT NULL, CreatedAt DATETIME2 DEFAULT GETUTCDATE(), CONSTRAINT FK_PriceHistory_Flight FOREIGN KEY (FlightId) REFERENCES Flights(Id) ON DELETE SET NULL, CONSTRAINT FK_PriceHistory_Train FOREIGN KEY (TrainId) REFERENCES Trains(Id) ON DELETE SET NULL, CONSTRAINT FK_PriceHistory_Bus FOREIGN KEY (BusId) REFERENCES Buses(Id) ON DELETE SET NULL);
CREATE INDEX IX_PriceHistory_Route_Date ON PriceHistories (RouteFrom, RouteTo, RecordedDate);
CREATE INDEX IX_PriceHistory_Price ON PriceHistories (Price);
END

IF COL_LENGTH('PriceHistories', 'BusId') IS NULL ALTER TABLE PriceHistories ADD BusId BIGINT NULL;
IF COL_LENGTH('PriceHistories', 'Mode') IS NULL ALTER TABLE PriceHistories ADD Mode NVARCHAR(20) NOT NULL DEFAULT 'flight';

IF OBJECT_ID('Users', 'U') IS NULL
BEGIN
CREATE TABLE Users (Id BIGINT PRIMARY KEY IDENTITY(1,1), Email NVARCHAR(255) NOT NULL, FullName NVARCHAR(255) NOT NULL, Phone NVARCHAR(20) NOT NULL DEFAULT '', PasswordHash NVARCHAR(255) NOT NULL DEFAULT '', EmailVerificationCode NVARCHAR(6) NULL, IsEmailVerified BIT NOT NULL DEFAULT 0, Role NVARCHAR(20) NOT NULL DEFAULT 'User', Address NVARCHAR(500) NULL, PaymentMethod NVARCHAR(50) NULL, CreatedAt DATETIME2 DEFAULT GETUTCDATE());
CREATE UNIQUE INDEX IX_Users_Email ON Users (Email);
END

IF OBJECT_ID('Bookings', 'U') IS NULL
BEGIN
CREATE TABLE Bookings (Id BIGINT PRIMARY KEY IDENTITY(1,1), UserId BIGINT NOT NULL, FlightId BIGINT NULL, TrainId BIGINT NULL, BusId BIGINT NULL, BookingDate DATETIME2 DEFAULT GETUTCDATE(), Status NVARCHAR(50) NOT NULL DEFAULT 'Pending', TotalPrice DECIMAL(18,2) NOT NULL, Passengers INT NOT NULL DEFAULT 1, Address NVARCHAR(500) NULL, PaymentMethod NVARCHAR(50) NULL, TransactionId NVARCHAR(100) NULL, VnPayTransactionNo NVARCHAR(50) NULL, SeatClass NVARCHAR(50) NULL, UnitPrice DECIMAL(18,2) NULL, DepartureTime DATETIME2 NULL, RefundAmount DECIMAL(18,2) NULL, CONSTRAINT FK_Bookings_User FOREIGN KEY (UserId) REFERENCES Users(Id), CONSTRAINT FK_Bookings_Flight FOREIGN KEY (FlightId) REFERENCES Flights(Id) ON DELETE SET NULL, CONSTRAINT FK_Bookings_Train FOREIGN KEY (TrainId) REFERENCES Trains(Id) ON DELETE SET NULL, CONSTRAINT FK_Bookings_Bus FOREIGN KEY (BusId) REFERENCES Buses(Id) ON DELETE SET NULL);
CREATE INDEX IX_Bookings_UserId ON Bookings (UserId);
CREATE INDEX IX_Bookings_Status ON Bookings (Status);
END

IF OBJECT_ID('BookingSegments', 'U') IS NULL
BEGIN
CREATE TABLE BookingSegments (Id BIGINT PRIMARY KEY IDENTITY(1,1), BookingId BIGINT NOT NULL, Mode NVARCHAR(20) NOT NULL DEFAULT 'flight', ItemId BIGINT NOT NULL, Code NVARCHAR(50) NOT NULL DEFAULT '', Name NVARCHAR(200) NOT NULL DEFAULT '', DepartureLocation NVARCHAR(50) NOT NULL DEFAULT '', ArrivalLocation NVARCHAR(50) NOT NULL DEFAULT '', DepartureTime DATETIME2 NOT NULL, ArrivalTime DATETIME2 NOT NULL, Price DECIMAL(18,2) NOT NULL DEFAULT 0, SeatClass NVARCHAR(50) NULL, CONSTRAINT FK_BookingSegments_Booking FOREIGN KEY (BookingId) REFERENCES Bookings(Id) ON DELETE CASCADE);
CREATE INDEX IX_BookingSegments_BookingId ON BookingSegments (BookingId);
END

IF OBJECT_ID('PriceAlerts', 'U') IS NULL
CREATE TABLE PriceAlerts (Id BIGINT PRIMARY KEY IDENTITY(1,1), Email NVARCHAR(255) NOT NULL, RouteFrom NVARCHAR(50) NOT NULL, RouteTo NVARCHAR(50) NOT NULL, TargetPrice DECIMAL(18,2) NOT NULL, CurrentPrice DECIMAL(18,2) NULL, IsActive BIT NOT NULL DEFAULT 1, CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(), NotifiedAt DATETIME2 NULL);

IF OBJECT_ID('BookingPassengers', 'U') IS NULL
BEGIN
CREATE TABLE BookingPassengers (Id BIGINT PRIMARY KEY IDENTITY(1,1), BookingId BIGINT NOT NULL, FullName NVARCHAR(255) NOT NULL, DateOfBirth DATETIME2 NULL, Gender NVARCHAR(10) NULL, Nationality NVARCHAR(100) NULL, IdNumber NVARCHAR(50) NULL, CONSTRAINT FK_BookingPassengers_Booking FOREIGN KEY (BookingId) REFERENCES Bookings(Id) ON DELETE CASCADE);
CREATE INDEX IX_BookingPassengers_BookingId ON BookingPassengers (BookingId);
END

IF OBJECT_ID('LuckyWheelSpins', 'U') IS NULL
BEGIN
CREATE TABLE LuckyWheelSpins (Id BIGINT PRIMARY KEY IDENTITY(1,1), Email NVARCHAR(255) NOT NULL, Won BIT NOT NULL DEFAULT 0, Code NVARCHAR(50) NULL, CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE());
CREATE INDEX IX_LuckyWheelSpins_Email ON LuckyWheelSpins (Email);
CREATE INDEX IX_LuckyWheelSpins_Email_CreatedAt ON LuckyWheelSpins (Email, CreatedAt);
END

IF COL_LENGTH('PriceAlerts', 'ItemId') IS NULL ALTER TABLE PriceAlerts ADD ItemId BIGINT NULL;
IF COL_LENGTH('PriceAlerts', 'Mode') IS NULL ALTER TABLE PriceAlerts ADD Mode NVARCHAR(20) NULL;

DROP TABLE IF EXISTS PriceFreezes;

-- Xóa các bảng tính năng không còn dùng (hotel & corporate) — bảng rỗng, drop an toàn mỗi lần start
DROP TABLE IF EXISTS HotelBookings;
DROP TABLE IF EXISTS Hotels;
DROP TABLE IF EXISTS CorporateEmployees;
DROP TABLE IF EXISTS Invoices;
DROP TABLE IF EXISTS CorporateAccounts;

-- Add missing columns (safe to run multiple times)
IF COL_LENGTH('InsurancePackages', 'Coverage') IS NOT NULL AND COL_LENGTH('InsurancePackages', 'Coverage') <> 1000 ALTER TABLE InsurancePackages ALTER COLUMN Coverage NVARCHAR(500) NOT NULL;

IF COL_LENGTH('Bookings', 'TransactionId') IS NULL ALTER TABLE Bookings ADD TransactionId NVARCHAR(100) NULL;
IF COL_LENGTH('Bookings', 'BusId') IS NULL
BEGIN
ALTER TABLE Bookings ADD BusId BIGINT NULL;
ALTER TABLE Bookings ADD CONSTRAINT FK_Bookings_Bus FOREIGN KEY (BusId) REFERENCES Buses(Id) ON DELETE SET NULL;
END
IF COL_LENGTH('Bookings', 'VnPayTransactionNo') IS NULL ALTER TABLE Bookings ADD VnPayTransactionNo NVARCHAR(50) NULL;
IF COL_LENGTH('Bookings', 'PaymentProvider') IS NULL ALTER TABLE Bookings ADD PaymentProvider NVARCHAR(50) NULL;
IF COL_LENGTH('Bookings', 'PayOSOrderCode') IS NULL ALTER TABLE Bookings ADD PayOSOrderCode INT NULL;
IF COL_LENGTH('Users', 'PasswordHash') IS NULL ALTER TABLE Users ADD PasswordHash NVARCHAR(255) NOT NULL DEFAULT '';
IF COL_LENGTH('Users', 'EmailVerificationCode') IS NULL ALTER TABLE Users ADD EmailVerificationCode NVARCHAR(6) NULL;
IF COL_LENGTH('Users', 'IsEmailVerified') IS NULL ALTER TABLE Users ADD IsEmailVerified BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('Users', 'Address') IS NULL ALTER TABLE Users ADD Address NVARCHAR(500) NULL;
IF COL_LENGTH('Users', 'PaymentMethod') IS NULL ALTER TABLE Users ADD PaymentMethod NVARCHAR(50) NULL;
IF COL_LENGTH('Flights', 'RoundTripGroupId') IS NULL ALTER TABLE Flights ADD RoundTripGroupId BIGINT NULL;IF COL_LENGTH('Flights', 'ShareCount') IS NULL ALTER TABLE Flights ADD ShareCount INT NOT NULL DEFAULT 0;
-- Mã chuyến bay thật (VD: VJ175) — sinh cho các bản ghi cũ theo đúng công thức frontend từng dùng
IF COL_LENGTH('Flights', 'FlightNumber') IS NULL ALTER TABLE Flights ADD FlightNumber NVARCHAR(10) NOT NULL DEFAULT '';
UPDATE Flights SET FlightNumber = AirlineCode + CAST((Id % 900) + 100 AS NVARCHAR(10)) WHERE FlightNumber = '';
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
IF COL_LENGTH('Bookings', 'SeatClass') IS NULL ALTER TABLE Bookings ADD SeatClass NVARCHAR(50) NULL;
IF COL_LENGTH('Bookings', 'UnitPrice') IS NULL ALTER TABLE Bookings ADD UnitPrice DECIMAL(18,2) NULL;
IF COL_LENGTH('Bookings', 'DepartureTime') IS NULL ALTER TABLE Bookings ADD DepartureTime DATETIME2 NULL;
IF COL_LENGTH('Bookings', 'RefundAmount') IS NULL ALTER TABLE Bookings ADD RefundAmount DECIMAL(18,2) NULL;

IF OBJECT_ID('Reviews', 'U') IS NULL
CREATE TABLE Reviews (Id BIGINT PRIMARY KEY IDENTITY(1,1), FlightId BIGINT NULL, TrainId BIGINT NULL, BusId BIGINT NULL, BookingId BIGINT NULL, UserId BIGINT NULL, Email NVARCHAR(255) NOT NULL, AuthorName NVARCHAR(255) NOT NULL, Rating INT NOT NULL, Comment NVARCHAR(2000) NOT NULL, CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(), CONSTRAINT FK_Reviews_Flight FOREIGN KEY (FlightId) REFERENCES Flights(Id) ON DELETE SET NULL, CONSTRAINT FK_Reviews_Train FOREIGN KEY (TrainId) REFERENCES Trains(Id) ON DELETE SET NULL, CONSTRAINT FK_Reviews_Bus FOREIGN KEY (BusId) REFERENCES Buses(Id) ON DELETE SET NULL);
IF COL_LENGTH('Reviews', 'BusId') IS NULL ALTER TABLE Reviews ADD BusId BIGINT NULL;
IF COL_LENGTH('Reviews', 'BookingId') IS NULL ALTER TABLE Reviews ADD BookingId BIGINT NULL;

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

IF OBJECT_ID('SubscriptionPlans', 'U') IS NULL
CREATE TABLE SubscriptionPlans (Id BIGINT PRIMARY KEY IDENTITY(1,1), Name NVARCHAR(100) NOT NULL, Description NVARCHAR(500) NOT NULL, MonthlyPrice DECIMAL(18,2) NOT NULL, YearlyPrice DECIMAL(18,2) NOT NULL, MaxAlertsPerDay INT NOT NULL DEFAULT 5, EarlyPriceAlerts BIT NOT NULL DEFAULT 0, MultiAirlineCompare BIT NOT NULL DEFAULT 0, PrioritySupport BIT NOT NULL DEFAULT 0, FastRefund BIT NOT NULL DEFAULT 0, SeatSelection BIT NOT NULL DEFAULT 0, PriorityLevel INT NOT NULL DEFAULT 0, IsActive BIT NOT NULL DEFAULT 1, CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE());

IF OBJECT_ID('UserSubscriptions', 'U') IS NULL
BEGIN
CREATE TABLE UserSubscriptions (Id BIGINT PRIMARY KEY IDENTITY(1,1), UserId BIGINT NOT NULL, PlanId BIGINT NOT NULL, BillingCycle NVARCHAR(20) NOT NULL DEFAULT 'monthly', StartDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(), EndDate DATETIME2 NOT NULL, Status NVARCHAR(20) NOT NULL DEFAULT 'active', CONSTRAINT FK_US_Plan FOREIGN KEY (PlanId) REFERENCES SubscriptionPlans(Id) ON DELETE CASCADE);
CREATE INDEX IX_US_UserId ON UserSubscriptions (UserId);
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
END");
    }

    private async Task SeedAsync(DbConnection conn)
    {
        _logger.LogInformation("Seeding demo data (idempotent — skips tables that already have data)...");

        // Migrate old insurance package names to new short names
        await ExecuteSqlAsync(conn, @"
IF EXISTS (SELECT 1 FROM InsurancePackages WHERE Name = N'Bảo hiểm chuyến đi Cơ bản')
BEGIN
    UPDATE InsurancePackages SET Name = N'Cơ Bản' WHERE Name = N'Bảo hiểm chuyến đi Cơ bản';
    UPDATE InsurancePackages SET Name = N'Cao Cấp' WHERE Name = N'Bảo hiểm chuyến đi Cao cấp';
    UPDATE InsurancePackages SET Name = N'Toàn Diện' WHERE Name = N'Bảo hiểm toàn diện Gia đình';
    UPDATE InsurancePackages SET Description = N'Bảo vệ toàn diện với chi phí y tế tối đa 200 triệu đồng, hủy chuyến, thất lạc hành lý và hỗ trợ 24/7.' WHERE Name = N'Toàn Diện';
END");

        // Seed demo user only if Users table is empty
        if (await ExecuteScalarLongAsync(conn, "SELECT COUNT(1) FROM Users") == 0)
        {
            var hash = BCrypt.Net.BCrypt.HashPassword("123456");
            await ExecuteSqlAsync(conn,
                "INSERT INTO Users (Email, FullName, Phone, PasswordHash, IsEmailVerified, Role) VALUES (N'user@example.com', N'Nguyễn Văn A', N'0901234567', @p0, 1, 'User')",
                ("@p0", hash));
        }

        // Ensure admin user exists (even if Users table is not empty)
        if (await ExecuteScalarLongAsync(conn, "SELECT COUNT(1) FROM Users WHERE Email = N'admin@ve247.vn'") == 0)
        {
            var adminHash = BCrypt.Net.BCrypt.HashPassword("Admin123");
            await ExecuteSqlAsync(conn,
                "INSERT INTO Users (Email, FullName, Phone, PasswordHash, IsEmailVerified, Role) VALUES (N'admin@ve247.vn', N'Quản trị viên', N'0987654321', @p0, 1, 'Admin')",
                ("@p0", adminHash));
        }

        // Seed demo notifications
        if (await ExecuteScalarLongAsync(conn, "SELECT COUNT(1) FROM Notifications") == 0)
        {
            await ExecuteSqlAsync(conn, @"INSERT INTO Notifications (Email, Type, Title, Message, Link, IsRead, CreatedAt) VALUES 
            (N'user@example.com', N'price_drop', N'Giá vé HAN → SGN giảm!', N'Vé máy bay hiện tại 1,890,000đ, giảm 15%.', N'/flights?from=HAN&to=SGN', 0, DATEADD(day, -2, GETUTCDATE())),
            (N'user@example.com', N'low_seats', N'Sắp hết ghế!', N'Chuyến bay HAN → DAD ngày mai chỉ còn 3 ghế.', N'/flights?from=HAN&to=DAD', 0, DATEADD(day, -1, GETUTCDATE())),
            (N'user@example.com', N'weather', N'Thời tiết Hà Nội', N'Ngày mai 32°C, nắng nóng. Mang kem chống nắng!', N'', 1, DATEADD(day, -3, GETUTCDATE())),
            (N'user@example.com', N'price_drop', N'Tàu hỏa SG → Đà Nẵng rẻ!', N'Giá tàu SE2 chỉ 480,000đ — rẻ nhất 30 ngày.', N'/trains?from=SGN&to=DAD', 0, GETUTCDATE())");
        }

        // Seed flights/trains/buses + price history — chỉ seed khi bảng Flights rỗng,
        // KHÔNG xóa dữ liệu cũ (trước đây bị xóa + seed lại mỗi lần restart).
        var flightCount = await ExecuteScalarLongAsync(conn, "SELECT COUNT(1) FROM Flights");
        if (flightCount == 0)
        {
            await _seedDataService.SeedAsync();
        }
        else
        {
            _logger.LogInformation("Seed skipped: Flights table already has {Count} rows.", flightCount);
        }

        // Seed buses if empty (in case flights were already present but buses are not)
        var busCount = await ExecuteScalarLongAsync(conn, "SELECT COUNT(1) FROM Buses");
        if (busCount == 0)
        {
            await _seedDataService.SeedBusesOnlyAsync();
        }

        // Seed community tips (idempotent — tự bỏ qua nếu đã có dữ liệu)
        await _seedDataService.SeedCommunityTipsAsync();

        // Seed PriceConfigs
        if (await ExecuteScalarLongAsync(conn, "SELECT COUNT(1) FROM PriceConfigs") == 0)
        {
            await ExecuteSqlAsync(conn, @"
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
('SGN','HAN',1,2.0,8),('SGN','HAN',2,1.8,8),('SGN','HAN',3,1.0,5),('SGN','HAN',4,0.95,5),('SGN','HAN',5,0.9,5),('SGN','HAN',6,1.3,6),('SGN','HAN',7,1.2,6),('SGN','HAN',8,1.2,6),('SGN','HAN',9,0.9,5),('SGN','HAN',10,0.85,5),('SGN','HAN',11,0.85,5),('SGN','HAN',12,1.1,6)");
        }

        // Seed PromoCodes
        if (await ExecuteScalarLongAsync(conn, "SELECT COUNT(1) FROM PromoCodes") == 0)
        {
            await ExecuteSqlAsync(conn, @"
INSERT INTO PromoCodes (Code, Description, DiscountPercent, MaxDiscount, MinOrderValue, UsageLimit, UsedCount, ValidFrom, ValidTo, IsActive) VALUES
('WELCOME10', N'Giảm 10% cho lần đầu đặt vé, tối đa 200,000đ', 10, 200000, 500000, 100, 0, '2026-01-01', '2027-01-01', 1),
('SUMMER25', N'Giảm 25% cho vé mùa hè, tối đa 500,000đ', 25, 500000, 1000000, 50, 0, '2026-06-01', '2026-09-30', 1),
('VIP20', N'Giảm 20% cho khách hàng VIP, tối đa 1,000,000đ', 20, 1000000, 500000, 200, 0, '2026-01-01', '2027-01-01', 1)");
        }
    }

    private static async Task ExecuteSqlAsync(DbConnection conn, string sql, params (string Name, object? Value)[] parameters)
    {
        using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        foreach (var (name, value) in parameters)
        {
            var param = cmd.CreateParameter();
            param.ParameterName = name;
            param.Value = value ?? DBNull.Value;
            cmd.Parameters.Add(param);
        }
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task<long> ExecuteScalarLongAsync(DbConnection conn, string sql)
    {
        using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        var result = await cmd.ExecuteScalarAsync();
        return result is null ? 0 : Convert.ToInt64(result);
    }
}
