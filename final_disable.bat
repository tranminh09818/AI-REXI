@echo off
echo Stopping Windows Defender...
net stop WinDefend /y
sc config WinDefend start= disabled

echo Stopping WdNisSvc...
net stop WdNisSvc /y
sc config WdNisSvc start= disabled

echo Killing MsMpEng...
taskkill /F /IM MsMpEng.exe
taskkill /F /IM MpDefenderCoreService.exe

echo Disabling HP services...
net stop SysInfoCap /y 2>nul
sc config SysInfoCap start= disabled 2>nul
net stop HPAppHelperCap /y 2>nul
sc config HPAppHelperCap start= disabled 2>nul
net stop HPDiagsCap /y 2>nul
sc config HPDiagsCap start= disabled 2>nul
net stop HPNetworkCap /y 2>nul
sc config HPNetworkCap start= disabled 2>nul
net stop HPSysInfoCap /y 2>nul
sc config HPSysInfoCap start= disabled 2>nul
net stop "HP Comm Recover" /y 2>nul
sc config "HP Comm Recover" start= disabled 2>nul

echo Disabling SQL Server...
net stop MSSQLSERVER /y 2>nul
sc config MSSQLSERVER start= disabled 2>nul

echo Disabling Office...
net stop ClickToRunSvc /y 2>nul
sc config ClickToRunSvc start= disabled 2>nul

echo Done!
pause
