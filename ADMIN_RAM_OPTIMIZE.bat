@echo off
echo ============================================
echo   STEP 1: Disable Tamper Protection
echo ============================================
echo.
echo Please follow these steps in Windows Security:
echo 1. Open Windows Security (click shield icon in taskbar)
echo 2. Click "Virus & threat protection"
echo 3. Click "Manage settings" under "Virus & threat protection settings"
echo 4. Turn OFF "Tamper Protection"
echo 5. Come back here and press any key
echo.
pause

echo.
echo ============================================
echo   STEP 2: Apply Registry Changes
echo ============================================
echo.

echo [1/4] Disabling Tamper Protection...
reg add "HKLM\SOFTWARE\Microsoft\Windows Defender\Features" /v TamperProtection /t REG_DWORD /d 0 /f
reg add "HKLM\SOFTWARE\Microsoft\Windows Defender\Features" /v IsTamperProtected /t REG_DWORD /d 0 /f

echo [2/4] Disabling Windows Defender...
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows Defender" /v DisableAntiSpyware /t REG_DWORD /d 1 /f
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows Defender" /v DisableAntiVirus /t REG_DWORD /d 1 /f
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows Defender\Real-Time Protection" /v DisableRealtimeMonitoring /t REG_DWORD /d 1 /f
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows Defender\Real-Time Protection" /v DisableBehaviorMonitoring /t REG_DWORD /d 1 /f
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows Defender\Real-Time Protection" /v DisableScanOnRealtimeEnable /t REG_DWORD /d 1 /f
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows Defender\Real-Time Protection" /v DisableIOAVProtection /t REG_DWORD /d 1 /f

echo [3/4] Stopping services...
net stop WinDefend /y
net stop WdNisSvc /y
net stop Sense /y
sc config WinDefend start= disabled
sc config WdNisSvc start= disabled
sc config Sense start= disabled

echo [4/4] Killing processes...
taskkill /F /IM MsMpEng.exe
taskkill /F /IM MpDefenderCoreService.exe

echo.
echo ============================================
echo   STEP 3: Disable Other Services
echo ============================================
echo.
net stop SysInfoCap /y & sc config SysInfoCap start= disabled
net stop HPAppHelperCap /y & sc config HPAppHelperCap start= disabled
net stop HPDiagsCap /y & sc config HPDiagsCap start= disabled
net stop HPNetworkCap /y & sc config HPNetworkCap start= disabled
net stop HPSysInfoCap /y & sc config HPSysInfoCap start= disabled
net stop "HP Comm Recover" /y & sc config "HP Comm Recover" start= disabled
net stop MSSQLSERVER /y & sc config MSSQLSERVER start= disabled
net stop ClickToRunSvc /y & sc config ClickToRunSvc start= disabled

echo.
echo ============================================
echo   STEP 4: Kill All Bloatware
echo ============================================
echo.
taskkill /F /IM SysInfoCap.exe
taskkill /F /IM AppHelperCap.exe
taskkill /F /IM NetworkCap.exe
taskkill /F /IM DiagsCap.exe
taskkill /F /IM HPCommRecovery.exe
taskkill /F /IM sqlservr.exe
taskkill /F /IM OfficeClickToRun.exe
taskkill /F /IM SearchHost.exe
taskkill /F /IM msedgewebview2.exe
taskkill /F /IM Widgets.exe
taskkill /F /IM ms-teams.exe
taskkill /F /IM wps.exe
taskkill /F /IM Taskmgr.exe

echo.
echo ============================================
echo   ALL DONE! Press any key to exit...
echo ============================================
pause >nul
