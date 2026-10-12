@echo off
rem Dung dung may chu cua du an (doc data\run\server.json). Khong tat chuong trinh khac.
chcp 65001 >nul
cd /d "%~dp0"
node app\server\src\stop.mjs
timeout /t 3 >nul
