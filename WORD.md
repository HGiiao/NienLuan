# BÁO CÁO TRIỂN KHAI TÍNH NĂNG DỰ ĐOÁN & NÂNG CAO UX
## Dự án Vé247 — Hệ thống đặt vé máy bay & tàu hỏa

---

## MỤC LỤC

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Kiến trúc hệ thống](#2-kiến-trúc-hệ-thống)
3. [Tính năng 1: AI Dự báo giá vé (Predictive Pricing)](#3-tính-năng-1-ai-dự-báo-giá-vé-predictive-pricing)
4. [Tính năng 2: Đóng băng giá (Price Freeze)](#4-tính-năng-2-đóng-băng-giá-price-freeze)
5. [Tính năng 3: Ma trận giá linh hoạt (Flexible Date Search)](#5-tính-năng-3-ma-trận-giá-linh-hoạt-flexible-date-search)
6. [Danh sách file thay đổi](#6-danh-sách-file-thay-đổi)
7. [Hướng dẫn chạy & kiểm tra](#7-hướng-dẫn-chạy--kiểm-tra)

---

## 1. TỔNG QUAN DỰ ÁN

Vé247 là hệ thống đặt vé máy bay và tàu hỏa trực tuyến với các chức năng chính:
- Tìm kiếm chuyến bay / tàu hỏa theo tuyến đường, ngày, loại vé (một chiều / khứ hồi)
- So sánh giá vé máy bay và tàu hỏa cạnh nhau
- Xu hướng giá: biểu đồ biến động giá theo ngày (7/14/30 ngày)
- Lộ trình tối ưu: tìm đường đi nhiều chặng qua các hub
- Cảnh báo giá: đặt target price → nhận email khi giá giảm
- Đặt vé & thanh toán: flow 2 bước
- Xác thực: Clerk OAuth + email/password + OTP
- Admin Dashboard: quản lý users, flights, trains, bookings, thống kê

**Công nghệ:**
- Backend: ASP.NET Core 10 Web API, EF Core, SQL Server Express
- Frontend: React 19 + Vite + TailwindCSS v4 + Recharts + Framer Motion + Clerk
- Email: Gmail SMTP

---

## 2. KIẾN TRÚC HỆ THỐNG

### 2.1. Backend

**Controllers (10):**

| Controller | Route | Mô tả |
|-----------|-------|-------|
| FlightsController | /api/flights | CRUD chuyến bay + pagination + round-trip |
| TrainsController | /api/trains | CRUD chuyến tàu + pagination + round-trip |
| PricesController | /api/prices | So sánh giá, xu hướng, dự đoán, calendar, lộ trình tối ưu |
| BookingsController | /api/bookings | Đặt vé, thanh toán, hủy |
| AuthController | /api/auth | Đăng ký (OTP), đăng nhập, profile |
| PriceAlertController | /api/price-alerts | Cảnh báo giá CRUD + check |
| PriceFreezeController | /api/price-freeze | Đóng băng giá (MỚI) |
| PaymentsController | /api/payments | VNPay return |
| LocationsController | /api/locations | Gợi ý sân bay/ga |
| AdminController | /api/admin | Dashboard + CRUD admin |

**Services (7):**

| Service | Mô tả |
|---------|-------|
| PriceHistoryService | Lấy dữ liệu xu hướng giá từ PriceHistories table |
| PricePredictionService | MỚI — Dự đoán giá bằng Linear Regression |
| PriceAggregatorService | Query flights + trains theo route |
| RouteOptimizerService | Tìm lộ trình multi-leg (2-3 chặng) |
| EmailService | Gửi email OTP + price alert qua Gmail SMTP |
| VnPayService | Tích hợp VNPay sandbox |
| SeedDataService | Seed 940 flights, 235 trains, 30 ngày price history |

**Models (8):** Flight, Train, PriceHistory, User, Booking, PriceAlert, PriceFreeze (MỚI)

### 2.2. Frontend

**Pages (15):**

| Page | Route | Mô tả |
|------|-------|-------|
| Home | / | Landing page |
| SearchFlights | /flights | Tìm chuyến bay + round-trip |
| SearchTrains | /trains | Tìm chuyến tàu + round-trip |
| PriceComparison | /compare | So sánh giá + xu hướng + heatmap + dự đoán |
| OptimalRoute | /optimal-route | Lộ trình tối ưu + cảnh báo giá |
| BookingPage | /booking/:type/:id | Form đặt vé step 1 |
| PaymentPage | /payment/:bookingId | Thanh toán step 2 |
| Bookings | /bookings | Tra cứu đặt chỗ |
| Profile | /profile | Thông tin cá nhân + giá đóng băng |
| LoginRegister | /auth | Đăng nhập / đăng ký |
| BookingConfirmation | /booking-confirmation/:id | Legacy |
| VnPayReturn | /payment/vnpay-return | VNPay callback |
| AdminLogin | /admin/login | Đăng nhập admin |
| AdminDashboard | /admin/* | Dashboard admin |
| NotFound | * | 404 |

**Components chính (12):** Navbar, Footer, HeroSearch, FlightCard, TrainCard, PriceFilter, RealTimeChart, LocationInput, BookingOptionsModal, PriceHeatmap (MỚI), Profile, PriceAlerts

### 2.3. Database (7 tables)

Flights, Trains, PriceHistory, Users, Bookings, PriceAlerts, PriceFreezes (MỚI)


---

## 3. TÍNH NĂNG 1: AI DỰ BÁO GIÁ VÉ (PREDICTIVE PRICING)

### 3.1. Mục tiêu

Dự đoán xu hướng giá vé trong 7 ngày tới dựa trên dữ liệu lịch sử 30 ngày, hiển thị badge gợi ý "Nên mua ngay" hoặc "Chờ thêm" trên mỗi chuyến, giúp người dùng ra quyết định đặt vé thông minh hơn.

### 3.2. Cách triển khai

#### 3.2.1. Backend — PricePredictionService

File: ackend/FlightAggregatorApi/Services/PricePredictionService.cs

Sử dụng **Linear Regression** (hồi quy tuyến tính) đơn giản — không cần ML model phức tạp:

**Công thức toán học:**
- Đường hồi quy: y = a + bx
- x = ngày thứ i (1, 2, 3, ..., n)
- y = giá trung bình ngày đó
- slope  = (n*Σxy - Σx*Σy) / (n*Σx² - (Σx)²)
- intercept  = (Σy - b*Σx) / n
- R² (độ tin cậy) = 1 - (SS_res / SS_tot)

**Logic recommendation:**
- Nếu R² < 0.3 → "uncertain" (dữ liệu không đủ tin cậy)
- Nếu xu hướng tăng (slope > 0) và R² >= 0.3 → "buy_now" (giá sắp tăng, mua ngay)
- Nếu xu hướng giảm (slope < 0) và R² >= 0.3 → "wait" (giá sắp giảm, chờ thêm)
- Khác → "neutral"

**Kết quả trả về (PricePredictionResult):**
- CurrentPrice: giá hiện tại
- PredictedPrice: giá dự đoán ngày đầu tiên
- Confidence: độ tin cậy (R², 0-1)
- Trend: "up" / "down" / "stable"
- ChangePercent: % thay đổi
- Recommendation: "buy_now" / "wait" / "neutral" / "uncertain"
- Predictions: mảng 7 ngày dự đoán (Date + PredictedPrice)

#### 3.2.2. Backend — API endpoint mới

**GET /api/prices/predict?from=HAN&to=SGN&days=7**
- Controller: PricesController (method Predict)
- Gọi PricePredictionService.Predict()
- Trả về PricePredictionResult

#### 3.2.3. Frontend — FlightCard & TrainCard

Thêm prop prediction (object hoặc null) vào cả FlightCard và TrainCard.

**Desktop — Action panel (cột giá bên phải):**
- prediction.recommendation === 'buy_now':
  - Badge màu xanh emerald: ✨ Nên mua ngay
- prediction.recommendation === 'wait':
  - Badge màu vàng amber: ⏰ Chờ thêm

**Desktop — Sidebar (cột thông tin bên trái):**
- Hiển thị "Dự báo: Tăng" (emerald) hoặc "Giảm" (amber)

**Mobile:**
- Badge nhỏ gọn cạnh giá
- Dòng "Nên mua"/"Chờ" bên cạnh hạng vé

#### 3.2.4. Frontend — SearchFlights & SearchTrains

**Luồng dữ liệu:**
1. User nhập from/to/date → click Tìm kiếm
2. Gọi getFlights() → nhận danh sách chuyến bay
3. Sau khi có kết quả, gọi predictPrice({ from, to })
4. Lưu prediction vào state
5. Pass prediction xuống từng FlightCard qua prop

**Bộ lọc "Chỉ vé nên mua":**
- Nút toggle bên cạnh PriceFilter
- Chỉ hiện khi có prediction với confidence > 0.3
- Khi bật: lọc items chỉ giữ các chuyến có thể mua ngay
- Màu emerald khi active

**Toast đóng băng giá:**
- Hiển thị thông báo khi freeze thành công

#### 3.2.5. Frontend — PriceComparison

**Biểu đồ xu hướng:**
- Merge trendData (dữ liệu quá khứ) + prediction.predictions (dữ liệu dự báo)
- Thêm đường dashed (strokeDasharray="6 3") màu chart-2 cho predictedPrice
- Legend hiển thị "Dự báo"

**Stat card mới (thứ 5):**
- Icon ✨ Sparkles
- Label: "Dự báo 7 ngày"
- Value: "Nên mua" / "Chờ thêm" / "Ổn định"
- Màu sắc tương ứng (emerald/amber/default)

### 3.3. Database

Không cần thêm bảng mới — dữ liệu được tính toán real-time từ PriceHistories table.

### 3.4. File thay đổi

| File | Loại |
|------|------|
| backend/.../Services/PricePredictionService.cs | MỚI |
| backend/.../Controllers/PricesController.cs | SỬA (thêm Predict method) |
| backend/.../Program.cs | SỬA (register service) |
| frontend/.../components/FlightCard.jsx | SỬA (prediction badge, freeze button) |
| frontend/.../components/TrainCard.jsx | SỬA (prediction badge, freeze button) |
| frontend/.../pages/SearchFlights.jsx | SỬA (prediction fetch, filter, freeze) |
| frontend/.../pages/SearchTrains.jsx | SỬA (prediction fetch, filter, freeze) |
| frontend/.../pages/PriceComparison.jsx | SỬA (prediction chart line + stat card) |
| frontend/.../services/api.js | SỬA (predictPrice function) |

---

## 4. TÍNH NĂNG 2: ĐÓNG BĂNG GIÁ (PRICE FREEZE)

### 4.1. Mục tiêu

Cho phép người dùng "đóng băng" mức giá hiện tại của một chuyến bay/chuyến tàu trong 24 giờ. Tạo cảm giác urgency (khan hiếm) và trải nghiệm khác biệt so với các OTA khác.

### 4.2. Cách triển khai

#### 4.2.1. Backend — Model PriceFreeze

File: ackend/FlightAggregatorApi/Models/PriceFreeze.cs

`
PriceFreeze {
    Id: long (PK, Identity)
    Email: string (NVARCHAR 255)
    FlightId: long? (FK → Flights, SET NULL)
    TrainId: long? (FK → Trains, SET NULL)
    FrozenPrice: decimal (18,2) — giá tại thời điểm đóng băng
    RouteFrom: string (NVARCHAR 50)
    RouteTo: string (NVARCHAR 50)
    ExpiresAt: DateTime — thời gian hết hạn
    IsRedeemed: bool — đã sử dụng chưa
    CreatedAt: DateTime (default GETUTCDATE())
}
`

#### 4.2.2. Backend — PriceFreezeController

**POST /api/price-freeze** — Tạo freeze mới
- Body: { email, flightId?, trainId?, hours (default 24) }
- Tìm flight/train → lấy giá hiện tại → tạo PriceFreeze với ExpiresAt = UTC now + hours
- Trả về đối tượng PriceFreeze

**GET /api/price-freeze?email=...** — Lấy danh sách freeze đang active
- Query: WHERE email = ? AND IsRedeemed = false AND ExpiresAt > UTC now
- Sắp xếp: CreatedAt DESC

**POST /api/price-freeze/{id}/redeem** — Đánh dấu đã sử dụng
- Tìm PriceFreeze → kiểm tra IsRedeemed + ExpiresAt
- Set IsRedeemed = true
- Cho phép tạo booking với giá đã freeze

**DELETE /api/price-freeze/{id}** — Xóa freeze
- Xóa bản ghi

#### 4.2.3. Backend — ApplicationDbContext

Thêm DbSet<PriceFreeze> PriceFreezes
Cấu hình entity:
- HasIndex(Email)
- HasIndex(IsRedeemed)
- HasOne(Flight).WithMany().OnDelete(SetNull)
- HasOne(Train).WithMany().OnDelete(SetNull)

#### 4.2.4. Backend — Program.cs (Runtime migration)

Thêm raw SQL tạo bảng PriceFreezes:
`sql
IF OBJECT_ID('PriceFreezes', 'U') IS NULL
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
    CONSTRAINT FK_PriceFreeze_Flight FOREIGN KEY (FlightId) REFERENCES Flights(Id),
    CONSTRAINT FK_PriceFreeze_Train FOREIGN KEY (TrainId) REFERENCES Trains(Id)
);
CREATE INDEX IX_PriceFreezes_Email ON PriceFreezes (Email);
CREATE INDEX IX_PriceFreezes_IsRedeemed ON PriceFreezes (IsRedeemed);
`

#### 4.2.5. Frontend — FlightCard & TrainCard

**Nút "Đóng băng":**
- Desktop: nút ❄️ Đóng băng cạnh nút Đặt vé (flex-1 border)
- Mobile: icon ❄️ bên cạnh nút Đặt vé
- Chỉ hiển thị khi prop onFreeze được truyền vào

#### 4.2.6. Frontend — SearchFlights & SearchTrains

**handleFreeze function:**
1. Kiểm tra user từ localStorage
2. Nếu chưa đăng nhập → redirect /auth?redirect=...
3. Gọi API createPriceFreeze({ email, flightId/trainId, hours: 24 })
4. Hiển thị toast xanh: "Đã đóng băng giá XX₫ trong 24h!"

#### 4.2.7. Frontend — Profile Page

**Section "Giá đã đóng băng":**
- Tiêu đề: ❄️ Giá đã đóng băng (số lượng)
- Card hiển thị: routeFrom → routeTo, frozenPrice, countdown (giờ:phút)
- Nút "Hủy" (gọi DELETE API)
- Tự động fetch khi trang Profile load

### 4.3. Database

Bảng mới: PriceFreezes

### 4.4. File thay đổi

| File | Loại |
|------|------|
| backend/.../Models/PriceFreeze.cs | MỚI |
| backend/.../Controllers/PriceFreezeController.cs | MỚI |
| backend/.../Data/ApplicationDbContext.cs | SỬA (DbSet + config) |
| backend/.../Program.cs | SỬA (CREATE TABLE) |
| database/schema.sql | SỬA (thêm bảng) |
| frontend/.../services/api.js | SỬA (3 API functions mới) |
| frontend/.../components/FlightCard.jsx | SỬA (onFreeze prop, nút) |
| frontend/.../components/TrainCard.jsx | SỬA (onFreeze prop, nút) |
| frontend/.../pages/SearchFlights.jsx | SỬA (handleFreeze, toast) |
| frontend/.../pages/SearchTrains.jsx | SỬA (handleFreeze, toast) |
| frontend/.../pages/Profile.jsx | SỬA (section freezes) |

---

## 5. TÍNH NĂNG 3: MA TRẬN GIÁ LINH HOẠT (FLEXIBLE DATE SEARCH)

### 5.1. Mục tiêu

Hiển thị ma trận giá dạng heatmap: dòng là điểm đến, cột là ngày trong tháng. Ô màu xanh = rẻ, đỏ = đắt. Giúp người dùng trực quan thấy ngày nào rẻ nhất trong tháng và khám phá điểm đến mới.

### 5.2. Cách triển khai

#### 5.2.1. Backend — API endpoint mới

**GET /api/prices/calendar?from=HAN&to=SGN&month=8&year=2026**

- Nếu có 	o: trả về ma trận 1 điểm đến × ngày
- Nếu không có 	o: tự động lấy 8 điểm đến popular nhất từ database
- Query Flights table: group by (ArrivalLocation, FlightDate) → Min price
- Trả về:
`json
{
    "month": 8,
    "year": 2026,
    "from": "HAN",
    "startDate": "2026-08-01",
    "endDate": "2026-08-31",
    "rows": [
        {
            "location": "SGN",
            "days": [1200000, null, 1150000, ...]
        },
        ...
    ]
}
`
- days[i] = null nếu không có chuyến bay ngày đó

#### 5.2.2. Frontend — PriceHeatmap Component

File: rontend/src/components/PriceHeatmap.jsx

**Props:**
- from: mã sân bay đi
- onSelectDate: callback(to, date) khi user click ô

**State:**
- month, year (có thể chuyển tháng bằng prev/next)
- data: response từ API
- loading

**Giao diện:**
- Header: icon CalendarDays + "Giá vé theo ngày" + chọn tháng (◀ Tháng 8/2026 ▶)
- Chú thích: "Màu xanh = giá rẻ, màu đỏ = giá đắt"
- Table heatmap:
  - Header: thứ (T2/T3/.../CN) + ngày (1-31)
  - Mỗi dòng: điểm đến + tên thành phố
  - Mỗi ô: giá VND (rút gọn, bỏ ₫) với màu nền theo thang:
    - ratio <= 20%: emerald-400/70 → rẻ nhất
    - ratio <= 40%: emerald-400/40
    - ratio <= 60%: amber-400/30 → trung bình
    - ratio <= 80%: orange-400/40
    - ratio > 80%: red-400/50 → đắt nhất
- Legend: Rẻ (xanh) → Trung bình (vàng) → Đắt (đỏ)
- Hover: ring primary-500
- Click: gọi onSelectDate → tự động search

**Logic màu sắc:**
`javascript
function getColor(price, minP, maxP) {
    if (price == null) return 'bg-xám'  // không có vé
    const ratio = (price - minP) / (maxP - minP)
    if (ratio <= 0.2) return 'bg-emerald-400/70'
    if (ratio <= 0.4) return 'bg-emerald-400/40'
    if (ratio <= 0.6) return 'bg-amber-400/30'
    if (ratio <= 0.8) return 'bg-orange-400/40'
    return 'bg-red-400/50'
}
`

#### 5.2.3. Frontend — PriceComparison Integration

**Vị trí:** Bên dưới biểu đồ xu hướng và bảng detail, trước khi đóng container

**Khi user click ô heatmap:**
1. Set query.to = location, query.date = fullDate
2. Lưu vào localStorage
3. Gọi fetchAll() → cập nhật compare data + trend data

### 5.3. Database

Không cần bảng mới — query từ Flights table.

### 5.4. File thay đổi

| File | Loại |
|------|------|
| frontend/.../components/PriceHeatmap.jsx | MỚI |
| backend/.../Controllers/PricesController.cs | SỬA (thêm GetCalendar) |
| frontend/.../pages/PriceComparison.jsx | SỬA (import + render heatmap) |
| frontend/.../services/api.js | SỬA (getPriceCalendar function) |

---

## 6. DANH SÁCH FILE THAY ĐỔI (TỔNG HỢP)

### Files MỚI (4 files):
1. backend/FlightAggregatorApi/Services/PricePredictionService.cs
2. backend/FlightAggregatorApi/Models/PriceFreeze.cs
3. backend/FlightAggregatorApi/Controllers/PriceFreezeController.cs
4. frontend/src/components/PriceHeatmap.jsx

### Files SỬA (12 files):
1. backend/FlightAggregatorApi/Controllers/PricesController.cs
2. backend/FlightAggregatorApi/Program.cs
3. backend/FlightAggregatorApi/Data/ApplicationDbContext.cs
4. database/schema.sql
5. frontend/src/services/api.js
6. frontend/src/components/FlightCard.jsx
7. frontend/src/components/TrainCard.jsx
8. frontend/src/pages/SearchFlights.jsx
9. frontend/src/pages/SearchTrains.jsx
10. frontend/src/pages/PriceComparison.jsx
11. frontend/src/pages/Profile.jsx

---

## 7. HƯỚNG DẪN CHẠY & KIỂM TRA

### 7.1. Backend

`ash
cd backend/FlightAggregatorApi
dotnet restore
dotnet build
dotnet run
`

Backend chạy tại http://localhost:5000

Endpoints mới:
- GET http://localhost:5000/api/prices/predict?from=HAN&to=SGN&days=7
- GET http://localhost:5000/api/prices/calendar?from=HAN&month=8&year=2026
- POST http://localhost:5000/api/price-freeze
- GET http://localhost:5000/api/price-freeze?email=user@example.com
- POST http://localhost:5000/api/price-freeze/1/redeem
- DELETE http://localhost:5000/api/price-freeze/1

### 7.2. Frontend

`ash
cd frontend
npm install
npm run dev
`

Frontend chạy tại http://localhost:5173

Kiểm tra:
1. Trang So sánh & Xu hướng (/compare): nhập từ→đến → thấy heatmap + đường dự báo
2. Trang Chuyến bay (/flights): search → thấy badge "Nên mua ngay"/"Chờ thêm" + nút "Đóng băng"
3. Trang Cá nhân (/profile): thấy mục "Giá đã đóng băng"
4. Nút lọc "Chỉ vé nên mua" bên cạnh bộ lọc giá

### 7.3. Build

`ash
# Backend
dotnet build
# Frontend
npm run build
`

Cả hai đều build 0 error.
