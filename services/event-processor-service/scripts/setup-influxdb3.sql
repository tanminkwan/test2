-- InfluxDB 3.x 초기화 SQL 스크립트
-- 실행 방법: influxdb3 sql --host http://localhost:8181 --query-file setup-influxdb3.sql

CREATE DATABASE IF NOT EXISTS game_metrics;
USE game_metrics;

-- 예시: 플레이어 메트릭 테이블
CREATE TABLE IF NOT EXISTS player_metrics (
    time TIMESTAMP,
    player_id STRING,
    metric_type STRING,
    value DOUBLE
);

-- 예시: 게임 이벤트 메트릭 테이블
CREATE TABLE IF NOT EXISTS game_events (
    time TIMESTAMP,
    event_type STRING,
    player_id STRING,
    vehicle_id STRING,
    value DOUBLE,
    data JSON
); 