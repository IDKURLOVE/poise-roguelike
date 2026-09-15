$ErrorActionPreference = "Stop"
$gameDir = "E:\a Project\action-roguelike"
$vbs = Join-Path $gameDir "POISE-启动.vbs"
$desktop = [Environment]::GetFolderPath("Desktop")

# 删除旧的乱码快捷方式
Get-ChildItem $desktop -Filter "*.lnk" | Where-Object { $_.Name -like "*POISE*" } | ForEach-Object {
  Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
}

$name = "POISE " + [System.Text.Encoding]::UTF8.GetString([byte[]](0xE7,0xA0,0xB4,0xE9,0x98,0xB2,0xE4,0xB9,0x8B,0xE9,0x9A,0x99))
$lnkPath = Join-Path $desktop ($name + ".lnk")

$WshShell = New-Object -ComObject WScript.Shell
$lnk = $WshShell.CreateShortcut($lnkPath)
$lnk.TargetPath = "wscript.exe"
$lnk.Arguments = "`"$vbs`""
$lnk.WorkingDirectory = $gameDir
$lnk.IconLocation = "$env:SystemRoot\System32\imageres.dll,109"
$lnk.Description = "POISE Dev POPOult"
$lnk.Save()

# 开始菜单（路径可能因系统而异）
$startMenu = [Environment]::GetFolderPath("StartMenu")
if ($startMenu) {
  $prog = Join-Path $startMenu "Programs"
  if (Test-Path $prog) {
    Copy-Item $lnkPath (Join-Path $prog ($name + ".lnk")) -Force
  }
}

Get-ChildItem $desktop -Filter "*POISE*" | ForEach-Object { Write-Host ("DESKTOP " + $_.Name) }
if ($startMenu) {
  Get-ChildItem (Join-Path $startMenu "Programs") -Filter "*POISE*" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host ("START " + $_.Name) }
}
