Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

try {
    Start-Process "http://localhost:3000"
    Start-Sleep -Seconds 3

    $screen = [System.Windows.Forms.Screen]::PrimaryScreen
    $bmp = New-Object System.Drawing.Bitmap($screen.Bounds.Width, $screen.Bounds.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.CopyFromScreen($screen.Bounds.Location, [System.Drawing.Point]::Empty, $screen.Bounds.Size)
    
    $bmp.Save("C:\Users\84916\.gemini\antigravity\brain\d0c83d56-b24a-4539-a279-d63d1f79e964\web_screen.png")
    $graphics.Dispose()
    $bmp.Dispose()
} catch {}
