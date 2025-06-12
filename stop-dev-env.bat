@echo off
echo ========================================
echo Windows 개발 환경 중지
echo ========================================

echo.
echo [1/2] Nginx 중지...
tasklist /fi "imagename eq nginx.exe" 2>nul | findstr "nginx.exe" >nul
if %errorlevel% == 0 (
    echo Nginx 프로세스를 중지합니다...
    taskkill /f /im nginx.exe >nul 2>&1
    if %errorlevel% == 0 (
        echo ✓ Nginx가 성공적으로 중지되었습니다.
    ) else (
        echo ✗ Nginx 중지에 실패했습니다.
    )
) else (
    echo Nginx가 실행되고 있지 않습니다.
)

echo.
echo [2/2] PostgreSQL 서비스 중지...
sc query postgresql-x64-15 | findstr "STATE" | findstr "RUNNING" >nul
if %errorlevel% == 0 (
    echo PostgreSQL 서비스를 중지합니다...
    net stop postgresql-x64-15 >nul 2>&1
    if %errorlevel% == 0 (
        echo ✓ PostgreSQL 서비스가 성공적으로 중지되었습니다.
    ) else (
        echo ✗ PostgreSQL 서비스 중지에 실패했습니다. 관리자 권한으로 실행해주세요.
    )
) else (
    echo PostgreSQL 서비스가 실행되고 있지 않습니다.
)

echo.
echo ========================================
echo 개발 환경이 중지되었습니다.
echo ========================================
echo.
pause 