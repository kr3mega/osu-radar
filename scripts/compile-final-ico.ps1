Add-Type -AssemblyName System.Drawing

$userProfile = $env:USERPROFILE
$srcPath = Join-Path $userProfile ".gemini\antigravity\brain\2b0fa344-e226-46ab-9900-ff771c54090d\pure_white_sliders_var1_balanced_1024.png"
$projectDir = (Resolve-Path ".").Path
$destDir = Join-Path $projectDir "public"
$distDir = Join-Path $projectDir "dist"
$icoPath = Join-Path $destDir "osu-skills.ico"
$appIcoPath = Join-Path $destDir "app.ico"
$pngPath = Join-Path $destDir "app.png"

if (-not (Test-Path $srcPath)) {
    Write-Error "Source file not found: $srcPath"
    exit 1
}

$src = [System.Drawing.Bitmap]::FromFile($srcPath)

# High-quality Windows icon resolutions
$sizes = @(256, 128, 64, 48, 32, 24, 16)
$bitmaps = @()

foreach ($sz in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($sz, $sz)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($src, 0, 0, $sz, $sz)
    $g.Dispose()
    $bitmaps += $bmp
}

# Write multi-resolution ICO
$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ms)

$bw.Write([uint16]0)
$bw.Write([uint16]1)
$bw.Write([uint16]$bitmaps.Count)

$offset = 6 + (16 * $bitmaps.Count)
$pngDataList = @()

foreach ($bmp in $bitmaps) {
    $imgStream = New-Object System.IO.MemoryStream
    $bmp.Save($imgStream, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = $imgStream.ToArray()
    $pngDataList += ,$bytes
    $imgStream.Dispose()
}

for ($i = 0; $i -lt $bitmaps.Count; $i++) {
    $sz = $sizes[$i]
    $w = if ($sz -ge 256) { 0 } else { [byte]$sz }
    $h = if ($sz -ge 256) { 0 } else { [byte]$sz }
    $bytes = $pngDataList[$i]
    
    $bw.Write([byte]$w)
    $bw.Write([byte]$h)
    $bw.Write([byte]0)
    $bw.Write([byte]0)
    $bw.Write([uint16]1)
    $bw.Write([uint16]32)
    $bw.Write([uint32]$bytes.Length)
    $bw.Write([uint32]$offset)
    
    $offset += $bytes.Length
}

for ($i = 0; $i -lt $pngDataList.Count; $i++) {
    $bw.Write($pngDataList[$i])
}

$bw.Flush()
$icoBytes = $ms.ToArray()

# Save to public/osu-skills.ico and public/app.ico
[System.IO.File]::WriteAllBytes($icoPath, $icoBytes)
[System.IO.File]::WriteAllBytes($appIcoPath, $icoBytes)

if (Test-Path $distDir) {
    [System.IO.File]::WriteAllBytes((Join-Path $distDir "osu-skills.ico"), $icoBytes)
    [System.IO.File]::WriteAllBytes((Join-Path $distDir "app.ico"), $icoBytes)
}
$ms.Dispose()

foreach ($bmp in $bitmaps) { $bmp.Dispose() }
$src.Dispose()

# Also save transparent 512x512 PNG
Copy-Item (Join-Path $userProfile ".gemini\antigravity\brain\2b0fa344-e226-46ab-9900-ff771c54090d\pure_white_sliders_var1_balanced.png") $pngPath -Force
if (Test-Path $distDir) {
    Copy-Item $pngPath (Join-Path $distDir "app.png") -Force
}

Write-Host "Generated master official $icoPath ($($icoBytes.Length) bytes) successfully!"

# Update Desktop shortcut with fresh icon
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
$shortcut.IconLocation = "$icoPath,0"
$shortcut.Description = "osu!skills - Performance & Skill Radar"
$shortcut.Save()

Write-Host "Re-created desktop shortcut: $shortcutPath -> $icoPath,0"

# Refresh shell icon cache
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class ShellNotifier {
    [DllImport("shell32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern void SHChangeNotify(uint wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);
}
'@
[ShellNotifier]::SHChangeNotify(0x00002000, 0x0005, [IntPtr]::Zero, [IntPtr]::Zero)
[ShellNotifier]::SHChangeNotify(0x08000000, 0x0000, [IntPtr]::Zero, [IntPtr]::Zero)

try {
    Start-Process -FilePath "ie4uinit.exe" -ArgumentList "-show" -NoNewWindow -Wait -ErrorAction SilentlyContinue
} catch {}

Write-Host "Shell icon cache notified successfully!"
