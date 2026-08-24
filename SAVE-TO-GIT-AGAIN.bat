@echo off
chcp 65001 >nul 2>&1
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo ==========================================================
echo    שמירה, דחיפה, ופרסום לאתר החי
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

echo  [1/6] מה השתנה מאז הפעם הקודמת:
echo.
git status --short
echo.

REM אם אין שינויים, אולי בכל זאת יש מה לפרסם
git status --porcelain > "%TEMP%\ez_dirty.txt"
for %%A in ("%TEMP%\ez_dirty.txt") do if %%~zA==0 goto :askpublish
del "%TEMP%\ez_dirty.txt" >nul 2>&1

echo ----------------------------------------------------------
set /p GO=  לשמור ולדחוף?  הקש Y ואז Enter (כל דבר אחר מבטל):
if /I not "%GO%"=="Y" goto :cancelled

echo.
echo  [2/6] מוסיף
git add -A
if errorlevel 1 goto :fail
git reset -q -- agent-portal.patch src.zip tsconfig.tsbuildinfo 2>nul

echo  [3/6] בודק שלא נכנסו מפתחות סודיים
git diff --cached --name-only > "%TEMP%\ez_staged.txt"
findstr /I /C:".env.local" "%TEMP%\ez_staged.txt" >nul
if not errorlevel 1 goto :secret
findstr /I /C:".env.production" "%TEMP%\ez_staged.txt" >nul
if not errorlevel 1 goto :secret
del "%TEMP%\ez_staged.txt" >nul 2>&1
echo        נקי.

echo  [4/6] שומר
if not exist "COMMIT-MESSAGE-next.txt" goto :nomsg
git commit -F COMMIT-MESSAGE-next.txt
if errorlevel 1 goto :nothingcommitted

echo.
echo  [5/6] דוחף
git push
if errorlevel 1 goto :pushfail
echo        נדחף.

:askpublish
echo.
echo ----------------------------------------------------------
echo  [6/6] פרסום לאתר החי
echo.
echo  עד כאן הכל שמור ודחוף לענף העבודה. האתר החי עדיין לא השתנה.
echo  כדי שזה יעלה לאתר צריך למזג את הענף ל-main.
echo.
set /p PUB=  לפרסם עכשיו לאתר החי?  הקש Y ואז Enter (כל דבר אחר מדלג):
if /I not "%PUB%"=="Y" goto :skipped

echo.
echo  עובר ל-main ומעדכן
git checkout main
if errorlevel 1 goto :fail
git pull --ff-only
if errorlevel 1 goto :pullfail

echo  ממזג את feature/agent-portal
git merge --no-edit feature/agent-portal
if errorlevel 1 goto :conflict

echo  דוחף את main
git push
if errorlevel 1 goto :mainpushfail

git checkout feature/agent-portal >nul 2>&1

echo.
echo ==========================================================
echo    פורסם. Vercel בונה עכשיו, תוך דקה-שתיים זה באוויר.
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

:nothingcommitted
echo.
echo  אין שינויים לשמור.
goto :askpublish

:cancelled
echo.
echo  בוטל. לא נעשה שום שינוי.
goto :done

:skipped
echo.
echo  דילגת על הפרסום. העבודה שמורה ודחופה, האתר החי לא השתנה.
echo  אפשר להריץ את הסקריפט שוב מתי שתרצה ולבחור Y.
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

:pullfail
echo.
echo  לא הצלחתי לעדכן את main מהשרת. לא מיזגתי כלום.
git checkout feature/agent-portal >nul 2>&1
echo  חזרת לענף העבודה. שלח לי צילום מסך.
goto :done

:conflict
echo.
echo  ==========  התנגשות במיזוג  ==========
echo  שני שינויים נגעו באותו קובץ. אני מבטל את המיזוג ומחזיר הכל לקדמותו.
git merge --abort
git checkout feature/agent-portal >nul 2>&1
echo  בוצע. שום נזק. תפעיל את Claude Code ותגיד לו: "יש התנגשות במיזוג ל-main, תפתור".
goto :done

:mainpushfail
echo.
echo  המיזוג הצליח מקומית אבל הדחיפה נכשלה. שום דבר לא אבד.
git checkout feature/agent-portal >nul 2>&1
echo  שלח לי צילום מסך של השגיאה.
goto :done

:done
echo.
pause
endlocal
