-- =====================================================
-- Vé247 — Seed Data Generator
-- Mỗi ngày: 10 chuyến bay khứ hồi (5 cặp) + 10 chuyến bay 1 chiều
-- Mỗi ngày: 5 chuyến tàu
-- =====================================================

SET NOCOUNT ON;

DECLARE @StartDate DATE = '2026-07-15';
DECLARE @EndDate DATE = '2026-08-30';
DECLARE @Today DATE = '2026-07-15';

-- =====================================================
-- 1. FLIGHTS
-- =====================================================

DECLARE @RoundTripRoutes TABLE (PairId INT, RouteFrom NVARCHAR(10), RouteTo NVARCHAR(10));
INSERT INTO @RoundTripRoutes VALUES
(0, 'HAN', 'SGN'), (1, 'HAN', 'DAD'), (2, 'SGN', 'DAD'),
(3, 'SGN', 'PQC'), (4, 'HAN', 'CXR');

DECLARE @FlightRoutes TABLE (Id INT, RouteFrom NVARCHAR(10), RouteTo NVARCHAR(10), Cum INT);
INSERT INTO @FlightRoutes VALUES
(1, 'HAN', 'SGN', 20), (2, 'SGN', 'HAN', 40),
(3, 'HAN', 'DAD', 54), (4, 'DAD', 'HAN', 68),
(5, 'SGN', 'DAD', 80), (6, 'DAD', 'SGN', 92),
(7, 'SGN', 'PQC', 102), (8, 'PQC', 'SGN', 112),
(9, 'HAN', 'CXR', 120), (10, 'CXR', 'HAN', 128),
(11, 'SGN', 'CXR', 135), (12, 'CXR', 'SGN', 142),
(13, 'SGN', 'VII', 145), (14, 'VII', 'SGN', 148),
(15, 'DAD', 'HPH', 150), (16, 'HPH', 'DAD', 152),
(17, 'SGN', 'VCA', 154), (18, 'VCA', 'SGN', 156),
(19, 'SGN', 'UIH', 158), (20, 'UIH', 'SGN', 160);

DECLARE @FlightTotalWeight INT = 160;
DECLARE @FlightDate DATE = @StartDate;

