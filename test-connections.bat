@echo off
echo ========================================
echo 개발 환경 연결 테스트
echo ========================================

echo.
echo [1/5] 서비스 상태 확인...
echo.

echo PostgreSQL 서비스 상태:
sc query postgresql-x64-15 | findstr "STATE"

echo.
echo Nginx 프로세스 상태:
tasklist /fi "imagename eq nginx.exe" 2>nul | findstr "nginx.exe"
if %errorlevel% neq 0 (
    echo Nginx 프로세스가 실행되고 있지 않습니다.
)

echo.
echo [2/5] 포트 사용 상태 확인...
echo.
echo 포트 5432 (PostgreSQL):
netstat -an | findstr :5432

echo.
echo 포트 80 (Nginx):
netstat -an | findstr :80

echo.
echo 포트 3001 (Game Service):
netstat -an | findstr :3001

echo.
echo 포트 3002 (User Service):
netstat -an | findstr :3002

echo.
echo [3/5] PostgreSQL 연결 테스트...
echo.

echo 기본 연결 테스트:
psql -U postgres -h localhost -c "SELECT 'PostgreSQL 연결 성공!' as status;" 2>nul
if %errorlevel% neq 0 (
    echo ✗ PostgreSQL 기본 연결 실패
) else (
    echo ✓ PostgreSQL 기본 연결 성공
)

echo.
echo Kong 데이터베이스 연결 테스트:
psql -U kong -h localhost -d kong -c "SELECT 'Kong DB 연결 성공!' as status;" 2>nul
if %errorlevel% neq 0 (
    echo ✗ Kong 데이터베이스 연결 실패 (데이터베이스가 생성되지 않았을 수 있습니다)
) else (
    echo ✓ Kong 데이터베이스 연결 성공
)

echo.
echo User Service 데이터베이스 연결 테스트:
psql -U postgres -h localhost -d user_service -c "SELECT 'User Service DB 연결 성공!' as status;" 2>nul
if %errorlevel% neq 0 (
    echo ✗ User Service 데이터베이스 연결 실패 (데이터베이스가 생성되지 않았을 수 있습니다)
) else (
    echo ✓ User Service 데이터베이스 연결 성공
)

echo.
echo [4/5] Nginx 연결 테스트...
echo.

echo 기본 페이지 테스트:
curl -s -o nul -w "HTTP 상태 코드: %%{http_code}\n" http://localhost 2>nul
if %errorlevel% neq 0 (
    echo ✗ Nginx 기본 페이지 연결 실패
) else (
    echo ✓ Nginx 기본 페이지 연결 성공
)

echo.
echo 헬스체크 엔드포인트 테스트:
curl -s http://localhost/health 2>nul
if %errorlevel% neq 0 (
    echo ✗ 헬스체크 엔드포인트 연결 실패
) else (
    echo ✓ 헬스체크 엔드포인트 연결 성공
)

echo.
echo [5/5] 백엔드 서비스 연결 테스트...
echo.

echo Game Service API 테스트 (포트 3001):
curl -s -o nul -w "HTTP 상태 코드: %%{http_code}\n" http://localhost:3001 2>nul
if %errorlevel% neq 0 (
    echo ✗ Game Service 직접 연결 실패 (서비스가 실행되지 않았을 수 있습니다)
) else (
    echo ✓ Game Service 직접 연결 성공
)

echo.
echo User Service API 테스트 (포트 3002):
curl -s -o nul -w "HTTP 상태 코드: %%{http_code}\n" http://localhost:3002 2>nul
if %errorlevel% neq 0 (
    echo ✗ User Service 직접 연결 실패 (서비스가 실행되지 않았을 수 있습니다)
) else (
    echo ✓ User Service 직접 연결 성공
)

echo.
echo Nginx를 통한 Game Service API 테스트:
curl -s -o nul -w "HTTP 상태 코드: %%{http_code}\n" http://localhost/api/games 2>nul
if %errorlevel% neq 0 (
    echo ✗ Nginx 프록시를 통한 Game Service 연결 실패
) else (
    echo ✓ Nginx 프록시를 통한 Game Service 연결 성공
)

echo.
echo Nginx를 통한 User Service API 테스트:
curl -s -o nul -w "HTTP 상태 코드: %%{http_code}\n" http://localhost/api/users 2>nul
if %errorlevel% neq 0 (
    echo ✗ Nginx 프록시를 통한 User Service 연결 실패
) else (
    echo ✓ Nginx 프록시를 통한 User Service 연결 성공
)

echo.
echo ========================================
echo 테스트 완료
echo ========================================
echo.
echo 서비스 매핑:
echo - Game Service: localhost:3001 → /api/games
echo - User Service: localhost:3002 → /api/users, /api/auth
echo.
echo 추가 정보:
echo - PostgreSQL 관리: pgAdmin 또는 psql 사용
echo - Nginx 로그: C:\nginx\logs\access.log, error.log
echo - PostgreSQL 로그: C:\Program Files\PostgreSQL\15\data\log\
echo.
echo 문제가 있는 경우:
echo 1. 관리자 권한으로 배치 파일 실행
echo 2. 방화벽 설정 확인
echo 3. 포트 충돌 확인 (netstat -an)
echo.
pause 