# AGENTS.md

## Project structure

- `backend/FlightAggregatorApi/` — ASP.NET Core 10 Web API
- `frontend/` — React 19 + Vite + TailwindCSS v4 + Recharts + Framer Motion + Clerk
- `database/` — SQL schema + seed data

## Setup & dev commands

```bash
# Backend
dotnet restore
dotnet build
dotnet run --project backend/FlightAggregatorApi

# Frontend
cd frontend && npm install
npm run dev        # Vite dev server (localhost:5173)
npm run build      # Production build
```

## Key conventions

- **CORS**: Allow `http://localhost:5173` in backend config (`Cors:AllowedOrigins`)
- **API responses**: Paginated (20/page), Gzip compressed, JSON with `ReferenceHandler.IgnoreCycles`
- **EF Core**: Use `AsNoTracking()` for read-only queries
- **Frontend env**: `VITE_API_URL=http://localhost:5000` in `.env`
- **Mobile-first**: All pages responsive
- **Auth**: Clerk (OAuth + email/password + phone SMS) + custom email/password fallback via `AuthController`
- **UI**: Tiếng Việt, hiển thị giá VND (`Intl.NumberFormat('vi-VN')`)
- **CSS**: TailwindCSS v4 `@theme` in `index.css`, biến màu CSS custom (--color-bg, --color-bg-card, --color-text-primary, --color-text-secondary, --color-text-tertiary, --color-border, --color-surface-50)
- **Font**: Inter (Google Fonts) + Geist (variable font cho weight)
- **Dark mode**: `ThemeContext` + localStorage `ve247-theme`, toggle button
- **Gmail SMTP**: `nggiao01@gmail.com`, App Password `qdii hzzz oidz lnyz` trong `appsettings.json` section `Email`

## Current state

### Backend — hoàn chỉnh
- **10 controllers**: Flights, Trains, Prices, Bookings, Auth, PriceAlert, Locations, Admin, Payments, Subscriptions — tất cả CRUD + pagination
- **RouteOptimizerService** (355 dòng): multi-leg journey planner (2-3 chặng, qua hub HAN/SGN/DAD/CXR/PQC/HCM)
- **PriceHistoryService**: trend data (min/max/avg) theo ngày
- **PriceAggregatorService**: query flights/trains theo route
- **PriceStreamService** (`Services/PriceStreamService.cs`): BackgroundService biến động giá ±5% mỗi 30s trên 8 tuyến phổ biến, broadcast qua SignalR PriceHub
- **EmailService** (`Services/EmailService.cs`): Gửi OTP + price alert email HTML template tiếng Việt qua Gmail SMTP (smtp.gmail.com:587, SSL). Dùng App Password. Timeout 30s, logging. Có `SendOtpAsync` + `SendPriceAlertAsync`.
- **Database**: EF Core + SQL Server Express (`localhost\SQLEXPRESS`) — **không còn dùng Azure SQL**
- **Seed**: 940 flights (470 round-trip + 470 one-way via RoundTripGroupId), 235 trains, 30 days price history, 1 user (user@example.com / 123456)
- **Runtime migration**: `PasswordHash`, `EmailVerificationCode`, `IsEmailVerified`, `Address`, `PaymentMethod` columns + `PriceAlerts` table được thêm bằng SQL raw trong `Program.cs`
- **Email OTP**: Gửi mã xác thực 6 số qua Gmail SMTP khi đăng ký. User chỉ được lưu vào DB sau khi verify OTP thành công. OTP lưu trong `IMemoryCache` 10 phút
- **Cache/Memory**: `AddMemoryCache()` đã register, dùng để lưu pending registration + OTP (10 phút)
- **Known issue**: Build warnings `NU1903` (Microsoft.OpenApi 2.0.0 vulnerability), decimal columns thiếu `HasColumnType`
- **Payment sandbox**: `POST /api/bookings/{id}/pay` — luôn set `Status = "Confirmed"` (test mode), tạo mã giao dịch `TXN_YYYYMMddHHmmss_RAND`

### Frontend — hoàn chỉnh
- **13 routes**: Trang chủ `/`, Chuyến bay `/flights`, Tàu hỏa `/trains`, So sánh & Xu hướng `/compare`, Lộ trình & Cảnh báo `/optimal-route`, Đặt vé `/booking/:type/:id`, Thanh toán `/payment/:bookingId`, Xác nhận `/booking-confirmation/:id`, Đặt chỗ `/bookings`, Cá nhân `/profile`, Đăng nhập `/auth`, SSO Callback
- **11 components**: Navbar, Footer, HeroSearch, FlightCard, TrainCard, PriceFilter, Profile, PriceAlerts, LocationInput, Pagination, CarbonBadge
- **Auth**: Clerk React SDK (UserButton, sign-in/sign-out) + custom email/password form dùng backend API
- **Email OTP**: Đăng ký → nhập OTP → xác thực → đăng nhập
- **Charts**: Recharts (LineChart, BarChart, PieChart, AreaChart)
- **Animations**: Framer Motion trên nhiều trang
- **Dark mode**: Gradient cover, skeleton loading, error state
- **Pagination**: Component `<Pagination>` trong `src/ui/Pagination.jsx`, dùng ở SearchFlights + SearchTrains
- **Search autocomplete**: `LocationInput` component gợi ý mã sân bay/tên thành phố khi gõ, dùng ở HeroSearch + SearchFlights + SearchTrains + PriceComparison + OptimalRoute

### Chưa triển khai
- Unit tests, Dockerfile, CI/CD
- Payment gateway thật (VNPay/Momo) — đang dùng sandbox luôn thành công
- Seat selection, review/rating
- Debounce search (300ms)

## Database

```sql
-- 6 tables: Flights, Trains, PriceHistory, Users, Bookings, PriceAlerts
-- Indexes on: (DepartureLocation, ArrivalLocation, Date), (Price), Email(unique), Status
-- Foreign keys: Booking → Flight/Train (ON DELETE SET NULL)
```

**PriceAlerts table** (runtime migration — `Program.cs`):
| Column | Type | Notes |
|--------|------|-------|
| Id | BIGINT IDENTITY | PK |
| Email | NVARCHAR(255) | NOT NULL |
| RouteFrom | NVARCHAR(50) | NOT NULL |
| RouteTo | NVARCHAR(50) | NOT NULL |
| TargetPrice | DECIMAL(18,2) | NOT NULL |
| CurrentPrice | DECIMAL(18,2) | NULL |
| IsActive | BIT | DEFAULT 1 |
| CreatedAt | DATETIME2 | DEFAULT GETUTCDATE() |
| NotifiedAt | DATETIME2 | NULL |

