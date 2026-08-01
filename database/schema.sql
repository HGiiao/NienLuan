-- Flights table
CREATE TABLE Flights (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    AirlineCode NVARCHAR(10) NOT NULL,
    AirlineName NVARCHAR(100) NOT NULL,
    DepartureLocation NVARCHAR(50) NOT NULL,
    ArrivalLocation NVARCHAR(50) NOT NULL,
    DepartureTime DATETIME2 NOT NULL,
    ArrivalTime DATETIME2 NOT NULL,
    Price DECIMAL(18,2) NOT NULL,
    Seats INT NOT NULL,
    SeatClass NVARCHAR(50) NOT NULL DEFAULT 'Economy',
    FlightDate DATE NOT NULL,
    RoundTripGroupId BIGINT NULL,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE()
);
CREATE INDEX IX_Flights_Route_Date ON Flights (DepartureLocation, ArrivalLocation, FlightDate);
CREATE INDEX IX_Flights_Price ON Flights (Price);
CREATE INDEX IX_Flights_RoundTrip ON Flights (RoundTripGroupId);

-- Trains table
CREATE TABLE Trains (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    TrainCode NVARCHAR(10) NOT NULL,
    TrainName NVARCHAR(100) NOT NULL,
    DepartureLocation NVARCHAR(50) NOT NULL,
    ArrivalLocation NVARCHAR(50) NOT NULL,
    DepartureTime DATETIME2 NOT NULL,
    ArrivalTime DATETIME2 NOT NULL,
    Price DECIMAL(18,2) NOT NULL,
    Seats INT NOT NULL,
    CoachClass NVARCHAR(50) NOT NULL DEFAULT '',
    TrainDate DATE NOT NULL,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE()
);
CREATE INDEX IX_Trains_Route_Date ON Trains (DepartureLocation, ArrivalLocation, TrainDate);
CREATE INDEX IX_Trains_Price ON Trains (Price);

-- PriceHistory table
CREATE TABLE PriceHistory (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    FlightId BIGINT NULL,
    TrainId BIGINT NULL,
    RouteFrom NVARCHAR(50) NOT NULL,
    RouteTo NVARCHAR(50) NOT NULL,
    Price DECIMAL(18,2) NOT NULL,
    RecordedDate DATE NOT NULL,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    CONSTRAINT FK_PriceHistory_Flight FOREIGN KEY (FlightId) REFERENCES Flights(Id) ON DELETE SET NULL,
    CONSTRAINT FK_PriceHistory_Train FOREIGN KEY (TrainId) REFERENCES Trains(Id) ON DELETE SET NULL
);
CREATE INDEX IX_PriceHistory_Route_Date ON PriceHistory (RouteFrom, RouteTo, RecordedDate);
CREATE INDEX IX_PriceHistory_Price ON PriceHistory (Price);

-- Users table
CREATE TABLE Users (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    Email NVARCHAR(255) NOT NULL,
    FullName NVARCHAR(255) NOT NULL,
    Phone NVARCHAR(20) NOT NULL DEFAULT '',
    PasswordHash NVARCHAR(255) NOT NULL DEFAULT '',
    EmailVerificationCode NVARCHAR(6) NULL,
    IsEmailVerified BIT NOT NULL DEFAULT 0,
    Role NVARCHAR(20) NOT NULL DEFAULT 'User',
    Address NVARCHAR(500) NULL,
    PaymentMethod NVARCHAR(50) NULL,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE()
);
CREATE UNIQUE INDEX IX_Users_Email ON Users (Email);
CREATE INDEX IX_Users_CreatedAt ON Users (CreatedAt);

-- Bookings table
CREATE TABLE Bookings (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    UserId BIGINT NOT NULL,
    FlightId BIGINT NULL,
    TrainId BIGINT NULL,
    BookingDate DATETIME2 DEFAULT GETUTCDATE(),
    Status NVARCHAR(50) NOT NULL DEFAULT 'Pending',
    TotalPrice DECIMAL(18,2) NOT NULL,
    Passengers INT NOT NULL DEFAULT 1,
    Address NVARCHAR(500) NULL,
    PaymentMethod NVARCHAR(50) NULL,
    TransactionId NVARCHAR(100) NULL,
    VnPayTransactionNo NVARCHAR(50) NULL,
    CONSTRAINT FK_Bookings_User FOREIGN KEY (UserId) REFERENCES Users(Id),
    CONSTRAINT FK_Bookings_Flight FOREIGN KEY (FlightId) REFERENCES Flights(Id) ON DELETE SET NULL,
    CONSTRAINT FK_Bookings_Train FOREIGN KEY (TrainId) REFERENCES Trains(Id) ON DELETE SET NULL
);
CREATE INDEX IX_Bookings_UserId ON Bookings (UserId);
CREATE INDEX IX_Bookings_Status ON Bookings (Status);
CREATE INDEX IX_Bookings_BookingDate ON Bookings (BookingDate);

-- PriceFreezes table
CREATE TABLE PriceFreezes (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    Email NVARCHAR(255) NOT NULL,
    FlightId BIGINT NULL,
    TrainId BIGINT NULL,
    FrozenPrice DECIMAL(18,2) NOT NULL,
    RouteFrom NVARCHAR(50) NOT NULL,
    RouteTo NVARCHAR(50) NOT NULL,
    ExpiresAt DATETIME2 NOT NULL,
    IsRedeemed BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT FK_PriceFreeze_Flight FOREIGN KEY (FlightId) REFERENCES Flights(Id) ON DELETE SET NULL,
    CONSTRAINT FK_PriceFreeze_Train FOREIGN KEY (TrainId) REFERENCES Trains(Id) ON DELETE SET NULL
);
CREATE INDEX IX_PriceFreezes_Email ON PriceFreezes (Email);
CREATE INDEX IX_PriceFreezes_IsRedeemed ON PriceFreezes (IsRedeemed);

-- PriceAlerts table
CREATE TABLE PriceAlerts (
    Id BIGINT PRIMARY KEY IDENTITY(1,1),
    Email NVARCHAR(255) NOT NULL,
    RouteFrom NVARCHAR(50) NOT NULL,
    RouteTo NVARCHAR(50) NOT NULL,
    TargetPrice DECIMAL(18,2) NOT NULL,
    CurrentPrice DECIMAL(18,2) NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    NotifiedAt DATETIME2 NULL
);
CREATE INDEX IX_PriceAlerts_Email ON PriceAlerts (Email);
CREATE INDEX IX_PriceAlerts_IsActive ON PriceAlerts (IsActive);
