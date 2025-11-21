@echo off
cd /D "%~dp0"

:: Create logs directory if it does not exist
if not exist "logs" mkdir "logs"

:: Define a temporary log file for privilege check
set "tempLog=logs\temp_%~n0.log"
echo Log starting >"%tempLog%"

:: Log the arguments received by the script
echo Arguments: %* >>"%tempLog%"

:: Check for administrative privileges
net session >nul 2>&1
echo net session result: %errorLevel% >>"%tempLog%"
if %errorLevel% == 0 (
    echo Running with administrative privileges >>"%tempLog%"
    goto :continueExecution
) else (
    echo Relaunching with administrative privileges >>"%tempLog%"
    echo Relaunching with administrative privileges > "logs\relaunching.log" :: Replace pause with this line
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
:: Initialize a variable to hold the result
set "EnvExists=0"

:: Loop over all existing environments
for /f "tokens=*" %%a in ('conda env list ^| findstr /R /C:"^%EnvName%$"') do (
    set "EnvExists=1"
)

:: Check if the environment exists
if %EnvExists%==1 (
    echo Environment %EnvName% exists.
) else (
    echo Environment %EnvName% does not exist.
	call mamba create -n %EnvName% python=3.10 -c conda-forge -y
)

call mamba activate %EnvName%
