Add-Type -AssemblyName System.Windows.Forms
$signature = @"
[DllImport("user32.dll")]
public static extern bool SetForegroundWindow(IntPtr hWnd);
[DllImport("user32.dll")]
public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
"@
$type = Add-Type -MemberDefinition $signature -Name "Win32UtilsApp" -Namespace Win32 -PassThru

# Focus browser window
$procs = Get-Process | Where-Object { $_.MainWindowTitle -like '*localhost:3000*' -or $_.ProcessName -like '*browser*' -or $_.ProcessName -like '*coccoc*' -or $_.MainWindowTitle -like '*http*' }
foreach ($p in $procs) {
    if ($p.MainWindowHandle -ne 0) {
        $type::ShowWindow($p.MainWindowHandle, 9)
        $type::SetForegroundWindow($p.MainWindowHandle)
        Start-Sleep -Milliseconds 500
        # Send F5 to refresh
        [System.Windows.Forms.SendKeys]::SendWait("{F5}")
        Start-Sleep -Seconds 3
    }
}

Start-Sleep -Seconds 2

# Capture Screen
Add-Type -AssemblyName System.Drawing
$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$bmp = New-Object System.Drawing.Bitmap($screen.Bounds.Width, $screen.Bounds.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bmp)
$graphics.CopyFromScreen($screen.Bounds.Location, [System.Drawing.Point]::Empty, $screen.Bounds.Size)

$outputPath = "d:\AI REXI\scratch\proof_screen.png"
$bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bmp.Dispose()