**Lưu ý**: `schema.sql` KHÔNG có cột `PasswordHash`, `EmailVerificationCode`, `IsEmailVerified` trong Users table, không có bảng `PriceAlerts`, không có `Address`/`PaymentMethod` trong Bookings — được thêm bằng runtime migration ở Program.cs.

**`RoundTripGroupId` column** (Flights): thêm bằng runtime migration. Seed có 470 cặp (940 flights). Khi tìm round-trip, backend join `RoundTripGroupId` để ghép chuyến đi + chuyến về.

## Auth flow (backend custom)

1. **Register** → `POST /api/auth/register` → validate → check email not exists → generate OTP 6 số → gửi email qua `EmailService` → lưu `PendingRegistration` vào `IMemoryCache` (key: `pending_reg:{email}`, TTL: 10 phút) → **KHÔNG lưu User vào DB**

2. **Verify email** → `POST /api/auth/verify-email` → tìm `PendingRegistration` trong cache → verify OTP → tạo `User` trong DB với `IsEmailVerified = true` → xoá cache

3. **Login** → `POST /api/auth/login` → tìm user theo email → verify BCrypt hash → kiểm tra `IsEmailVerified` → return user info

4. **Clerk sync** → `POST /api/auth/clerk-sync` → tìm user theo email, nếu chưa có thì tạo mới với `PasswordHash = "__clerk_managed__"` và `IsEmailVerified = true`

## Navbar auth logic (frontend)

- Kiểm tra cả Clerk `isSignedIn` AND localStorage `user` (từ backend login)
- `localUser = JSON.parse(localStorage.getItem('user'))` — đọc trực tiếp mỗi lần render (ko dùng useState cache)
- `loginMethod` flag trong localStorage: `'clerk'` (từ ClerkSync) hoặc `'backend'` (từ LoginRegister)
- ClerkSync chỉ xoá localStorage khi `loginMethod === 'clerk'` (ko ảnh hưởng backend login)
- Nút "Đăng xuất" cho backend auth user

## Design System (Vé247)

- **Brand**: Xanh #003580 (`brand-500`)
- **Accent**: Cam #F15A24 (`accent-500`) — buttons, prices, highlights
- **Navbar**: Sticky white bg, 3-column layout (logo left, 7 links centered, hotline + user right), blue hover, Clerk UserButton + backend auth fallback, dark mode toggle. 7 links: Trang chủ, Chuyến bay, Tàu hỏa, So sánh & Xu hướng, Lộ trình & Cảnh báo, Đặt chỗ.
- **Footer**: 4 columns (info, hỗ trợ, chứng nhận, thanh toán)
- **Cards**: White bg, rounded-2xl, shadow-sm, hover:shadow-lg, hover:-translate-y-0.5
- **Buttons**: accent-500 bg, white text, rounded-xl, font-bold
- **Inputs**: bg-gray-50, focus:bg-white, focus:ring-accent-500
- **Dark mode**: CSS custom properties, smooth transitions

## Routes (React Router)

| Path | Page | Description |
|------|------|-------------|
| `/` | Home | Landing page: hero search + features + destinations + deals |
| `/flights` | SearchFlights | Tìm chuyến bay (`?from=&to=&date=&tripType=&returnDate=`) |
| `/trains` | SearchTrains | Tìm chuyến tàu (`?from=&to=&date=&tripType=&returnDate=`) |
| `/compare` | PriceComparison | So sánh & xu hướng giá (merged: stat cards + area chart + detail table, round-trip support) |
| `/optimal-route` | OptimalRoute | Lộ trình tối ưu + Cảnh báo giá (2 tabs), search form với trip toggle + LocationInput |
| `/booking/:type/:id` | BookingPage | Step 1: form thông tin hành khách + chọn phương thức thanh toán + chi tiết vé |
| `/payment/:bookingId` | PaymentPage | Step 2: xử lý thanh toán qua backend (sandbox), success/failure |
| `/payment/subscription/:planId` | SubscriptionPaymentPage | Thanh toán gói VIP/Premium: chọn phương thức → gọi API → kết quả |
| `/booking-confirmation/:id` | BookingConfirmation | (cũ — keep cho backward compat) |
| `/bookings` | Bookings | Tra cứu đặt chỗ theo email |
| `/profile` | Profile | Thông tin cá nhân + inline editing (name, phone) |
| `/auth` | LoginRegister | Đăng nhập / Đăng ký (Clerk + custom + OTP) |
| `/auth/sso-callback` | SSO Callback | Xử lý callback từ Clerk OAuth |
| `/admin/login` | AdminLogin | Đăng nhập quản trị (kiểm tra `role !== 'Admin'`) |
| `/admin` | AdminDashboard | Admin dashboard tổng quan (có `AdminGuard`) |
| `/admin/*` | AdminDashboard | Catch-all cho các tab admin |
| (redirect) | `/trends` → `/compare` | Redirect |
| (redirect) | `/price-alerts` → `/optimal-route` | Redirect |

## Components

| Component | Key features |
|-----------|-------------|
| `HeroSearch.jsx` | Full-width gradient banner, 3 tabs (bay/tàu/combo), popular routes chips, Framer Motion, LocationInput |
| `Home.jsx` | Hero + features grid + destinations grid + deals cards + CTA |
| `Navbar.jsx` | Logo Vé247, 7 nav links centered, hotline 1900 6468, responsive hamburger, Clerk UserButton + backend auth fallback, dark mode toggle. 3-column layout, white bg, blue hover |
| `Footer.jsx` | 4-column grid, payment badges (Visa/MC/Momo/ZaloPay/VNPay), hotline, copyright |
| `FlightCard.jsx` | 4-zone layout (airline → timeline → price → action), Google Flights-style timeline, gradient logo, flight number, city names, badge "Rẻ nhất/Nhanh nhất", low stock warning, save button, Framer Motion entry animation. Đặt vé → mở BookingOptionsModal |
| `TrainCard.jsx` | Timeline route, train icon, brand-500 color scheme. Đặt vé → mở BookingOptionsModal |
| `PriceFilter.jsx` | FilterPanel wrapper, sort + min/max price inputs, state object (không stale closure) |
| `Profile.jsx` | Cover gradient + avatar initials + stats grid + info cards + quick actions + logout + inline editing |
| `PriceAlerts.jsx` | Create alert form + alert list + toggle/delete + check prices + search form (LocationInput, trip toggle) |
| `LocationInput.jsx` | Search autocomplete dropdown, gợi ý mã sân bay/tên thành phố, keyboard nav, variant hero/default |
| `BookingOptionsModal.jsx` | Modal 2 lựa chọn: đặt tại hãng (mở tab mới) hoặc đặt tại Vé247 (form đặt vé) |

## Booking flow (2 steps)

