@echo off
cd /d "%~dp0"
set PORT=8028
set "PYTHON_CMD="

where python >nul 2>nul
if %errorlevel%==0 (
    set "PYTHON_CMD=python"
)

if not defined PYTHON_CMD (
    where py >nul 2>nul
    if %errorlevel%==0 (
        set "PYTHON_CMD=py"
    )
)

if not defined PYTHON_CMD (
    if exist "C:\Users\Vitalii\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" (
        set "PYTHON_CMD=C:\Users\Vitalii\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
    )
)

if not defined PYTHON_CMD (
    echo Python не знайдено.
    pause
    exit /b
)

start "" powershell -NoProfile -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:%PORT%/index.html'"
"%PYTHON_CMD%" -m http.server %PORT% --bind 127.0.0.1
