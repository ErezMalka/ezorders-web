@echo off
chcp 65001 >nul 2>&1
setlocal EnableExtensions
cd /d "%~dp0"
set "OUT=%~dp0_merge-info.txt"

echo ==========================================================
echo    אוסף מידע על ההתנגשות - לא משנה כלום בקוד
echo ==========================================================
echo.

echo ==== A: main version of ContractActions.tsx ==== > "%OUT%"
git show origin/main:src/components/agent/ContractActions.tsx >> "%OUT%" 2>&1

echo. >> "%OUT%"
echo ==== B: what main changed since the merge base ==== >> "%OUT%"
git diff feature/agent-portal...origin/main -- src/components/agent tailwind.config.ts >> "%OUT%" 2>&1

echo. >> "%OUT%"
echo ==== C: status ==== >> "%OUT%"
git status --short >> "%OUT%" 2>&1
git branch -vv >> "%OUT%" 2>&1
git log --oneline -3 origin/main >> "%OUT%" 2>&1

echo  נוצר הקובץ _merge-info.txt בתיקייה. אפשר לסגור את החלון.
echo.
pause
endlocal
