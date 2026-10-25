@echo off
setlocal enabledelayedexpansion
title osu!radar Desktop - Terminal de Logs Ao Vivo

set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"
cd /d "%APP_DIR%"

cls
echo ================================================================================
echo                    osu!radar Desktop - Terminal de Logs Ao Vivo
echo ================================================================================
echo  * Este terminal exibe em tempo real todos os eventos e acoes do app.
echo  * Os logs tambem sao salvos automaticamente em: logs\electron-desktop.log
echo ================================================================================
echo.

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
echo [INFO] osu!radar finalizado. Pressione qualquer tecla para fechar.
pause
