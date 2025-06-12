@echo off
echo ========================================
echo Windows 개발 환경 시작
echo ========================================

echo.
echo [1/3] PostgreSQL 서비스 상태 확인...
sc query postgresql-x64-15 | findstr "STATE" | findstr "RUNNING" >nul
if %errorlevel% == 0 (
    echo PostgreSQL 서비스가 이미 실행 중입니다.
) else (
    echo PostgreSQL 서비스를 시작합니다...
    net start postgresql-x64-15
    if %errorlevel% == 0 (
        echo PostgreSQL 서비스가 성공적으로 시작되었습니다.
    ) else (
        echo PostgreSQL 서비스 시작에 실패했습니다. 관리자 권한으로 실행해주세요.
        pause
        exit /b 1
    )
)

echo.
echo [2/3] Nginx 상태 확인...
tasklist /fi "imagename eq nginx.exe" 2>nul | findstr "nginx.exe" >nul
if %errorlevel% == 0 (
    echo Nginx가 이미 실행 중입니다.
) else (
    echo Nginx를 시작합니다...
    if exist "C:\nginx\nginx.exe" (
        cd /d C:\nginx
        start nginx.exe
        timeout /t 2 /nobreak >nul
        tasklist /fi "imagename eq nginx.exe" 2>nul | findstr "nginx.exe" >nul
        if %errorlevel% == 0 (
            echo Nginx가 성공적으로 시작되었습니다.
        ) else (
            echo Nginx 시작에 실패했습니다.
            pause
            exit /b 1
        )
    ) else (
        echo Nginx가 C:\nginx에 설치되어 있지 않습니다.
        echo 설치 경로를 확인해주세요.
        pause
        exit /b 1
    )
)

echo.
echo [3/3] 서비스 연결 테스트...
echo PostgreSQL 연결 테스트...
psql -U postgres -h localhost -c "SELECT version();" >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ PostgreSQL 연결 성공
) else (
    echo ✗ PostgreSQL 연결 실패
)

echo Nginx 연결 테스트...
curl -s http://localhost >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ Nginx 연결 성공
) else (
    echo ✗ Nginx 연결 실패
)

echo.
echo ========================================
echo 개발 환경이 준비되었습니다!
echo ========================================
echo.
echo 서비스 상태:
echo - PostgreSQL: http://localhost:5432
echo - Nginx: http://localhost
echo - 헬스체크: http://localhost/health
echo.
echo 중지하려면 stop-dev-env.bat을 실행하세요.
echo.
pause 