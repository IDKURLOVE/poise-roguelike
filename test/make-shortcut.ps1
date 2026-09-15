# 创建桌面快捷方式
$ErrorActionPreference = "Stop"
$gameDir = "E:\a Project\action-roguelike"
$vbs = Join-Path $gameDir "POISE-启动.vbs"
$desktop = [Environment]::GetFolderPath("Desktop")
$lnkPath = Join-Path $desktop "POISE 破防之隙.lnk"
$WshShell = New-Object -ComObject WScript.Shell
$lnk = $WshShell.CreateShortcut($lnkPath)
$lnk.TargetPath = "wscript.exe"
$lnk.Arguments = "`"$vbs`""
$lnk.WorkingDirectory = $gameDir
$lnk.IconLocation = "$env:SystemRoot\System32\imageres.dll,109"
$lnk.Description = "POISE 破防之隙 · Dev POPOult"
$lnk.Save()
Write-Host "OK desktop: $lnkPath"