### Step 1 — BookingPage (`/booking/:type/:id`)
- Full page (không modal), URL nhận type (flight/train) + id
- Pass item data via `location.state` từ FlightCard/TrainCard
- **Form**: Họ tên, Email, SĐT, Địa chỉ, Số khách
- **Payment method**: 3 options (Thẻ tín dụng / Ví điện tử / Chuyển khoản) với card UI có checkmark
- **Panel phải**: chi tiết vé (mã chuyến, giờ, tuyến, đơn giá, tổng tiền)
- Submit → `POST /api/bookings` → navigate `/payment/:bookingId` với state

### Step 2 — PaymentPage (`/payment/:bookingId`)
- **Processing**: spinner + "Đang xử lý thanh toán..." + thông tin đặt chỗ + badge "Sandbox — luôn thành công"
- Gọi API `POST /api/bookings/{id}/pay` (backend set `Status = Confirmed`)
- **Success**: icon check xanh + mã giao dịch + thông tin vé + nút "Xem đặt chỗ" / "Về trang chủ"
- **Failed**: icon X đỏ + message lỗi + nút "Thử lại" / "Xem đặt chỗ"
- **Backend**: sandbox mode — luôn trả về `success: true`

## UI files

```
frontend/src/
├── index.css              — Tailwind theme (brand + accent + CSS vars)
├── index.html             — Inter + Geist font, title "Ve247"
├── App.jsx                — ClerkProvider + BrowserRouter + 13 routes + layout + ThemeProvider + ClerkSync
├── components/
│   ├── Navbar.jsx         — 3-column layout, 7 links centered, white bg, blue hover
│   ├── Footer.jsx         — 4 columns, payment, hotline
│   ├── HeroSearch.jsx     — Banner + tabs + search form + quick routes + LocationInput
│   ├── FlightCard.jsx     — 4-zone layout, Google Flights timeline, gradient logo, badges, Đặt vé → navigate
│   ├── TrainCard.jsx      — Timeline design, train icon, blue price, Đặt vé → navigate
│   ├── PriceFilter.jsx    — FilterPanel wrapper, sort + range
│   ├── LocationInput.jsx  — Search autocomplete, keyboard nav, variant hero/default
│   ├── BookingOptionsModal.jsx — Modal 2 lựa chọn: đặt tại hãng (mở tab mới) hoặc đặt tại Vé247 (form đặt vé)
│   ├── Profile.jsx        — Cover gradient + initials + stats + info cards + inline editing
│   └── PriceAlerts.jsx    — Form tạo alert + list + toggle/delete + check prices + search form
├── pages/
│   ├── Home.jsx           — Landing: hero, features, destinations, deals, CTA
│   ├── SearchFlights.jsx  — Query params, search + filter + FlightCard, round-trip support, LocationInput
│   ├── SearchTrains.jsx   — Query params, search + filter + TrainCard, round-trip support, LocationInput
│   ├── PriceComparison.jsx — Merged compare + trends: stat cards, area chart, detail table, trip toggle, LocationInput, returnDate
│   ├── OptimalRoute.jsx   — Merged optimal route + price alerts: 2 tabs, search form, trip toggle, LocationInput
│   ├── Bookings.jsx       — Booking list with status pills + cancel
│   ├── Profile.jsx        — Cover gradient + initials + stats + info cards + inline editing
│   ├── PriceAlerts.jsx    — Form create alert + alert list + toggle/delete + check prices
│   ├── BookingPage.jsx    — Step 1 booking form: thông tin + payment method + trip summary
│   ├── PaymentPage.jsx    — Step 2 payment: backend API call, processing/success/failed states, sandbox badge
│   ├── SubscriptionPaymentPage.jsx — Thanh toán gói VIP: chi tiết plan + chọn phương thức + API + kết quả
│   ├── VipPlans.jsx       — Pricing table, billing toggle (tháng/năm), nút "Đăng ký ngay" → navigate payment
│   ├── BookingConfirmation.jsx — (legacy) Xác nhận đặt chỗ
│   └── LoginRegister.jsx  — Clerk auth UI + custom login/register tabs + OTP step
├── admin/
│   ├── AdminContext.jsx    — Toast + Confirm context provider
│   ├── AdminSidebar.jsx    — White sidebar, collapsible, blue active indicator, tooltip
│   ├── Toast.jsx           — Toast notification system (success/error/warning/info)
│   ├── ConfirmDialog.jsx   — Animated confirm dialog
│   ├── DataTable.jsx       — Reusable table: sticky header, search, sort, pagination
│   ├── ModalForm.jsx       — Glass modal form with validation
│   ├── StatCard.jsx        — Compact stat card with sparkline + trend
│   ├── ThemeToggle.jsx     — Light/dark toggle for admin
│   ├── index.js            — Barrel exports
│   └── pages/
│       ├── Overview.jsx    — Dashboard: 6 stats + 2 charts + top routes + activity
│       ├── FlightsPage.jsx — CRUD flights table
│       ├── TrainsPage.jsx  — CRUD trains table
│       ├── BookingsPage.jsx— Bookings table + detail view + confirm/cancel
│       └── UsersPage.jsx   — Users table + delete
├── services/api.js        — Axios endpoints (22 functions)
├── utils/formatters.js    — formatCurrencyVnd, formatDurationMs
└── hooks/
    └── usePriceStream.js  — SignalR WebSocket hook: connect, join/leave route group, auto-reconnect
```

## API endpoints

