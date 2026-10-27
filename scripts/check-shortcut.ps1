$desktop = [Environment]::GetFolderPath('Desktop')
$lnkPath = Join-Path $desktop "osu!skills.lnk"
if (Test-Path $lnkPath) {
    $sh = (New-Object -ComObject WScript.Shell).CreateShortcut($lnkPath)
    Write-Host "Shortcut Exists: $lnkPath"
    Write-Host "TargetPath: $($sh.TargetPath)"
    Write-Host "IconLocation: $($sh.IconLocation)"
} else {
    Write-Host "Shortcut does NOT exist at $lnkPath"
}
