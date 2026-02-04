# 简单修复 Cursor 终端 PATH 问题
# 自动查找并添加 Node.js 到 PATH

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  修复 Cursor 终端 PATH" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 常见的 Node.js 安装路径
$paths = @(
    "$env:ProgramFiles\nodejs",
    "${env:ProgramFiles(x86)}\nodejs",
    "$env:LOCALAPPDATA\Programs\nodejs",
    "C:\Program Files\nodejs",
    "C:\Program Files (x86)\nodejs"
)

$found = $false

# 查找 node.exe
Write-Host "正在查找 Node.js..." -ForegroundColor Yellow

foreach ($p in $paths) {
    if (Test-Path "$p\node.exe") {
        Write-Host "找到 Node.js: $p" -ForegroundColor Green
        $env:PATH = "$p;$env:PATH"
        $found = $true
        break
    }
}

# 如果没找到，尝试注册表
if (-not $found) {
    Write-Host "尝试从注册表查找..." -ForegroundColor Yellow
    try {
        $reg = Get-ItemProperty "HKLM:\SOFTWARE\Node.js" -ErrorAction SilentlyContinue
        if ($reg -and $reg.InstallPath) {
            $p = $reg.InstallPath
            if (Test-Path "$p\node.exe") {
                Write-Host "找到 Node.js: $p" -ForegroundColor Green
                $env:PATH = "$p;$env:PATH"
                $found = $true
            }
        }
    } catch {
        # 忽略错误
    }
}

# 如果还是没找到
if (-not $found) {
    Write-Host "未自动找到 Node.js" -ForegroundColor Red
    Write-Host ""
    Write-Host "请手动输入 Node.js 路径（例如: C:\Program Files\nodejs）" -ForegroundColor Yellow
    $inputPath = Read-Host "路径"
    
    if (Test-Path "$inputPath\node.exe") {
        $env:PATH = "$inputPath;$env:PATH"
        $found = $true
    } else {
        Write-Host "路径无效" -ForegroundColor Red
        exit 1
    }
}

# 验证
Write-Host ""
Write-Host "验证中..." -ForegroundColor Yellow

$nodeVer = ""
$npmVer = ""

try {
    $nodeVer = node --version
} catch {
    $nodeVer = ""
}

try {
    $npmVer = npm --version
} catch {
    $npmVer = ""
}

if ($nodeVer -and $npmVer) {
    Write-Host ""
    Write-Host "成功！" -ForegroundColor Green
    Write-Host "Node.js: $nodeVer" -ForegroundColor Green
    Write-Host "npm: $npmVer" -ForegroundColor Green
    Write-Host ""
    Write-Host "现在可以运行:" -ForegroundColor Yellow
    Write-Host "  npm install" -ForegroundColor White
    Write-Host "  npm start" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "验证失败，请检查 Node.js 是否正确安装" -ForegroundColor Red
}