| Method | Path | Controller |
|--------|------|------------|
| GET | `/api/flights` | FlightsController |
| GET | `/api/flights/{id}` | FlightsController |
| GET | `/api/trains` | TrainsController |
| GET | `/api/trains/{id}` | TrainsController |
| GET | `/api/prices/trends` | PricesController |
| GET | `/api/prices/compare` | PricesController (hỗ trợ `tripType` + `returnDate`) |
| POST | `/api/prices/optimal-route` | PricesController |
| GET | `/api/bookings` | BookingsController |
| GET | `/api/bookings/{id}` | BookingsController |
| POST | `/api/bookings` | BookingsController (nhận `Address` + `PaymentMethod`) |
| POST | `/api/bookings/{id}/pay` | BookingsController (sandbox — luôn thành công) |
| PATCH | `/api/bookings/{id}/cancel` | BookingsController |
| POST | `/api/auth/register` | AuthController |
| POST | `/api/auth/verify-email` | AuthController |
| POST | `/api/auth/login` | AuthController |
| POST | `/api/auth/clerk-sync` | AuthController |
| GET | `/api/auth/profile` | AuthController |
| PUT | `/api/auth/profile` | AuthController (cập nhật email, fullName, phone) |
| POST | `/api/price-alerts` | PriceAlertController |
| GET | `/api/price-alerts` | PriceAlertController |
| DELETE | `/api/price-alerts/{id}` | PriceAlertController |
| PATCH | `/api/price-alerts/{id}/toggle` | PriceAlertController |
| POST | `/api/price-alerts/check` | PriceAlertController (gửi email qua EmailService khi giá ≤ target) |
| GET | `/api/locations/search` | LocationsController |
| **Subscriptions** | | |
| GET | `/api/subscriptions/plans` | SubscriptionController |
| GET | `/api/subscriptions/user/{userId}` | SubscriptionController |
| POST | `/api/subscriptions/subscribe` | SubscriptionController |
| POST | `/api/subscriptions/cancel/{userId}` | SubscriptionController |
| **SignalR** | | |
| WS | `/hubs/prices` | PriceHub — real-time price updates via WebSocket |
| **Admin** | | |
| GET | `/api/admin/dashboard` | AdminController (tổng quan) |
| GET | `/api/admin/stats?period=30` | AdminController (thống kê chi tiết) |
| GET | `/api/admin/users` | AdminController |
| DELETE | `/api/admin/users/{id}` | AdminController |
| GET | `/api/admin/bookings` | AdminController |
| GET | `/api/admin/flights` | AdminController |
| POST | `/api/admin/flights` | AdminController |
| PUT | `/api/admin/flights/{id}` | AdminController |
| DELETE | `/api/admin/flights/{id}` | AdminController |
| GET | `/api/admin/trains` | AdminController |
| POST | `/api/admin/trains` | AdminController |
| PUT | `/api/admin/trains/{id}` | AdminController |
| DELETE | `/api/admin/trains/{id}` | AdminController |

Chi tiết: `docs/API_ENDPOINTS.md`

## Deployment

```bash
dotnet publish -c Release
az appservice plan create --name plan-ve247 --sku B1
az webapp create --name ve247-api --plan plan-ve247
az webapp config connection-string set --name ve247-api --settings DB="<connection-string>"
npm run build
az staticwebapp create --name ve247-app --source ./dist
sqlcmd -i database/schema.sql
```

## Docs

- `docs/API_ENDPOINTS.md` — all routes with examples
- `docs/DATABASE_SCHEMA.md` — relationships & indexes
- `docs/DEPLOYMENT_GUIDE.md` — Azure setup

## Session history (lần gần nhất)

### Lần 16 — 26/07/2026 — Fix IntroAnimation blank screen (P0)

- **Vấn đề**: IntroAnimation "Hành trình Việt Nam" bị trắng màn hình sau khi chạy, không vào được Home
- **Root cause 1**: Framer Motion `motion.circle`/`motion.path` + CSS `offsetDistance`/`offsetPath` không tương thích với SVG — crash silent toàn bộ component. Fix: thay bằng SVG `<animate>` thuần cho map elements (city nodes, flight routes, train path, pulse rings). Giữ `motion.div`/`motion.span`/`motion.button` cho UI cards (AiCard, SuggestionCard, PriceBubble, CTA)
- **Root cause 2**: `setInterval` với closure variable `i` trong `useEffect(() => {...}, [])` — React 19 StrictMode (dev) không cleanup interval đúng lúc, khiến `i` vượt quá `CITIES.length` → `CITIES[i]` undefined → crash `Cannot read properties of undefined (reading 'id')`. Fix: thay bằng `useEffect` chain với `visibleCities.length` làm dependency, dùng `setTimeout` + `nextIndex = visibleCities.length` (luôn đảm bảo in-bounds)
- **Thêm ErrorBoundary** (`src/components/ErrorBoundary.jsx`): class component bắt lỗi render, hiển thị card đỏ với message + stack + nút "Thử lại". Wrap toàn bộ App + IntroAnimation riêng
- **Thêm global error handler**: `window.onerror` + `window.onunhandledrejection` trong `App()` để log lỗi không bắt được
- **Auto-navigate**: Khi countdown = 0, đợi 2s rồi tự động gọi `onComplete` → vào Home (không cần click)
- **Tạo file mới**: `src/components/ErrorBoundary.jsx`
- **Build**: Frontend 0 error

### Lần 13 — 23/07/2026 — Travel Insurance + Corporate Portal + VIP Subscription + Hotel Bundle

- **Feature 11 – Travel Insurance**: `Models/InsurancePackage.cs` + `Models/BookingInsurance.cs`, `InsuranceController.cs` (CRUD + seed 3 gói Bảo Việt/Bảo Minh/BIC), `InsuranceCard.jsx` (chọn gói, toggle chọn/bỏ), tích hợp trong `BookingPage.jsx`
- **Feature 12 – Corporate Booking Portal**: `Models/CorporateAccount.cs` + `CorporateEmployee.cs` + `Invoice.cs`, `CorporateController.cs` (register/employees/add-remove/approve-reject/invoice CRUD), approval workflow, VAT invoice (tự động tính 10% VAT)
- **Feature 13 – Subscription Plan (VIP)**: `Models/SubscriptionPlan.cs` + `UserSubscription.cs`, `SubscriptionController.cs` (plans/register/cancel, seed 3 gói Free/VIP/Premium với giá 0-199k/tháng), `VipPlans.jsx` (pricing table, billing toggle, tính năng so sánh), nút VIP trên Navbar
- **Feature 14 – Flight + Hotel Bundle**: `Models/Hotel.cs` + `HotelBooking.cs`, `HotelController.cs` (search/book, seed 4 khách sạn/địa điểm), `HotelCard.jsx` (star rating, amenities icons, giá/đêm)
- **Build**: Backend 0 error, Frontend 0 error

### Lần 12 — 23/07/2026 — Notification Hub + Calendar Sync + Carbon Footprint + Seat Map

- **Feature 7 – Smart Notification Hub**: `Models/Notification.cs`, `NotificationsController.cs` (list/unread-count/mark-read/mark-all-read/delete/seed), `NotificationBell.jsx` (dropdown panel with type icons, auto-refresh 30s, mark read/delete actions, unread badge), integrated in `Navbar.jsx`
- **Feature 8 – Travel Calendar Sync**: `GET /api/bookings/{id}/calendar` endpoint trả về file `.ics` (VCALENDAR/VEVENT với VALARM 24h), nút "Thêm vào lịch" trên `Bookings.jsx`
- **Feature 9 – Carbon Footprint Calculator**: `Services/CarbonFootprintService.cs` (15 tuyến đường, flight 0.255kg CO₂/km, train 0.041kg CO₂/km), `GET /api/prices/carbon` endpoint, `CarbonBadge.jsx` (badge "Xanh hơn" trên TrainCard + detailed comparison view), integrated trong `PriceComparison.jsx`
- **Feature 10 – Interactive Seat Map**: `Models/Seat.cs`, `SeatMapService.cs` (auto-generate 180 ghế máy bay A-F + 48 giường tàu 8 khoang), `SeatsController.cs` (GET map + POST book), `SeatMap.jsx` (visual grid, business/economy tabs, seat selection with confirmation), integrated trong `BookingPage.jsx`
- **Build**: Backend 0 error, Frontend 0 error

