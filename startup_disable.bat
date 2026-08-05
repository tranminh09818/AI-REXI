@echo off
:: Kill bloatware on startup - KEEP freebuff, cline, opencode
taskkill /F /IM SysInfoCap.exe 2>nul
taskkill /F /IM AppHelperCap.exe 2>nul
taskkill /F /IM NetworkCap.exe 2>nul
taskkill /F /IM DiagsCap.exe 2>nul
taskkill /F /IM HPCommRecovery.exe 2>nul
taskkill /F /IM sqlservr.exe 2>nul
taskkill /F /IM OfficeClickToRun.exe 2>nul
taskkill /F /IM SearchHost.exe 2>nul
taskkill /F /IM msedgewebview2.exe 2>nul
taskkill /F /IM Widgets.exe 2>nul
taskkill /F /IM ms-teams.exe 2>nul
taskkill /F /IM wps.exe 2>nul
taskkill /F /IM wpsoffice.exe 2>nul
