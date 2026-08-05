# Kill bloatware every run
$kill = @('SearchHost','msedgewebview2','Widgets','ms-teams','SysInfoCap','AppHelperCap','NetworkCap','DiagsCap','HPCommRecovery','Taskmgr','OfficeClickToRun','sqlservr','WmiPrvSE','MoUsoCoreWorker','OneDrive','SecurityHealthSystray','RtkAudUService64')
foreach($p in $kill) { 
    Get-Process -Name $p -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

# Empty working sets of all processes
Add-Type -MemberDefinition '[DllImport("psapi.dll")] public static extern int EmptyWorkingSet(IntPtr hw);' -Name "psapi" -Namespace "win32" -PassThru
Get-Process | ForEach-Object { 
    try { [win32.psapi]::EmptyWorkingSet($_.Handle) } catch {} 
}

# Force system to trim working sets
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class MemOpt {
    [DllImport("kernel32.dll")] public static extern bool SetProcessWorkingSetSize(IntPtr p, int min, int max);
    [DllImport("kernel32.dll")] public static extern IntPtr GetCurrentProcess();
}
"@
$proc = [MemOpt]::GetCurrentProcess()
[MemOpt]::SetProcessWorkingSetSize($proc, -1, -1) | Out-Null
