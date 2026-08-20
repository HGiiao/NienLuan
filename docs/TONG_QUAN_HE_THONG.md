# 🏗️ TỔNG QUAN HỆ THỐNG VÉ247

> Tài liệu giải thích toàn bộ dự án: hệ thống được tạo ra như thế nào, chạy ra sao, và vì sao chọn từng công nghệ.
> Đọc từ từ theo thứ tự các mục bên dưới.

---

## Mục lục

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Frontend — React (Vercel)](#2-frontend--react-vercel)
3. [Backend — ASP.NET Core (Azure)](#3-backend--aspnet-core-azure)
4. [Database — Azure SQL](#4-database--azure-sql)
5. [Luồng hoạt động từ đầu đến cuối](#5-luồng-hoạt-động-từ-đầu-đến-cuối)
6. [Thanh toán — vì sao nhiều cổng](#6-thanh-toán--vì-sao-nhiều-cổng)
7. [Cách chạy và sử dụng](#7-cách-chạy-và-sử-dụng)
8. [Vì sao chọn bộ công nghệ này](#8-vì-sao-chọn-bộ-công-nghệ-này)
9. [Sự cố thường gặp](#9-sự-cố-thường-gặp)

---

## 1. Tổng quan dự án

**Vé247** là một website đặt vé đa phương tiện (dạng thu gọn của Agoda/Traveloka):

- Tìm và đặt **vé máy bay, tàu hỏa, xe khách**
- **So sánh giá** giữa các hãng, **dự đoán giá** theo thời điểm
- Gợi ý **lộ trình kết hợp nhiều phương tiện** (bay + tàu + xe)
- **Thanh toán online** (VNPay, MoMo, ZaloPay, PayOS, VietQR)
- Tính năng phụ: chat bot, vòng quay may mắn, gói VIP, bảo hiểm, mã giảm giá, đánh giá, cảnh báo giá, trang admin...

### Kiến trúc 3 phần độc lập

```
┌─────────────────────┐        ┌──────────────────────┐        ┌──────────────────┐
│  FRONTEND (Vercel)  │  HTTPS │  BACKEND (Azure)     │  SQL   │  DATABASE        │
│  React + Vite       │ ─────► │  ASP.NET Core 10     │ ─────► │  Azure SQL       │
│  ve247-booking.     │ axios  │  ve247-api.          │ EF Core│  FlightAggregatorDb│
│  vercel.app         │ SignalR│  azurewebsites.net   │        │  (chứa mọi dữ liệu)│
└─────────────────────┘        └──────────────────────┘        └──────────────────┘
```

> ⚠️ **Quan trọng nhất:** Vercel chỉ chứa *giao diện tĩnh* (HTML/JS/CSS).
> **Mọi dữ liệu đều nằm ở backend + database.**
> Nếu backend chết (hoặc bị xóa), trang sẽ trống trơn — đúng như sự cố
> "không có dữ liệu" từng xảy ra trên `ve247-booking.vercel.app`.

---

## 2. Frontend — React (Vercel)

### Công nghệ

**React 19 + Vite 8 + Tailwind CSS 4 + React Router 7**, deploy lên **Vercel** (hosting tĩnh).

### Các thư viện chính và vai trò

| Thư viện | Vai trò | Vì sao chọn |
|---|---|---|
| **React + Vite** | Xây SPA (Single Page App) | Vite build ra file tĩnh rất nhanh, deploy miễn phí trên Vercel; React phổ biến, dễ học/sửa |
| **React Router** | Điều hướng ~25 trang | `/flights`, `/booking/:type/:id`, `/payment/:id`, `/admin`... |
| **Tailwind CSS** | Giao diện | Viết style ngay trong JSX, nhanh, không cần file CSS riêng |
| **Axios** | Gọi API backend | Tự động JSON, dễ thêm interceptor (log lỗi tập trung) |
| **Clerk** | Đăng nhập (Google/Facebook/email) | Không phải tự xây auth, có sẵn OAuth + SSO chuẩn |
| **@microsoft/signalr** | Nhận **giá vé realtime** | WebSocket đẩy giá từ server về trình duyệt tức thì |
| **Recharts** | Biểu đồ lịch sử giá | Vẽ đồ thị giá theo ngày |
| **Three.js** | Intro 3D đầu trang | Hiệu ứng mở app cho ấn tượng |

### Luồng dữ liệu của frontend

Tất cả lời gọi API đi qua **một file trung tâm**: `frontend/src/services/api.js`
(baseURL = biến môi trường `VITE_API_URL`).

- **Local (dev):** `frontend/.env` đặt `VITE_API_URL=http://localhost:5000`, đồng thời
  `vite.config.js` có proxy `/api` → `localhost:5000`, nên dev chỉ cần chạy backend.
- **Production:** Vercel build với `VITE_API_URL=https://ve247-api.azurewebsites.net`
  → trình duyệt người dùng gọi thẳng Azure.
- ⚠️ **Cạm bẫy:** nếu không có `VITE_API_URL`, axios gọi `/api/*` trên chính domain
  Vercel. Mà `vercel.json` rewrite **mọi route về `index.html`** → server trả HTML
  thay vì JSON → frontend parse lỗi → **không có dữ liệu**.

---

## 3. Backend — ASP.NET Core (Azure)

### Công nghệ

**ASP.NET Core 10 Web API + Entity Framework Core 10 + SignalR**, deploy lên
**Azure App Service** (Windows, plan B1, Always On = true).

### Cấu trúc chuẩn MVC

```
backend/FlightAggregatorApi/
├── Controllers/    ← 19 controller: mỗi cái = một nhóm API
├── Services/       ← 19 service: logic nghiệp vụ
├── Models/         ← ~20 class entity (Booking, Flight, User...)
├── Data/           ← ApplicationDbContext (EF Core)
├── Hubs/           ← PriceHub (SignalR realtime giá)
└── Program.cs      ← điểm khởi động: CORS, DI, tự tạo DB + seed
```

### 19 Controllers — nhóm API

| Controller | Chức năng |
|---|---|
| `FlightsController`, `TrainsController`, `BusesController` | Tìm kiếm theo tuyến/ngày, phân trang |
| `PricesController` | So sánh giá, lịch sử giá, dự đoán giá, lộ trình tối ưu, carbon footprint |
| `BookingsController` | Đặt vé (nhiều hành khách, nhiều chặng), hủy, hoàn tiền |
| `PaymentsController` | Nhận kết quả thanh toán từ VNPay/MoMo/ZaloPay/PayOS |
| `AuthController` | Đăng ký/đăng nhập + `clerk-sync` (đồng bộ user Clerk vào DB) |
| `AdminController` | Dashboard, quản lý user/booking/chuyến bay, import/export |
| `ChatController` | Chat bot gợi ý phương tiện (rule-based) |
| + `Reviews`, `PromoCodes`, `LuckyWheel`, `Notifications`, `Insurance`, `Subscription`, `PriceAlert`, `CommunityTips`, `Locations`, `VietQr` | Các tính năng phụ |

### 19 Services — logic nghiệp vụ

| Service | Chức năng |
|---|---|
| `SeedDataService` (905 dòng) | **Sinh dữ liệu giả**: ~600 chuyến bay/ngày theo công thức giá thực tế |
| `DatabaseInitializerService` | Tự tạo bảng + seed khi app khởi động (idempotent) |
| `PriceStreamService` | Chạy nền, mỗi 30s "đẩy" giá mới qua SignalR (mô phỏng giá biến động) |
| `PricePredictionService` | Dự đoán giá theo lịch sử + PriceConfigs theo tháng |
| `RouteOptimizerService` | Tối ưu lộ trình kết hợp 3 phương tiện |
| `FarePolicy` | Quy tắc hoàn/hủy vé theo thời điểm |
| `VnPayService`, `MoMoService`, `ZaloPayService`, `PayOSService`, `VietQrService` | Tích hợp từng cổng thanh toán |
| `EmailService` | Gửi email xác thực + thông báo giá (SMTP Gmail) |
| `ChatBotService` | Trợ lý gợi ý phương tiện |
| + `PriceAlertService`, `PriceHistoryService`, `CarbonFootprintService`, `PlanResolver`... | Các logic còn lại |

### Điểm mấu chốt — app tự dựng database

Trong `Program.cs`, khi app khởi động:

1. Mở kết nối tới `AzureSqlDb` (connection string từ app settings).
2. `DatabaseInitializerService` chạy SQL raw: `IF OBJECT_ID('Flights','U') IS NULL CREATE TABLE...`
   — **chỉ tạo bảng nếu chưa tồn tại** (idempotent, không xóa dữ liệu cũ).
3. Nếu bảng `Flights` rỗng → gọi `SeedDataService` sinh dữ liệu:
   - ~600 chuyến bay + tàu + xe cho **30 ngày tới**
   - Giá mô phỏng theo giá thực tế 2026: HAN→SGN VietJet ~506–868k,
     Vietnam Airlines ~1.04–1.5M, có hệ số theo hãng/tháng/cuối tuần
4. Seed luôn các tài khoản demo + mã giảm giá + gói bảo hiểm/VIP + PriceConfigs 12 tháng.

### Điểm mấu chốt 2 — realtime giá bằng SignalR

- Backend khai báo `PriceHub` tại đường dẫn `/hubs/prices`.
- `PriceStreamService` (hosted service) chạy nền, cứ ~30s cập nhật giá và broadcast.
- Frontend (`hooks/usePriceStream.js`):
  - Kết nối WebSocket tới `/hubs/prices`
  - Gọi `JoinRoute(from, to)` để chỉ nhận giá của tuyến đang xem
  - Nếu mất kết nối → **tự chuyển sang polling** mỗi 30s (dự phòng), rồi tự reconnect.

---

## 4. Database — Azure SQL

### Công nghệ

**SQL Server trên Azure**: `ve247-serverless-nguyen2.database.windows.net`,
database `FlightAggregatorDb`.

| Lý do | Giải thích |
|---|---|
| **SQL Server + EF Core** | Cùng "gia đình" Microsoft với ASP.NET → tích hợp 1 đường, LINQ query mạnh |
| **Quan hệ + Transaction** | Đặt vé ghi nhiều bảng cùng lúc (Booking + Passengers + Segments + Insurance) → phải atomic |
| **Azure SQL** | Sinh viên có credit miễn phí, không phải tự cài đặt, tự backup, có firewall |

### Các bảng chính (~20 bảng)

**Danh mục vé**
- `Flights`, `Trains`, `Buses` — có index theo (tuyến, ngày) và (giá) → tìm kiếm nhanh

**Tài khoản**
- `Users` (mật khẩu hash bằng BCrypt), `Notifications`

**Đặt vé**
- `Bookings` + `BookingPassengers` + `BookingSegments` + `BookingInsurances`
  (khóa ngoại cascade: xóa booking → xóa luôn dữ liệu con)

**Tính năng phụ**
- `PriceAlerts`, `PriceHistory`, `PriceConfigs`, `PromoCodes`, `Reviews`,
  `CommunityTips`, `LuckyWheelSpins`, `SubscriptionPlans`, `UserSubscriptions`,
  `InsurancePackages`, `Locations`

---

## 5. Luồng hoạt động từ đầu đến cuối

```
1. User mở ve247-booking.vercel.app
        │
2. React render trang Home → gọi GET /api/flights?from=HAN&to=SGN
        │ (axios → https://ve247-api.azurewebsites.net)
3. Backend nhận request → FlightsController → EF Core query SQL Server
        │
4. SQL trả về danh sách chuyến bay → backend serialize JSON (DateTime chuẩn UTC)
        │
5. Frontend render danh sách + biểu đồ giá
        │
6. User chọn chuyến → vào /booking/:type/:id → điền hành khách
        │ → POST /api/bookings  (backend tính giá + giảm giá + bảo hiểm)
        │
7. Chọn thanh toán (VNPay/MoMo/ZaloPay/PayOS/VietQR)
        │ → backend tạo link thanh toán sandbox → redirect sang cổng thanh toán
        │
8. Cổng thanh toán gọi lại backend (IPN/webhook) xác nhận tiền
        │ → Booking chuyển trạng thái "Confirmed" → user quay lại trang xác nhận
        │
9. Trong lúc đó: SignalR /hubs/prices đẩy giá mới mỗi 30s
   nếu user đang xem trang so sánh giá (mô phỏng giá "sống")
```

---

## 6. Thanh toán — vì sao nhiều cổng

Đây là đề tài học thuật nên nhóm tích hợp **đủ cổng thanh toán Việt Nam**
(đều dùng **sandbox/test**, không thu tiền thật):

| Cổng | Cách hoạt động | Trạng thái |
|---|---|---|
| **VNPay** | Tạo link `sandbox.vnpayment.vn` → user thanh toán → VNPay gọi IPN + redirect return | ✅ Có cấu hình |
| **MoMo** | Test gateway `test-payment.momo.vn` | ⚠️ Chưa có key |
| **ZaloPay** | `sb-openapi.zalopay.vn` | ⚠️ Chưa có key |
| **PayOS** | `api-merchant.payos.vn` — trả mã QR qua VietQR | ✅ Có key thật |
| **VietQR** | Sinh mã QR chuyển khoản ngân hàng | ⚠️ Chưa có key |

---

## 7. Cách chạy và sử dụng

### Chạy local (dev)

```bash
# Bước 1 — Backend, port 5000 (seed mất 30–60s lần đầu)
scripts\start-backend.bat        # chạy nền, không chết khi đóng terminal
# (hoặc scripts\run-backend.bat để xem log trực tiếp)

# Bước 2 — Frontend, port 5173 (proxy /api tự chuyển sang localhost:5000)
cd frontend
npm install
npm run dev
```

Mở `http://localhost:5173` → dữ liệu lấy từ backend local + SQL Azure
(cùng 1 database với production).

### Deploy production

**Backend → Azure:**
```bash
cd backend/FlightAggregatorApi
dotnet publish -c Release -o ./publish
cd publish && zip -r ../publish.zip .
az webapp deploy --name ve247-api --resource-group rg-ve247 --src-path ../publish.zip --type zip
```
- App settings bắt buộc: `ConnectionStrings:AzureSqlDb`, `Cors:AllowedOrigins`
- Bật **Always On = true** để background service (giá realtime) không bị ngủ

**Frontend → Vercel:**
- GitHub push → Vercel tự build (có `vercel.json` rewrite về `index.html`)
- Bắt buộc đặt env trong Vercel project settings:
  - `VITE_API_URL` = URL backend (ví dụ `https://ve247-api.azurewebsites.net`)
  - `VITE_CLERK_PUBLISHABLE_KEY` = key Clerk

### Tài khoản demo (đã seed sẵn trong DB)

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Admin | `admin@ve247.vn` | `Admin123` |
| User | `user@example.com` | `123456` |

---

## 8. Vì sao chọn bộ công nghệ này

1. **React + Vercel** → giao diện đẹp, phát triển nhanh, hosting tĩnh miễn phí,
   CI/CD tự động từ GitHub.
2. **ASP.NET Core + EF Core + SQL Server** → bộ 3 của Microsoft khớp nhau hoàn hảo,
   xử lý transaction đặt vé an toàn, kiến trúc rõ ràng dễ chấm điểm.
3. **Azure** → tài khoản sinh viên có credit miễn phí, đủ chạy SQL + App Service.
4. **SignalR** → điểm "wow" realtime giá vé mà REST thuần không làm được.
5. **Clerk** → không tốn công xây auth, có sẵn Google/Facebook/email.
6. **Các cổng thanh toán VN** → đúng bối cảnh thực tế thị trường Việt Nam,
   đủ sandbox để demo.

---

## 9. Sự cố thường gặp

### "Trang không có dữ liệu" (đã từng xảy ra)

**Triệu chứng:** mở `ve247-booking.vercel.app` thấy trang trống, không có chuyến bay nào.

**Nguyên nhân:** Backend `ve247-api.azurewebsites.net` bị xóa/không tồn tại
(DNS không resolve). Frontend gọi API → lỗi network → không có dữ liệu.

**Kiểm tra nhanh:**
```bash
curl https://ve247-api.azurewebsites.net/health
# mong đợi: {"status":"healthy",...}
```

**Cách xử lý:** deploy lại backend lên Azure (xem mục 7), giữ nguyên tên webapp
để URL không đổi.

### "Gọi API trả về HTML thay vì JSON"

**Nguyên nhân:** thiếu `VITE_API_URL` khi build → axios gọi `/api/*` trên domain
Vercel → `vercel.json` rewrite về `index.html`.

**Cách xử lý:** đặt `VITE_API_URL` trong Vercel project settings rồi redeploy.

### Backend bị "ngủ" / giá không realtime

**Nguyên nhân:** plan App Service không bật Always On (plan Free bị tắt sau ~20 phút).

**Cách xử lý:** dùng plan B1 trở lên + `az webapp config set --always-on true`.

### CORS bị chặn: "No 'Access-Control-Allow-Origin' header"

**Triệu chứng:** trình duyệt gọi API từ `ve247-booking.vercel.app` bị chặn CORS dù đã set
app setting `Cors:AllowedOrigins` đúng domain.

**Nguyên nhân:** `builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()`
trả về **NULL** khi value là chuỗi JSON array → code rơi vào fallback
`["http://localhost:5173"]` → origin Vercel không được phép.

**Cách xử lý (đã sửa trong `Program.cs`):** dùng hàm `GetCorsOrigins()` tự parse value —
hỗ trợ cả 2 định dạng:
- JSON array string: `["http://localhost:5173","https://ve247-booking.vercel.app"]`
- Comma-separated: `http://localhost:5173,https://ve247-booking.vercel.app`

**Kiểm tra nhanh:**
```bash
curl -s -D - -o /dev/null https://ve247-api.azurewebsites.net/api/flights \
  -H "Origin: https://ve247-booking.vercel.app" | grep -i access-control
# mong đợi: Access-Control-Allow-Origin: https://ve247-booking.vercel.app
```

---

*Tài liệu được tạo để tham khảo nội bộ dự án Vé247.*
