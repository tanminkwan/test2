# 테이블 소유권 확인 스크립트 실행

# postgres 비밀번호 설정
$env:PGPASSWORD = "1q2w3e4r!!"

Write-Host "===== 테이블 소유권 확인 스크립트 실행 =====" -ForegroundColor Cyan
psql -h localhost -p 5432 -U postgres -d game_statistics -f check-ownership.sql

Write-Host "`n===== 테이블 소유권 확인 완료 =====" -ForegroundColor Green 