' POISE 破防之隙 · 无控制台窗口启动
' Dev POPOult
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
url = "file:///" & Replace(dir & "\index.html", "\", "/")

browser = ""
p1 = sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\Microsoft\Edge\Application\msedge.exe"
p2 = sh.ExpandEnvironmentStrings("%ProgramFiles%") & "\Microsoft\Edge\Application\msedge.exe"
p3 = sh.ExpandEnvironmentStrings("%LocalAppData%") & "\Google\Chrome\Application\chrome.exe"
p4 = sh.ExpandEnvironmentStrings("%ProgramFiles%") & "\Google\Chrome\Application\chrome.exe"
If fso.FileExists(p1) Then browser = p1
If browser = "" And fso.FileExists(p2) Then browser = p2
If browser = "" And fso.FileExists(p3) Then browser = p3
If browser = "" And fso.FileExists(p4) Then browser = p4

If browser = "" Then
  MsgBox "未找到 Edge/Chrome，请用浏览器打开 index.html", 48, "POISE"
  WScript.Quit 1
End If

sh.Run """" & browser & """ --app=""" & url & """ --window-size=1100,780 --no-first-run", 1, False
