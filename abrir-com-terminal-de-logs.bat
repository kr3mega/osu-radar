@echo off
setlocal enabledelayedexpansion
title osu!skills Desktop - Terminal de Logs
set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"
cd /d "%APP_DIR%"

cls
echo ================================================================================
echo                    osu!skills Desktop - Terminal de Logs
echo ================================================================================
echo  * Este terminal exibe em tempo real todos os eventos e acoes do app.
echo  * Os logs tambem sao salvos continuamente em: logs\electron-desktop.log
echo ================================================================================
echo.

:: Verifica se o Electron ja esta em execucao no sistema
tasklist /fi "imagename eq electron.exe" 2>nul | find /i "electron.exe" >nul
if not errorlevel 1 (
  echo [INFO] O osu!skills Desktop ja esta em execucao!
  echo [INFO] Conectando diretamente ao fluxo de logs do app ativo...
  echo [INFO] Pressione Ctrl+C a qualquer momento para fechar este terminal.
  echo.
  goto stream_logs
)

if not exist "%APP_DIR%\dist\index.html" goto build_app
if not exist "%APP_DIR%\dist-electron\electron\main.js" goto build_app
goto run_app

:build_app
echo [INFO] Compilando arquivos de producao...
call npm run electron:build
if errorlevel 1 (
  pause
  exit /b 1
)

:run_app
set "ELECTRON_ENABLE_LOGGING=1"
if exist "%APP_DIR%\node_modules\electron\cli.js" (
  node "%APP_DIR%\node_modules\electron\cli.js" "%APP_DIR%"
) else (
  "%APP_DIR%\node_modules\electron\dist\electron.exe" "%APP_DIR%"
)

echo.
echo [INFO] osu!skills finalizado. Pressione qualquer tecla para fechar.
pause
exit /b 0

:stream_logs
if not exist "%APP_DIR%\logs\electron-desktop.log" (
  echo [AVISO] Aguardando inicializacao do arquivo de logs...
  timeout /t 2 >nul
)
powershell -NoProfile -Command "Get-Content -Path 'logs\electron-desktop.log' -Wait -Tail 30"

