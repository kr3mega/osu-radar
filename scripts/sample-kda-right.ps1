Add-Type -AssemblyName System.Drawing

$userProfile = $env:USERPROFILE
$imgPath = Join-Path $userProfile ".gemini\antigravity\brain\2b0fa344-e226-46ab-9900-ff771c54090d\.user_uploaded\media_1793039813105_9422b898.png"
$bmp = [System.Drawing.Bitmap]::FromFile($imgPath)

$colors = @()
for ($y = 40; $y -lt 160; $y += 6) {
    for ($x = 550; $x -lt 720; $x += 6) {
        $p = $bmp.GetPixel($x, $y)
        if ($p.R + $p.G + $p.B -gt 350) {
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
