@echo off
chcp 65001 >nul
echo ========================================
echo   打包应用（禁用代码签名）
echo ========================================
echo.

REM 设置环境变量跳过签名
set CSC_IDENTITY_AUTO_DISCOVERY=false

echo 正在打包...
echo.

call npm run build

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   打包成功！
    echo ========================================
    echo.
    echo 安装程序位于: dist 目录
) else (
    echo.
    echo ========================================
    echo   打包失败
    echo ========================================
)

pause
