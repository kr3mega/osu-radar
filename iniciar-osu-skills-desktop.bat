@echo off
set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"
cd /d "%APP_DIR%"

if exist "%APP_DIR%\iniciar-osu-skills-desktop.vbs" (
  start "" wscript "%APP_DIR%\iniciar-osu-skills-desktop.vbs"
  exit /b 0
)

if not exist "%APP_DIR%\dist\index.html" goto build_app
if not exist "%APP_DIR%\dist-electron\electron\main.js" goto build_app

goto launch_app

:build_app
call npm run electron:build
if errorlevel 1 (
  pause
  exit /b 1
)

:launch_app
start "" "%APP_DIR%\node_modules\electron\dist\electron.exe" "%APP_DIR%"
exit /b 0
