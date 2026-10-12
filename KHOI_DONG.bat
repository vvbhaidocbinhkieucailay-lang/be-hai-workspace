@echo off
rem Khoi dong KHONG GIAN LAM VIEC VO VAN BE HAI (may chu chay an, chi lang nghe 127.0.0.1)
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [LOI] Chua cai Node.js. Tai ban LTS tai https://nodejs.org/ roi chay lai tep nay.
  pause
  exit /b 1
)
wscript "%~dp0app\scripts\mo-ung-dung.vbs"
echo May chu chay an (khong co cua so); trinh duyet se mo http://127.0.0.1:5178/
echo Muon tat: DUNG.bat. Muon lan sau khoi bam nut nay: chay CAI_TU_KHOI_DONG.bat mot lan.
timeout /t 5 >nul
