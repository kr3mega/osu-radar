@echo off
title osu!skills - Visualizador de Logs
set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"
cd /d "%APP_DIR%"

if not exist "%APP_DIR%\logs\electron-desktop.log" (
  echo Nenhum arquivo de log encontrado em logs\electron-desktop.log ainda.
  pause
  exit /b 0
)

echo ================================================================================
echo           osu!skills - Exibindo Ultimos Eventos Gravados em Disco
echo ================================================================================
echo Pressione Ctrl+C para sair do visualizador continuo.
echo --------------------------------------------------------------------------------
powershell -NoProfile -Command "Get-Content -Path 'logs\electron-desktop.log' -Wait -Tail 40"
