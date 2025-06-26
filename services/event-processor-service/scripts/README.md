# Event Processor Service 데이터베이스 설정 스크립트

이 디렉토리에는 Event Processor Service의 PostgreSQL, InfluxDB, Redis 데이터베이스 설정에 필요한 스크립트가 포함되어 있습니다.

## 파일 구조

- `setup-database.bat` - Windows에서 PostgreSQL 설정을 자동화하는 배치 스크립트
- `create-user.sql` - PostgreSQL 사용자 및 데이터베이스 생성 스크립트
- `create-tables.sql` - 필요한 테이블 생성 스크립트
- `init-db.sql` - Docker 컨테이너 초기화용 스크립트
- `docker-compose.yml` - Docker 환경 설정 파일

## Windows에서 설정하기

### 사전 요구사항

- PostgreSQL 설치됨
- 관리자 비밀번호: `1q2w3e4r!!`

### 단계

1. `setup-database.bat` 스크립트 실행
   ```
   setup-database.bat
   ```

2. 테이블 생성
   ```
   set PGPASSWORD=app123!@# && psql -U app_user -h localhost -d game_statistics -f create-tables.sql
   ```

## Docker로 설정하기

### 사전 요구사항

- Docker 및 Docker Compose 설치됨

### 단계

1. Docker Compose 실행
   ```
   docker-compose -f docker-compose.yml up -d
   ```

2. PostgreSQL 컨테이너에 테이블 생성 스크립트 실행
   ```
   docker exec -i event-processor-postgres psql -U app_user -d game_statistics < create-tables.sql
   ```

## 연결 정보

### PostgreSQL (TimescaleDB)

- 호스트: localhost (Docker: event-processor-postgres)
- 포트: 5432
- 데이터베이스: game_statistics
- 사용자: app_user
- 비밀번호: app123!@#

### InfluxDB

- 호스트: localhost (Docker: event-processor-influxdb)
- 포트: 8086
- 조직: game-org
- 버킷: game-metrics
- 사용자: admin
- 비밀번호: 1q2w3e4r!!
- 토큰: your-influx-token

### Redis

- 호스트: localhost (Docker: event-processor-redis)
- 포트: 6379
- 비밀번호: 1q2w3e4r!!

## 환경 변수 설정 (.env 파일)

서비스 실행을 위해 필요한 환경 변수를 `.env` 파일에 설정해야 합니다. `sample.env` 파일을 복사하여 `.env` 파일을 생성하고 적절하게 수정하세요.

```
# PostgreSQL 설정
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=app_user
POSTGRES_PASSWORD=app123!@#
POSTGRES_DB=game_statistics

# InfluxDB 설정
INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=your-influx-token
INFLUX_ORG=game-org
INFLUX_BUCKET=game-metrics

# Redis 설정
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=