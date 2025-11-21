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
set /p EnvName=<..\env_name.txt
call mamba activate %EnvName%
call mamba env update -n %EnvName% -f ..\env_windows.yml
