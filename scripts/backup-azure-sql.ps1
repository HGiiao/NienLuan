# ============================================================================
# Vé247 — Backup Azure SQL (Serverless) sang .bacpac + Import vào local SQL Express
#
# Dùng để phòng khi hết $ Azure: dữ liệu vẫn được quản lý ở máy local qua SSMS.
#
# Cách dùng:
#   .\scripts\backup-azure-sql.ps1                 # export + import (mặc định)
#   .\scripts\backup-azure-sql.ps1 -ExportOnly     # chỉ export .bacpac
#   .\scripts\backup-azure-sql.ps1 -ImportOnly     # chỉ import .bacpac (đã có file)
#   .\scripts\backup-azure-sql.ps1 -BackupDir D:\backup
# ============================================================================

param(
    [string]$AzureServer = "ve247-serverless-nguyen2.database.windows.net",
    [string]$AzureDb = "FlightAggregatorDb",
    [string]$AzureUser = "sqladmin",
    [string]$AzurePassword = "Nghgiao05@",
    [string]$LocalServer = "localhost\SQLEXPRESS",
    [string]$LocalDb = "FlightAggregatorDb",
    [string]$BackupDir = "",
    [switch]$ExportOnly,
    [switch]$ImportOnly
)

$ErrorActionPreference = "Stop"

if (-not $BackupDir) { $BackupDir = Join-Path $PSScriptRoot "..\backups" }
$BackupDir = [System.IO.Path]::GetFullPath($BackupDir)
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

$Bacpac = Join-Path $BackupDir "$($AzureDb)_$(Get-Date -Format 'yyyyMMdd_HHmm').bacpac"

# ---- Tìm sqlpackage ----
function Find-SqlPackage {
    $candidates = @(
        (Get-Command sqlpackage.exe -ErrorAction SilentlyContinue).Source,
        (Get-Command sqlpackage -ErrorAction SilentlyContinue).Source
    )
    if (-not $candidates) {
        $tool = Join-Path ([System.Environment]::GetFolderPath('UserProfile')) ".dotnet\tools\sqlpackage.exe"
        if (Test-Path $tool) { $candidates += $tool }
    }
    $found = $candidates | Where-Object { $_ } | Select-Object -First 1
    if (-not $found) {
        throw "Không tìm thấy sqlpackage. Cài bằng: dotnet tool install -g microsoft.sqlpackage"
    }
    return $found
}

$sqlpackage = Find-SqlPackage
Write-Host "Dùng sqlpackage: $sqlpackage" -ForegroundColor Cyan

# ---- Export từ Azure SQL ----
function Export-AzureDb {
    Write-Host "`n>>> Export Azure SQL ($AzureServer/$AzureDb) -> $Bacpac" -ForegroundColor Yellow
    $conn = "Server=$AzureServer;Initial Catalog=$AzureDb;User ID=$AzureUser;Password=$AzurePassword;Encrypt=True;TrustServerCertificate=False"
    & $sqlpackage /Action:Export /SourceConnectionString:"$conn" /TargetFile:"$Bacpac"
    if ($LASTEXITCODE -ne 0) {
        throw "Export thất bại (mã $LASTEXITCODE). Nếu lỗi firewall, vào Azure Portal: SQL server -> Networking -> add client IP rồi chạy lại."
    }
    $size = [math]::Round((Get-Item $Bacpac).Length / 1MB, 2)
    Write-Host "Export thành công: $Bacpac ($size MB)" -ForegroundColor Green
}

# ---- Import vào local SQL Express ----
function Import-LocalDb {
    Write-Host "`n>>> Import -> $LocalServer/$LocalDb" -ForegroundColor Yellow
    $targetConn = "Server=$LocalServer;Database=master;Trusted_Connection=True;Encrypt=False;TrustServerCertificate=True"

    # sqlpackage chỉ import vào DB mới/trống -> xóa DB đích nếu tồn tại
    $exists = $false
    try {
        $conn = New-Object System.Data.SqlClient.SqlConnection $targetConn
        $conn.Open()
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = "SELECT COUNT(*) FROM sys.databases WHERE name = @db"
        $cmd.Parameters.Add((New-Object System.Data.SqlClient.SqlParameter("@db", $LocalDb))) | Out-Null
        $exists = [int]$cmd.ExecuteScalar() -gt 0
        $conn.Close()
    } catch {
        Write-Warning "Không kiểm tra được DB đích: $($_.Exception.Message)"
    }

    if ($exists) {
        Write-Host "Xóa DB $LocalServer\$LocalDb (bản local cũ) để thay bằng bản Azure..." -ForegroundColor Yellow
        $conn = New-Object System.Data.SqlClient.SqlConnection $targetConn
        $conn.Open()
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = "ALTER DATABASE [$LocalDb] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$LocalDb];"
        $cmd.ExecuteNonQuery() | Out-Null
        $conn.Close()
    }

    $conn = "Server=$LocalServer;Database=$LocalDb;Trusted_Connection=True;Encrypt=False;TrustServerCertificate=True"
    & $sqlpackage /Action:Import /SourceFile:"$Bacpac" /TargetConnectionString:"$conn"
    if ($LASTEXITCODE -ne 0) {
        throw "Import thất bại (mã $LASTEXITCODE). Kiểm tra instance $LocalServer đang chạy (Get-Service MSSQL*SQLEXPRESS)."
    }
    Write-Host "Import thành công vào $LocalServer\$LocalDb" -ForegroundColor Green
}

if (-not $ImportOnly) { Export-AzureDb }
else {
    $latest = Get-ChildItem $BackupDir -Filter "*.bacpac" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $latest) { throw "Không có file .bacpac trong $BackupDir" }
    $Bacpac = $latest.FullName
    Write-Host "Dùng file có sẵn: $Bacpac" -ForegroundColor Cyan
}

if (-not $ExportOnly) { Import-LocalDb }

Write-Host "`nHoàn tất!" -ForegroundColor Green
Write-Host "Trỏ backend về local (appsettings.Development.json):"
Write-Host "  Server=$LocalServer;Database=$LocalDb;Trusted_Connection=True;Encrypt=False;TrustServerCertificate=True;" -ForegroundColor Cyan