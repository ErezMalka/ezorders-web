@echo off
chcp 65001 >nul 2>&1
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo ==========================================================
echo    שמירת אזור הסוכנים ב-Git ודחיפה ל-GitHub
echo ==========================================================
echo.
echo  התיקייה: %CD%
echo.

REM ── 1. שהתיקייה באמת מאגר git ─────────────────────────────
git --version >nul 2>&1
if errorlevel 1 goto :nogit

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 goto :norepo

if not exist "COMMIT-MESSAGE-agent-portal.txt" goto :nomsg

REM ── 2. אם כבר רץ פעם אחת, לא לרוץ שוב ─────────────────────
git rev-parse --verify --quiet feature/agent-portal >nul 2>&1
if not errorlevel 1 goto :already

REM ── 3. מה עומד להישמר ─────────────────────────────────────
echo  [1/6] מה שעדיין לא נשמר:
echo.
git status --short
echo.
echo ----------------------------------------------------------
echo  ייווצר ענף חדש בשם feature/agent-portal, הקבצים למעלה
echo  יקומטו לתוכו, והוא יידחף ל-GitHub.
echo.
echo  שום דבר לא נמחק ושום דבר קיים לא נדרס.
echo ----------------------------------------------------------
echo.
set /p GO=  להמשיך?  הקש Y ואז Enter (כל דבר אחר מבטל):
if /I not "%GO%"=="Y" goto :cancelled

REM ── 4. ענף משלו ───────────────────────────────────────────
echo.
echo  [2/6] יוצר ענף feature/agent-portal
git checkout -b feature/agent-portal
if errorlevel 1 goto :fail

REM ── 5. הוספה, בלי קבצי פסולת ──────────────────────────────
echo  [3/6] מוסיף את הקבצים
git add -A
if errorlevel 1 goto :fail

REM קובץ patch של 10MB, ארכיון ישן ו-artifact של הבילד. לא שייכים למאגר.
git reset -q -- agent-portal.patch src.zip tsconfig.tsbuildinfo 2>nul

REM ── 6. בדיקת בטיחות: שאף סוד לא נכנס ──────────────────────
echo  [4/6] בודק שלא נכנסו מפתחות סודיים
git diff --cached --name-only > "%TEMP%\ez_staged.txt"
findstr /I /C:".env.local" "%TEMP%\ez_staged.txt" >nul
if not errorlevel 1 goto :secret
findstr /I /C:".env.production" "%TEMP%\ez_staged.txt" >nul
if not errorlevel 1 goto :secret
del "%TEMP%\ez_staged.txt" >nul 2>&1
echo        נקי.

REM ── 7. קומיט ──────────────────────────────────────────────
echo  [5/6] שומר
git commit -F COMMIT-MESSAGE-agent-portal.txt
if errorlevel 1 goto :nothing

REM ── 8. דחיפה ──────────────────────────────────────────────
echo.
echo  [6/6] דוחף ל-GitHub
echo        אם ייפתח חלון של GitHub שמבקש התחברות - אשר אותו.
echo.
git push -u origin feature/agent-portal
if errorlevel 1 goto :pushfail

echo.
echo ==========================================================
echo    הצליח. העבודה שמורה ונדחפה.
echo ==========================================================
echo.
git log --oneline -1
echo.
echo  אפשר עכשיו למחוק את agent-portal.patch - הוא עותק
echo  של עבודה שכבר נמצאת במאגר, ותופס 10MB.
echo.
goto :done


:already
echo.
echo  הענף feature/agent-portal כבר קיים - נראה שהסקריפט כבר רץ.
echo  המצב הנוכחי:
echo.
git log --oneline -1
echo.
git status --short
echo.
echo  אם נשארו קבצים ברשימה למעלה, הם עדיין לא נשמרו.
echo  שלח לי צילום מסך של החלון הזה ואגיד מה הלאה.
goto :done

:nogit
echo.
echo  git לא מותקן או לא נמצא בנתיב.
echo  התקן מ- https://git-scm.com/download/win  ונסה שוב.
goto :done

:norepo
echo.
echo  התיקייה הזו אינה מאגר git.
echo  ודא שהקובץ יושב בתוך Projects\ezorders-web.
goto :done

:nomsg
echo.
echo  חסר הקובץ COMMIT-MESSAGE-agent-portal.txt.
echo  הוא אמור לשבת ליד הסקריפט הזה.
goto :done

:secret
echo.
echo  ==========  עצירה  ==========
echo  קובץ סביבה עם מפתחות סודיים עומד להיכנס לקומיט.
echo  לא ממשיכים. שלח לי צילום מסך ואטפל.
echo.
git reset -q
git checkout - >nul 2>&1
git branch -D feature/agent-portal >nul 2>&1
echo  הכל הוחזר לקדמותו - לא נשמר כלום.
goto :done

:nothing
echo.
echo  אין מה לשמור - ייתכן שהכל כבר מקומט.
git status --short
goto :done

:pushfail
echo.
echo  הקומיט נשמר בהצלחה, אבל הדחיפה ל-GitHub נכשלה.
echo  זה בדרך כלל עניין של הרשאות ולא של הקוד - העבודה בטוחה.
echo  שלח לי צילום מסך של השגיאה למעלה.
goto :done

:cancelled
echo.
echo  בוטל. לא נעשה שום שינוי.
goto :done

:fail
echo.
echo  משהו נכשל. השגיאה למעלה.
echo  שלח לי צילום מסך ואגיד מה קרה.
goto :done

:done
echo.
pause
endlocal
