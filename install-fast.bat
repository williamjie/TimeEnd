@echo off
chcp 65001 >nul
echo ========================================
echo   快速安装依赖（使用国内镜像）
echo ========================================
echo.

echo 正在使用淘宝镜像源安装...
echo.

call npm install --registry=https://registry.npmmirror.com

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   安装成功！
    echo ========================================
    echo.
    echo 现在可以运行: npm start
) else (
    echo.
    echo ========================================
    echo   安装失败
    echo ========================================
    echo.
    echo 请检查网络连接或重试
)

pause
