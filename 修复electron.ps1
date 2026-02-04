# Fix Electron installation issue

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  修复 Electron 安装问题" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "正在删除损坏的 Electron..." -ForegroundColor Yellow
Remove-Item -Recurse -Force node_modules\electron -ErrorAction SilentlyContinue

Write-Host "正在重新安装 Electron..." -ForegroundColor Yellow
npm install electron --save-dev

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  修复完成！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "现在可以运行: npm start" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "修复失败，请尝试删除整个 node_modules 后重新安装" -ForegroundColor Red
    Write-Host "  Remove-Item -Recurse -Force node_modules" -ForegroundColor White
    Write-Host "  npm install" -ForegroundColor White
}
