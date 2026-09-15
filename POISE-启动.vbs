' POISE desktop launcher (ASCII only)
' Dev POPOult
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
game = dir & "\index.html"
If Not fso.FileExists(game) Then
  MsgBox "index.html not found next to this launcher.", 16, "POISE"
  WScript.Quit 1
End If
' encode space in file URL
url = "file:///" & Replace(Replace(game, "\", "/"), " ", "%20")

browser = ""
candidates = Array( _
  sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\Microsoft\Edge\Application\msedge.exe", _
  sh.ExpandEnvironmentStrings("%ProgramFiles%") & "\Microsoft\Edge\Application\msedge.exe", _
  sh.ExpandEnvironmentStrings("%LocalAppData%") & "\Google\Chrome\Application\chrome.exe", _
  sh.ExpandEnvironmentStrings("%ProgramFiles%") & "\Google\Chrome\Application\chrome.exe", _
  sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\Google\Chrome\Application\chrome.exe" _
)
For Each p In candidates
  If fso.FileExists(p) Then
    browser = p
    Exit For
  End If
Next
If browser = "" Then
  MsgBox "Edge/Chrome not found. Open index.html in a browser.", 48, "POISE"
  WScript.Quit 1
End If

sh.Run """" & browser & """ --app=""" & url & """ --window-size=1120,800 --no-first-run", 1, False
