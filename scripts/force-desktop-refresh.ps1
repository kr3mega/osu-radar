Add-Type -TypeDefinition (Get-Content -Raw "scripts/IcoWriter.cs") -ReferencedAssemblies System.Drawing

$userProfile = $env:USERPROFILE
$projectDir = (Resolve-Path ".").Path
$destDir = Join-Path $projectDir "public"
$distDir = Join-Path $projectDir "dist"

# Source 1024x1024 master PNG (pure white clean sliders)
$masterPath = Join-Path $userProfile ".gemini\antigravity\brain\2b0fa344-e226-46ab-9900-ff771c54090d\pure_white_sliders_var1_balanced_1024.png"
if (-not (Test-Path $masterPath)) {
    Write-Error "Master file not found: $masterPath"
    exit 1
}

$master = [System.Drawing.Bitmap]::FromFile($masterPath)

# Use a brand new unique filename that Windows IconCache has NEVER seen:
$uniqueIcoName = "osu-skills-clean.ico"
$cleanIcoPath = Join-Path $destDir $uniqueIcoName
$distCleanIcoPath = Join-Path $distDir $uniqueIcoName

[IcoWriter]::SaveIco($master, $cleanIcoPath)
[IcoWriter]::SaveIco($master, (Join-Path $destDir "app.ico"))
[IcoWriter]::SaveIco($master, (Join-Path $destDir "osu-skills.ico"))

if (Test-Path $distDir) {
    [IcoWriter]::SaveIco($master, $distCleanIcoPath)
    [IcoWriter]::SaveIco($master, (Join-Path $distDir "app.ico"))
    [IcoWriter]::SaveIco($master, (Join-Path $distDir "osu-skills.ico"))
}
$master.Dispose()

Write-Host "Created fresh unique ICO: $cleanIcoPath"

# 1. Update/Re-create Desktop Shortcut
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
$sc.IconLocation = "$cleanIcoPath,0"
$sc.Description = "osu!skills - Performance & Skill Radar"
$sc.Save()
Write-Host "Re-created Desktop Shortcut: $desktopShortcut -> $cleanIcoPath,0"

# 2. Also create/update Start Menu ("Tela Inicial") Shortcut:
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
$scStart.IconLocation = "$cleanIcoPath,0"
$scStart.Description = "osu!skills - Performance & Skill Radar"
$scStart.Save()
Write-Host "Created Start Menu (Tela Inicial) Shortcut: $startMenuShortcut -> $cleanIcoPath,0"

# 3. Force Windows Explorer to Refresh the Desktop
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public class DesktopRefresher {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr FindWindowEx(IntPtr parentHandle, IntPtr childAfter, string className, string windowTitle);

    [DllImport("user32.dll")]
    public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("shell32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern void SHChangeNotify(uint wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);

    public static void RefreshDesktop() {
        // Send SHCNE_ASSOCCHANGED with SHCNF_FLUSH (0x1000)
        SHChangeNotify(0x08000000, 0x1000, IntPtr.Zero, IntPtr.Zero);
        
        // Find Desktop ListView and send Refresh command (28931 = 0x7103)
        IntPtr hProgman = FindWindow("Progman", null);
        if (hProgman != IntPtr.Zero) {
            IntPtr hShellView = FindWindowEx(hProgman, IntPtr.Zero, "SHELLDLL_DefView", null);
            if (hShellView != IntPtr.Zero) {
                SendMessage(hShellView, 0x0111, new IntPtr(28931), IntPtr.Zero);
            }
        }
        
        // Also check WorkerW windows for modern Windows 10/11
        IntPtr hWorker = IntPtr.Zero;
        do {
            hWorker = FindWindowEx(IntPtr.Zero, hWorker, "WorkerW", null);
            if (hWorker != IntPtr.Zero) {
                IntPtr hView = FindWindowEx(hWorker, IntPtr.Zero, "SHELLDLL_DefView", null);
                if (hView != IntPtr.Zero) {
                    SendMessage(hView, 0x0111, new IntPtr(28931), IntPtr.Zero);
                }
            }
        } while (hWorker != IntPtr.Zero);
    }
}
'@

[DesktopRefresher]::RefreshDesktop()
Write-Host "Sent native Win32 Desktop Refresh command (F5 equivalent) to Shell!"

# Also call ie4uinit
try {
    Start-Process -FilePath "ie4uinit.exe" -ArgumentList "-show" -NoNewWindow -Wait -ErrorAction SilentlyContinue
} catch {}

Write-Host "All shortcuts and caches fully updated!"