WHILE @FlightDate <= @EndDate
BEGIN
    DECLARE @IsWeekend BIT = CASE WHEN DATEPART(WEEKDAY, @FlightDate) IN (1, 7) THEN 1 ELSE 0 END;
    DECLARE @WeekendMult FLOAT = CASE WHEN @IsWeekend = 1 THEN 1.1 + (CAST(ABS(CHECKSUM(NEWID())) AS FLOAT) / 2147483647.0) * 0.2 ELSE 1.0 END;
    DECLARE @DaysUntil INT = DATEDIFF(DAY, @Today, @FlightDate);
    DECLARE @i INT = 0;
    DECLARE @RouteFrom NVARCHAR(10), @RouteTo NVARCHAR(10);
    DECLARE @AirlineCode NVARCHAR(10), @AirlineName NVARCHAR(100);
    DECLARE @Hour INT, @Minute INT, @Departure DATETIME2, @Duration INT, @Arrival DATETIME2;
    DECLARE @Price DECIMAL(18,2), @PriceBase FLOAT, @Seats INT;

    -- 5 cặp khứ hồi (10 chuyến) — chung 1 hãng bay cho cả ngày
    DECLARE @RtAirlineRoll INT = CAST(ABS(CHECKSUM(NEWID())) AS INT) % 100;
    DECLARE @RtAirlineCode NVARCHAR(10) = CASE
        WHEN @RtAirlineRoll < 35 THEN 'VN' WHEN @RtAirlineRoll < 65 THEN 'VJ'
        WHEN @RtAirlineRoll < 83 THEN 'QH' WHEN @RtAirlineRoll < 93 THEN 'VU'
        ELSE 'BL'
    END;
    DECLARE @RtAirlineName NVARCHAR(100) = CASE @RtAirlineCode
        WHEN 'VN' THEN 'Vietnam Airlines' WHEN 'VJ' THEN 'VietJet Air'
        WHEN 'QH' THEN 'Bamboo Airways' WHEN 'VU' THEN 'Vietravel Airlines'
        ELSE 'Pacific Airlines'
    END;

    DECLARE @PairId INT;
    DECLARE pair_cursor CURSOR FOR SELECT PairId FROM @RoundTripRoutes ORDER BY PairId;
    OPEN pair_cursor;
    FETCH NEXT FROM pair_cursor INTO @PairId;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SELECT @RouteFrom = RouteFrom, @RouteTo = RouteTo
        FROM @RoundTripRoutes WHERE PairId = @PairId;

        DECLARE @GroupId BIGINT = DATEDIFF(DAY, @StartDate, @FlightDate) * 5 + @PairId;

        -- Chuyến đi (outbound) — buổi sáng
        SET @Hour = 6 + CAST(ABS(CHECKSUM(NEWID())) AS INT) % 5;
        SET @Minute = CAST(ABS(CHECKSUM(NEWID())) AS INT) % 12 * 5;
        SET @Departure = DATETIME2FROMPARTS(YEAR(@FlightDate), MONTH(@FlightDate), DAY(@FlightDate), @Hour, @Minute, 0, 0, 0);
        SET @Duration = 50 + CAST(ABS(CHECKSUM(NEWID())) AS INT) % 131;
        SET @Arrival = DATEADD(MINUTE, @Duration, @Departure);
        SET @PriceBase = 800000.0 + (CAST(ABS(CHECKSUM(NEWID())) AS FLOAT) / 2147483647.0) * 3700000.0;
        SET @PriceBase = @PriceBase * @WeekendMult;
        SET @Price = ROUND(@PriceBase / 10000, 0) * 10000;
        IF @Price < 500000 SET @Price = 500000;
        IF @DaysUntil <= 2 SET @Seats = 3 + CAST(ABS(CHECKSUM(NEWID())) AS INT) % 23;
        ELSE IF @DaysUntil <= 7 SET @Seats = 5 + CAST(ABS(CHECKSUM(NEWID())) AS INT) % 46;
        ELSE IF @DaysUntil <= 14 SET @Seats = 10 + CAST(ABS(CHECKSUM(NEWID())) AS INT) % 91;
        ELSE SET @Seats = 20 + CAST(ABS(CHECKSUM(NEWID())) AS INT) % 161;

        INSERT INTO Flights (AirlineCode, AirlineName, DepartureLocation, ArrivalLocation,
                             DepartureTime, ArrivalTime, Price, Seats, FlightDate, RoundTripGroupId, CreatedAt)
        VALUES (@RtAirlineCode, @RtAirlineName, @RouteFrom, @RouteTo,
                @Departure, @Arrival, @Price, @Seats, @FlightDate, @GroupId, GETUTCDATE());

        -- Chuyến về (return) — buổi chiều
        SET @Hour = 14 + CAST(ABS(CHECKSUM(NEWID())) AS INT) % 6;
        SET @Minute = CAST(ABS(CHECKSUM(NEWID())) AS INT) % 12 * 5;
        SET @Departure = DATETIME2FROMPARTS(YEAR(@FlightDate), MONTH(@FlightDate), DAY(@FlightDate), @Hour, @Minute, 0, 0, 0);
        SET @Duration = 50 + CAST(ABS(CHECKSUM(NEWID())) AS INT) % 131;
        SET @Arrival = DATEADD(MINUTE, @Duration, @Departure);
        SET @PriceBase = 800000.0 + (CAST(ABS(CHECKSUM(NEWID())) AS FLOAT) / 2147483647.0) * 3700000.0;
        SET @PriceBase = @PriceBase * @WeekendMult;
        IF (CAST(ABS(CHECKSUM(NEWID())) AS INT) % 100) < 18
            SET @PriceBase = @PriceBase * (0.70 + (CAST(ABS(CHECKSUM(NEWID())) AS FLOAT) / 2147483647.0) * 0.15);
        SET @Price = ROUND(@PriceBase / 10000, 0) * 10000;
        IF @Price < 500000 SET @Price = 500000;
        IF @DaysUntil <= 2 SET @Seats = 3 + CAST(ABS(CHECKSUM(NEWID())) AS INT) % 23;
        ELSE IF @DaysUntil <= 7 SET @Seats = 5 + CAST(ABS(CHECKSUM(NEWID())) AS INT) % 46;
        ELSE IF @DaysUntil <= 14 SET @Seats = 10 + CAST(ABS(CHECKSUM(NEWID())) AS INT) % 91;
        ELSE SET @Seats = 20 + CAST(ABS(CHECKSUM(NEWID())) AS INT) % 161;

        INSERT INTO Flights (AirlineCode, AirlineName, DepartureLocation, ArrivalLocation,
                             DepartureTime, ArrivalTime, Price, Seats, FlightDate, RoundTripGroupId, CreatedAt)
        VALUES (@RtAirlineCode, @RtAirlineName, @RouteTo, @RouteFrom,
                @Departure, @Arrival, @Price, @Seats, @FlightDate, @GroupId, GETUTCDATE());

        FETCH NEXT FROM pair_cursor INTO @PairId;
    END
    CLOSE pair_cursor;
    DEALLOCATE pair_cursor;

    -- 10 chuyến 1 chiều ngẫu nhiên (lấy từ @FlightRoutes, loại trùng route cặp)
    SET @i = 0;
    WHILE @i < 10
    BEGIN
        DECLARE @RouteRoll INT = CAST(ABS(CHECKSUM(NEWID())) AS BIGINT) % @FlightTotalWeight + 1;
        SELECT TOP 1 @RouteFrom = RouteFrom, @RouteTo = RouteTo
        FROM @FlightRoutes WHERE Cum >= @RouteRoll ORDER BY Cum;

        DECLARE @AirlineRoll INT = CAST(ABS(CHECKSUM(NEWID())) AS INT) % 100;
        SET @AirlineCode = CASE
            WHEN @AirlineRoll < 35 THEN 'VN' WHEN @AirlineRoll < 65 THEN 'VJ'
            WHEN @AirlineRoll < 83 THEN 'QH' WHEN @AirlineRoll < 93 THEN 'VU'
            ELSE 'BL'
        END;
        SET @AirlineName = CASE @AirlineCode
            WHEN 'VN' THEN 'Vietnam Airlines' WHEN 'VJ' THEN 'VietJet Air'
            WHEN 'QH' THEN 'Bamboo Airways' WHEN 'VU' THEN 'Vietravel Airlines'
            ELSE 'Pacific Airlines'
        END;

        SET @Hour = CAST(ABS(CHECKSUM(NEWID())) AS INT) % 24;
        SET @Minute = CAST(ABS(CHECKSUM(NEWID())) AS INT) % 12 * 5;
        SET @Departure = DATETIME2FROMPARTS(YEAR(@FlightDate), MONTH(@FlightDate), DAY(@FlightDate), @Hour, @Minute, 0, 0, 0);
        SET @Duration = 50 + CAST(ABS(CHECKSUM(NEWID())) AS INT) % 131;
        SET @Arrival = DATEADD(MINUTE, @Duration, @Departure);
        SET @PriceBase = 800000.0 + (CAST(ABS(CHECKSUM(NEWID())) AS FLOAT) / 2147483647.0) * 3700000.0;
        SET @PriceBase = @PriceBase * @WeekendMult;
        IF (CAST(ABS(CHECKSUM(NEWID())) AS INT) % 100) < 18
            SET @PriceBase = @PriceBase * (0.70 + (CAST(ABS(CHECKSUM(NEWID())) AS FLOAT) / 2147483647.0) * 0.15);
        SET @Price = ROUND(@PriceBase / 10000, 0) * 10000;
        IF @Price < 500000 SET @Price = 500000;
        IF @DaysUntil <= 2 SET @Seats = 3 + CAST(ABS(CHECKSUM(NEWID())) AS INT) % 23;
        ELSE IF @DaysUntil <= 7 SET @Seats = 5 + CAST(ABS(CHECKSUM(NEWID())) AS INT) % 46;
        ELSE IF @DaysUntil <= 14 SET @Seats = 10 + CAST(ABS(CHECKSUM(NEWID())) AS INT) % 91;
        ELSE SET @Seats = 20 + CAST(ABS(CHECKSUM(NEWID())) AS INT) % 161;

        INSERT INTO Flights (AirlineCode, AirlineName, DepartureLocation, ArrivalLocation,
                             DepartureTime, ArrivalTime, Price, Seats, FlightDate, CreatedAt)
        VALUES (@AirlineCode, @AirlineName, @RouteFrom, @RouteTo,
                @Departure, @Arrival, @Price, @Seats, @FlightDate, GETUTCDATE());

        SET @i = @i + 1;
    END

    SET @FlightDate = DATEADD(DAY, 1, @FlightDate);
