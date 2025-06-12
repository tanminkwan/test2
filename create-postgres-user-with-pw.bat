@echo off
echo ========================================
echo PostgreSQL 새 사용자 생성 (비밀번호 포함)
echo ========================================

echo.
echo [1/3] PostgreSQL PATH 설정...
set "POSTGRES_PATH=C:\Program Files\PostgreSQL\17\bin"
set "PATH=%PATH%;%POSTGRES_PATH%"

echo.
echo [2/3] 환경변수 설정...
set PGPASSWORD=1q2w3e4r!!
echo PostgreSQL 비밀번호가 설정되었습니다.

echo.
echo [3/3] 새 사용자 및 데이터베이스 생성...
echo postgres 관리자 계정으로 접속하여 새 사용자를 생성합니다.
echo.

psql -U postgres -h localhost -f create-db-and-user.sql

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
    echo set PGPASSWORD=app123!@# ^&^& psql -U app_user -h localhost -d user_service
    echo.
) else (
    echo.
    echo ✗ 사용자 생성에 실패했습니다.
    echo 오류 코드: %errorlevel%
)

echo.
pause 