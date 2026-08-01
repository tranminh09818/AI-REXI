@echo off
echo ===================================================
echo   AI REXI - System RAM Optimizer & Cleanup Tool
echo ===================================================
echo Clearing standby memory cache and temporary files...

powershell -Command "[System.GC]::Collect(); [System.GC]::WaitForPendingFinalizers()"
echo Cleaning temporary files...
del /q /f %TEMP%\*.* 2>nul
del /q /f "d:\AI REXI\Frontend\dev_err.log" 2>nul
del /q /f "d:\AI REXI\Frontend\dev_out.log" 2>nul
del /q /f "d:\AI REXI\Backend\server_err.log" 2>nul

echo System memory optimization finished.