END
-- =====================================================
-- 2. TRAINS
-- =====================================================

DECLARE @TrainRoutes TABLE (Id INT, RouteFrom NVARCHAR(10), RouteTo NVARCHAR(10), Cum INT);
INSERT INTO @TrainRoutes VALUES
(1, 'HAN', 'HCM', 20), (2, 'HCM', 'HAN', 40),
(3, 'HAN', 'DAD', 55), (4, 'DAD', 'HAN', 70),
(5, 'DAD', 'HCM', 82), (6, 'HCM', 'DAD', 94),
(7, 'HAN', 'HUI', 102), (8, 'HUI', 'HAN', 110),
(9, 'HUI', 'HCM', 116), (10, 'HCM', 'HUI', 122),
(11, 'HAN', 'CXR', 127), (12, 'CXR', 'HAN', 132),
(13, 'DAD', 'CXR', 136), (14, 'CXR', 'DAD', 140),
(15, 'VII', 'HCM', 143), (16, 'HCM', 'VII', 146),
(17, 'HAN', 'VII', 148), (18, 'VII', 'HAN', 150),
(19, 'DAD', 'QNG', 152), (20, 'QNG', 'DAD', 154),
(21, 'CXR', 'HCM', 155), (22, 'HCM', 'CXR', 156),
(23, 'HUI', 'DAD', 157), (24, 'DAD', 'HUI', 158);

