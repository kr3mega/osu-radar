$sh = (New-Object -ComObject WScript.Shell).CreateShortcut("$env:USERPROFILE\Desktop\osu!.lnk")
Write-Host "TargetPath: $($sh.TargetPath)"
Write-Host "IconLocation: $($sh.IconLocation)"
