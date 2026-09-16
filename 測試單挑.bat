@echo off
setlocal EnableExtensions
call "%~dp0scripts\start-test.bat" duel
exit /b %errorlevel%
