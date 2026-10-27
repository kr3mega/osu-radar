$userProfile = $env:USERPROFILE
$desktop = [Environment]::GetFolderPath('Desktop')
$startMenu = [Environment]::GetFolderPath('StartMenu')
$programs = [Environment]::GetFolderPath('Programs')

Write-Host "Desktop: $desktop"
Get-ChildItem $desktop -Filter "*osu*" | ForEach-Object { Write-Host "Found in Desktop: $($_.FullName)" }

Write-Host "Start Menu: $startMenu"
Get-ChildItem -Recurse $startMenu -Filter "*osu*" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "Found in StartMenu: $($_.FullName)" }

Write-Host "Programs: $programs"
Get-ChildItem -Recurse $programs -Filter "*osu*" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "Found in Programs: $($_.FullName)" }
