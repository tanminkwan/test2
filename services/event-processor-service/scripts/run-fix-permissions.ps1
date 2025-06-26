# 권한 부여 스크립트 실행

# postgres 비밀번호 설정
$env:PGPASSWORD = "1q2w3e4r!!"

Write-Host "===== 권한 부여 스크립트 실행 =====" -ForegroundColor Cyan
psql -h localhost -p 5432 -U postgres -d game_statistics -f fix-permissions.sql

Write-Host "`n===== 권한 부여 완료 =====" -ForegroundColor Green 