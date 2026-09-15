@echo off
cd /d "%~dp0"
call npm run game
if errorlevel 1 pause
