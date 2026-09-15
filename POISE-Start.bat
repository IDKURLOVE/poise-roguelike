@echo off
rem POISE desktop launcher - Dev POPOult
setlocal EnableDelayedExpansion
set "GAME=%~dp0index.html"
if not exist "%GAME%" (
  echo index.html not found
  pause
  exit /b 1
)
set "GAMEURL=%GAME%"
set "GAMEURL=!GAMEURL:\=/!"
set "GAMEURL=!GAMEURL: =%%20!"
set "URL=file:///%GAMEURL%"

set "BROWSER="
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" set "BROWSER=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" set "BROWSER=C:\Program Files\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "BROWSER=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" set "BROWSER=C:\Program Files\Google\Chrome\Application\chrome.exe"

if not defined BROWSER (
  echo Edge/Chrome not found. Open index.html in a browser.
  pause
  exit /b 1
)

start "" "%BROWSER%" --app="%URL%" --window-size=1120,800 --no-first-run
endlocal
