@echo off
echo ========================================
echo User Service - 데이터베이스 연결 테스트
echo ========================================

echo.
echo [1/3] PostgreSQL PATH 설정...
set "POSTGRES_PATH=C:\Program Files\PostgreSQL\17\bin"
set "PATH=%PATH%;%POSTGRES_PATH%"

echo.
echo [2/3] PostgreSQL 서비스 상태 확인...
sc query postgresql-x64-17 | findstr "STATE" | findstr "RUNNING" >nul
if %errorlevel% == 0 (
    echo ✓ PostgreSQL 서비스가 실행 중입니다.
) else (
    echo ✗ PostgreSQL 서비스가 실행되지 않고 있습니다.
    echo   서비스를 시작하세요: net start postgresql-x64-17
    pause
    exit /b 1
)

echo.
echo [3/3] 데이터베이스 연결 테스트...
echo.

echo 관리자 계정 연결 테스트:
set PGPASSWORD=1q2w3e4r!!
psql -U postgres -h localhost -c "SELECT 'PostgreSQL 관리자 연결 성공!' as status;" 2>nul
if %errorlevel% neq 0 (
    echo ✗ PostgreSQL 관리자 연결 실패
    echo   비밀번호를 확인하세요.
) else (
    echo ✓ PostgreSQL 관리자 연결 성공
)

echo.
echo User Service 데이터베이스 연결 테스트:
set PGPASSWORD=app123!@#
psql -U app_user -h localhost -d vehicle_game -c "SELECT 'User Service DB 연결 성공!' as status;" 2>nul
if %errorlevel% neq 0 (
    echo ✗ User Service 데이터베이스 연결 실패
    echo   setup-database.bat을 먼저 실행하세요.
) else (
    echo ✓ User Service 데이터베이스 연결 성공
)

echo.
echo 포트 상태 확인:
echo PostgreSQL (5432):
netstat -an | findstr :5432

echo.
echo User Service (3002):
netstat -an | findstr :3002

echo.
echo ========================================
echo 테스트 완료
echo ========================================
echo.
echo 다음 단계:
echo 1. 데이터베이스 설정: scripts\setup-database.bat
echo 2. User Service 시작: cd .. ^&^& npm start
echo 3. 브라우저 테스트: http://localhost/api-test.html
echo.
pause 