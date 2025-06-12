@echo off
echo ========================================
echo Vehicle Game - Docker 환경 중지
echo ========================================

echo.
echo [1/2] 실행 중인 컨테이너 확인...
docker-compose ps

echo.
echo [2/2] 서비스 중지...
docker-compose stop

echo.
echo ========================================
echo ✓ Vehicle Game Docker 환경 중지 완료!
echo ========================================
echo.
echo 추가 옵션:
echo - 컨테이너 삭제: docker-compose down
echo - 볼륨까지 삭제: docker-compose down -v
echo - 이미지까지 삭제: docker-compose down -v --rmi all
echo.
pause 