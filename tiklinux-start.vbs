Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c node server.js", 0, False
WScript.Sleep 4000
WshShell.Run "cmd /c npx localtunnel --port 3000 --subdomain tiklinux > C:\Users\ibrah\AppData\Local\Temp\lt-live.log 2>&1", 0, False