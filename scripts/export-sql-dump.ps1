# ============================================================================
# Vé247 — Xuất toàn bộ database Azure SQL Server thành file .sql
# (CREATE TABLE + INSERT dữ liệu thật) để nộp/chạy lại 100% chính xác.
#
# Cách dùng:
#   .\scripts\export-sql-dump.ps1
#   .\scripts\export-sql-dump.ps1 -OutputPath D:\path\dump.sql
# ============================================================================

param(
    [string]$AzureServer = "ve247-serverless-nguyen2.database.windows.net",
    [string]$AzureDb = "FlightAggregatorDb",
    [string]$AzureUser = "sqladmin",
    [string]$AzurePassword = "Nghgiao05@",
    [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"
$sw = [System.Diagnostics.Stopwatch]::StartNew()

if (-not $OutputPath) { $OutputPath = Join-Path $PSScriptRoot "..\sql_dump\FlightAggregatorDb.sql" }
$OutputDir = Split-Path $OutputPath -Parent
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
$OutputPath = [System.IO.Path]::GetFullPath($OutputPath)

$connStr = "Server=$AzureServer;Initial Catalog=$AzureDb;User ID=$AzureUser;Password=$AzurePassword;Encrypt=True;TrustServerCertificate=False"
$conn = New-Object System.Data.SqlClient.SqlConnection $connStr
$conn.Open()
Write-Host "Đã kết nối Azure SQL: $AzureServer/$AzureDb" -ForegroundColor Cyan

function Query-Scalar([string]$sql, [System.Data.SqlClient.SqlParameter[]]$ps = @()) {
    $cmd = $conn.CreateCommand(); $cmd.CommandText = $sql
    foreach ($p in $ps) { $cmd.Parameters.Add($p) | Out-Null }
    return $cmd.ExecuteScalar()
}

function Query-Table([string]$sql, [System.Data.SqlClient.SqlParameter[]]$ps = @()) {
    $cmd = $conn.CreateCommand(); $cmd.CommandText = $sql
    foreach ($p in $ps) { $cmd.Parameters.Add($p) | Out-Null }
    $da = New-Object System.Data.SqlClient.SqlDataAdapter $cmd
    $dt = New-Object System.Data.DataTable
    $da.Fill($dt) | Out-Null
    Write-Output -NoEnumerate $dt
}

# Lấy danh sách bảng (loại trừ bảng hệ thống)
$tables = Query-Table @"
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME NOT LIKE 'sys%'
ORDER BY TABLE_NAME
"@

Write-Host "Tìm thấy $($tables.Rows.Count) bảng." -ForegroundColor Cyan

function Get-TypeDef([string]$dataType, $maxLen, $prec, $scale, $datePrec) {
    switch ($dataType.ToLower()) {
        { $_ -in @('varchar','nvarchar','char','nchar') } {
            if ($maxLen -eq -1) { return "$dataType (MAX)" } elseif ($maxLen -gt 0) { return "$dataType ($maxLen)" } else { return $dataType }
        }
        { $_ -in @('varbinary','binary') } { return "$dataType ($maxLen)" }
        { $_ -in @('decimal','numeric') } { return "$dataType ($prec,$scale)" }
        { $_ -in @('datetime2','time','datetimeoffset') } { return "$dataType ($datePrec)" }
        { $_ -in @('datetime','smalldatetime','date','int','bigint','smallint','tinyint','bit','float','real','money','smallmoney','text','ntext','image','uniqueidentifier') } { return $dataType }
        default { return $dataType }
    }
}

function To-SqlLiteral([string]$dataType, $value) {
    if ($value -is [System.DBNull] -or $null -eq $value) { return 'NULL' }
    switch ($dataType.ToLower()) {
        { $_ -in @('bigint','int','smallint','tinyint','bit','decimal','numeric','money','smallmoney','float','real') } {
            return [System.Convert]::ToString($value, [System.Globalization.CultureInfo]::InvariantCulture)
        }
        { $_ -in @('char','varchar','text') } { return "'" + ($value.ToString().Replace("'", "''")) + "'" }
        { $_ -in @('nchar','nvarchar','ntext') } { return "N'" + ($value.ToString().Replace("'", "''")) + "'" }
        { $_ -in @('datetime','datetime2','smalldatetime','date') } {
            $dt = if ($value -is [DateTime]) { $value } else { [DateTime]$value }
            return "'" + $dt.ToString("yyyy-MM-dd HH:mm:ss.fffffff") + "'"
        }
        'time' { return "'" + ([TimeSpan]$value).ToString() + "'" }
        'datetimeoffset' { return "'" + ([DateTimeOffset]$value).ToString("yyyy-MM-dd HH:mm:ss.fffffff zzz") + "'" }
        'uniqueidentifier' { return "'" + $value.ToString() + "'" }
        { $_ -in @('binary','varbinary','image','rowversion','timestamp') } {
            return "0x" + ([BitConverter]::ToString([byte[]]$value)).Replace("-", "")
        }
        default { return "'" + ($value.ToString().Replace("'", "''")) + "'" }
    }
}

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("/*")
[void]$sb.AppendLine("  Vé247 - FlightAggregatorDb (Azure SQL Server)")
[void]$sb.AppendLine("  Export: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  |  Server: $AzureServer")
[void]$sb.AppendLine("  Số bảng: $($tables.Rows.Count)  |  Nguồn: $AzureDb")
[void]$sb.AppendLine("*/")
[void]$sb.AppendLine("USE [$AzureDb];")
[void]$sb.AppendLine("GO")
[void]$sb.AppendLine("SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON;")
[void]$sb.AppendLine("GO")

$totalRows = 0
foreach ($row in $tables.Rows) {
    $t = $row["TABLE_NAME"]
    $cols = Query-Table "SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE, DATETIME_PRECISION, IS_NULLABLE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @t ORDER BY ORDINAL_POSITION" @( ,(New-Object System.Data.SqlClient.SqlParameter("@t", $t)) )

    $identity = Query-Table "SELECT name, seed_value, increment_value FROM sys.identity_columns WHERE object_id = OBJECT_ID(@q)" @( ,(New-Object System.Data.SqlClient.SqlParameter("@q", "[dbo].[$t]")) )

    $pkCols = Query-Table @"
SELECT col.COLUMN_NAME
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE col ON tc.CONSTRAINT_NAME = col.CONSTRAINT_NAME
WHERE tc.TABLE_NAME = @t AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
ORDER BY col.ORDINAL_POSITION
"@ @( ,(New-Object System.Data.SqlClient.SqlParameter("@t", $t)) )

    $pkName = $null
    if ($pkCols.Rows.Count -gt 0) {
        $pkName = Query-Scalar @"
SELECT tc.CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
WHERE tc.TABLE_NAME = @t AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
"@ @( ,(New-Object System.Data.SqlClient.SqlParameter("@t", $t)) )
    }

    $colDefs = New-Object System.Collections.Generic.List[string]
    $colNames = @()
    foreach ($c in $cols.Rows) {
        $cn = $c["COLUMN_NAME"]
        $colNames += "[$cn]"
        $def = Get-TypeDef $c["DATA_TYPE"] $c["CHARACTER_MAXIMUM_LENGTH"] $c["NUMERIC_PRECISION"] $c["NUMERIC_SCALE"] $c["DATETIME_PRECISION"]
        $part = "[$cn] $def"
        $isId = $identity.Rows | Where-Object { $_.name -eq $cn }
        if ($isId) {
            $seed = $isId.seed_value; $inc = $isId.increment_value
            $part += " IDENTITY($seed, $inc)"
        }
        $part += if ($c["IS_NULLABLE"] -eq "YES") { " NULL" } else { " NOT NULL" }
        if ($c["COLUMN_DEFAULT"] -ne [DBNull]::Value -and $c["COLUMN_DEFAULT"]) {
            $part += " DEFAULT $($c["COLUMN_DEFAULT"])"
        }
        $colDefs.Add($part)
    }

    if ($pkName) {
        $pkColDef = "[$pkName] PRIMARY KEY (" + (($pkCols.Rows | ForEach-Object { "[$($_.COLUMN_NAME)]" }) -join ", ") + ")"
        $colDefs.Add($pkColDef)
    }

    [void]$sb.AppendLine("IF OBJECT_ID(N'[dbo].[$t]', N'U') IS NOT NULL DROP TABLE [dbo].[$t];")
    [void]$sb.AppendLine("GO")
    [void]$sb.AppendLine("CREATE TABLE [dbo].[$t] (")
    [void]$sb.AppendLine(($colDefs -join ",`r`n"))
    [void]$sb.AppendLine(");")
    [void]$sb.AppendLine("GO")

    # Dữ liệu
    $dataSql = "SELECT " + (($colNames | ForEach-Object { $_ }) -join ", ") + " FROM [dbo].[$t]"
    $data = Query-Table $dataSql
    $cnt = $data.Rows.Count
    $totalRows += $cnt

    if ($cnt -gt 0) {
        $batchSize = 500
        $colList = ($colNames -join ", ")
        for ($start = 0; $start -lt $cnt; $start += $batchSize) {
            $tuples = New-Object System.Collections.Generic.List[string]
            $end = [Math]::Min($start + $batchSize, $cnt)
            for ($r = $start; $r -lt $end; $r++) {
                $datarow = $data.Rows[$r]
                $vals = @()
                for ($i = 0; $i -lt $cols.Rows.Count; $i++) {
                    $dt2 = $cols.Rows[$i]["DATA_TYPE"]
                    $vals += To-SqlLiteral $dt2 $datarow[$i]
                }
                $tuples.Add("(" + ($vals -join ", ") + ")")
            }
            [void]$sb.AppendLine("INSERT INTO [dbo].[$t] ($colList) VALUES")
            [void]$sb.AppendLine(($tuples -join ",`r`n") + ";")
            [void]$sb.AppendLine("GO")
        }
    }
    Write-Host ("  {0,-22} {1,8} dòng" -f $t, $cnt) -ForegroundColor Gray
}

$conn.Close()

# Ghi file UTF-8 có BOM (SSMS đọc đúng tiếng Việt)
$utf8Bom = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllText($OutputPath, $sb.ToString(), $utf8Bom)

$sw.Stop()
$size = [math]::Round((Get-Item $OutputPath).Length / 1MB, 2)
Write-Host ""
Write-Host "Hoàn tất!" -ForegroundColor Green
Write-Host "  File:    $OutputPath"
Write-Host "  Kích thước: $size MB"
Write-Host "  Tổng dòng:   $totalRows"
Write-Host "  Thời gian:   $($sw.Elapsed.TotalSeconds) giây"