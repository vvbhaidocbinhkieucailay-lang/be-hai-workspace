@echo off
rem Bat: may chu tu chay (an) khi dang nhap Windows + loi tat tren man hinh nen. Lan sau khong can bam KHOI_DONG.bat.
chcp 65001 >nul
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0app\scripts\tu-khoi-dong.ps1" -Action bat
if errorlevel 1 ( pause & exit /b 1 )
echo Dang mo ung dung...
wscript "%~dp0app\scripts\mo-ung-dung.vbs"
echo Xong. Tu nay: dang nhap Windows la may chu tu chay; mo bang loi tat "Khong gian lam viec Be Hai" tren man hinh nen
echo hoac dau trang http://127.0.0.1:5178/ trong trinh duyet.
pause
