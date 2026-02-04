# 修复 Cursor 终端 PATH 问题
# 使用 UTF-8 编码保存

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

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
$nodePath = ""

# 查找 node.exe
Write-Host "正在查找 Node.js..." -ForegroundColor Yellow

foreach ($p in $paths) {
    if (Test-Path "$p\node.exe") {
        Write-Host "找到 Node.js: $p" -ForegroundColor Green
        $nodePath = $p
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
                $nodePath = $p
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
        $nodePath = $inputPath
        $found = $true
    } else {
        Write-Host "路径无效" -ForegroundColor Red
        exit 1
    }
}

# 添加到 PATH
if ($found -and $nodePath) {
    Write-Host ""
    Write-Host "正在添加到 PATH..." -ForegroundColor Yellow
    $env:PATH = "$nodePath;$env:PATH"
    
    # 验证
    Write-Host "验证中..." -ForegroundColor Yellow
    
    $nodeVer = ""
    $npmVer = ""
    
    try {
        $nodeOutput = & node --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $nodeVer = $nodeOutput.ToString().Trim()
        }
    } catch {
        $nodeVer = ""
    }
    
    try {
        $npmOutput = & npm --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $npmVer = $npmOutput.ToString().Trim()
        }
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
        Write-Host ""
        Write-Host "注意: 此修复仅对当前终端会话有效。" -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "验证失败，请检查 Node.js 是否正确安装" -ForegroundColor Red
        Write-Host "Node 输出: $nodeVer" -ForegroundColor Yellow
        Write-Host "npm 输出: $npmVer" -ForegroundColor Yellow
    }
}
