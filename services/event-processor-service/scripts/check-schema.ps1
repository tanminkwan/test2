# 스키마 확인용 PowerShell 스크립트

# 환경 변수 설정
$env:PGPASSWORD = "app123!@#"

# 데이터베이스 접속 정보
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_USER = "app_user"
$DB_NAME = "game_statistics"

# 테이블 구조 확인
Write-Host "===== Players 테이블 구조 확인 =====" -ForegroundColor Cyan
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\d players"

Write-Host "`n===== Vehicles 테이블 구조 확인 =====" -ForegroundColor Cyan
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\d vehicles"

Write-Host "`n===== Player_Sessions 테이블 구조 확인 =====" -ForegroundColor Cyan
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\d player_sessions"

Write-Host "`n===== Game_Sessions 테이블 구조 확인 =====" -ForegroundColor Cyan
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\d game_sessions"

Write-Host "`n===== Game_Events 테이블 구조 확인 =====" -ForegroundColor Cyan
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\d game_events"

Write-Host "`n===== 테이블의 player_id 칼럼 타입 확인 =====" -ForegroundColor Cyan
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE column_name = 'player_id';" 