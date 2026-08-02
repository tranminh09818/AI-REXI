# PowerShell script chạy theo Task Scheduler Session 1
$logFile = "d:\AI REXI\scratch\loop_test.log"
"Starting test pipeline..." | Out-File $logFile

try {
    # Bước 1: Khởi động Backend server nếu chưa chạy
    $port5000 = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
    if (-not $port5000) {
        "Starting Backend..." | Out-File $logFile -Append
        Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "d:\AI REXI\Backend" -WindowStyle Hidden
        Start-Sleep -Seconds 3
    } else {
        "Backend port 5000 is already active" | Out-File $logFile -Append
    }

    # Bước 1b: Khởi động Frontend vite nếu chưa chạy
    $port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
    if (-not $port5173) {
        "Starting Frontend..." | Out-File $logFile -Append
        Start-Process -FilePath "cmd.exe" -ArgumentList "/c npx vite" -WorkingDirectory "d:\AI REXI\Frontend" -WindowStyle Hidden
        Start-Sleep -Seconds 4
    } else {
        "Frontend port 5173 is already active" | Out-File $logFile -Append
    }

    # Bước 2: Mở trình duyệt Cốc Cốc / Chrome với địa chỉ Web http://localhost:5173
    "Opening Web in Browser..." | Out-File $logFile -Append
    Start-Process "http://localhost:5173"
    Start-Sleep -Seconds 5

    # Bước 3: Chụp ảnh màn hình kiểm thử kết quả thực tế
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    
    $screen = [System.Windows.Forms.Screen]::PrimaryScreen
    $bmp = New-Object System.Drawing.Bitmap($screen.Bounds.Width, $screen.Bounds.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.CopyFromScreen($screen.Bounds.Location, [System.Drawing.Point]::Empty, $screen.Bounds.Size)
    
    $outPath = "d:\AI REXI\scratch\verify_browser_result.png"
    $bmp.Save($outPath)
    $graphics.Dispose()
    $bmp.Dispose()
    
    "Pipeline execution finished successfully." | Out-File $logFile -Append
} catch {
    $_ | Out-File $logFile -Append
}
