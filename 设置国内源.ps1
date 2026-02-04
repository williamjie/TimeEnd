# 设置 npm 和 Electron 国内镜像源

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  设置 npm 国内镜像源" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 设置 npm 镜像源
Write-Host "正在设置 npm 镜像源..." -ForegroundColor Yellow
npm config set registry https://registry.npmmirror.com

# 设置 Electron 镜像源
Write-Host "正在设置 Electron 镜像源..." -ForegroundColor Yellow
npm config set electron_mirror https://npmmirror.com/mirrors/electron/

# 验证设置
Write-Host ""
Write-Host "验证配置..." -ForegroundColor Yellow
Write-Host ""
Write-Host "npm 镜像源:" -ForegroundColor Cyan
npm config get registry
Write-Host ""
Write-Host "Electron 镜像源:" -ForegroundColor Cyan
npm config get electron_mirror

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  设置完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "现在可以运行:" -ForegroundColor Yellow
Write-Host "  npm install" -ForegroundColor White
Write-Host ""
