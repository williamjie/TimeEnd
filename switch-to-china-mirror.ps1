# Switch npm to China mirror

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Switching to China Mirror" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set npm registry
Write-Host "Setting npm registry to npmmirror.com..." -ForegroundColor Yellow
npm config set registry https://registry.npmmirror.com

# Set electron mirror
Write-Host "Setting electron mirror..." -ForegroundColor Yellow
npm config set electron_mirror https://npmmirror.com/mirrors/electron/

# Set electron-builder mirror
Write-Host "Setting electron-builder mirror..." -ForegroundColor Yellow
npm config set electron_builder_binaries_mirror https://npmmirror.com/mirrors/electron-builder-binaries/

# Verify
Write-Host ""
Write-Host "Verifying configuration..." -ForegroundColor Yellow
$registry = npm config get registry
Write-Host "npm registry: $registry" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configuration Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Now you can run:" -ForegroundColor Yellow
Write-Host "  npm install" -ForegroundColor White
Write-Host ""
Write-Host "This will be much faster!" -ForegroundColor Green
