@echo off
REM ============================================================
REM  Ve247 - Stop backend (dung server dang chay nen)
REM ============================================================
setlocal
echo Dang tim server Ve247 tren port 5000...
powershell -NoProfile -Command ^
  "$c = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue; ^
   if ($c) { $c | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; ^
     Write-Host ('Da dung server (PID ' + ($c.OwningProcess -join ', ') + ')') } ^
   else { Write-Host 'Khong co server nao dang chay tren port 5000' }"
endlocal
