@echo off
chcp 65001 >nul
echo ========================================
echo   自动查找并修复 Node.js PATH
echo ========================================
echo.

REM 尝试使用 where 命令查找
where node >nul 2>&1
if %errorlevel% equ 0 (
    echo [成功] 找到 Node.js
    where node
    echo.
    echo 可以直接运行: npm install
    pause
    exit /b 0
)

REM 检查常见路径
set "NODE_PATHS=C:\Program Files\nodejs;C:\Program Files (x86)\nodejs;%LOCALAPPDATA%\Programs\nodejs"

for %%p in (%NODE_PATHS%) do (
    if exist "%%p\node.exe" (
        echo [找到] Node.js 在: %%p
        set "PATH=%%p;%PATH%"
        echo.
        echo [成功] 已添加到 PATH
        echo.
        echo 现在可以运行: npm install
        pause
        exit /b 0
    )
)

echo [错误] 未找到 Node.js
echo.
echo 请安装 Node.js:
echo 1. 访问 https://nodejs.org/
echo 2. 下载并安装 LTS 版本
echo 3. 安装时确保勾选 "Add to PATH"
echo.
pause
