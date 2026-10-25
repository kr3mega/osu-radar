@echo off
title osu!radar - Aplicativo Desktop (Electron)
cd /d "%~dp0"

if not exist "dist\index.html" goto build_first
if not exist "dist-electron\electron\main.js" goto build_first

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
start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0"
exit /b 0
