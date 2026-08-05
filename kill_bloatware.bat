:loop
taskkill /F /IM SearchHost.exe >nul 2>&1
taskkill /F /IM msedgewebview2.exe >nul 2>&1
taskkill /F /IM Widgets.exe >nul 2>&1
taskkill /F /IM SysInfoCap.exe >nul 2>&1
taskkill /F /IM AppHelperCap.exe >nul 2>&1
taskkill /F /IM NetworkCap.exe >nul 2>&1
taskkill /F /IM DiagsCap.exe >nul 2>&1
taskkill /F /IM HPCommRecovery.exe >nul 2>&1
taskkill /F /IM Taskmgr.exe >nul 2>&1
taskkill /F /IM sqlservr.exe >nul 2>&1
timeout /t 5 /nobreak >nul
goto loop
