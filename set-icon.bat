@echo off
echo Setting icon for revolt-cli-v1.0.9.exe...

REM Check if npx is available
where npx >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: npx is not found in your PATH.
    echo Please install Node.js and try again.
    pause
    exit /b 1
)

REM Check if the exe and ico files exist
if not exist revolt-cli-v1.0.9.exe (
    echo Error: revolt-cli-v1.0.9.exe not found.
    pause
    exit /b 1
)
if not exist icon.ico (
    echo Error: icon.ico not found.
    pause
    exit /b 1
)

REM Run rcedit
echo Running rcedit...
npx rcedit revolt-cli-v1.0.9.exe --set-icon icon.ico

if %errorlevel% equ 0 (
    echo Icon set successfully!
) else (
    echo Failed to set icon. Please check the error messages above.
)

pause
