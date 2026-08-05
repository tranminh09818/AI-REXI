while($true) {
    # Empty opencode working set
    $r = Add-Type -MemberDefinition '[DllImport("psapi.dll")] public static extern int EmptyWorkingSet(IntPtr hw);' -Name "psapi" -Namespace "win32" -PassThru -ErrorAction SilentlyContinue
    Get-Process opencode -ErrorAction SilentlyContinue | ForEach-Object {
        try { [win32.psapi]::EmptyWorkingSet($_.Handle) } catch {}
    }
    
    # Kill bloatware ONLY - keep freebuff, cline, opencode
    $kills = @('SearchHost','msedgewebview2','Widgets','ms-teams','SysInfoCap','AppHelperCap','NetworkCap','DiagsCap','HPCommRecovery','wps','wpsoffice','promecefpluginhost','wpscloudsvr','wpscenter','Taskmgr','OfficeClickToRun')
    foreach($p in $kills) { 
        Get-Process -Name $p -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    }
    
    Start-Sleep 30
}
