@echo off
echo ========================================
echo PostgreSQL 연결 테스트
echo ========================================

echo.
echo [1/4] PostgreSQL 서비스 상태 확인...
sc query postgresql-x64-15 | findstr "STATE"
if %errorlevel% neq 0 (
    echo PostgreSQL 서비스를 찾을 수 없습니다.
    echo 다른 버전을 확인해보겠습니다...
    sc query | findstr postgresql
)

echo.
echo [2/4] PostgreSQL 포트 확인...
netstat -an | findstr :5432
if %errorlevel% neq 0 (
    echo 포트 5432가 사용되지 않고 있습니다.
    echo PostgreSQL이 실행되지 않았을 수 있습니다.
)

echo.
echo [3/4] PostgreSQL 연결 테스트...
echo 기본 연결 테스트:
psql -U postgres -h localhost -c "SELECT version();" 2>nul
if %errorlevel% == 0 (
    echo ✓ PostgreSQL 기본 연결 성공
) else (
    echo ✗ PostgreSQL 기본 연결 실패
    echo psql 명령어가 PATH에 있는지 확인하세요.
    echo PATH: %PATH% | findstr PostgreSQL
)

echo.
echo [4/4] 데이터베이스 존재 확인...
echo User Service 데이터베이스 확인:
psql -U postgres -h localhost -c "\l" 2>nul | findstr user_service
if %errorlevel% == 0 (
    echo ✓ user_service 데이터베이스 존재
) else (
    echo ✗ user_service 데이터베이스가 없습니다.
    echo setup-databases.sql을 실행해주세요.
)

echo.
echo Kong 데이터베이스 확인:
psql -U postgres -h localhost -c "\l" 2>nul | findstr kong
if %errorlevel% == 0 (
    echo ✓ kong 데이터베이스 존재
) else (
    echo ✗ kong 데이터베이스가 없습니다.
    echo setup-databases.sql을 실행해주세요.
)

echo.
echo ========================================
echo 테스트 완료
echo ========================================
echo.
echo 다음 단계:
echo 1. PostgreSQL 서비스가 실행되지 않은 경우:
echo    - 서비스 시작: net start postgresql-x64-15
echo.
echo 2. 데이터베이스가 없는 경우:
echo    - 데이터베이스 설정: psql -U postgres -h localhost -f setup-databases.sql
echo.
echo 3. User Service API 테스트:
echo    - test-user-api.bat 실행
echo.
pause 