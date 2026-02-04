# PowerShell 安装脚本
# 用于检测和指导 Node.js 安装

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TimeEnd 项目环境检查" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js
Write-Host "正在检查 Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "✅ Node.js 已安装: $nodeVersion" -ForegroundColor Green
    } else {
        throw "Node.js not found"
    }
} catch {
    Write-Host "❌ Node.js 未安装或未添加到 PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "请按照以下步骤安装 Node.js:" -ForegroundColor Yellow
    Write-Host "1. 访问: https://nodejs.org/" -ForegroundColor White
    Write-Host "2. 下载并安装 LTS 版本" -ForegroundColor White
    Write-Host "3. 安装时确保勾选 'Add to PATH'" -ForegroundColor White
    Write-Host "4. 安装完成后重启 PowerShell" -ForegroundColor White
    Write-Host ""
    Write-Host "或者使用 Chocolatey 安装:" -ForegroundColor Yellow
    Write-Host "   choco install nodejs-lts" -ForegroundColor White
    Write-Host ""
    exit 1
}

# 检查 npm
Write-Host "正在检查 npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version 2>$null
    if ($npmVersion) {
        Write-Host "✅ npm 已安装: v$npmVersion" -ForegroundColor Green
    } else {
        throw "npm not found"
    }
} catch {
    Write-Host "❌ npm 未找到" -ForegroundColor Red
    Write-Host "   请重新安装 Node.js" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  环境检查通过！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否已安装依赖
if (Test-Path "node_modules") {
    Write-Host "✅ 依赖已安装" -ForegroundColor Green
    Write-Host ""
    Write-Host "运行应用:" -ForegroundColor Yellow
    Write-Host "  npm start" -ForegroundColor White
} else {
    Write-Host "📦 开始安装依赖..." -ForegroundColor Yellow
    Write-Host ""
    
    # 尝试使用国内镜像
    $useMirror = Read-Host "是否使用国内镜像源加速? (Y/n)"
    if ($useMirror -eq "" -or $useMirror -eq "Y" -or $useMirror -eq "y") {
        Write-Host "使用淘宝镜像源..." -ForegroundColor Cyan
        npm install --registry=https://registry.npmmirror.com
    } else {
        npm install
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ 依赖安装完成！" -ForegroundColor Green
        Write-Host ""
        Write-Host "运行应用:" -ForegroundColor Yellow
        Write-Host "  npm start" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "❌ 依赖安装失败" -ForegroundColor Red
        Write-Host "   请检查网络连接或手动运行: npm install" -ForegroundColor Yellow
    }
}
