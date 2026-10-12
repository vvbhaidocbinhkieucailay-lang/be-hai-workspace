' Mo KHONG GIAN LAM VIEC VO VAN BE HAI: chay may chu AN (khong co cua so) roi mo trinh duyet.
' Neu may chu da chay san thi chi mo trinh duyet. Tham so /an: chi chay may chu, khong mo trinh duyet (dung khi Windows khoi dong).
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
root = fso.GetParentFolderName(fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName)))
sh.CurrentDirectory = root
extra = " --open"
If WScript.Arguments.Count > 0 Then
  If LCase(WScript.Arguments(0)) = "/an" Then extra = ""
End If
On Error Resume Next
sh.Run "node --disable-warning=ExperimentalWarning """ & root & "\app\server\src\index.mjs""" & extra, 0, False
If Err.Number <> 0 Then MsgBox "Khong chay duoc Node.js. Hay cai Node.js LTS tu https://nodejs.org/ roi thu lai.", 16, "Khong gian lam viec Be Hai"
