@echo off
echo Updating .env file...
echo.
echo Please manually update your .env file with:
echo.
echo R2_PUBLIC_URL=https://wizy-r2-proxy.tasdemir-umit.workers.dev
echo.
echo Press any key to open .env in notepad...
pause > nul
notepad .env
