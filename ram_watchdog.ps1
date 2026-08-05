while($true) {
    $kill = @('msedgewebview2','Widgets','SearchHost','ms-teams','SysInfoCap','AppHelperCap','NetworkCap','DiagsCap','HPCommRecovery','Taskmgr','OfficeClickToRun','sqlservr','wslservice','MoUsoCoreWorker')
    foreach($p in $kill) { Stop-Process -Name $p -Force -ErrorAction SilentlyContinue }
    Start-Sleep 10
}
