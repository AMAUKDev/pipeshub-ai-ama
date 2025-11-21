@echo off
cd /D "%~dp0"
if not "%1"=="am_admin" (powershell start -verb runas '%0' am_admin & exit /b)

set /p EnvName=<..\env_name.txt

call mamba activate %EnvName%

call CMD /k