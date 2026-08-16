@echo off
REM ============================================================
REM  Ve247 - Run backend (foreground, for development)
REM  Tự động dừng instance cũ đang chiếm port 5000
REM  trước khi chạy, tránh lỗi "Hosting failed to start"
REM ============================================================
setlocal
cd /d "%~dp0\.."

echo [1/3] Kiem tra port 5000...
powershell -NoProfile -Command ^
  "$c = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue; ^
   if ($c) { $c | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; ^
     Write-Host ('  -> Da dung instance cu (PID ' + ($c.OwningProcess -join ', ') + ') dang chiem port 5000') } ^
   else { Write-Host '  -> Port 5000 trong, khong can dung gi' }"
timeout /t 2 /nobreak >nul

echo [2/3] Build + chay server...
echo       (Seed mat ~30-60s, cho dong "Now listening on: http://localhost:5000")
dotnet run --project backend\FlightAggregatorApi

echo [3/3] Server da dung.
endlocal
