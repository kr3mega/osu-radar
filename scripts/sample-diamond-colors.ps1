Add-Type -AssemblyName System.Drawing

$userProfile = $env:USERPROFILE
$imgPath = Join-Path $userProfile ".gemini\antigravity\brain\2b0fa344-e226-46ab-9900-ff771c54090d\.user_uploaded\media_1793038398192_d16af164.png"
$bmp = [System.Drawing.Bitmap]::FromFile($imgPath)

Write-Host "Image dimensions: $($bmp.Width) x $($bmp.Height)"

# Sample points around the ring and shapes
$colors = @()
for ($y = 0; $y -lt $bmp.Height; $y += 4) {
    for ($x = 0; $x -lt $bmp.Width; $x += 4) {
        $p = $bmp.GetPixel($x, $y)
        # Filter out very dark background pixels
        if ($p.R + $p.G + $p.B -gt 250) {
            $hex = "#{0:X2}{1:X2}{2:X2}" -f $p.R, $p.G, $p.B
            $colors += $hex
        }
    }
}
$bmp.Dispose()

$grouped = $colors | Group-Object | Sort-Object Count -Descending | Select-Object -First 20
foreach ($g in $grouped) {
    Write-Host "$($g.Name) : $($g.Count)"
}
