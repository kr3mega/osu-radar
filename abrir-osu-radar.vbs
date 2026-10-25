Option Explicit
Dim shell, fso, rootDir
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
rootDir = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = rootDir
shell.Run "wscript """ & rootDir & "\abrir-osu-skills.vbs""", 1, False
