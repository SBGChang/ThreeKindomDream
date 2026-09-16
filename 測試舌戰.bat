@echo off
setlocal EnableExtensions
call "%~dp0scripts\start-test.bat" debate
exit /b %errorlevel%
