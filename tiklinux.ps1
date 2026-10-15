# tiklinux Desktop Launcher
# ─────────────────────────────────
# تشغيل tiklinux كتطبيق على سطح المكتب

$Host.UI.RawUI.WindowTitle = "tiklinux Desktop"
Clear-Host

Write-Host ""
Write-Host "  ╔══════════════════════════════════╗" -ForegroundColor Red
Write-Host "  ║      tiklinux Desktop            ║" -ForegroundColor Red
Write-Host "  ║   استوديو أدوات بث TikTok        ║" -ForegroundColor White
Write-Host "  ╚══════════════════════════════════╝" -ForegroundColor Red
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "  ⏳ جاري تشغيل الخادم..." -ForegroundColor Yellow

$nodeProcess = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $scriptDir -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 2

$port = 3000
$listening = netstat -ano | Select-String ":$port" | Select-String "LISTENING"

if ($listening) {
    Write-Host "  ✓ الخادم يعمل على المنفذ $port" -ForegroundColor Green
} else {
    Write-Host "  ✗ خطأ في تشغيل الخادم" -ForegroundColor Red
    Read-Host "  اضغط Enter للخروج"
    exit
}

Write-Host "  ⏳ فتح المتصفح..." -ForegroundColor Yellow
Start-Process "http://localhost:$port"

Write-Host ""
Write-Host "  ✓ tiklinux جاهز للاستخدام!" -ForegroundColor Green
Write-Host ""
Write-Host "  ──────────────────────────────────" -ForegroundColor DarkGray
Write-Host "  اضغط Ctrl+C لإغلاق التطبيق" -ForegroundColor DarkGray
Write-Host ""

try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host ""
    Write-Host "  ⏳ إغلاق الخادم..." -ForegroundColor Yellow
    Stop-Process -Id $nodeProcess.Id -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ تم الإغلاق" -ForegroundColor Green
}