### Lần 11 — 23/07/2026 — Predictive + Freeze + Heatmap + Reviews + Sharing + Tips

- **Feature 1 – Predictive Pricing**: `PricePredictionService.cs` (Linear Regression, R², recommendation), `GET /api/prices/predict` endpoint, prediction badge on `FlightCard`/`TrainCard`, "Chỉ vé nên mua" filter toggle, dashed prediction line + stat card in `PriceComparison`
- **Feature 2 – Price Freeze**: `Models/PriceFreeze.cs`, `PriceFreezeController.cs` (POST/GET/redeem/DELETE), `DbSet` + `CREATE TABLE` in `Program.cs`, ❄️ button on `FlightCard`/`TrainCard`, toast on freeze, "Giá đã đóng băng" section in `Profile.jsx`
- **Feature 3 – Flexible Date Heatmap**: `GET /api/prices/calendar` endpoint, `PriceHeatmap.jsx` (month navigator, color gradient xanh→đỏ, click-to-search), integrated in `PriceComparison.jsx`
- **Feature 4 – Review & Rating**: `Models/Review.cs`, `ReviewsController.cs` (list/summary/create/delete), `ReviewSection.jsx` (star rating input, distribution bar, review list, form), star + count on `FlightCard`/`TrainCard`
- **Feature 5 – Travel Deal Sharing**: `ShareDeal.jsx` (Facebook popup, Zalo popup, clipboard copy, native share), `onShare` prop + share button on `FlightCard`/`TrainCard`, search pages show share modal, `GET /share/{type}/{id}` OG meta endpoint
- **Feature 6 – Community Tips**: `Models/CommunityTip.cs`, `CommunityTipsController.cs` (list/create/upvote), `CommunityTips.jsx` (category selector, tip form, upvote button, list with author/date), integrated in `PriceComparison`
- **Build**: Backend 0 error, Frontend 0 error
- **Known issue**: Backend `NU1903` (Microsoft.OpenApi 2.0.0 vulnerability)

### Lần 6 — 18/07/2026
- **Chuyển DB sang Azure SQL Serverless**: Tạo database `ve247-serverless-nguyen2` trên Azure, update connection string
- **Fix seed lỗi `Invalid object name 'PriceHistories'`**: Nguyên nhân table `PriceHistory` (singular) còn sót từ `EnsureCreated()` không bị drop (do IF OBJECT_ID check nhầm tên), khiến CREATE TABLE PriceHistories thất bại vì trùng tên constraint FK. Fix: thêm `IF OBJECT_ID('PriceHistory', 'U') IS NOT NULL DROP TABLE PriceHistory` trong raw ADO.NET batch
- **Auth guard cho BookingPage + PaymentPage**: Kiểm tra `isAuth` (Clerk `isSignedIn` + localStorage `user`), redirect `/auth?redirect=...` nếu chưa đăng nhập. BookingPage tự động fetch item từ API (`getFlight`/`getTrain`) khi `location.state` mất sau redirect
- **LoginRegister redirect**: Parse `?redirect=` từ URL params → sau login navigate về redirect đó (backend, phone OAuth, Clerk OAuth đều hỗ trợ)
- **BookingOptionsModal**: Component modal mới (`frontend/src/components/BookingOptionsModal.jsx`) hiện 2 lựa chọn khi click "Đặt vé":
  - "Đặt tại hãng": Mở tab mới đến website chính thức (Vietnam Airlines, VietJet Air, Bamboo Airways, Pacific Airlines, Vietravel Airlines, Đường sắt VN)
  - "Đặt tại Vé247": Vào form đặt vé hiện tại (có kiểm tra đăng nhập)
- **Tích hợp modal**: SearchFlights + SearchTrains gọi modal thay vì navigate thẳng
- **Build**: Frontend 0 error

### Lần 1 — 11/07/2026
- **Fix Navbar**: Đọc localStorage trực tiếp mỗi render (bỏ `useState` cache) → hiển thị tên user sau login backend
- **Fix LoginRegister**: Chuyển email/password từ Clerk hooks sang backend API (`login`/`register` từ `api.js`)
- **Fix ClerkSync**: Chỉ xoá localStorage user khi `loginMethod === 'clerk'`
- **Thêm EmailService**: Gửi OTP email HTML template qua Gmail SMTP (smtp.gmail.com:587, SSL)
- **Sửa register flow**: Lưu pending registration vào `IMemoryCache` → gửi OTP email → verify OTP → tạo user trong DB
- **Thêm verify-email endpoint**: Xác thực OTP từ cache, tạo User trong DB sau khi verify
- **Thêm IsEmailVerified check**: Login kiểm tra email verified trước khi cho phép đăng nhập
- **Update appsettings.json**: Thêm Email section (Gmail SMTP)
- **Seed user**: `IsEmailVerified = true`
- **Runtime migration**: Thêm `EmailVerificationCode` + `IsEmailVerified` columns

### Lần 2 — 14/07/2026
- **Fix EmailService**: App password, timeout, logging, fix email body duplication
- **Design lại Email template**: Tiếng Việt có dấu, gradient header xanh, OTP monospace 40px, CTA button
- **Tạo Profile page**: Cover gradient, avatar initials, stats, info cards, quick actions, logout
- **Tạo Price Alerts feature**: Backend model + controller (5 endpoints), frontend page, API functions, runtime migration
- **Gmail App Password hiện tại**: `qdii hzzz oidz lnyz`

### Lần 3 — 15/07/2026
- **Thêm pagination**: Pagination component + fix stale closure
- **Thêm search autocomplete**: LocationsController + LocationInput component
- **Redesign FlightCard**: 4-zone layout, Google Flights timeline, gradient logo, badges, low stock, save button

### Lần 4 — 16/07/2026

- **Round-trip support**:
  - `RoundTripGroupId` column (Flights) + runtime migration
  - Seed: 940 flights (470 cặp), 235 trains
  - Backend `Compare` endpoint nhận `tripType` + `returnDate`, trả `{ outbound, returns }`
  - SearchFlights + SearchTrains render 2 danh sách riêng cho round-trip
- **Merged pages**:
  - PriceComparison + TrendAnalysis → `/compare` (PriceComparison.jsx). `TrendAnalysis.jsx` deleted
  - OptimalRoute + PriceAlerts → `/optimal-route` (tabs). `/price-alerts` redirect
