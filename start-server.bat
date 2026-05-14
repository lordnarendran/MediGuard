@echo off
echo ========================================
echo   MediGuard Local Development Server
echo ========================================
echo.
echo Starting server on http://localhost:8000
echo Press Ctrl+C to stop the server
echo.
echo Your browser will open automatically...
echo.

REM Try Python 3 first
python -m http.server 8000 2>nul
if %errorlevel% equ 0 goto :end

REM Try Python 2 if Python 3 failed
python -m SimpleHTTPServer 8000 2>nul
if %errorlevel% equ 0 goto :end

REM If Python is not found
echo ERROR: Python is not installed or not in PATH
echo.
echo Please install Python from https://www.python.org/downloads/
echo Or use one of the other methods in HOW-TO-RUN-LOCALLY.md
echo.
pause

:end
