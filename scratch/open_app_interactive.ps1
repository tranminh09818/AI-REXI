Add-Type -AssemblyName System.Windows.Forms
$signature = @"
[DllImport("user32.dll")]
public static extern bool SetForegroundWindow(IntPtr hWnd);
[DllImport("user32.dll")]
public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
"@
$type = Add-Type -MemberDefinition $signature -Name "Win32UtilsApp" -Namespace Win32 -PassThru

# Mở Explorer và chọn file
$filePath = "d:\AI REXI\scratch\open_app.url"
explorer.exe /select,$filePath

# Đợi Explorer mở
Start-Sleep -Seconds 3

# Focus vào Explorer window (tên folder là scratch)
$procs = Get-Process | Where-Object { $_.MainWindowTitle -like '*scratch*' -or $_.ProcessName -eq 'explorer' }
foreach ($p in $procs) {
    if ($p.MainWindowTitle -ne "") {
        $type::ShowWindow($p.MainWindowHandle, 9)
        $type::SetForegroundWindow($p.MainWindowHandle)
        Start-Sleep -Milliseconds 500
    }
}

# Gửi phím Enter để thực sự mở file
[System.Windows.Forms.SendKeys]::SendWait("{ENTER}")

Start-Sleep -Seconds 3

# Chụp lại màn hình để làm minh chứng
Add-Type -AssemblyName System.Drawing
$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$bmp = New-Object System.Drawing.Bitmap($screen.Bounds.Width, $screen.Bounds.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
$graphics.CopyFromScreen($screen.Bounds.Location, [System.Drawing.Point]::Empty, $screen.Bounds.Size)

$outputPath = "d:\AI REXI\scratch\proof_screen.png"
$bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bmp.Dispose()
