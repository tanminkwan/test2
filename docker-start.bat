@echo off
echo ========================================
echo Vehicle Game - Docker 환경 시작
echo ========================================

echo.
echo [1/4] Docker 상태 확인...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ Docker가 설치되지 않았거나 실행되지 않고 있습니다.
    echo   Docker Desktop을 설치하고 실행하세요.
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ Docker Compose가 설치되지 않았습니다.
    pause
    exit /b 1
)

echo ✓ Docker 환경 확인 완료

echo.
echo [2/4] 기존 컨테이너 정리...
docker-compose down --remove-orphans

echo.
echo [3/4] Docker 이미지 빌드...
docker-compose build --no-cache

echo.
echo [4/4] 서비스 시작...
docker-compose up -d

echo.
echo ========================================
echo 서비스 상태 확인 중...
echo ========================================

timeout /t 10 /nobreak >nul

echo.
echo 컨테이너 상태:
docker-compose ps

echo.
echo 서비스 로그 (최근 20줄):
docker-compose logs --tail=20

echo.
echo ========================================
echo ✓ Vehicle Game Docker 환경 시작 완료!
echo ========================================
echo.
echo 접속 정보:
echo - 웹 애플리케이션: http://localhost
echo - API 테스트: http://localhost/api-test.html
echo - User Service: http://localhost:3002 (내부 전용)
echo - Game Service: http://localhost:3001 (내부 전용)
echo - PostgreSQL: localhost:5432
echo.
echo 관리 명령어:
echo - 로그 보기: docker-compose logs -f
echo - 서비스 중지: docker-compose stop
echo - 완전 삭제: docker-compose down -v
echo.
pause 