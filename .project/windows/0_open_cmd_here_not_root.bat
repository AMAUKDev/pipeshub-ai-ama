@echo off
cd /D "%~dp0"

set /p EnvName=<..\env_name.txt

call mamba activate %EnvName%

call CMD /k