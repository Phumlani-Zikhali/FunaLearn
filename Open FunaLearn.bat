@echo off
setlocal
call "%~dp0Start FunaLearn.cmd"
if errorlevel 1 (
    echo FunaLearn could not start. Please check the error message.
    pause
    exit /b 1
)
exit /b 0
