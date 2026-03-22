@echo off
setlocal

cd /d "%~dp0\.."
for /f %%i in ('node scripts\lib\codex-launch-mode.js') do set CODEX_LAUNCH_MODE=%%i

if /I "%CODEX_LAUNCH_MODE%"=="telegram" (
    call scripts\codex-with-telegram.cmd %*
    exit /b %ERRORLEVEL%
)

call scripts\codex-with-mcp.cmd %*
exit /b %ERRORLEVEL%
