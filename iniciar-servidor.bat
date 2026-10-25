@echo off
title osu!skills - Servidor Local
cd /d "%~dp0"

echo ====================================================
echo             osu!skills - Servidor Local
echo ====================================================
echo.
echo  Acessivel em: http://localhost:3000/
echo  Para fechar o servidor, feche esta janela ou aperte Ctrl+C.
echo.
echo  Abrindo o navegador automaticamente...
start http://localhost:3000/
echo.

npm run dev
pause
