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
echo  * Este terminal exibe em tempo real todos os eventos, logs e conexoes do app.
echo  * Os logs tambem sao salvos automaticamente no disco em:
echo      logs\electron-desktop.log
echo  * Mantenha esta janela aberta enquanto o osu!radar estiver em uso.
echo ================================================================================
echo.

if not exist "%APP_DIR%\dist\index.html" goto build_app
if not exist "%APP_DIR%\dist-electron\electron\main.js" goto build_app

goto run_desktop

:build_app
echo [INFO] Build do aplicativo nao encontrado ou desatualizado. Compilando agora...
echo [INFO] Isso pode levar alguns segundos...
call npm run electron:build
if errorlevel 1 (
  echo.
  echo [ERRO] Falha ao compilar o osu!radar Desktop.
  echo Verifique as mensagens de erro acima.
  echo.
  pause
  exit /b 1
)
echo [SUCESSO] Compilacao concluida com sucesso!
echo.

:run_desktop
set "ELECTRON_ENABLE_LOGGING=1"
echo [INFO] Inicializando osu!radar Desktop...
echo [INFO] Aguarde a janela do aplicativo ser exibida na tela...
echo --------------------------------------------------------------------------------

if exist "%APP_DIR%\node_modules\electron\cli.js" (
  node "%APP_DIR%\node_modules\electron\cli.js" "%APP_DIR%"
) else if exist "%APP_DIR%\node_modules\electron\dist\electron.exe" (
  "%APP_DIR%\node_modules\electron\dist\electron.exe" "%APP_DIR%"
) else (
  call npx electron .
)

set "APP_EXIT_CODE=%ERRORLEVEL%"

echo.
echo ================================================================================
echo  O processo do osu!radar Desktop foi finalizado (Codigo de saida: %APP_EXIT_CODE%).
echo  Os logs completos desta sessao foram gravados em:
echo    %APP_DIR%\logs\electron-desktop.log
echo ================================================================================
echo.
pause
exit /b %APP_EXIT_CODE%