DECLARE @TrainTotalWeight INT = 158;
DECLARE @TrainDate DATE = @StartDate;

WHILE @TrainDate <= @EndDate
BEGIN
    DECLARE @TIsWeekend BIT = CASE WHEN DATEPART(WEEKDAY, @TrainDate) IN (1, 7) THEN 1 ELSE 0 END;
    DECLARE @TWeekendMult FLOAT = CASE WHEN @TIsWeekend = 1 THEN 1.1 + (CAST(ABS(CHECKSUM(NEWID())) AS FLOAT) / 2147483647.0) * 0.2 ELSE 1.0 END;
    DECLARE @ti INT = 0;

    WHILE @ti < 5
    BEGIN
        DECLARE @TRouteFrom NVARCHAR(10), @TRouteTo NVARCHAR(10);
        SELECT TOP 1 @TRouteFrom = RouteFrom, @TRouteTo = RouteTo
        FROM @TrainRoutes
        WHERE Cum >= CAST(ABS(CHECKSUM(NEWID())) AS BIGINT) % @TrainTotalWeight + 1
        ORDER BY Cum;

        DECLARE @THour INT = CAST(ABS(CHECKSUM(NEWID())) AS INT) % 24;
        DECLARE @TMinute INT = CAST(ABS(CHECKSUM(NEWID())) AS INT) % 12 * 5;
        DECLARE @TDeparture DATETIME2 = DATETIME2FROMPARTS(YEAR(@TrainDate), MONTH(@TrainDate), DAY(@TrainDate), @THour, @TMinute, 0, 0, 0);
        DECLARE @TDuration INT = 180 + CAST(ABS(CHECKSUM(NEWID())) AS INT) % 1021;
        DECLARE @TArrival DATETIME2 = DATEADD(MINUTE, @TDuration, @TDeparture);
        DECLARE @TPriceBase FLOAT = 250000.0 + (CAST(ABS(CHECKSUM(NEWID())) AS FLOAT) / 2147483647.0) * 1550000.0;
        SET @TPriceBase = @TPriceBase * @TWeekendMult;
        IF (CAST(ABS(CHECKSUM(NEWID())) AS INT) % 100) < 15
            SET @TPriceBase = @TPriceBase * (0.75 + (CAST(ABS(CHECKSUM(NEWID())) AS FLOAT) / 2147483647.0) * 0.15);
        DECLARE @TPrice DECIMAL(18,2) = ROUND(@TPriceBase / 10000, 0) * 10000;
        IF @TPrice < 150000 SET @TPrice = 150000;

        DECLARE @ClassRoll INT = CAST(ABS(CHECKSUM(NEWID())) AS INT) % 4;
        DECLARE @CoachClass NVARCHAR(50) = CASE @ClassRoll
            WHEN 0 THEN 'Soft Sleeper' WHEN 1 THEN 'Hard Sleeper'
            WHEN 2 THEN 'Seat' ELSE 'Soft Seat' END;
        DECLARE @TSeats INT = CASE @CoachClass
            WHEN 'Soft Sleeper' THEN 30 + CAST(ABS(CHECKSUM(NEWID())) AS INT) % 71
            WHEN 'Hard Sleeper' THEN 50 + CAST(ABS(CHECKSUM(NEWID())) AS INT) % 101
            WHEN 'Soft Seat' THEN 100 + CAST(ABS(CHECKSUM(NEWID())) AS INT) % 151
            ELSE 100 + CAST(ABS(CHECKSUM(NEWID())) AS INT) % 301 END;

        DECLARE @Prefix NVARCHAR(2) = CASE CAST(ABS(CHECKSUM(NEWID())) AS INT) % 10
            WHEN 0 THEN 'LP' WHEN 1 THEN 'LP'
            WHEN 2 THEN 'TN' WHEN 3 THEN 'TN' WHEN 4 THEN 'TN'
            ELSE 'SE' END;
        DECLARE @TrainCode NVARCHAR(10) = @Prefix + RIGHT('00' + CAST(DATEPART(DAYOFYEAR, @TrainDate) AS NVARCHAR), 3) + CAST(@ti + 1 AS NVARCHAR);
        DECLARE @TrainName NVARCHAR(100) = CASE @Prefix
            WHEN 'SE' THEN 'Reunification Express'
            WHEN 'TN' THEN 'Fast Train'
            ELSE 'Local Train' END;

        INSERT INTO Trains (TrainCode, TrainName, DepartureLocation, ArrivalLocation,
                            DepartureTime, ArrivalTime, Price, Seats, CoachClass, TrainDate, CreatedAt)
        VALUES (@TrainCode, @TrainName, @TRouteFrom, @TRouteTo,
                @TDeparture, @TArrival, @TPrice, @TSeats, @CoachClass, @TrainDate, GETUTCDATE());
        SET @ti = @ti + 1;
    END
    SET @TrainDate = DATEADD(DAY, 1, @TrainDate);
