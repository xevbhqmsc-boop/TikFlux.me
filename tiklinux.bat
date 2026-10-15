@echo off
title TIKLINUX - Starting...
echo Starting TIKLINUX Server...
cd /d "%~dp0"
start /min node server.js
timeout /t 3 /nobreak >nul
echo Starting Cloudflare Tunnel...
start /min "" "C:\Users\ibrah\AppData\Local\Temp\cf.exe" tunnel --protocol http2 --url http://localhost:3000
timeout /t 8 /nobreak >nul
echo.
echo ============================================
echo   TIKLINUX is running!
echo   Local:  http://localhost:3000
echo ============================================
echo.
echo Tunnel URL will appear above.
echo Press Ctrl+C to stop.
pause
