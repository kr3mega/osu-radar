Add-Type -TypeDefinition (Get-Content -Raw "scripts/IcoWriter.cs") -ReferencedAssemblies System.Drawing

$userProfile = $env:USERPROFILE
$projectDir = (Resolve-Path ".").Path
$destDir = Join-Path $projectDir "public"
$distDir = Join-Path $projectDir "dist"

# Source master 1024x1024 PNG (Fundo Escuro Obsidiana com Elementos Diamante K/DA e Gradiente Perfeito em skills)
$masterPath = Join-Path $userProfile ".gemini\antigravity\brain\2b0fa344-e226-46ab-9900-ff771c54090d\kda_fixed_var1_spectrum_1024.png"
if (-not (Test-Path $masterPath)) {
    Write-Error "Master file not found: $masterPath"
    exit 1
}

$master = [System.Drawing.Bitmap]::FromFile($masterPath)

# Fresh unique icon filename so Windows Explorer immediately refreshes the cached icon
$uniqueIcoName = "osu-skills-kda.ico"
$kdaIcoPath = Join-Path $destDir $uniqueIcoName

[IcoWriter]::SaveIco($master, $kdaIcoPath)
[IcoWriter]::SaveIco($master, (Join-Path $destDir "osu-skills-clean.ico"))
[IcoWriter]::SaveIco($master, (Join-Path $destDir "osu-skills.ico"))
[IcoWriter]::SaveIco($master, (Join-Path $destDir "app.ico"))

if (Test-Path $distDir) {
    [IcoWriter]::SaveIco($master, (Join-Path $distDir $uniqueIcoName))
    [IcoWriter]::SaveIco($master, (Join-Path $distDir "osu-skills-clean.ico"))
    [IcoWriter]::SaveIco($master, (Join-Path $distDir "osu-skills.ico"))
    [IcoWriter]::SaveIco($master, (Join-Path $distDir "app.ico"))
}
$master.Dispose()

# Also save high-res transparent PNG to public/app.png and dist/app.png
Copy-Item (Join-Path $userProfile ".gemini\antigravity\brain\2b0fa344-e226-46ab-9900-ff771c54090d\kda_fixed_var1_spectrum.png") (Join-Path $destDir "app.png") -Force
if (Test-Path $distDir) {
    Copy-Item (Join-Path $destDir "app.png") (Join-Path $distDir "app.png") -Force
}

Write-Host "Generated fresh K/DA Diamond compliant ICOs in public and dist!"

# 1. Update Desktop Shortcut
$desktopDir = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$desktopShortcut = Join-Path $desktopDir "osu!skills.lnk"

if (Test-Path $desktopShortcut) {
    Remove-Item $desktopShortcut -Force
    Start-Sleep -Milliseconds 150
}

$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut($desktopShortcut)
$sc.TargetPath = Join-Path $projectDir "node_modules\electron\dist\electron.exe"
$sc.Arguments = "."
$sc.WorkingDirectory = $projectDir
$sc.IconLocation = "$kdaIcoPath,0"
$sc.Description = "osu!skills - Performance & Skill Radar"
$sc.Save()
Write-Host "Re-created Desktop Shortcut: $desktopShortcut -> $kdaIcoPath,0"

# 2. Update Start Menu Shortcut
$startMenuPrograms = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Programs)
$startMenuShortcut = Join-Path $startMenuPrograms "osu!skills.lnk"

if (Test-Path $startMenuShortcut) {
    Remove-Item $startMenuShortcut -Force
    Start-Sleep -Milliseconds 150
}

$scStart = $wsh.CreateShortcut($startMenuShortcut)
$scStart.TargetPath = Join-Path $projectDir "node_modules\electron\dist\electron.exe"
$scStart.Arguments = "."
$scStart.WorkingDirectory = $projectDir
$scStart.IconLocation = "$kdaIcoPath,0"
$scStart.Description = "osu!skills - Performance & Skill Radar"
$scStart.Save()
Write-Host "Re-created Start Menu Shortcut: $startMenuShortcut -> $kdaIcoPath,0"

# 3. Force Windows Explorer to Refresh the Desktop
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public class DesktopRefresherKDA {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr FindWindowEx(IntPtr parentHandle, IntPtr childAfter, string className, string windowTitle);

    [DllImport("user32.dll")]
    public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("shell32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern void SHChangeNotify(uint wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);

    public static void RefreshDesktop() {
        SHChangeNotify(0x08000000, 0x1000, IntPtr.Zero, IntPtr.Zero);
        
        IntPtr hProgman = FindWindow("Progman", null);
        if (hProgman != IntPtr.Zero) {
            IntPtr hShellDefView = FindWindowEx(hProgman, IntPtr.Zero, "SHELLDLL_DefView", null);
            if (hShellDefView != IntPtr.Zero) {
                SendMessage(hShellDefView, 0x0111, (IntPtr)28931, IntPtr.Zero);
            }
        }

        IntPtr hWorkerW = IntPtr.Zero;
        do {
            hWorkerW = FindWindowEx(IntPtr.Zero, hWorkerW, "WorkerW", null);
            if (hWorkerW != IntPtr.Zero) {
                IntPtr hView = FindWindowEx(hWorkerW, IntPtr.Zero, "SHELLDLL_DefView", null);
                if (hView != IntPtr.Zero) {
                    SendMessage(hView, 0x0111, (IntPtr)28931, IntPtr.Zero);
                }
            }
        } while (hWorkerW != IntPtr.Zero);
    }
}
'@

[DesktopRefresherKDA]::RefreshDesktop()
Write-Host "Windows Shell & Desktop cache notified of new K/DA icon!"
