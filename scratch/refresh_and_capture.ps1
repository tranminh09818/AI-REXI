Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

try {
    # Send F5 key to refresh Cốc Cốc window if active
    [System.Windows.Forms.SendKeys]::SendWait('{F5}')
    Start-Sleep -Seconds 3
    
    $screen = [System.Windows.Forms.Screen]::PrimaryScreen
    $bmp = New-Object System.Drawing.Bitmap($screen.Bounds.Width, $screen.Bounds.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.CopyFromScreen($screen.Bounds.Location, [System.Drawing.Point]::Empty, $screen.Bounds.Size)
    
    $outputPath = "d:\AI REXI\scratch\proof_screen_browser.png"
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bmp.Dispose()
    
    "OK" | Out-File "d:\AI REXI\scratch\proof_status.txt" -Encoding utf8
} catch {
    $_.Exception.Message | Out-File "d:\AI REXI\scratch\proof_status.txt" -Encoding utf8
}
