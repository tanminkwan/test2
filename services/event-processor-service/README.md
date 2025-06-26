# 이벤트 프로세서 서비스

게임 이벤트를 수집, 처리, 분석하는 마이크로서비스입니다.

## 기능

- 게임 이벤트 수집 및 처리
- 시계열 데이터 저장 및 분석
- 실시간 통계 생성
- 배치 처리를 통한 데이터베이스 작업 최적화

## 기술 스택

- Node.js, Express
- Redis (이벤트 구독)
- PostgreSQL (영구 데이터 저장)
- InfluxDB (시계열 데이터 저장)

## 시작하기

### 환경 변수 설정

`.env` 파일을 생성하고 다음과 같이 설정합니다:

```
# 서버 설정
PORT=3003
NODE_ENV=development

# Redis 설정
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# PostgreSQL 설정
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=vehicle_game
POSTGRES_SSL=false

# InfluxDB 설정
INFLUXDB_URL=http://localhost:8086
INFLUXDB_TOKEN=
INFLUXDB_ORG=vehicle_game
INFLUXDB_BUCKET=game_metrics

# 로깅 설정
LOG_LEVEL=info
LOG_PRETTY=true

# 배치 처리 설정
BATCH_SIZE=100
FLUSH_INTERVAL_MS=5000
```

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 모드로 실행
npm run dev

# 프로덕션 모드로 실행
npm start
```

## API 엔드포인트

### 상태 확인

```
GET /health
```

서비스 상태를 확인합니다.

### 통계 요약

```
GET /api/statistics/summary
```

전체 게임 통계 요약을 조회합니다.

### 플레이어별 통계

```
GET /api/statistics/player/:playerId
```

특정 플레이어의 통계를 조회합니다.

## 이벤트 처리 흐름

1. Game Service에서 게임 이벤트 발생 (예: 충돌, 점수 획득)
2. 이벤트가 Redis를 통해 발행됨
3. Event Processor Service가 Redis에서 이벤트를 구독하여 수신
4. 이벤트 데이터가 처리되어 PostgreSQL(영구 저장)과 InfluxDB(시계열 분석)에 저장
5. 처리된 데이터를 기반으로 실시간 통계 및 분석 제공

## 데이터베이스 스키마

### PostgreSQL 테이블

```sql
-- 게임 이벤트 테이블
CREATE TABLE game_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  player_id UUID NOT NULL,
  vehicle_id VARCHAR(50),
  timestamp TIMESTAMP NOT NULL,
  data JSONB
);

-- 인덱스
CREATE INDEX idx_game_events_player_id ON game_events(player_id);
CREATE INDEX idx_game_events_event_type ON game_events(event_type);
CREATE INDEX idx_game_events_timestamp ON game_events(timestamp);
```

### InfluxDB 측정

- `score`: 점수 관련 메트릭
- `damage`: 피해 관련 메트릭
- `kills`: 킬 관련 메트릭
- `collision`: 충돌 관련 메트릭
- `weaponFired`: 무기 발사 관련 메트릭
- `itemCollected`: 아이템 획득 관련 메트릭

## 배치 처리

성능 최적화를 위해 이벤트와 메트릭은 배치로 처리됩니다:

1. 이벤트와 메트릭은 먼저 메모리 버퍼에 저장됩니다.
2. 버퍼가 일정 크기(기본값: 100개)에 도달하거나 일정 시간(기본값: 5초)이 경과하면 데이터베이스에 일괄 저장됩니다.
3. 이를 통해 데이터베이스 연결 및 쿼리 횟수를 최소화하여 성능을 향상시킵니다. 