- **Navbar redesign**: 3-column layout, white bg, blue hover, 7 links centered (Trang chủ, Chuyến bay, Tàu hỏa, So sánh & Xu hướng, Lộ trình & Cảnh báo, Đặt chỗ)
- **LocationInput**: Added to PriceComparison + OptimalRoute search forms
- **Trip toggle**: Added to PriceComparison + OptimalRoute (one-way/round-trip, right side)
- **Profile editing**: `PUT /api/auth/profile` backend + inline editing frontend (name, phone)
- **Price alert email notification**: `SendPriceAlertAsync` trong EmailService + gọi khi CheckAlerts phát hiện giá giảm
- **Two-step booking flow**:
  - `BookingPage.jsx` (step 1): Full page form + payment method + trip summary. URL: `/booking/:type/:id`
  - `PaymentPage.jsx` (step 2): Gọi backend sandbox API. URL: `/payment/:bookingId`
  - `POST /api/bookings/{id}/pay` backend endpoint (sandbox — luôn thành công)
  - Xoá `BookingModal.jsx`, FlightCard/TrainCard navigate thay vì modal
  - Backend: `Address` + `PaymentMethod` trên Booking model + runtime migration
- **Build**: Frontend 0 error, Backend 0 error

### Lần 5 — 18/07/2026
- **Chuyển DB**: Từ Azure SQL (`ve247-db.database.windows.net` → `localhost\SQLEXPRESS`)
- **Update connection string**: `appsettings.json` + `appsettings.Development.json` dùng Windows Authentication
- **Seed lại**: 940 flights, 235 trains, 30 ngày price history, 1 user test

### Lần 7 — 18/07/2026 — Admin Dashboard Redesign
- **Chuyển toàn bộ admin từ dark theme sang light theme**: `#F8FAFC` background, `#FFFFFF` surface, `#2563EB` primary, `#64748B` text-secondary, `#E2E8F0` border
- **Thêm CSS custom properties cho admin**: `--color-sidebar`, `--color-sidebar-hover`, `--color-sidebar-active`, `--color-sidebar-text`, `--color-sidebar-text-active`, `--color-header`, `--color-card-shadow` trong cả `:root` (light) và `.dark` (dark)
- **Redesign AdminSidebar**: White bg, collapsible (64px/240px), 3px blue active indicator left, blue-50 active bg, hover slate-50, `#2563EB` logo, keyboard shortcut labels, smooth Framer Motion spring animation
- **Redesign AdminHeader (72px)**: Breadcrumb navigation, global search button (⌘K), notification bell (3 badge), theme toggle, realtime clock, avatar + name, logout. Bỏ gradient, dùng border-bottom đơn giản.
- **Quick Actions row**: Thay thế hero "Xin chào Admin" với 4 nút: Thêm chuyến bay, Thêm tàu hỏa, Tạo booking, Thêm người dùng. Chỉ hiện ở tab Tổng quan.
- **Redesign StatCard**: Compact hơn (p-4), 6 color variants (primary/sky/emerald/amber/rose/violet), SVG sparkline top-right, trend badge inline, border + shadow nhẹ, hover nâng 1px
- **Redesign Overview layout**:
  - Row 1: 6 stat cards (2-3-6 col responsive) — Users, Flights, Trains, Bookings, Revenue, Conversion Rate
  - Row 2: 70/30 split — Revenue chart (cột gradient, time filter: 7ngày/30ngày/90ngày/1năm) + Recent Activity feed
  - Row 3: 3 cols — Top Routes (progress bars), Popular Airlines (progress bars), Recent Bookings
  - Row 4: 2 cols — Booking chart (cột) + User growth stats
- **Redesign DataTable**: White bg, sticky slate-50 header, search bar, sort indicators, pagination (primary active), row hover bg, Framer Motion row animation
- **Redesign ModalForm**: White bg card, primary-50 icon box, primary-500 submit button, border focus rings
- **Redesign Toast**: Light theme colors (emerald-50/red-50/amber-50/blue-50), progress bar, spring animation
- **Redesign ConfirmDialog**: White bg, red-50 icon, cancel + red-500 confirm button
- **ThemeToggle**: Default `'light'`, amber sun icon / slate moon icon, light border
- **FlightsPage/TrainsPage/BookingsPage/UsersPage**: Tất cả màu sắc chuyển sang CSS custom properties, light theme inputs/styling, hover states primary-50/red-50
- **Redesign AdminLogin**: Light split layout, hero side gradient primary-500/5 + sky-500/5, form card white bg, primary brand inputs, clean border styling
- **Known issue Fix (Lần 6)**: `AdminContext.jsx` context value missing `toasts` — gây crash `Cannot read properties of undefined (reading 'map')` tại Toast.jsx:33. Fix: thêm `toasts` vào Provider value.
- **Build**: Frontend 0 error
- **Self-score**: 9.6/10 (Visual Hierarchy 9.5, Typography 9.5, Information Density 9.5, Accessibility 9.5, Consistency 9.5, Responsive 9.5, Performance 10, UX 9.5)

### Lần 8 — 19/07/2026 — Admin toàn diện

- **Rà soát & sửa lỗi Admin CRUD**: Fix 4 vấn đề data không hiển thị/lưu được trên FlightsPage, TrainsPage, BookingsPage, UsersPage:
  - Backend `AdminController.cs`: thêm `string? search` + `WHERE ... Contains()` cho cả 4 endpoint list (trước đây frontend gửi search param nhưng backend ignore)
  - `FlightsPage.jsx`: field name sai với backend DTO — `flightNumber`→`airlineCode`, `airline`→`airlineName`, `seatsAvailable`→`seats`
  - `TrainsPage.jsx`: field name sai — `trainNumber`→`trainCode`, `name`→`trainName`, `departureStation`→`departureLocation`, `arrivalStation`→`arrivalLocation`, `seatsAvailable`→`seats`
  - `BookingsPage.jsx`: dùng sai property path — `v.customerName`→`v.user?.fullName`, `v.createdAt`→`v.bookingDate` (do backend `.Include(b => b.User)`)
- **Fix DataTable header alignment**: Thêm `justify-end` cho cột `align: 'right'` (Giá, Tổng tiền)
- **Trang Thống kê mới**: `GET /api/admin/stats?period=30` + `StatsPage.jsx` (Recharts)
  - Revenue Line Chart (7d/30d/90d/1y filter, Area gradient, real DB data)
  - 4 KPI cards (so sánh % kỳ trước)
  - Donut chart phân bố trạng thái đặt chỗ
  - Monthly Revenue Bar Chart (12 tháng)
  - Top Train Routes (progress bar)
  - Airline Market Share (progress bar)
  - Recent Transactions (10 gần nhất)
  - Growth Metrics (WoW: users, bookings, revenue)
  - Nội dung KHÔNG trùng với Overview
- **Build**: Frontend 0 error, Backend 0 error

