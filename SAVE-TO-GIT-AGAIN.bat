@echo off
chcp 65001 >nul 2>&1
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo ==========================================================
echo    שמירת שינויים נוספים ודחיפה
echo ==========================================================
echo.
echo  התיקייה: %CD%
echo.

git --version >nul 2>&1
if errorlevel 1 goto :nogit

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 goto :norepo

REM ── להיות על הענף הנכון ────────────────────────────────────
for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%b
if /I not "%BRANCH%"=="feature/agent-portal" (
  echo  עובר לענף feature/agent-portal ^(היית על %BRANCH%^)
  git checkout feature/agent-portal
  if errorlevel 1 goto :fail
)

echo  [1/5] מה השתנה מאז הפעם הקודמת:
echo.
git status --short
echo.

REM אם אין שינויים, אין מה לעשות
git status --porcelain > "%TEMP%\ez_dirty.txt"
for %%A in ("%TEMP%\ez_dirty.txt") do if %%~zA==0 goto :nothing
del "%TEMP%\ez_dirty.txt" >nul 2>&1

echo ----------------------------------------------------------
set /p GO=  לשמור ולדחוף?  הקש Y ואז Enter (כל דבר אחר מבטל):
if /I not "%GO%"=="Y" goto :cancelled

echo.
echo  [2/5] מוסיף
git add -A
if errorlevel 1 goto :fail
git reset -q -- agent-portal.patch src.zip tsconfig.tsbuildinfo 2>nul

echo  [3/5] בודק שלא נכנסו מפתחות סודיים
git diff --cached --name-only > "%TEMP%\ez_staged.txt"
findstr /I /C:".env.local" "%TEMP%\ez_staged.txt" >nul
if not errorlevel 1 goto :secret
findstr /I /C:".env.production" "%TEMP%\ez_staged.txt" >nul
if not errorlevel 1 goto :secret
del "%TEMP%\ez_staged.txt" >nul 2>&1
echo        נקי.

echo  [4/5] שומר
if not exist "COMMIT-MESSAGE-next.txt" goto :nomsg
git commit -F COMMIT-MESSAGE-next.txt
if errorlevel 1 goto :nothing

echo.
echo  [5/5] דוחף
git push
if errorlevel 1 goto :pushfail

echo.
echo ==========================================================
echo    הצליח.
echo ==========================================================
echo.
git log --oneline -1
goto :done

:nogit
echo  git לא מותקן או לא נמצא בנתיב.
goto :done

:norepo
echo  התיקייה הזו אינה מאגר git.
goto :done

:nomsg
echo.
echo  חסר הקובץ COMMIT-MESSAGE-next.txt ליד הסקריפט.
git reset -q
goto :done

:secret
echo.
echo  ==========  עצירה  ==========
echo  קובץ סביבה עם מפתחות סודיים עומד להיכנס לקומיט. לא ממשיכים.
git reset -q
echo  הכל הוחזר לקדמותו.
goto :done

:nothing
echo.
echo  אין שינויים לשמור.
goto :done

:cancelled
echo.
echo  בוטל. לא נעשה שום שינוי.
goto :done

:fail
echo.
echo  משהו נכשל. השגיאה למעלה. שלח לי צילום מסך.
goto :done

:pushfail
echo.
echo  נשמר מקומית, אבל הדחיפה נכשלה. העבודה בטוחה.
echo  שלח לי צילום מסך של השגיאה.
goto :done

:done
echo.
pause
endlocal
