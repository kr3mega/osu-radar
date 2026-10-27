Add-Type -AssemblyName System.Drawing

$srcPath = (Resolve-Path "osu! Official Design Package\Package\Logos\Raster Output\osu!logo_1024.png").Path
$destDir = (Resolve-Path "public").Path
$icoPath = Join-Path $destDir "app.ico"
$distIcoPath = (Resolve-Path "dist").Path | ForEach-Object { Join-Path $_ "app.ico" }

$src = [System.Drawing.Bitmap]::FromFile($srcPath)

# Standard Windows icon sizes (from 256 to 16)
$sizes = @(256, 128, 64, 48, 32, 16)
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
[System.IO.File]::WriteAllBytes($icoPath, $icoBytes)
if ($distIcoPath) {
    [System.IO.File]::WriteAllBytes($distIcoPath, $icoBytes)
}
$ms.Dispose()

foreach ($bmp in $bitmaps) { $bmp.Dispose() }
$src.Dispose()

Write-Host "Generated master official $icoPath from 1024x1024 source successfully!"
