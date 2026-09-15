@echo off
rem POISE 破防之隙 · 桌面启动器
rem Dev POPOult · https://github.com/POPOult
setlocal
set "GAME=%~dp0index.html"
set "GAME=%GAME:\=/%"
set "URL=file:///%GAME%"

set "BROWSER="
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "BROWSER=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"

if not defined BROWSER (
  echo 未找到 Edge/Chrome，请用浏览器打开 index.html
  pause
  exit /b 1
)

rem --app: 无地址栏独立窗口；禁右键菜单由页面内脚本处理
start "" "%BROWSER%" --app="%URL%" --window-size=1100,780 --no-first-run --disable-features=TranslateUI
endlocal
