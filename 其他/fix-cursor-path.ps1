# 修复 Cursor 终端 PATH 问题
# 此脚本会查找 Node.js 并添加到当前会话的 PATH

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  修复 Cursor 终端 PATH 问题" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 常见的 Node.js 安装路径
$commonPaths = @(
    "$env:ProgramFiles\nodejs",
    "${env:ProgramFiles(x86)}\nodejs",
    "$env:LOCALAPPDATA\Programs\nodejs",
    "$env:APPDATA\npm",
    "C:\Program Files\nodejs",
    "C:\Program Files (x86)\nodejs"
)

$nodePath = $null

# 尝试查找 node.exe
Write-Host "正在查找 Node.js..." -ForegroundColor Yellow

foreach ($path in $commonPaths) {
    if (Test-Path "$path\node.exe") {
        $nodePath = $path
        Write-Host "✅ 找到 Node.js: $nodePath" -ForegroundColor Green
        break
    }
}

# 如果没找到，尝试从注册表查找
if (-not $nodePath) {
    Write-Host "尝试从注册表查找..." -ForegroundColor Yellow
    $regPath = "HKLM:\SOFTWARE\Node.js"
    if (Test-Path $regPath) {
        $installPath = (Get-ItemProperty $regPath -ErrorAction SilentlyContinue).InstallPath
        if ($installPath -and (Test-Path "$installPath\node.exe")) {
            $nodePath = $installPath
            Write-Host "✅ 从注册表找到 Node.js: $nodePath" -ForegroundColor Green
        }
    }
}

# 如果还是没找到，让用户手动输入
if (-not $nodePath) {
    Write-Host "❌ 未自动找到 Node.js" -ForegroundColor Red
    Write-Host ""
    Write-Host "请手动输入 Node.js 安装路径（例如: C:\Program Files\nodejs）" -ForegroundColor Yellow
    $nodePath = Read-Host "Node.js 路径"
    
    if (-not (Test-Path "$nodePath\node.exe")) {
        Write-Host "❌ 路径无效或 node.exe 不存在" -ForegroundColor Red
        exit 1
    }
}

# 添加到当前会话的 PATH
Write-Host ""
Write-Host "正在添加到 PATH..." -ForegroundColor Yellow
$env:PATH = "$nodePath;$env:PATH"

# 验证
Write-Host ""
Write-Host "验证安装..." -ForegroundColor Yellow
try {
    $nodeVersion = (node --version 2>&1 | Out-String).Trim()
    $npmVersion = (npm --version 2>&1 | Out-String).Trim()
    
    if ($nodeVersion -and $npmVersion -and $nodeVersion -notmatch "错误" -and $npmVersion -notmatch "错误") {
        Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
        Write-Host "✅ npm: v$npmVersion" -ForegroundColor Green
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "  ✅ PATH 已修复！" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "现在可以运行:" -ForegroundColor Yellow
        Write-Host "  npm install" -ForegroundColor White
        Write-Host "  npm start" -ForegroundColor White
        Write-Host ""
        Write-Host "注意: 此修复仅对当前终端会话有效。" -ForegroundColor Yellow
        Write-Host "要永久修复，请运行: .\fix-cursor-path-permanent.ps1" -ForegroundColor Yellow
    } else {
        Write-Host "❌ 验证失败" -ForegroundColor Red
        Write-Host "Node.js 输出: $nodeVersion" -ForegroundColor Yellow
        Write-Host "npm 输出: $npmVersion" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ 验证失败: $($_.Exception.Message)" -ForegroundColor Red
}