END

-- =====================================================
-- 3. PRICE HISTORY
-- =====================================================

DECLARE @HistoryDate DATE = DATEADD(DAY, -30, @StartDate);
DECLARE @RouteIndex INT;

WHILE @HistoryDate <= @EndDate
BEGIN
    SET @RouteIndex = 0;
    WHILE @RouteIndex < 10
    BEGIN
        DECLARE @HRouteFrom NVARCHAR(10), @HRouteTo NVARCHAR(10);
        DECLARE @HMin INT, @HMax INT;
        SELECT @HRouteFrom = RouteFrom, @HRouteTo = RouteTo, @HMin = MinPrice, @HMax = MaxPrice
        FROM (VALUES
            (0, 'HAN', 'SGN', 1800000, 3500000), (1, 'SGN', 'HAN', 1800000, 3500000),
            (2, 'HAN', 'DAD', 1000000, 2200000), (3, 'DAD', 'HAN', 1000000, 2200000),
            (4, 'SGN', 'DAD', 1000000, 2200000), (5, 'DAD', 'SGN', 1000000, 2200000),
            (6, 'SGN', 'PQC', 1200000, 2800000), (7, 'PQC', 'SGN', 1200000, 2800000),
            (8, 'HAN', 'CXR', 1500000, 3000000), (9, 'CXR', 'HAN', 1500000, 3000000)
        ) AS H(Id, RouteFrom, RouteTo, MinPrice, MaxPrice)
        WHERE Id = @RouteIndex;

        DECLARE @HPBase FLOAT = @HMin + (CAST(ABS(CHECKSUM(NEWID())) AS FLOAT) / 2147483647.0) * (@HMax - @HMin);
        DECLARE @HVar FLOAT = -0.15 + (CAST(ABS(CHECKSUM(NEWID())) AS FLOAT) / 2147483647.0) * 0.30;
        SET @HPBase = @HPBase * (1 + @HVar);
        IF DATEPART(WEEKDAY, @HistoryDate) IN (1, 7)
            SET @HPBase = @HPBase * (1.05 + (CAST(ABS(CHECKSUM(NEWID())) AS FLOAT) / 2147483647.0) * 0.15);
        DECLARE @HPrice DECIMAL(18,2) = ROUND(@HPBase / 10000, 0) * 10000;

        INSERT INTO PriceHistories (RouteFrom, RouteTo, Price, RecordedDate, CreatedAt)
        VALUES (@HRouteFrom, @HRouteTo, @HPrice, @HistoryDate, GETUTCDATE());
        SET @RouteIndex = @RouteIndex + 1;
    END
    SET @HistoryDate = DATEADD(DAY, 1, @HistoryDate);
