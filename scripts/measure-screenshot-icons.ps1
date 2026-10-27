Add-Type -AssemblyName System.Drawing

$targetDir = "$env:USERPROFILE\.gemini\antigravity\brain\2b0fa344-e226-46ab-9900-ff771c54090d\.user_uploaded"
$imgPath = Join-Path $targetDir "media_1793061417545_d5e4598d.png"
$bmp = [System.Drawing.Bitmap]::FromFile($imgPath)

Write-Host "Screenshot size: $($bmp.Width) x $($bmp.Height)"

# Find the bounding boxes of the two icons:
# Left icon (Osu!Skills): x from 0 to 100
# Right icon (osu!): x from 80 to 200

function GetCircleBounds($bmp, $startX, $endX) {
    $minX = $endX; $maxX = $startX; $minY = $bmp.Height; $maxY = 0
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        for ($x = $startX; $x -lt $endX; $x++) {
            $p = $bmp.GetPixel($x, $y)
            # Find pink pixels (R > 200, G < 150, B > 130)
            if ($p.R -gt 200 -and $p.G -lt 160 -and $p.B -gt 130) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    return [PSCustomObject]@{
        MinX = $minX; MaxX = $maxX; MinY = $minY; MaxY = $maxY
        Width = $maxX - $minX + 1
        Height = $maxY - $minY + 1
    }
}

$left = GetCircleBounds $bmp 0 90
$right = GetCircleBounds $bmp 85 $bmp.Width

Write-Host "Left (Osu!Skills): Width=$($left.Width), Height=$($left.Height)"
Write-Host "Right (osu! official): Width=$($right.Width), Height=$($right.Height)"
Write-Host "Ratio (osu! / Osu!Skills): $([math]::Round($right.Width / $left.Width, 3))"

$bmp.Dispose()
