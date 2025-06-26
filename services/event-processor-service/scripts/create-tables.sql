-- Event Processor Service - 테이블 생성 스크립트
-- 실행 방법: psql -U app_user -h localhost -d game_statistics -f create-tables.sql

-- TimescaleDB 확장 생성 여부 확인
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- 플레이어 테이블
CREATE TABLE IF NOT EXISTS players (
    player_id UUID PRIMARY KEY,
    player_name VARCHAR(50) NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL
);

-- 플레이어 세션 테이블
CREATE TABLE IF NOT EXISTS player_sessions (
    id SERIAL PRIMARY KEY,
    player_id UUID NOT NULL REFERENCES players(player_id),
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL,
    left_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_player_session UNIQUE (player_id, joined_at)
);

-- 게임 세션 테이블
CREATE TABLE IF NOT EXISTS game_sessions (
    game_id VARCHAR(50) PRIMARY KEY,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    player_count INTEGER NOT NULL,
    game_mode VARCHAR(50) NOT NULL,
    winner_id UUID
);

-- 차량 테이블
CREATE TABLE IF NOT EXISTS vehicles (
    vehicle_id VARCHAR(50) PRIMARY KEY,
    player_id UUID NOT NULL REFERENCES players(player_id),
    vehicle_type VARCHAR(50) NOT NULL,
    spawned_at TIMESTAMP WITH TIME ZONE NOT NULL,
    destroyed_at TIMESTAMP WITH TIME ZONE,
    destroyed_by UUID,
    position JSONB
);

-- 게임 이벤트 테이블
CREATE TABLE IF NOT EXISTS game_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    player_id UUID,
    vehicle_id VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    data JSONB NOT NULL
);

-- 광고판 파괴 테이블
CREATE TABLE IF NOT EXISTS billboard_destructions (
    id SERIAL PRIMARY KEY,
    billboard_id VARCHAR(50) NOT NULL,
    destroyed_by UUID NOT NULL,
    destroyed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    position JSONB,
    reward INTEGER NOT NULL
);

-- 아이템 상자 파괴 테이블
CREATE TABLE IF NOT EXISTS item_box_destructions (
    id SERIAL PRIMARY KEY,
    item_box_id VARCHAR(50) NOT NULL,
    destroyed_by UUID NOT NULL,
    destroyed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    position JSONB,
    rewards JSONB
);

-- 플레이어 통계 테이블
CREATE TABLE IF NOT EXISTS player_statistics (
    player_id UUID PRIMARY KEY REFERENCES players(player_id),
    kills INTEGER DEFAULT 0,
    deaths INTEGER DEFAULT 0,
    hits INTEGER DEFAULT 0,
    shots INTEGER DEFAULT 0,
    missile_fires INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,
    missiles_collected INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- game_events 테이블을 TimescaleDB 하이퍼테이블로 변환
SELECT create_hypertable('game_events', 'timestamp', if_not_exists => TRUE);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_game_events_event_type ON game_events(event_type);
CREATE INDEX IF NOT EXISTS idx_game_events_player_id ON game_events(player_id);
CREATE INDEX IF NOT EXISTS idx_game_events_vehicle_id ON game_events(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_player_id ON vehicles(player_id);
CREATE INDEX IF NOT EXISTS idx_player_sessions_player_id ON player_sessions(player_id);

-- 게임 메트릭 테이블
CREATE TABLE IF NOT EXISTS game_metrics (
    id SERIAL PRIMARY KEY,
    time TIMESTAMPTZ NOT NULL,
    player_id UUID,
    metric_type VARCHAR(50) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    data JSONB
);

-- game_metrics 테이블을 TimescaleDB 하이퍼테이블로 변환
SELECT create_hypertable('game_metrics', 'time', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_game_metrics_metric_type ON game_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_game_metrics_player_id ON game_metrics(player_id);

\echo '========================================='
\echo '테이블 생성 완료!'
\echo '=========================================' 