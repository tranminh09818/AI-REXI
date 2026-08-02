Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

try {
    $screen = [System.Windows.Forms.Screen]::PrimaryScreen
    $bmp = New-Object System.Drawing.Bitmap($screen.Bounds.Width, $screen.Bounds.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.CopyFromScreen($screen.Bounds.Location, [System.Drawing.Point]::Empty, $screen.Bounds.Size)
    
    $outPath = "d:\AI REXI\screen_current.png"
    $bmp.Save($outPath)
    $graphics.Dispose()
    $bmp.Dispose()
    
    "OK" | Out-File "d:\AI REXI\scratch\capture_status.txt"
} catch {
    $_ | Out-File "d:\AI REXI\scratch\capture_status.txt"
}