END

-- =====================================================
-- 4. USERS
-- =====================================================

IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'user@example.com')
    INSERT INTO Users (Email, FullName, Phone, PasswordHash, IsEmailVerified, CreatedAt)
    VALUES ('user@example.com', 'Nguyen Van A', '0901234567', '', 1, GETUTCDATE());

-- =====================================================
-- 5. BOOKINGS (mẫu)
-- =====================================================

DECLARE @UserId BIGINT = (SELECT Id FROM Users WHERE Email = 'user@example.com');

IF NOT EXISTS (SELECT 1 FROM Bookings WHERE UserId = @UserId)
BEGIN
    INSERT INTO Bookings (UserId, FlightId, Status, TotalPrice, Passengers, BookingDate)
    SELECT TOP 1 @UserId, Id, 'Confirmed', Price * 1, 1, GETUTCDATE()
    FROM Flights ORDER BY Id;

    INSERT INTO Bookings (UserId, FlightId, Status, TotalPrice, Passengers, BookingDate)
    SELECT @UserId, Id, 'Pending', Price * 2, 2, GETUTCDATE()
    FROM (SELECT Id, Price FROM Flights ORDER BY Id OFFSET 2 ROWS FETCH NEXT 1 ROW ONLY) AS F;

    INSERT INTO Bookings (UserId, TrainId, Status, TotalPrice, Passengers, BookingDate)
    SELECT TOP 1 @UserId, Id, 'Completed', Price * 1, 1, DATEADD(DAY, -5, GETUTCDATE())
    FROM Trains ORDER BY Id;

    INSERT INTO Bookings (UserId, FlightId, Status, TotalPrice, Passengers, BookingDate)
    SELECT @UserId, Id, 'Cancelled', Price * 1, 1, DATEADD(DAY, -10, GETUTCDATE())
    FROM (SELECT Id, Price FROM Flights ORDER BY Id OFFSET 5 ROWS FETCH NEXT 1 ROW ONLY) AS F;
END

PRINT 'Seed completed.';
GO
