# postgres 관리자 계정으로 스키마 업데이트 스크립트 실행

# postgres 비밀번호 설정
$env:PGPASSWORD = "1q2w3e4r!!"

Write-Host "===== 관리자 계정으로 스키마 업데이트 스크립트 실행 =====" -ForegroundColor Cyan
psql -h localhost -p 5432 -U postgres -d game_statistics -f update-schema.sql

Write-Host "`n===== 스키마 업데이트 완료 =====" -ForegroundColor Green

# 스키마 확인
Write-Host "`n===== 업데이트된 player_id 칼럼 타입 확인 =====" -ForegroundColor Cyan
psql -h localhost -p 5432 -U postgres -d game_statistics -c "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE column_name = 'player_id';" 