@echo off
chcp 65001 >nul
echo ========================================
echo   提交代码到 Gitee
echo ========================================
echo.

echo 1. 提交代码...
git commit -m "first commit"
if %errorlevel% neq 0 (
    echo 提交失败
    pause
    exit /b 1
)

echo.
echo 2. 推送到远程仓库...
git push -u origin master
if %errorlevel% neq 0 (
    echo.
    echo 推送失败，可能需要配置 SSH 密钥或使用 HTTPS
    echo.
    echo 如果使用 HTTPS，请运行:
    echo   git remote set-url origin https://gitee.com/wiliam216/time-end.git
    echo   git push -u origin master
    pause
    exit /b 1
)

echo.
echo ========================================
echo   提交成功！
echo ========================================
pause
