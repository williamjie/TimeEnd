@echo off
chcp 65001 >nul
echo ========================================
echo   TimeEnd 项目快速启动
echo ========================================
echo.

REM 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js
    echo.
    echo 请先安装 Node.js:
    echo 1. 访问 https://nodejs.org/
    echo 2. 下载并安装 LTS 版本
    echo 3. 安装时确保勾选 "Add to PATH"
    echo 4. 安装完成后重新运行此脚本
    echo.
    pause
    exit /b 1
)

REM 检查 npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 npm
    echo 请重新安装 Node.js
    pause
    exit /b 1
)

echo [信息] 检测到 Node.js 和 npm
echo.

REM 检查依赖
if not exist "node_modules" (
    echo [信息] 正在安装依赖...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
    echo.
)

echo [信息] 启动应用...
echo.
call npm start

pause
