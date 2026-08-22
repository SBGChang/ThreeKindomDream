@echo off
rem === encoding: UTF-8 (no BOM), line endings: CRLF ===
rem chcp 65001 must run before any non-ASCII output.
chcp 65001 >nul 2>nul
setlocal EnableExtensions
cd /d "%~dp0"
title Three Kingdom Dream - Greybox v0

where node >nul 2>nul
if errorlevel 1 goto NO_NODE

if not exist "node_modules\" (
    echo.
    echo [1/2] 首次執行，安裝依賴中，請稍候...
    echo.
    call npm install --no-audit --no-fund
    if errorlevel 1 goto FAIL_INSTALL
)

if not exist "content\manifest.json" (
    echo.
    echo [2/2] 編譯內容產物...
    echo.
    call npm run content:build
    if errorlevel 1 goto FAIL_BUILD
)

:MENU
cls
echo ================================================
echo   三國夢 · 灰盒 v0
echo ================================================
echo.
echo   [1]  啟動遊戲          dev server + 開瀏覽器
echo   [2]  跑四道門禁        typecheck / 紀律 / 內容 / 測試
echo   [3]  平衡模擬器        七種策略各 300 次
echo   [4]  單輪逐回合明細    看一場夢從頭到尾
echo   [5]  重新編譯內容      改過 content-source 後執行
echo   [6]  DC 校準報告       各章檢定值分佈
echo.
echo   [0]  離開
echo.
set "PICK="
set /p "PICK=請選擇： "
rem 空輸入代表 stdin 已結束（非互動執行），直接離開而非重畫選單。
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
echo 啟動 dev server... 網址 http://localhost:5173
echo 按 Ctrl+C 可停止並回到選單。
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
set /p "GOON=按 Enter 回選單... "
goto MENU

:NO_NODE
echo.
echo [ERROR] Node.js not found.
echo         找不到 Node.js，請先安裝 Node 20 以上版本。
echo         https://nodejs.org/
echo.
pause
exit /b 1

:FAIL_INSTALL
echo.
echo [ERROR] npm install failed.
echo         依賴安裝失敗。請檢查網路，或手動執行 npm install。
echo.
pause
exit /b 1

:FAIL_BUILD
echo.
echo [ERROR] content build failed.
echo         內容編譯失敗。請執行 npm run content:build 看完整訊息。
echo.
pause
exit /b 1

:BYE
endlocal
exit /b 0
