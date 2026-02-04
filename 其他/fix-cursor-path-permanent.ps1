# 永久修复 Cursor 终端 PATH 问题
# 需要管理员权限

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  永久修复 Cursor PATH 问题" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查管理员权限
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  此脚本需要管理员权限" -ForegroundColor Yellow
    Write-Host "请右键点击 PowerShell，选择'以管理员身份运行'，然后重新执行此脚本" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "或者，您可以手动添加 Node.js 到系统 PATH:" -ForegroundColor Yellow
    Write-Host "1. 右键'此电脑' -> 属性 -> 高级系统设置" -ForegroundColor White
    Write-Host "2. 环境变量 -> 系统变量 -> Path -> 编辑" -ForegroundColor White
    Write-Host "3. 新建 -> 添加 Node.js 路径（例如: C:\Program Files\nodejs）" -ForegroundColor White
    Write-Host "4. 确定 -> 重启 Cursor" -ForegroundColor White
    exit 1
}

# 查找 Node.js
$commonPaths = @(
    "$env:ProgramFiles\nodejs",
    "${env:ProgramFiles(x86)}\nodejs",
    "$env:LOCALAPPDATA\Programs\nodejs",
    "C:\Program Files\nodejs",
    "C:\Program Files (x86)\nodejs"
)

$nodePath = $null

foreach ($path in $commonPaths) {
    if (Test-Path "$path\node.exe") {
        $nodePath = $path
        Write-Host "✅ 找到 Node.js: $nodePath" -ForegroundColor Green
        break
    }
}

if (-not $nodePath) {
    Write-Host "❌ 未找到 Node.js" -ForegroundColor Red
    Write-Host "请手动输入 Node.js 安装路径:" -ForegroundColor Yellow
    $nodePath = Read-Host "路径"
    
    if (-not (Test-Path "$nodePath\node.exe")) {
        Write-Host "❌ 路径无效" -ForegroundColor Red
        exit 1
    }
}

# 添加到系统 PATH
Write-Host ""
Write-Host "正在添加到系统 PATH..." -ForegroundColor Yellow

$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
if ($currentPath -notlike "*$nodePath*") {
    $newPath = "$currentPath;$nodePath"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
    Write-Host "✅ 已添加到系统 PATH" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Node.js 路径已在系统 PATH 中" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ 修复完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "请重启 Cursor 以使更改生效。" -ForegroundColor Yellow
