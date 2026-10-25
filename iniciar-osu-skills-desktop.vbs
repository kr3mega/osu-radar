' ==============================================================================
' osu!skills Desktop - Inicializador Silencioso (Zero Prompt / Headless Launcher)
' ==============================================================================
' Este script inicia o osu!skills Desktop sem abrir nenhuma janela preta de comando.
' Todos os logs continuam sendo gravados e arquivados automaticamente em:
'   logs\electron-desktop.log
' ==============================================================================

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

appDir = fso.GetParentFolderName(WScript.ScriptFullName)
electronExe = appDir & "\node_modules\electron\dist\electron.exe"
mainJs = appDir & "\dist-electron\electron\main.js"

WshShell.CurrentDirectory = appDir

If Not fso.FileExists(mainJs) Then
  WshShell.Run "cmd /c npm run electron:build", 0, True
End If

WshShell.Run """" & electronExe & """ """ & appDir & """", 0, False
