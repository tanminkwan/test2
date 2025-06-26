-- 데이터베이스 스키마 확인용 스크립트

-- player_id 칼럼 정보 조회
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE column_name = 'player_id';

-- players 테이블 구조 조회
\d players 