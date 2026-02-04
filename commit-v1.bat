@echo off
chcp 65001 >nul
cd /d E:\company_code\TimeEnd

echo Committing changes...
git commit -m "v1: Release version 1.0 - Complete timer application with forced interruption feature"

if %errorlevel% equ 0 (
    echo.
    echo Creating V1 tag...
    git tag -a v1.0 -m "Version 1.0 - TimeEnd timer application complete"
    
    echo.
    echo Pushing to remote...
    git push origin master
    
    echo.
    echo Pushing tags...
    git push origin v1.0
    
    echo.
    echo ========================================
    echo   SUCCESS: Code committed and tagged as V1
    echo ========================================
) else (
    echo.
    echo ========================================
    echo   FAILED: Commit failed
    echo ========================================
)

pause
