@echo off
rem =============================================================
rem  ASCII only. No BOM. CRLF line endings.
rem
rem  The console runs the system OEM code page (CP950 on zh-TW),
rem  so UTF-8 bytes in this file render as garbage. Keep every
rem  user-facing string in English, and do not add chcp 65001 back:
rem  it switches the code page only after cmd has started parsing,
rem  and the legacy console font garbles the output anyway.
rem
rem  .gitattributes pins *.bat to eol=crlf, otherwise the repo-wide
rem  eol=lf rule hands a fresh clone an LF-only batch file.
rem =============================================================
setlocal EnableExtensions
cd /d "%~dp0"
title Three Kingdom Dream - Greybox v0

where node >nul 2>nul
if errorlevel 1 goto NO_NODE

if not exist "node_modules\" (
    echo.
    echo [1/2] First run: installing dependencies. This takes a while...
    echo.
    call npm install --no-audit --no-fund
    if errorlevel 1 goto FAIL_INSTALL
)

if not exist "content\manifest.json" (
    echo.
    echo [2/2] Compiling content artifacts...
    echo.
    call npm run content:build
    if errorlevel 1 goto FAIL_BUILD
)

:MENU
cls
echo ================================================
echo   Three Kingdom Dream  -  Greybox v0
echo ================================================
echo.
echo   [1]  Play                dev server, opens browser
echo   [2]  Verify - 4 gates    typecheck / discipline / content / modules
echo   [3]  Balance simulator   7 policies, 300 runs each
echo   [4]  Single run trace    turn-by-turn detail for one seed
echo   [5]  Rebuild content     run after editing content-source
echo   [6]  DC calibration      check-value distribution per chapter
echo.
echo   [0]  Quit
echo.
set "PICK="
set /p "PICK=Select: "
rem Empty input means stdin is closed (piped or non-interactive run).
rem Quit instead of spinning on the menu forever.
if not defined PICK goto BYE

if "%PICK%"=="1" goto DEV
if "%PICK%"=="2" goto VERIFY
if "%PICK%"=="3" goto SIM
if "%PICK%"=="4" goto SMOKE
if "%PICK%"=="5" goto BUILD
if "%PICK%"=="6" goto CALIB
if "%PICK%"=="0" goto BYE
goto MENU

:DEV
cls
echo Starting dev server... URL: http://localhost:5173
echo Press Ctrl+C to stop and return to the menu.
echo.
call npm run dev -- --open
goto AFTER

:VERIFY
cls
call npm run verify
goto AFTER

:SIM
cls
call npx tsx scripts/simulate.ts 300
goto AFTER

:SMOKE
cls
call npx tsx scripts/smoke.ts 4242
goto AFTER

:BUILD
cls
call npm run content:build
goto AFTER

:CALIB
cls
call npx tsx scripts/calibrate.ts 150
goto AFTER

:AFTER
echo.
echo ------------------------------------------------
set "GOON="
set /p "GOON=Press Enter to return to the menu... "
goto MENU

:NO_NODE
echo.
echo [ERROR] Node.js not found.
echo         Install Node 20 or newer first: https://nodejs.org/
echo.
pause
exit /b 1

:FAIL_INSTALL
echo.
echo [ERROR] npm install failed.
echo         Check the network, or run npm install manually.
echo.
pause
exit /b 1

:FAIL_BUILD
echo.
echo [ERROR] content build failed.
echo         Run npm run content:build to see the full error.
echo.
pause
exit /b 1

:BYE
endlocal
exit /b 0
