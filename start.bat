@echo off
title Codeforces & LeetCode Tracker
echo ========================================================
echo   Starting Codeforces & LeetCode Tracker...
echo ========================================================
echo.

node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js was not detected in PATH.
    echo Please make sure Node.js is installed or restart your shell.
    pause
    exit /b 1
)

echo Starting web server on http://localhost:3000...
start http://localhost:3000
node server.js

pause
