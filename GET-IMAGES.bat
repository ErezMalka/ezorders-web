@echo off
chcp 65001 >nul 2>&1
cd /d "%~dp0"
echo.
echo ==========================================================
echo    הורדת כל תמונות המוצרים מ-bite.co.il
echo ==========================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0GET-IMAGES.ps1"
echo.
pause