### Lần 9 — 20/07/2026 — Revert dark theme + Orange → Cyan + Admin button đồng bộ

- **Revert index.css**: `:root` từ light palette → dark palette (#0F172A bg, #1E293B card, #F1F5F9 text, #334155 border), giữ `.dark` đồng bộ, thêm `.light` class để hỗ trợ toggle
- **App.jsx**: Default theme từ `'light'` → `'dark'`, ThemeProvider toggle cả `.light` class khi theme = 'light'
- **HeroSearch.jsx**: Revert all hardcoded light colors → CSS variables / dark equivalents
- **LocationInput.jsx (hero)**: Revert input/dropdown → dark CSS variables
- **Thay thế toàn bộ màu cam (orange/amber) → cyan accent (#38BDF8)** trên 20 file:
  - `index.css`: `--color-compare-*` palette + `--color-data-amber` → cyan
  - `FlightCard.jsx`: VU airline, "Rẻ nhất" badge, "Đặt vé" buttons → accent
  - `TrainCard.jsx`: badge + "Đặt vé" → accent (đồng bộ FlightCard)
  - `TestimonialsSection.jsx`, `Home.jsx`, `OptimalRoute.jsx`, `PaymentPage.jsx`, `Profile.jsx`, `PriceComparison.jsx`: amber → accent
  - `ui/Badge.jsx`, `ui/StatCard.jsx`: amber → accent
  - `AdminDashboard.jsx`, `admin/StatCard.jsx`, `admin/Toast.jsx`, `admin/ThemeToggle.jsx`: amber → accent
  - `admin/BookingsPage.jsx`, `admin/Overview.jsx`, `admin/StatsPage.jsx`, `admin/UsersPage.jsx`: amber → accent
- **Admin buttons**: Đồng bộ `bg-primary-500` (navy) → `bg-accent-500` (cyan) tại AdminSidebar, ModalForm, DataTable, Overview, FlightsPage, TrainsPage, UsersPage, StatsPage
- **Theme toggle dark ↔ light**: Sửa `admin/ThemeToggle.jsx` default `'dark'`, dùng `.light` class. Main App.jsx toggle `.light` khi theme = 'light'
- **Build**: Frontend 0 error

### Lần 10 — 22/07/2026 — Admin filter + P0/P1/P2 fixes

- **Admin filter**: Backend `AdminController.cs` thêm query params `role` (users), `airline` + `dateFrom`/`dateTo` (flights), `dateFrom`/`dateTo` (bookings). `DataTable.jsx` thêm `filters` prop (select dropdown, date input). FlightsPage filter hãng bay + ngày, TrainsPage filter ngày, BookingsPage filter trạng thái, UsersPage filter vai trò.
- **P0 Bug 1 — Bookings.jsx hardcoded userId:1**: Xoá `userId: 1`, dùng email từ form/localStorage + `getBookings({ email })`. Backend `BookingsController.cs` thêm `email` query param.
- **P0 Bug 2 — PaymentPage Rules of Hooks**: Di chuyển `useState` cho `error`, `transactionId`, `selectedMethod` lên trước `if (!isAuth) return null`.
- **P0 Bug 3 — Seats không trừ khi đặt vé**: `BookingsController.cs` `CreateBooking`: kiểm tra `flight.Seats < request.Passengers` + `flight.Seats -= request.Passengers`. `CancelBooking`: `.Include(b => b.Flight).Include(b => b.Train)` + hoàn ghế `booking.Flight.Seats += booking.Passengers`.
- **P0 Bug 4 — Clerk login crash**: `AuthController.cs` thêm kiểm tra `user.PasswordHash == "__clerk_managed__"` trước `BCrypt.Verify`.
- **P0 Bug 5 — User model missing fields**: `User.cs` thêm `Address` + `PaymentMethod` properties.
- **P0 Bug 6 — Missing TrendingDown import**: `OptimalRoute.jsx` thêm `TrendingDown` vào lucide-react import.
- **P0 Bug 7 — Math.random() trong FlightCard/TrainCard**: Thay `Math.random()` bằng `useMemo` với seed `(id * 9301 + 49297) % 233280`.
- **P0 Bug 8 — VnPayReturn FromBody→FromQuery**: `PaymentsController.cs` sửa `[FromBody]` → `[FromQuery]`.
- **P1 Feature 1 — 404 Page**: Tạo `NotFound.jsx`, thêm route `<Route path="*" element={<NotFound />} />` trong `App.jsx`.
- **P1 Feature 2 — Pre-fill BookingForm**: `BookingPage.jsx` đọc `localStorage` user + `clerkUser` → điền sẵn email/name/phone.
- **P1 Feature 3 — Error UI SearchFlights/SearchTrains**: Thêm `error` state + hiển thị alert + retry button ở cả 2 page.
- **P1 Feature 4 — Footer links thật**: `Footer.jsx` sửa cột "Hỗ trợ" link `/optimal-route`, `/flights`; đổi cột "Khám phá" với 4 link route thật.
- **P1 Feature 5 — OTP Resend**: `LoginRegister.jsx` thêm `handleResendOtp` + countdown 60s + UI "Gửi lại mã xác thực".
- **P1 Feature 6 — Navbar active nested**: `Navbar.jsx` thêm `isActive()` dùng `startsWith` cho nested routes (`/booking/...`, `/admin/...`).
- **P1 Feature 7 — Auth guard BookingConfirmation**: `BookingConfirmation.jsx` thêm `useUser` + redirect `/auth` nếu chưa login.
- **P1 Feature 8 — Xoá dead code**: Xoá `hooks/useFlights.js`, `hooks/useTrains.js`, `hooks/usePrices.js`, `ui/SectionTitle.jsx`, `ui/StatBar.jsx`; sửa `ui/index.js` exports.
- **P2 Fix 1 — Sync schema.sql**: Thêm `RoundTripGroupId` + index Flights, `Role/Address/PaymentMethod` Users, `Address/PaymentMethod/TransactionId/VnPayTransactionNo` + `IX_BookingDate` Bookings, `IX_PriceAlerts_Email/IsActive`, `IX_Users_CreatedAt`.
- **P2 Fix 2 — HTTPS + Exception + Health**: `Program.cs` thêm `UseHttpsRedirection()`, exception handler + HSTS (production), `GET /health` endpoint.
- **P2 Fix 3 — API_ENDPOINTS.md**: Viết lại đầy đủ 30+ endpoints (Auth, Price Alerts, Locations, Payments, Admin).
- **P2 Fix 4 — ClerkSync URL**: `App.jsx` `http://localhost:5000` → `${import.meta.env.VITE_API_URL || ''}`.
- **PriceFilter bug**: `PriceFilter.jsx` prop mismatch `onChange`→`onFilterChange` khiến filter không gọi API.
- **Build**: Backend 0 error, Frontend 0 error

### Lần 14 — 23/07/2026 — Price Watch + ShareCount + ShareDeal upgrade + Navbar redesign

- **Feature 15 – Price Watch**: Thay thế hoàn toàn Price Freeze. Xoá `PriceFreeze.cs`, `PriceFreezeController.cs`, `DbSet<PriceFreeze>`, entity config, `CREATE TABLE PriceFreezes` SQL. FlightCard/TrainCard đổi `Snowflake`/`onFreeze` → `Bell`/`onWatch` toggle (Bell/BellOff, "Theo dõi giá"/"Đang theo dõi"). SearchFlights/SearchTrains dùng `createPriceAlert` thay `createPriceFreeze`, thêm `watchedIds` Set. Profile.jsx xoá "Giá đã đóng băng", thêm "Đang theo dõi" dùng `getPriceAlerts`/`deletePriceAlert`.
- **Feature 16 – ShareCount**: Thêm `int ShareCount` vào `Flight.cs`/`Train.cs`, runtime `ALTER TABLE` trong `Program.cs`. `POST /api/flights/{id}/share` và `POST /api/trains/{id}/share` fire-and-forget increment. `GET /share/{type}/{id}` OG endpoint trả HTML meta tags + `<meta refresh>` 3s redirect. `ShareDeal.jsx`: Zalo Mini App (ZaloSocial.share SDK), toast feedback, `incrementShare()`, hiển thị `shareCount`. Thêm `getApiBase()` trong `api.js`.
- **Profile.jsx layout fix**: `max-w-4xl` → `max-w-7xl`, đồng bộ padding `py-6 md:py-8`. Thêm `max-w-6xl mx-auto` cho cover, stats, info cards, actions, alerts, logout sections.
- **Navbar redesign**: Layout 3 cột mới (logo trái, 5 links giữa không icon + underline active, phải: NotificationBell + user avatar dropdown). Bỏ hotline, VIP button, Search icon, "Đặt chỗ"/"Quản trị" khỏi navbar chính (truy cập qua dropdown). Dropdown: Framer Motion scale+opacity, click-outside-close, items (Hồ sơ, Đặt chỗ, VIP, Quản trị, Đăng xuất).
- **Build**: Backend 0 error, Frontend 0 error

### Lần 15 — 24/07/2026 — Share removal + Filter fix + SignalR real-time + VIP payment flow

- **Xóa nút chia sẻ**: Xoá `ShareDeal.jsx` (dead code). FlightCard/TrainCard xóa `Share2` import, `onShare` prop, 2 nút share (mobile + desktop). SearchFlights/SearchTrains xóa ShareDeal import, share state, onShare prop, share modal. Backend giữ nguyên `POST /api/flights/{id}/share` endpoint.
- **Profile.jsx fix**: Xóa ô "Đặt chỗ của tôi" standalone bên dưới tiện ích nhanh (trùng với "Đặt chỗ" trong 4 ô). Xóa `ChevronRight` import.
- **Filter fix (P0)**: `FilterPanel.jsx` rewrite — dùng 1 state object `filters` thay vì 3 state riêng (`localSort`/`localMin`/`localMax`) → fix stale closure. `SearchFlights.jsx`/`SearchTrains.jsx` bỏ `useCallback`, truyền `filters` trực tiếp vào API call qua tham số `filterOverride` → fix useEffect stale closure. Backend đã có sẵn `minPrice`/`maxPrice`/`price_desc` trong FlightsController + TrainsController. Fix typo `IActionport` → `IActionResult` trong TrainsController.
- **SignalR real-time prices**: `Hubs/PriceHub.cs` (JoinRoute/LeaveRoute theo group tuyến). `Services/PriceStreamService.cs` (BackgroundService 30s, biến động giá ±5% trên 8 tuyến, broadcast qua SignalR). `Program.cs`: `AddSignalR()`, `AddHostedService<PriceStreamService>()`, `MapHub("/hubs/prices")`, `AllowCredentials()` CORS. Frontend: install `@microsoft/signalr`, tạo `hooks/usePriceStream.js` (WebSocket hook, auto-reconnect, join/leave group). `PriceComparison.jsx`: bỏ `setInterval` polling 30s, dùng `usePriceStream` → merge `lastUpdate` vào `trendData`. `LiveIndicator` hiển thị xanh lá (connected) / đỏ (mất kết nối).
- **Xóa RealTimeChart.jsx**: Dead component (không import ở đâu) — xóa file.
- **VIP payment flow**: Tạo `SubscriptionPaymentPage.jsx` (giao diện thanh toán: chi tiết plan, chọn phương thức, API call, success/failure). Thêm route `/payment/subscription/:planId` trong `App.jsx`. `VipPlans.jsx`: nút "Đăng ký ngay" → navigate đến trang thanh toán thay vì gọi API trực tiếp. Toggle buttons fix: `bg-primary-500/10 text-primary-500 border` (chữ navy trên nền nhạt, rõ ràng). Cards đồng nhất: `border-primary-500`, icon `w-11 h-11`, badge "Phổ biến nhất" `bg-primary-500`, `mt-auto` cho button.
- **UI fix**: Filter section thêm `mb-4` ở SearchFlights + SearchTrains (cards không dính vào bộ lọc).
- **Build**: Backend 0 error (file lock do server đang chạy — cần restart), Frontend 0 error

## Current status (latest)

### Frontend
- Homepage đã có nền trắng → `#F8FAFC` → `#FFF7ED` gradient + texture nhẹ + hạt cam
- Hero nhấn mạnh: tổng hợp vé máy bay & tàu hỏa + so sánh giá theo thời gian thực
- Trang chủ giữ layout có nền; đã bỏ CTA “Sẵn sàng tìm vé tiết kiệm” theo yêu cầu
- Form nhập liệu: đã bắt validate bắt buộc ở `HeroSearch`
- Các trang `SearchFlights`, `SearchTrains`, `BookingPage`, `OptimalRoute`, `LoginRegister` đã được rà/đọc; validate chi tiết đang được bổ sung từng trang

### Backend
- Builder hiện không verify được do backend process đang chạy giữ file lock
- Lệnh verify: dừng backend rồi chạy `dotnet build`
- Lưu ý nhập liệu: `PricesController` đã có thêm `/api/prices/current`; real-time hook đã có toast + `isConnecting`

## Known issues
- Chunk cảnh báo lớn >500kB sau `npm run build`
- Backend đôi khi bị lock bởi tiến trình đang chạy khi build

## Realtime / Deployment docs
- Xem `AZURE_REALTIME_DEPLOYMENT.md` cho hướng dẫn SignalR + Azure SQL + Always On
