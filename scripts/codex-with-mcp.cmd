@echo off
setlocal

cd /d "%~dp0\.."
node scripts\bootstrap-codex-mcp.js --no-list
if errorlevel 1 exit /b %errorlevel%

codex %*
