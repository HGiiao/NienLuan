@echo off
REM ============================================================
REM  Ve247 - Start backend in BACKGROUND (chay nen, khong tat theo terminal)
REM  - Dung instance cu dang chiem port 5000
REM  - Build bang dotnet build (truoc khi chay, exe khong bi lock)
REM  - Chay exe detached: dong terminal / khoi dong lai may van con chay
REM ============================================================
setlocal
cd /d "%~dp0\..\backend\FlightAggregatorApi"

echo [1/4] Kiem tra port 5000...
powershell -NoProfile -Command ^
  "$c = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue; ^
   if ($c) { $c | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; ^
     Write-Host ('  -> Da dung instance cu (PID ' + ($c.OwningProcess -join ', ') + ')') } ^
   else { Write-Host '  -> Port 5000 trong' }"
timeout /t 2 /nobreak >nul

echo [2/4] Build (Release)...
dotnet build -c Release
if errorlevel 1 (
  echo BUILD LOI. Kiem tra loi o tren roi chay lai.
  exit /b 1
)

echo [3/4] Chay server nen...
set "EXE_DIR=%~dp0..\backend\FlightAggregatorApi\bin\Release\net10.0"
powershell -NoProfile -Command ^
  "Start-Process -FilePath '%EXE_DIR%\FlightAggregatorApi.exe' -WorkingDirectory '%EXE_DIR%' -WindowStyle Hidden"

echo [4/4] Server dang khoi dong nen (seed ~30-60s)...
echo       Kiem tra: http://localhost:5000/health
echo       Dung server:  scripts\stop-backend.bat
endlocal
