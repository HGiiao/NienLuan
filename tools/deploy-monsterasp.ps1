#requires -Version 7
<#
.SYNOPSIS
    Publish backend va tai len MonsterASP.NET qua SFTP.
.DESCRIPTION
    Dung:
      ./tools/deploy-monsterasp.ps1           -> chi publish (kiem tra build)
      ./tools/deploy-monsterasp.ps1 -Upload   -> publish + tai len /wwwroot qua SFTP
    Se hoi mat khau SFTP khi tai len (OpenSSH built-in cua Windows).
    Neu SFTP loi, dung WebFTP keo-tha thu cong — xem docs/DEPLOY_MONSTERASP.md.
#>
param(
    [switch]$Upload,
    [string]$FtpHost = 'site86569.siteasp.net',
    [string]$FtpUser = 'site86569',
    [string]$RemoteDir = '/wwwroot'
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$proj = Join-Path $repo 'backend/FlightAggregatorApi/FlightAggregatorApi.csproj'
$out = Join-Path $env:TEMP 've247-monsterasp-publish'

Write-Host "==> dotnet publish ($proj)" -ForegroundColor Cyan
if (Test-Path $out) { Remove-Item $out -Recurse -Force }
dotnet publish $proj -c Release -o $out --nologo
if ($LASTEXITCODE -ne 0) { throw "Publish that bai" }
Write-Host "Publish OK: $out" -ForegroundColor Green

if (-not $Upload) {
    Write-Host "`nChi publish. Chay lai voi -Upload de tai len host." -ForegroundColor Yellow
    return
}

if (-not (Get-Command sftp -ErrorAction SilentlyContinue)) {
    Write-Warning "Khong tim thay sftp (OpenSSH client). Dung WebFTP https://webftp.monsterasp.net keo-tha noi dung '$out' vao $RemoteDir"
    exit 1
}

Write-Host "==> Tai len ${FtpUser}@${FtpHost}:${RemoteDir} (nhap mat khau khi duoc hoi)..." -ForegroundColor Cyan

$batch = Join-Path $env:TEMP 've247-sftp-commands.txt'
$cmds = @("cd `"$RemoteDir`"")
Get-ChildItem $out | ForEach-Object {
    if ($_.PSIsContainer) { $cmds += "put -r `"$($_.FullName)`"" }
    else { $cmds += "put `"$($_.FullName)`"" }
}
Set-Content -Path $batch -Value $cmds -Encoding utf8

Get-Content $batch | sftp -P 22 "${FtpUser}@${FtpHost}"
if ($LASTEXITCODE -ne 0) {
    Write-Warning "SFTP that bai. Mo https://webftp.monsterasp.net va keo-tha thu muc '$out' vao $RemoteDir"
    exit 1
}

Write-Host "`n==> Xong! Kiem tra: https://${FtpHost}/health" -ForegroundColor Green
