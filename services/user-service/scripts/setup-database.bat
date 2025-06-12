@echo off
echo ========================================
echo User Service - PostgreSQL 데이터베이스 설정
echo ========================================

echo.
echo [1/3] PostgreSQL PATH 설정...
set "POSTGRES_PATH=C:\Program Files\PostgreSQL\17\bin"
set "PATH=%PATH%;%POSTGRES_PATH%"

echo.
echo [2/3] 환경변수 설정...
set PGPASSWORD=1q2w3e4r!!
echo PostgreSQL 관리자 비밀번호가 설정되었습니다.

echo.
echo [3/3] User Service 데이터베이스 및 사용자 생성...
echo postgres 관리자 계정으로 접속하여 새 사용자를 생성합니다.
echo.

psql -U postgres -h localhost -f "%~dp0create-user.sql"

if %errorlevel% == 0 (
    echo.
    echo ========================================
    echo ✓ User Service 데이터베이스 설정 완료!
    echo ========================================
    echo.
    echo 생성된 계정 정보:
    echo - 사용자명: app_user
    echo - 비밀번호: app123!@#
    echo - 데이터베이스: vehicle_game
    echo.
    echo 테스트 명령어:
    echo set PGPASSWORD=app123!@# ^&^& psql -U app_user -h localhost -d vehicle_game
    echo.
    echo User Service 시작:
    echo cd .. ^&^& npm start
    echo.
) else (
    echo.
    echo ✗ 데이터베이스 설정에 실패했습니다.
    echo 오류 코드: %errorlevel%
)

echo.
pause 