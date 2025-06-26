-- 게임 통계 데이터베이스 테이블 생성 스크립트

-- 플레이어 테이블
CREATE TABLE IF NOT EXISTS players (
  player_id VARCHAR(50) PRIMARY KEY,
  player_name VARCHAR(100) NOT NULL,
  joined_at TIMESTAMP NOT NULL,
  vehicle_type VARCHAR(50)
);

-- 플레이어 세션 테이블
CREATE TABLE IF NOT EXISTS player_sessions (
  session_id SERIAL PRIMARY KEY,
  player_id VARCHAR(50) REFERENCES players(player_id),
  joined_at TIMESTAMP NOT NULL,
  left_at TIMESTAMP,
  game_id VARCHAR(50)
);

-- 게임 세션 테이블
CREATE TABLE IF NOT EXISTS game_sessions (
  game_id VARCHAR(50) PRIMARY KEY,
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  player_count INT,
  winner_id VARCHAR(50),
  game_mode VARCHAR(50)
);

-- 차량 테이블
CREATE TABLE IF NOT EXISTS vehicles (
  vehicle_id VARCHAR(50) PRIMARY KEY,
  player_id VARCHAR(50) REFERENCES players(player_id),
  vehicle_type VARCHAR(50),
  spawned_at TIMESTAMP NOT NULL,
  destroyed_at TIMESTAMP,
  destroyed_by VARCHAR(50),
  position JSONB
);

-- 광고판 파괴 테이블
CREATE TABLE IF NOT EXISTS billboard_destructions (
  id SERIAL PRIMARY KEY,
  billboard_id VARCHAR(50) NOT NULL,
  destroyed_by VARCHAR(50),
  destroyed_at TIMESTAMP NOT NULL,
  position JSONB,
  reward INT
);

-- 아이템 상자 파괴 테이블
CREATE TABLE IF NOT EXISTS item_box_destructions (
  id SERIAL PRIMARY KEY,
  item_box_id VARCHAR(50) NOT NULL,
  destroyed_by VARCHAR(50),
  destroyed_at TIMESTAMP NOT NULL,
  position JSONB,
  rewards JSONB
);

-- 플레이어 통계 테이블
CREATE TABLE IF NOT EXISTS player_statistics (
  player_id VARCHAR(50) PRIMARY KEY REFERENCES players(player_id),
  kills INT DEFAULT 0,
  deaths INT DEFAULT 0,
  hits INT DEFAULT 0,
  shots INT DEFAULT 0,
  missile_fires INT DEFAULT 0,
  missiles_collected INT DEFAULT 0,
  score INT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 트리거 설정: 플레이어 생성 시 통계 테이블에 자동 추가
CREATE OR REPLACE FUNCTION create_player_statistics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO player_statistics (player_id)
  VALUES (NEW.player_id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS player_created_trigger ON players;
CREATE TRIGGER player_created_trigger
AFTER INSERT ON players
FOR EACH ROW
EXECUTE FUNCTION create_player_statistics();

-- TimescaleDB 확장 활성화 (사용 가능한 경우)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    RETURN;
  END IF;

  BEGIN
    CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'TimescaleDB 확장을 사용할 수 없습니다. 표준 PostgreSQL로 계속 진행합니다.';
  END;
END
$$; 