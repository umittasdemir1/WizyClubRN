@echo off
setlocal

cd /d "%~dp0\.."
node scripts\prompt-doppler-sync.js
if errorlevel 1 exit /b %errorlevel%
node scripts\bootstrap-codex-mcp.js --no-list
if errorlevel 1 exit /b %errorlevel%

for /f %%i in ('node .codex\skills\telegram-progress-reporter\scripts\telegram_progress_notifier.js start --print-session-id') do set CODEX_TELEGRAM_SESSION_ID=%%i

codex %*
set "EXIT_CODE=%ERRORLEVEL%"

if "%CODEX_TELEGRAM_SESSION_ID%"=="" exit /b %EXIT_CODE%

if "%EXIT_CODE%"=="0" (
    node .codex\skills\telegram-progress-reporter\scripts\telegram_progress_notifier.js finish --session-id %CODEX_TELEGRAM_SESSION_ID% --status ok >nul 2>nul
) else (
    node .codex\skills\telegram-progress-reporter\scripts\telegram_progress_notifier.js finish --session-id %CODEX_TELEGRAM_SESSION_ID% --status fail >nul 2>nul
)

exit /b %EXIT_CODE%
