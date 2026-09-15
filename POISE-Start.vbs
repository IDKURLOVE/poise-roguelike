Dim fso, sh, log
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
Set log = fso.CreateTextFile(dir & "\launch.log", True)
log.WriteLine "dir=" & dir

game = dir & "\index.html"
If Not fso.FileExists(game) Then
  log.WriteLine "FAIL no game"
  log.Close
  WScript.Quit 1
End If

rel = Replace(game, "\", "/")
rel = Replace(rel, " ", "%20")
url = "file:///" & rel
log.WriteLine "url=" & url

' 硬编码常见路径（本机 ExpandEnvironmentStrings 对 ProgramFiles 会空）
Dim candidates, p, browser
candidates = Array( _
  "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe", _
  "C:\Program Files\Microsoft\Edge\Application\msedge.exe", _
  "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe", _
  "C:\Program Files\Google\Chrome\Application\chrome.exe", _
  sh.ExpandEnvironmentStrings("%LocalAppData%") & "\Google\Chrome\Application\chrome.exe", _
  sh.ExpandEnvironmentStrings("%LocalAppData%") & "\Microsoft\Edge\Application\msedge.exe" _
)

browser = ""
For Each p In candidates
  log.WriteLine "try " & p & " -> " & fso.FileExists(p)
  If fso.FileExists(p) Then
    browser = p
    Exit For
  End If
Next

' 注册表 App Paths 兜底
If browser = "" Then
  On Error Resume Next
  reg = sh.RegRead("HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe\")
  If Err.Number = 0 And fso.FileExists(reg) Then
    browser = reg
    log.WriteLine "reg edge " & reg
  Else
    Err.Clear
    reg = sh.RegRead("HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe\")
    If Err.Number = 0 And fso.FileExists(reg) Then
      browser = reg
      log.WriteLine "reg chrome " & reg
    End If
  End If
  On Error Goto 0
End If

If browser = "" Then
  log.WriteLine "FAIL no browser"
  MsgBox "Edge/Chrome not found. Open index.html in a browser.", 48, "POISE"
  log.Close
  WScript.Quit 1
End If

cmd = """" & browser & """ --app=" & url & " --window-size=1120,800 --no-first-run"
log.WriteLine "cmd=" & cmd
On Error Resume Next
sh.Run cmd, 1, False
If Err.Number <> 0 Then
  log.WriteLine "run err=" & Err.Description
  log.Close
  WScript.Quit 1
End If
log.WriteLine "run ok"
log.Close
