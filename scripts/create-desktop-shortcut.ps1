$WshShell = New-Object -ComObject WScript.Shell
$desktopPath = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopPath 'osu!skills.lnk'
$shortcut = $WshShell.CreateShortcut($shortcutPath)
$projectDir = (Resolve-Path .).Path
$electronExe = Join-Path $projectDir 'node_modules\electron\dist\electron.exe'
$iconPath = Join-Path $projectDir 'public\app.ico'

$shortcut.TargetPath = $electronExe
$shortcut.Arguments = '.'
$shortcut.WorkingDirectory = $projectDir
$shortcut.IconLocation = "$iconPath,0"
$shortcut.Description = "osu!skills - Treinador e Visualizador de Habilidades para osu!"
$shortcut.Save()

Write-Host "Created shortcut successfully at: $shortcutPath"
