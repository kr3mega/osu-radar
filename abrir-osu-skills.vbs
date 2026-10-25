Option Explicit

Dim fso, shell, rootDir, electronExe, distHtml, mainJs
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

rootDir = fso.GetParentFolderName(WScript.ScriptFullName)
If Right(rootDir, 1) = "\" Then
  rootDir = Left(rootDir, Len(rootDir) - 1)
End If

electronExe = rootDir & "\node_modules\electron\dist\electron.exe"
distHtml = rootDir & "\dist\index.html"
mainJs = rootDir & "\dist-electron\electron\main.js"

shell.CurrentDirectory = rootDir

If fso.FileExists(electronExe) And fso.FileExists(distHtml) And fso.FileExists(mainJs) Then
  shell.Run """" & electronExe & """ """ & rootDir & """", 1, False
Else
  shell.Run """" & rootDir & "\iniciar-osu-skills-desktop.bat""", 1, False
End If
