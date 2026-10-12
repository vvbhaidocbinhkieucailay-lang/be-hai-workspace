@echo off
rem Tat che do tu chay khi dang nhap Windows (khong xoa du lieu).
chcp 65001 >nul
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0app\scripts\tu-khoi-dong.ps1" -Action tat
pause
