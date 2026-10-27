Add-Type -AssemblyName System.Drawing

$exePath = "$env:USERPROFILE\AppData\Local\osu!\osu!.exe"
$ico = [System.Drawing.Icon]::ExtractAssociatedIcon($exePath)
$bmp = $ico.ToBitmap()

$targetDir = "$env:USERPROFILE\.gemini\antigravity\brain\2b0fa344-e226-46ab-9900-ff771c54090d"
$outPng = Join-Path $targetDir "official_game_icon.png"
$bmp.Save($outPng, [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "Extracted official osu!.exe icon: $($bmp.Width)x$($bmp.Height)"

# Now measure the exact diameter of the circle in official_game_icon.png
$minX = $bmp.Width
$maxX = 0
$minY = $bmp.Height
$maxY = 0

for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
        $pixel = $bmp.GetPixel($x, $y)
        if ($pixel.A -gt 20) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

$diameterX = $maxX - $minX + 1
$diameterY = $maxY - $minY + 1
$ratio = $diameterX / $bmp.Width

Write-Host "Bounds: minX=$minX, maxX=$maxX, minY=$minY, maxY=$maxY"
Write-Host "Diameter: $diameterX x $diameterY"
Write-Host "Circle Ratio in icon: $ratio ($([math]::Round($ratio * 100, 1))%)"

$ico.Dispose()
$bmp.Dispose()
