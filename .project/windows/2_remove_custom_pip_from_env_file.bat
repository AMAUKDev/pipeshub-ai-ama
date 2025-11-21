@echo off
cd /D "%~dp0"

:: Create logs directory if it does not exist
if not exist "logs" mkdir "logs"

:: Define a temporary log file for privilege check
set "tempLog=logs\temp_%~n0.log"
echo Log starting >"%tempLog%"

:: Check for administrative privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running with administrative privileges
    goto :continueExecution
) else (
    echo Relaunching with administrative privileges
	pause
    powershell start -verb runas '%0' am_admin & exit /b
)

:continueExecution
:: Append the temporary log file to the main log file and remove the temporary log file
echo Log starting > "logs\%~n0.log"
type "%tempLog%" >> "logs\%~n0.log"
del "%tempLog%"

:: Call the subroutine and append all its output to the main log file
title %~n0
call :main >> "logs\%~n0.log" 2>&1
exit /b

:main
setlocal EnableDelayedExpansion

set "inputFile=..\env_windows.yml"
set "outputFile=..\temp_environment.yml"

if exist %outputFile% del %outputFile%

set "inPipSection=no"

for /f "delims=" %%a in (%inputFile%) do (
    set "line=%%a"
    set "writeLine=yes"
    
    if "!line!"=="  - pip:" (
        set "inPipSection=yes"
    )
    
    if "!inPipSection!"=="yes" (
        echo "!line!" | findstr /C:"flaskappframework" 1>nul 2>nul
        if !errorlevel! equ 0 set "writeLine=no"
        
        echo "!line!" | findstr /C:"lucian-mongo-api" 1>nul 2>nul
        if !errorlevel! equ 0 set "writeLine=no"
    )
    
    if "!writeLine!"=="yes" (
        echo !line! >> %outputFile%
    )
)

:: Replace the original file with the modified one
move /Y %outputFile% %inputFile%
if exist %outputFile% del %outputFile%

echo.
echo The environment file has been modified and overwritten as %inputFile%
