Add-Type -AssemblyName System.Drawing

$userProfile = $env:USERPROFILE
$imgPath = Join-Path $userProfile ".gemini\antigravity\brain\2b0fa344-e226-46ab-9900-ff771c54090d\.user_uploaded\media_1793039813105_9422b898.png"
$bmp = [System.Drawing.Bitmap]::FromFile($imgPath)

Write-Host "K/DA Image dimensions: $($bmp.Width) x $($bmp.Height)"

# Sample points from the "ALL OUT" background and letters
$colors = @()
for ($y = 100; $y -lt 400; $y += 10) {
    for ($x = 50; $x -lt 400; $x += 10) {
        $p = $bmp.GetPixel($x, $y)
        $hex = "#{0:X2}{1:X2}{2:X2}" -f $p.R, $p.G, $p.B
        $colors += $hex
    }
}
$bmp.Dispose()

$grouped = $colors | Group-Object | Sort-Object Count -Descending | Select-Object -First 25
foreach ($g in $grouped) {
    Write-Host "$($g.Name) : $($g.Count)"
}
