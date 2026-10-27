Add-Type -AssemblyName System.Drawing

$userProfile = $env:USERPROFILE
$projectDir = (Resolve-Path ".").Path
$destDir = Join-Path $projectDir "public"
$desktopDir = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$shortcutPath = Join-Path $desktopDir "osu!skills.lnk"

# 1. Create a uniquely-named icon file to bypass Windows IconCache:
$newIcoPath = Join-Path $destDir "osu-skills.ico"
Copy-Item (Join-Path $destDir "app.ico") $newIcoPath -Force

if (Test-Path (Join-Path $projectDir "dist")) {
    Copy-Item (Join-Path $destDir "app.ico") (Join-Path $projectDir "dist\osu-skills.ico") -Force
}

Write-Host "Created fresh icon file: $newIcoPath"

# 2. Update shortcut IconLocation to the new unique path
$wsh = New-Object -ComObject WScript.Shell

# Delete old shortcut first so Windows shell detects a brand-new shortcut creation
if (Test-Path $shortcutPath) {
    Remove-Item $shortcutPath -Force
    Start-Sleep -Milliseconds 200
}

$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = Join-Path $projectDir "node_modules\electron\dist\electron.exe"
$shortcut.Arguments = "."
$shortcut.WorkingDirectory = $projectDir
$shortcut.IconLocation = "$newIcoPath,0"
$shortcut.Description = "osu!skills - Performance & Skill Radar"
$shortcut.Save()

Write-Host "Re-created desktop shortcut: $shortcutPath -> Icon: $newIcoPath,0"

# 3. Notify Windows Shell of file creation and association change
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class ShellHelper {
    [DllImport("shell32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern void SHChangeNotify(uint wEventId, uint uFlags, string dwItem1, string dwItem2);
}
'@

# SHCNE_CREATE (0x00000002) with SHCNF_PATHW (0x0005)
[ShellHelper]::SHChangeNotify(0x00000002, 0x0005, $shortcutPath, $null)

# SHCNE_UPDATEITEM (0x00002000) with SHCNF_PATHW (0x0005)
[ShellHelper]::SHChangeNotify(0x00002000, 0x0005, $shortcutPath, $null)

# SHCNE_ASSOCCHANGED (0x08000000) with SHCNF_IDLIST (0x0000)
[ShellHelper]::SHChangeNotify(0x08000000, 0x0000, $null, $null)

Write-Host "Notified Windows Shell: SHCNE_CREATE, SHCNE_UPDATEITEM, SHCNE_ASSOCCHANGED!"

# 4. Optional: ie4uinit to refresh icon cache on Windows 10/11
try {
    Start-Process -FilePath "ie4uinit.exe" -ArgumentList "-show" -NoNewWindow -Wait -ErrorAction SilentlyContinue
} catch {}

Write-Host "Done! Shortcut icon is now forced fresh!"
