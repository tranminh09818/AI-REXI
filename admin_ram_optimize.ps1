Write-Host "=== RAM OPTIMIZER - ADMIN MODE ===" -ForegroundColor Green
Write-Host ""

# Stop and disable services
$services = @('MSSQLSERVER','ClickToRunSvc','SysInfoCap','HPAppHelperCap','HPDiagsCap','HPNetworkCap','HPSysInfoCap','HP Comm Recover','WSearch','SysMain','DiagTrack')
foreach($svc in $services) {
    Stop-Service $svc -Force -ErrorAction SilentlyContinue
    Set-Service $svc -StartupType Disabled -ErrorAction SilentlyContinue
    Write-Host "Disabled: $svc" -ForegroundColor Yellow
}

# Kill processes
$processes = @('sqlservr','MsMpEng','SysInfoCap','Taskmgr','OfficeClickToRun','AppHelperCap','NetworkCap','DiagsCap','HPCommRecovery','SearchHost','msedgewebview2','Widgets','ms-teams')
foreach($p in $processes) {
    Stop-Process -Name $p -Force -ErrorAction SilentlyContinue
    Write-Host "Killed: $p" -ForegroundColor Red
}

# Empty working sets
Add-Type -MemberDefinition '[DllImport("psapi.dll")] public static extern int EmptyWorkingSet(IntPtr hw);' -Name "psapi" -Namespace "win32" -PassThru
Get-Process | ForEach-Object { try { [win32.psapi]::EmptyWorkingSet($_.Handle) } catch {} }

Start-Sleep 2
$os = Get-CimInstance Win32_OperatingSystem
$total = [math]::Round($os.TotalVisibleMemorySize/1MB,2)
$free = [math]::Round($os.FreePhysicalMemory/1MB,2)
$used = $total - $free
$pct = [math]::Round(($used/$total)*100,1)
Write-Host ""
Write-Host "=== RESULT ===" -ForegroundColor Green
Write-Host "Total: ${total}GB | Used: ${used}GB | Free: ${free}GB | Usage: ${pct}%"
if ($pct -lt 40) { Write-Host "SUCCESS: Under 40%!" -ForegroundColor Green }
else { Write-Host "Still above 40% - some processes may need manual intervention" -ForegroundColor Yellow }
