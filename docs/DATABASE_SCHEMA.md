# Database Schema

## Entity Relationships

```
Flights ──┐
          ├── PriceHistory
Trains ───┘
               
Users ──── Bookings ──┬── Flights (nullable)
                      └── Trains  (nullable)
```

## Tables

### Flights
- `Id` BIGINT PK
- `AirlineCode` NVARCHAR(10)
- `AirlineName` NVARCHAR(100)
- `DepartureLocation` NVARCHAR(50) — indexed with ArrivalLocation + FlightDate
- `ArrivalLocation` NVARCHAR(50)
- `DepartureTime` DATETIME2
- `ArrivalTime` DATETIME2
- `Price` DECIMAL(10,2) — indexed
- `Seats` INT
- `FlightDate` DATE
- `CreatedAt` DATETIME2

### Trains
- Same columns pattern as Flights, plus `CoachClass` NVARCHAR(50)

### PriceHistory
- Tracks daily price snapshots for trend analysis
- Linked to Flight or Train (nullable FK)
- Indexed on (RouteFrom, RouteTo, RecordedDate)

### Users
- `Email` UNIQUE indexed

### Bookings
- Status: `Pending` → `Confirmed` | `Cancelled`
- Can reference either Flight or Train (not both)
- Indexed on UserId and Status

## Indexes

- **Flights**: (DepartureLocation, ArrivalLocation, FlightDate), (Price)
- **Trains**: (DepartureLocation, ArrivalLocation, TrainDate), (Price)
- **PriceHistory**: (RouteFrom, RouteTo, RecordedDate), (Price)
- **Users**: Email (unique)
- **Bookings**: UserId, Status
