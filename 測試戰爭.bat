@echo off
setlocal EnableExtensions
call "%~dp0scripts\start-test.bat" battle
exit /b %errorlevel%
