while($true) {
    $r = Add-Type -MemberDefinition '[DllImport("psapi.dll")] public static extern int EmptyWorkingSet(IntPtr hw);' -Name "psapi" -Namespace "win32" -PassThru -ErrorAction SilentlyContinue
    Get-Process opencode -ErrorAction SilentlyContinue | ForEach-Object {
        try { [win32.psapi]::EmptyWorkingSet($_.Handle) } catch {}
    }
    
    # Kill bloatware
    $kills = @('SearchHost','msedgewebview2','Widgets','ms-teams','SysInfoCap','AppHelperCap','NetworkCap','DiagsCap','HPCommRecovery','Taskmgr')
    foreach($p in $kills) { Stop-Process -Name $p -Force -ErrorAction SilentlyContinue }
    
    Start-Sleep 30
}
