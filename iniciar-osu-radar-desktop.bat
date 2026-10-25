@echo off
title osu!radar - Aplicativo Desktop (Electron)
set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"
cd /d "%APP_DIR%"

if not exist "%APP_DIR%\dist\index.html" goto build_first
if not exist "%APP_DIR%\dist-electron\electron\main.js" goto build_first

goto run_app

:build_first
echo ====================================================
echo   Preparando build standalone do osu!radar Desktop...
echo ====================================================
call npm run electron:build
if errorlevel 1 (
  echo.
  echo Erro ao compilar o osu!radar Desktop.
  pause
  exit /b 1
)

:run_app
start "" "%APP_DIR%\node_modules\electron\dist\electron.exe" "%APP_DIR%"
exit /b 0
