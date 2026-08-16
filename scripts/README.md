# Chạy Backend không bị văng — hướng dẫn

Dự án có 3 script trong `scripts/` giúp chạy backend **dứt điểm, không còn lỗi**
"Hosting failed to start" / "address already in use" / "file is being used".

## Nguyên nhân các lần bị văng/fail

| Triệu chứng | Nguyên nhân |
|---|---|
| `Hosting failed to start` / `address already in use` | Đã có **instance khác** đang chiếm port 5000 (chạy `dotnet run` lần 2, hoặc instance nền từ lần trước) |
| Build lỗi "file is being used by another process" | Exe đang bị **tiến trình đang chạy** khóa → không ghi đè được |
| Server chết khi đóng terminal / Ctrl+C / máy ngủ | `dotnet run` chạy **tiền cảnh** — đóng terminal là tắt server |

## Cách dùng

### 1. Chạy nền (khuyên dùng hàng ngày) — server sống sót khi đóng terminal

```bat
scripts\start-backend.bat
```

- Tự dừng instance cũ đang chiếm port 5000 (không cần tự tìm PID).
- Build **Release** rồi chạy exe **ẩn nền** → đóng terminal, khởi động lại máy vẫn còn chạy.
- Kiểm tra: mở `http://localhost:5000/health` → `{"status":"healthy"}`.

Dừng server:

```bat
scripts\stop-backend.bat
```

### 2. Chạy tiền cảnh (muốn xem log trực tiếp, kiểu dev)

```bat
scripts\run-backend.bat
```

- Cũng tự dừng instance cũ chiếm port 5000 trước khi chạy.
- Log hiện ngay trên terminal; tắt terminal = tắt server (bình thường).

### 3. Thủ công (không dùng script)

```bash
netstat -ano | grep ":5000" | grep LISTENING   # tìm PID đang chiếm
taskkill //PID <PID> //F                        # dừng nó trước
dotnet run --project backend/FlightAggregatorApi
```

## Lưu ý

- **Seed mất 30–60 giây** trước khi `Now listening on: http://localhost:5000` — đừng tưởng treo.
- Tuyệt đối **không chạy 2 cách cùng lúc** (VD: `run-backend.bat` + `start-backend.bat`) — vẫn là 2 instance chiếm cùng port.
- Muốn đổi port: sửa `backend/FlightAggregatorApi/Properties/launchSettings.json` (applicationUrl) + `frontend/.env` (`VITE_API_URL`) + CORS trong `appsettings.json`.
