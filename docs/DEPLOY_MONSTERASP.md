# Chuyển đổi sang MonsterASP.NET (phương án dự phòng khi hết credit Azure)

> **Nguyên tắc:** KHÔNG sửa code. Cùng một bản build (`dotnet publish`) chạy được trên cả Azure
> lẫn MonsterASP. Mọi giá trị khác biệt giữa hai môi trường xử lý bằng **Environment Variables**
> đặt trong Control Panel của MonsterASP. Database tự tạo schema + seed dữ liệu khi app khởi động
> lần đầu (`DatabaseInitializerService`).

## Thông tin hosting đã đăng ký

| Mục | Giá trị |
|---|---|
| FTP / SFTP | `site86569.siteasp.net` — port `21` (FTP) / `22` (SFTP) |
| Login FTP | `site86569` |
| Thư mục web | `/wwwroot` |
| WebFTP | https://webftp.monsterasp.net |
| MSSQL Server | `db64717.databaseasp.net:1433` (chỉ kết nối được từ trong mạng MonsterASP) |
| WebMSSQL | https://webmssql.monsterasp.net |
| URL website | `https://site86569.siteasp.net` (kiểm tra lại trong panel) |

## Các bước chuyển đổi khi hết tiền Azure

### Bước 0 — Kích hoạt SSL (bắt buộc)

Control Panel → chọn website → **HTTPS / Let's Encrypt** → Enable.
Không có HTTPS thì frontend (chạy trên Vercel, HTTPS) sẽ bị chặn gọi API và SignalR không kết nối được.

### Bước 1 — Publish backend

```powershell
cd backend/FlightAggregatorApi
dotnet publish -c Release -o ./publish
```

Hoặc chạy sẵn script: `tools/deploy-monsterasp.ps1` (publish + upload qua SFTP).

### Bước 2 — Upload lên host

- **Cách A (script):** `./tools/deploy-monsterasp.ps1 -Upload` — nhập mật khẩu SFTP khi được hỏi.
- **Cách B (thủ công):** mở https://webftp.monsterasp.net , kéo-thả toàn bộ **nội dung** thư mục
  `publish` vào `/wwwroot`.

> Nếu sau này update code mà gặp lỗi lạ: xoá sạch `/wwwroot` rồi upload lại từ đầu.

### Bước 3 — Đặt Environment Variables trong Control Panel

Control Panel → website → mục Environment Variables, thêm:

| Biến | Giá trị |
|---|---|
| `ConnectionStrings__AzureSqlDb` | `Server=db64717.databaseasp.net;Database=db64717;User Id=db64717;Password=<mật-khẩu-DB>;Encrypt=False;MultipleActiveResultSets=True;` |
| `VnPay__ReturnUrl` | `https://ve247-booking.vercel.app/payment/vnpay-return` |
| `VnPay__IpnUrl` | `https://site86569.siteasp.net/api/payments/vnpay-ipn` |
| `MoMo__RedirectUrl` | `https://ve247-booking.vercel.app/payment/momo-return` |
| `MoMo__IpnUrl` | `https://site86569.siteasp.net/api/payments/momo-ipn` |
| `ZaloPay__RedirectUrl` | `https://ve247-booking.vercel.app/payment/zalopay-return` |
| `ZaloPay__CallbackUrl` | `https://site86569.siteasp.net/api/payments/zalopay-ipn` |
| `PayOS__ReturnUrl` | `https://ve247-booking.vercel.app/payment/payos-return` |
| `PayOS__WebhookUrl` | `https://site86569.siteasp.net/api/payments/payos-ipn` |

CORS giữ nguyên — mặc định trong `appsettings.json` đã cho phép `localhost:5173` và
`ve247-booking.vercel.app`.

### Bước 4 — Kiểm tra backend

1. Mở `https://site86569.siteasp.net/health` → phải trả `{"status":"healthy",...}`.
2. Request đầu tiên sẽ chậm hơn thường lệ (tạo schema + seed toàn bộ dữ liệu demo) — đợi 30–60s.
3. Đăng nhập thử tài khoản seed: `admin@ve247.vn` / `Admin123`.
4. Kiểm tra SignalR realtime giá: mở trang tìm kiếm vé, xem bảng giá có nhảy số không
   (nếu free tier không hỗ trợ WebSocket thì tính năng này im lặng, phần còn lại vẫn chạy bình thường).

### Bước 5 — Trỏ frontend sang backend mới

Vercel → project `ve247-booking` → Settings → Environment Variables:

```
VITE_API_URL = https://site86569.siteasp.net
```

→ **Redeploy** frontend. Xong.

## Chuyển dữ liệu cũ từ Azure (tuỳ chọn)

Dữ liệu (users, bookings, reviews...) **không tự chuyển** sang DB mới. Hai lựa chọn:

1. **Bắt đầu sạch** — DB mới sẽ được seed dữ liệu demo đầy đủ, phù hợp demo đồ án.
2. **Giữ nguyên dữ liệu** — backup `.bak` từ Azure SQL, restore theo hướng dẫn
   [Restore database](https://help.monsterasp.net/books/databases/page/restore-database)
   của MonsterASP (cần bật Remote Access cho DB trong panel trước).

## Lưu ý bảo mật

- Không bao giờ commit mật khẩu DB / FTP vào repo.
- Sau khi chuyển xong và ổn định: rotate các secret đang nằm trong git history
  (SMTP app password, VNPay HashSecret, PayOS keys, mật khẩu Azure SQL cũ).
