@echo off
title AI Caddie Server
echo.
echo ============================================
echo    AI CADDIE - Starting Server...
echo ============================================
echo.
echo  WATCH FOR THE WINDOWS FIREWALL POPUP!
echo  You MUST click "Allow access" when it
echo  appears (check the "Private" box).
echo.
echo  Starting in 3 seconds...
timeout /t 3 >nul

cd /d C:\Users\sswetz001\ai-caddie
node server.js

pause
