@echo off
echo ========================================
echo PostgreSQL 접속 테스트
echo ========================================

echo.
echo [1/3] PostgreSQL PATH 설정...
set "POSTGRES_PATH=C:\Program Files\PostgreSQL\17\bin"
set "PATH=%PATH%;%POSTGRES_PATH%"
echo PostgreSQL bin 디렉토리가 PATH에 추가되었습니다.

echo.
echo [2/3] PostgreSQL 서비스 상태 확인...
sc query postgresql-x64-15 | findstr "STATE" | findstr "RUNNING" >nul
if %errorlevel% == 0 (
    echo ✓ PostgreSQL 서비스가 실행 중입니다.
) else (
    echo ✗ PostgreSQL 서비스가 실행되지 않고 있습니다.
    echo 서비스를 시작하려면 관리자 권한으로 다음 명령을 실행하세요:
    echo net start postgresql-x64-15
    pause
    exit /b 1
)

echo.
echo [3/3] PostgreSQL 접속 테스트...
echo 데이터베이스에 연결을 시도합니다...
echo (비밀번호를 입력하라고 하면 postgres 사용자의 비밀번호를 입력하세요)
echo.

psql -U postgres -h localhost -c "SELECT version();"
if %errorlevel% == 0 (
    echo.
    echo ✓ PostgreSQL 접속 테스트 성공!
) else (
    echo.
    echo ✗ PostgreSQL 접속 테스트 실패
    echo 비밀번호가 틀렸거나 연결에 문제가 있습니다.
)

echo.
echo ========================================
echo 테스트 완료
echo ========================================
pause 