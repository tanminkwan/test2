@echo off
echo ========================================
echo PostgreSQL 새 사용자 생성
echo ========================================

echo.
echo [1/3] PostgreSQL PATH 설정...
set "POSTGRES_PATH=C:\Program Files\PostgreSQL\17\bin"
set "PATH=%PATH%;%POSTGRES_PATH%"

echo.
echo [2/3] PostgreSQL 서비스 확인...
sc query postgresql-x64-15 | findstr "STATE" | findstr "RUNNING" >nul
if %errorlevel% == 0 (
    echo ✓ PostgreSQL 서비스가 실행 중입니다.
) else (
    echo ✗ PostgreSQL 서비스가 실행되지 않고 있습니다.
    echo 먼저 PostgreSQL 서비스를 시작해주세요.
    pause
    exit /b 1
)

echo.
echo [3/3] 새 사용자 생성...
echo postgres 관리자 계정으로 접속하여 새 사용자를 생성합니다.
echo (postgres 비밀번호를 입력하세요)
echo.

psql -U postgres -h localhost -f create-user.sql

if %errorlevel% == 0 (
    echo.
    echo ========================================
    echo ✓ 새 사용자 생성 완료!
    echo ========================================
    echo.
    echo 생성된 계정 정보:
    echo - 사용자명: app_user
    echo - 비밀번호: app123!@#
    echo - 데이터베이스: user_service
    echo.
    echo 테스트 명령어:
    echo psql -U app_user -h localhost -d user_service
    echo.
) else (
    echo.
    echo ✗ 사용자 생성에 실패했습니다.
    echo postgres 비밀번호를 확인하거나 권한을 확인해주세요.
)

echo.
pause 