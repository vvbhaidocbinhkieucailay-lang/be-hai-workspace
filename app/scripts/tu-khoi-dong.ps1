# Bật/tắt: (1) tự chạy máy chủ ẩn khi đăng nhập Windows, (2) lối tắt "Không gian làm việc Bé Hai" trên màn hình nền.
# Chỉ tạo/xóa đúng 2 lối tắt của ứng dụng này; không sửa cài đặt khác của Windows.
param([ValidateSet('bat', 'tat', 'trangthai')][string]$Action = 'bat')
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$vbs = Join-Path $root 'app\scripts\mo-ung-dung.vbs'
$startupLnk = Join-Path ([Environment]::GetFolderPath('Startup')) 'KhongGianLamViec_BeHai.lnk'
$desktopLnk = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Khong gian lam viec Be Hai.lnk'
$wscript = Join-Path $env:WINDIR 'System32\wscript.exe'

function New-Shortcut($path, $arguments, $desc) {
  $sh = New-Object -ComObject WScript.Shell
  $lnk = $sh.CreateShortcut($path)
  $lnk.TargetPath = $wscript
  $lnk.Arguments = $arguments
  $lnk.WorkingDirectory = $root
  $lnk.Description = $desc
  $lnk.IconLocation = "$env:WINDIR\System32\imageres.dll,1"
  $lnk.Save()
}

if ($Action -eq 'trangthai') {
  [pscustomobject]@{ tu_khoi_dong = (Test-Path $startupLnk); loi_tat = (Test-Path $desktopLnk); startup = $startupLnk; desktop = $desktopLnk } | ConvertTo-Json -Compress
  exit 0
}
if ($Action -eq 'tat') {
  if (Test-Path $startupLnk) { Remove-Item $startupLnk }
  Write-Output 'Da tat tu khoi dong cung Windows (giu loi tat tren man hinh nen).'
  exit 0
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Output '[LOI] Chua cai Node.js (https://nodejs.org/).'; exit 1 }
New-Shortcut $startupLnk "`"$vbs`" /an" 'Chay may chu Khong gian lam viec Be Hai khi dang nhap Windows'
New-Shortcut $desktopLnk "`"$vbs`"" 'Mo Khong gian lam viec Be Hai (http://127.0.0.1:5178/)'
Write-Output "Da bat tu khoi dong. Loi tat: $desktopLnk"
