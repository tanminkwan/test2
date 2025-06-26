# 이벤트 프로세서 서비스 개발 환경 설정 (Windows)

이 문서는 Windows 환경에서 이벤트 프로세서 서비스를 설정하고 실행하는 방법을 설명합니다.

## 필수 요구사항

- Node.js 18.x 이상
- npm 8.x 이상
- Redis 서버
- PostgreSQL 14.x 이상 (TimescaleDB 확장 권장)
- InfluxDB 2.x

## 설치 방법

1. 저장소를 클론합니다:
   ```
   git clone <repository-url>
   cd <repository-directory>
   ```

2. 종속성을 설치합니다:
   ```
   cd services/event-processor-service
   npm install
   ```

3. `.env` 파일을 생성하고 아래 내용을 복사합니다:
   ```
   # 서비스 설정
   PORT=3003
   NODE_ENV=development
   SERVICE_NAME=event-processor-service

   # Redis 설정
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=
   REDIS_DB=0
   REDIS_CHANNEL=game-events

   # PostgreSQL 설정
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_DB=game_statistics
   POSTGRES_SSL=false

   # InfluxDB 설정
   INFLUX_URL=http://localhost:8086
   INFLUX_TOKEN=your-influx-token
   INFLUX_ORG=game-org
   INFLUX_BUCKET=game-metrics

   # 로깅 설정
   LOG_LEVEL=info
   LOG_FILE_DIR=./logs

   # 이벤트 처리 설정
   BATCH_SIZE=100
   BATCH_INTERVAL_MS=1000
   MAX_RETRY_COUNT=3

   # 로그 파일 복구 설정
   LOG_RECOVERY_ENABLED=true
   LOG_RECOVERY_DIR=../game-service/logs/events
   ```

4. 환경 변수를 자신의 환경에 맞게 수정합니다.

## 데이터베이스 설정

### PostgreSQL / TimescaleDB

1. PostgreSQL 서버에 접속합니다:
   ```
   psql -U postgres
   ```

2. 게임 통계용 데이터베이스를 생성합니다:
   ```sql
   CREATE DATABASE game_statistics;
   ```

3. 생성한 데이터베이스에 접속합니다:
   ```
   \c game_statistics
   ```

4. 필요한 테이블을 생성합니다:
   ```sql
   -- 플레이어 테이블
   CREATE TABLE players (
     player_id VARCHAR(50) PRIMARY KEY,
     player_name VARCHAR(100) NOT NULL,
     joined_at TIMESTAMP NOT NULL,
     vehicle_type VARCHAR(50)
   );

   -- 플레이어 세션 테이블
   CREATE TABLE player_sessions (
     session_id SERIAL PRIMARY KEY,
     player_id VARCHAR(50) REFERENCES players(player_id),
     joined_at TIMESTAMP NOT NULL,
     left_at TIMESTAMP,
     game_id VARCHAR(50)
   );

   -- 게임 세션 테이블
   CREATE TABLE game_sessions (
     game_id VARCHAR(50) PRIMARY KEY,
     started_at TIMESTAMP NOT NULL,
     ended_at TIMESTAMP,
     player_count INT,
     winner_id VARCHAR(50),
     game_mode VARCHAR(50)
   );

   -- 차량 테이블
   CREATE TABLE vehicles (
     vehicle_id VARCHAR(50) PRIMARY KEY,
     player_id VARCHAR(50) REFERENCES players(player_id),
     vehicle_type VARCHAR(50),
     spawned_at TIMESTAMP NOT NULL,
     destroyed_at TIMESTAMP,
     destroyed_by VARCHAR(50),
     position JSONB
   );

   -- 광고판 파괴 테이블
   CREATE TABLE billboard_destructions (
     id SERIAL PRIMARY KEY,
     billboard_id VARCHAR(50) NOT NULL,
     destroyed_by VARCHAR(50),
     destroyed_at TIMESTAMP NOT NULL,
     position JSONB,
     reward INT
   );

   -- 아이템 상자 파괴 테이블
   CREATE TABLE item_box_destructions (
     id SERIAL PRIMARY KEY,
     item_box_id VARCHAR(50) NOT NULL,
     destroyed_by VARCHAR(50),
     destroyed_at TIMESTAMP NOT NULL,
     position JSONB,
     rewards JSONB
   );

   -- 플레이어 통계 테이블
   CREATE TABLE player_statistics (
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

   CREATE TRIGGER player_created_trigger
   AFTER INSERT ON players
   FOR EACH ROW
   EXECUTE FUNCTION create_player_statistics();
   ```

### InfluxDB

1. InfluxDB UI에 접속합니다 (기본 URL: http://localhost:8086).

2. 초기 설정을 완료하고 조직(Organization)과 버킷(Bucket)을 생성합니다.

3. API 토큰을 생성하고 `.env` 파일의 `INFLUX_TOKEN` 값을 업데이트합니다.

### Redis

1. Redis 서버가 실행 중인지 확인합니다:
   ```
   redis-cli ping
   ```

2. 응답이 "PONG"이면 Redis가 정상적으로 실행 중입니다.

## 서비스 실행

### 개발 모드

개발 모드에서는 코드 변경 시 자동으로 서버가 재시작됩니다:

```
npm run dev
```

### 프로덕션 모드

프로덕션 모드로 실행:

```
npm start
```

## API 엔드포인트

서비스가 실행되면 다음 엔드포인트를 사용할 수 있습니다:

- `GET /`: 서비스 기본 정보 반환
- `GET /health`: 서비스 상태 확인
- `GET /stats`: 간단한 통계 정보 반환

## 트러블슈팅

### Redis 연결 문제

Redis 연결 오류가 발생하면:

1. Redis 서버가 실행 중인지 확인합니다.
2. `.env` 파일의 Redis 설정이 올바른지 확인합니다.
3. 방화벽 설정을 확인합니다.

### 데이터베이스 연결 문제

PostgreSQL 또는 InfluxDB 연결 오류가 발생하면:

1. 데이터베이스 서버가 실행 중인지 확인합니다.
2. `.env` 파일의 데이터베이스 설정이 올바른지 확인합니다.
3. 사용자 권한을 확인합니다.

### 로그 파일

로그 파일은 기본적으로 `./logs` 디렉토리에 저장됩니다:

- `event-processor.log`: 일반 로그
- `error.log`: 오류 로그

## 로그 파일 복구 기능

Redis 연결이 실패하면 서비스는 자동으로 로그 파일 복구 모드로 전환됩니다. 이 모드에서는 `LOG_RECOVERY_DIR`에 지정된 디렉토리에서 JSONL 형식의 로그 파일을 읽어 처리합니다.

로그 파일 복구 기능을 비활성화하려면 `.env` 파일에서 `LOG_RECOVERY_ENABLED=false`로 설정하세요. 