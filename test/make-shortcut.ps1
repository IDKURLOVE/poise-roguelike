$ErrorActionPreference = "Stop"
$gameDir = "E:\a Project\action-roguelike"
$vbs = Join-Path $gameDir "POISE-Start.vbs"
if (!(Test-Path -LiteralPath $vbs)) { throw "missing vbs" }

$desktop = [Environment]::GetFolderPath("Desktop")
Get-ChildItem $desktop -Filter "*.lnk" | Where-Object { $_.Name -like "*POISE*" } | Remove-Item -Force -ErrorAction SilentlyContinue

$lnkPath = Join-Path $desktop "POISE.lnk"
$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut($lnkPath)
$lnk.TargetPath = "wscript.exe"
$lnk.Arguments = "//B `"$vbs`""
$lnk.WorkingDirectory = $gameDir
$lnk.IconLocation = "$env:SystemRoot\System32\imageres.dll,109"
$lnk.Description = "POISE Dev IDKURLOVE"
$lnk.Save()
Write-Host ("OK " + $lnkPath)
