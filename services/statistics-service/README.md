# 통계 서비스

게임 통계를 수집, 분석, 제공하는 마이크로서비스입니다.

## 기능

- 게임 통계 요약 제공
- 플레이어별 통계 제공
- 무기 사용 통계 제공
- 시간별 활동 통계 제공
- 통계 데이터 내보내기 (JSON, CSV)

## 기술 스택

- Node.js, Express
- PostgreSQL (영구 데이터 저장)
- InfluxDB (시계열 데이터 분석)
- 메모리 캐싱

## 시작하기

### 환경 변수 설정

`.env` 파일을 생성하고 다음과 같이 설정합니다:

```
# 서버 설정
PORT=3004
NODE_ENV=development

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

# 캐싱 설정
CACHE_ENABLED=true
CACHE_TTL=300
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

### 무기 사용 통계

```
GET /api/statistics/weapons
```

무기 사용 통계를 조회합니다.

### 시간별 활동 통계

```
GET /api/statistics/activity?period=24h
```

시간별 활동 통계를 조회합니다. `period` 파라미터는 조회 기간을 지정합니다 (기본값: 24h).
유효한 값: `24h`, `7d`, `30d`

## 데이터 캐싱

성능 최적화를 위해 통계 데이터는 메모리에 캐싱됩니다:

- 캐시 TTL: 기본 5분 (환경 변수로 설정 가능)
- 캐시 키: 요청 유형과 파라미터에 따라 생성
- 캐시 무효화: TTL 만료 시 자동으로 무효화

## 데이터베이스 연결

- **PostgreSQL**: 플레이어 정보, 게임 이벤트, 통계 데이터 저장
- **InfluxDB**: 시계열 데이터 분석, 실시간 메트릭 저장

## 도커 이미지 빌드

```bash
docker build -t statistics-service .
```

## 도커 컨테이너 실행

```bash
docker run -p 3004:3004 --env-file .env statistics-service
``` 