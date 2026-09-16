@echo off
setlocal EnableExtensions
cd /d "%~dp0.."

set "TEST_PAGE="
if "%~1"=="duel" set "TEST_PAGE=confrontation-demo"
if "%~1"=="debate" set "TEST_PAGE=debate-demo"
if "%~1"=="battle" set "TEST_PAGE=battle-demo"
if not defined TEST_PAGE (
    echo [ERROR] Unknown test. Expected duel, debate, or battle.
    exit /b 1
)
title Three Kingdom Dream - %~1 test

where node >nul 2>nul
if errorlevel 1 goto NO_NODE
where npm >nul 2>nul
if errorlevel 1 goto NO_NODE

if not exist "node_modules\.bin\vite.cmd" (
    echo Installing dependencies...
    call npm install --no-audit --no-fund
    if errorlevel 1 goto FAILED
)
if not exist "content\manifest.json" (
    echo Compiling test content...
    call npm run content:build
    if errorlevel 1 goto FAILED
)

echo Opening the %~1 test with sample data.
echo Use the start button on the test page to play.
echo Keep this window open while playing. Close it to stop the test server.
echo.
call npm run dev -- --host 127.0.0.1 --open "/?art=%TEST_PAGE%"
if errorlevel 1 goto FAILED
exit /b 0

:NO_NODE
echo [ERROR] Node.js and npm are required. Install Node.js, then try again.
pause
exit /b 1

:FAILED
echo.
echo [ERROR] Test launch failed. See the error above.
pause
exit /b 1
