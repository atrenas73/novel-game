@echo off

REM Vite 起動
start "Vite Dev Server" cmd /k ^
cd /d "%~dp0App" ^&^& npm run dev

REM 少し待つ（簡易）
timeout /t 3 > nul

REM Electron 起動
start "Electron" cmd /k ^
cd /d "%~dp0" ^&^& npx electron electron/main.js

