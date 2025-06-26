-- 기존 테이블과 참조를 수정하기 위한 스크립트
-- 실행 방법: psql -U app_user -h localhost -d game_statistics -f update-schema.sql

-- 참조 제약 조건 삭제
ALTER TABLE player_sessions DROP CONSTRAINT player_sessions_player_id_fkey;
ALTER TABLE vehicles DROP CONSTRAINT vehicles_player_id_fkey;
ALTER TABLE player_statistics DROP CONSTRAINT player_statistics_player_id_fkey;

-- players 테이블 수정
ALTER TABLE players ALTER COLUMN player_id TYPE VARCHAR(50) USING player_id::VARCHAR(50);

-- vehicles 테이블 수정
ALTER TABLE vehicles ALTER COLUMN player_id TYPE VARCHAR(50) USING player_id::VARCHAR(50);
ALTER TABLE vehicles ALTER COLUMN destroyed_by TYPE VARCHAR(50) USING destroyed_by::VARCHAR(50);

-- player_sessions 테이블 수정
ALTER TABLE player_sessions ALTER COLUMN player_id TYPE VARCHAR(50) USING player_id::VARCHAR(50);

-- game_sessions 테이블 수정
ALTER TABLE game_sessions ALTER COLUMN winner_id TYPE VARCHAR(50) USING winner_id::VARCHAR(50);

-- game_events 테이블 수정
ALTER TABLE game_events ALTER COLUMN player_id TYPE VARCHAR(50) USING player_id::VARCHAR(50);

-- billboard_destructions 테이블 수정
ALTER TABLE billboard_destructions ALTER COLUMN destroyed_by TYPE VARCHAR(50) USING destroyed_by::VARCHAR(50);

-- item_box_destructions 테이블 수정
ALTER TABLE item_box_destructions ALTER COLUMN destroyed_by TYPE VARCHAR(50) USING destroyed_by::VARCHAR(50);

-- player_statistics 테이블 수정
ALTER TABLE player_statistics ALTER COLUMN player_id TYPE VARCHAR(50) USING player_id::VARCHAR(50);

-- game_metrics 테이블 수정
ALTER TABLE game_metrics ALTER COLUMN player_id TYPE VARCHAR(50) USING player_id::VARCHAR(50);

-- 참조 제약 조건 다시 생성
ALTER TABLE player_sessions ADD CONSTRAINT player_sessions_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(player_id);
ALTER TABLE vehicles ADD CONSTRAINT vehicles_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(player_id);
ALTER TABLE player_statistics ADD CONSTRAINT player_statistics_player_id_fkey FOREIGN KEY (player_id) REFERENCES players(player_id);

-- 정보 출력
\echo '========================================='
\echo '스키마 업데이트 완료: player_id와 관련 필드가 VARCHAR(50)로 변환되었습니다!'
\echo '=========================================' 