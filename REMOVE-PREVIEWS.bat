@echo off
cd /d "%~dp0"
if exist "Claude outputs\" rmdir /s /q "Claude outputs"
git rm -r -q --cached "Claude outputs" 2>nul
echo done
pause
