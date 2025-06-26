-- app_user에게 필요한 권한 부여 스크립트
-- postgres 사용자로 실행해야 합니다

-- 테이블 소유권 확인
SELECT tablename, tableowner 
FROM pg_tables 
WHERE schemaname = 'public';

-- app_user에게 모든 테이블에 대한 모든 권한 부여
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;

-- 시퀀스에 대한 권한도 부여
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- app_user를 테이블 소유자로 변경
ALTER TABLE players OWNER TO app_user;
ALTER TABLE vehicles OWNER TO app_user;
ALTER TABLE player_sessions OWNER TO app_user;
ALTER TABLE game_sessions OWNER TO app_user;
ALTER TABLE game_events OWNER TO app_user;
ALTER TABLE billboard_destructions OWNER TO app_user;
ALTER TABLE item_box_destructions OWNER TO app_user;
ALTER TABLE player_statistics OWNER TO app_user;
-- ALTER TABLE game_metrics OWNER TO app_user; -- 이 테이블이 없을 수 있음 