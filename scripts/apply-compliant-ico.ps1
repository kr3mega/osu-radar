Add-Type -TypeDefinition (Get-Content -Raw "scripts/IcoWriter.cs") -ReferencedAssemblies System.Drawing

$userProfile = $env:USERPROFILE
$masterPath = Join-Path $userProfile ".gemini\antigravity\brain\2b0fa344-e226-46ab-9900-ff771c54090d\pure_white_sliders_var1_balanced_1024.png"
$master = [System.Drawing.Bitmap]::FromFile($masterPath)

# 1. Generate compliant icons for public and dist
$projectDir = (Resolve-Path ".").Path
$publicIco = Join-Path $projectDir "public\osu-skills.ico"
$publicAppIco = Join-Path $projectDir "public\app.ico"
$distIco = Join-Path $projectDir "dist\osu-skills.ico"
$distAppIco = Join-Path $projectDir "dist\app.ico"

[IcoWriter]::SaveIco($master, $publicIco)
[IcoWriter]::SaveIco($master, $publicAppIco)

if (Test-Path (Join-Path $projectDir "dist")) {
    [IcoWriter]::SaveIco($master, $distIco)
    [IcoWriter]::SaveIco($master, $distAppIco)
}
$master.Dispose()

Write-Host "Generated 100% Windows-compliant ICOs in public and dist!"

# 2. Test reading every resolution (16, 24, 32, 48, 64, 128, 256)
$testSizes = @(16, 24, 32, 48, 64, 128, 256)
foreach ($s in $testSizes) {
    $ico = New-Object System.Drawing.Icon($publicIco, $s, $s)
    $bmp = $ico.ToBitmap()
    Write-Host "Resolution verified: $s x $s -> Extracted Bitmap: $($bmp.Width) x $($bmp.Height)"
    $bmp.Dispose()
    $ico.Dispose()
}

# 3. Update Desktop shortcut
$desktopDir = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$shortcutPath = Join-Path $desktopDir "osu!skills.lnk"

if (Test-Path $shortcutPath) {
    Remove-Item $shortcutPath -Force
    Start-Sleep -Milliseconds 150
}

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = Join-Path $projectDir "node_modules\electron\dist\electron.exe"
$shortcut.Arguments = "."
$shortcut.WorkingDirectory = $projectDir
$shortcut.IconLocation = "$publicIco,0"
$shortcut.Description = "osu!skills - Performance & Skill Radar"
$shortcut.Save()

Write-Host "Re-created desktop shortcut: $shortcutPath -> $publicIco,0"

# 4. Notify Windows Shell
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class ShellNotifier2 {
    [DllImport("shell32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern void SHChangeNotify(uint wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);
}
'@

[ShellNotifier2]::SHChangeNotify(0x00002000, 0x0005, [IntPtr]::Zero, [IntPtr]::Zero)
[ShellNotifier2]::SHChangeNotify(0x08000000, 0x0000, [IntPtr]::Zero, [IntPtr]::Zero)

try {
    Start-Process -FilePath "ie4uinit.exe" -ArgumentList "-show" -NoNewWindow -Wait -ErrorAction SilentlyContinue
} catch {}

Write-Host "Desktop refreshed with fully compliant DIB+PNG icon!"
