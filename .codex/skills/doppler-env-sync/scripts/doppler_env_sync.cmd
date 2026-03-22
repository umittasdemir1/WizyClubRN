@echo off
setlocal

cd /d "%~dp0\..\..\..\.."
node scripts\update-env-from-doppler.js %*
exit /b %ERRORLEVEL%
