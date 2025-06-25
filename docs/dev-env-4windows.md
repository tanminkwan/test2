# Windows 개발 환경 설정 가이드

이 문서는 Windows 환경에서 마이크로서비스 아키텍처 기반 게임 프로젝트의 개발 환경을 설정하는 방법을 설명합니다.

## 목차

1. [필수 요구사항](#필수-요구사항)
2. [Node.js 설치](#nodejs-설치)
3. [PostgreSQL 설치](#postgresql-설치)
4. [Redis 설치](#redis-설치)
5. [InfluxDB 3.0 설치](#influxdb-30-설치)
6. [Nginx 설치](#nginx-설치)
7. [서비스 실행](#서비스-실행)

## 필수 요구사항

- Windows 10 이상
- 관리자 권한
- 인터넷 연결

## Node.js 설치

1. [Node.js 공식 웹사이트](https://nodejs.org/)에서 LTS 버전 다운로드
2. 설치 프로그램 실행 및 기본 옵션으로 설치
3. 설치 확인:
   ```powershell
   node --version
   npm --version
   ```

## PostgreSQL 설치

1. [PostgreSQL 다운로드 페이지](https://www.postgresql.org/download/windows/)에서 설치 프로그램 다운로드
2. 설치 프로그램 실행 및 안내에 따라 설치
   - 기본 포트: 5432
   - 관리자 비밀번호 설정 (기억해두세요)
3. pgAdmin 설치 (PostgreSQL과 함께 제공됨)
4. 설치 확인:
   ```powershell
   psql -U postgres -c "SELECT version();"
   ```

### 데이터베이스 생성

1. pgAdmin 실행
2. 서버에 연결 (비밀번호 입력)
3. 각 서비스별 데이터베이스 생성:
   ```sql
   -- User Service 데이터베이스
   CREATE DATABASE user_service;
   CREATE USER app_user WITH PASSWORD 'app123!@#';
   GRANT ALL PRIVILEGES ON DATABASE user_service TO app_user;

   -- Event Processor 데이터베이스
   CREATE DATABASE event_processor;
   CREATE USER event_user WITH PASSWORD 'event123!@#';
   GRANT ALL PRIVILEGES ON DATABASE event_processor TO event_user;
   ```

### PostgreSQL에 TimescaleDB 설치

시계열 데이터를 효율적으로 처리하기 위해 TimescaleDB 확장 모듈을 설치할 수 있습니다.

1. **공식 설치 프로그램 사용**
   - [TimescaleDB 다운로드 페이지](https://docs.timescale.com/install/latest/self-hosted/installation-windows/)에서 Windows용 설치 프로그램 다운로드
   - 설치 프로그램 실행 및 안내에 따라 설치
   - 설치 과정에서 기존 PostgreSQL 인스턴스 선택

2. **PostgreSQL 확장으로 직접 설치**
   ```powershell
   # PostgreSQL bin 디렉토리로 이동 (버전에 따라 경로가 다를 수 있음)
   cd "C:\Program Files\PostgreSQL\14\bin"
   
   # TimescaleDB 확장 설치
   .\psql -U postgres -c "CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"
   ```

3. **설치 확인**
   ```powershell
   # PostgreSQL에 연결
   .\psql -U postgres
   
   # TimescaleDB 확장 확인
   SELECT default_version, installed_version FROM pg_available_extensions WHERE name = 'timescaledb';
   ```

4. **PostgreSQL 설정 파일 수정**
   ```powershell
   # 설정 파일 위치 (경로는 다를 수 있음)
   notepad "C:\Program Files\PostgreSQL\14\data\postgresql.conf"
   ```
   
   파일에 다음 줄을 추가 또는 수정:
   ```
   shared_preload_libraries = 'timescaledb'
   ```

5. **PostgreSQL 서비스 재시작**
   ```powershell
   # PostgreSQL 서비스 재시작
   net stop postgresql
   net start postgresql
   ```

## Redis 설치

1. [Redis Windows 포트](https://github.com/microsoftarchive/redis/releases) 다운로드
   - 최신 MSI 설치 파일(예: Redis-x64-3.0.504.msi) 다운로드
   - 또는 [Memurai](https://www.memurai.com/) (Windows용 Redis 호환 서버) 사용

2. 설치 프로그램 실행 및 기본 옵션으로 설치
   - "Add the Redis installation folder to the PATH environment variable" 옵션 체크
   - 설치 경로 기본값: `C:\Program Files\Redis`

3. Redis 서버 실행 방법 (세 가지 방법 중 하나 선택):

   **방법 1: Windows 서비스로 실행 (권장)**
   ```powershell
   # 서비스 시작
   net start redis

   # 서비스 상태 확인
   sc query redis
   
   # 서비스 중지 (필요시)
   net stop redis
   ```

   **방법 2: 명령 프롬프트에서 직접 실행**
   ```powershell
   # 설치 경로로 이동
   cd "C:\Program Files\Redis"
   
   # 서버 실행
   .\redis-server.exe
   ```

   **방법 3: 설정 파일로 실행**
   ```powershell
   # 설치 경로로 이동
   cd "C:\Program Files\Redis"
   
   # 설정 파일로 서버 실행
   .\redis-server.exe redis.windows.conf
   ```

4. 설치 확인:
   ```powershell
   # Redis CLI 실행
   redis-cli

   # PING 명령으로 연결 테스트
   127.0.0.1:6379> PING
   # "PONG" 응답이 나와야 함
   
   # CLI 종료
   127.0.0.1:6379> exit
   ```

5. 기본 설정:
   - 포트: 6379
   - 비밀번호: 기본 설정 없음
   - 설정 파일 위치: `C:\Program Files\Redis\redis.windows.conf`

6. 설정 변경 (선택 사항):
   ```powershell
   # 설정 파일 편집
   notepad "C:\Program Files\Redis\redis.windows.conf"
   
   # 변경 후 서비스 재시작
   net stop redis
   net start redis
   ```

## InfluxDB 3.0 설치

1. [InfluxDB 다운로드 페이지](https://www.influxdata.com/downloads/)에서 InfluxDB 3.0 Windows 버전 다운로드
2. 설치 프로그램 실행 및 안내에 따라 설치
3. 데이터 저장 디렉토리 생성:
   ```powershell
   mkdir C:\InfluxDB3\data
   ```
4. InfluxDB 서버 실행:
   ```powershell
   influxdb3 serve --node-id influx_node --object-store file --data-dir C:\InfluxDB3\data
   ```
5. 새 터미널에서 데이터베이스 생성:
   ```powershell
   influxdb3 create database game_metrics
   ```
6. 인증 토큰 생성:
   ```powershell
   influxdb3 create token --name event-processor-token --all-access
   ```
   생성된 토큰을 복사하여 `.env` 파일에 사용하세요.

7. 설치 확인:
   ```powershell
   # 간단한 데이터 쓰기
   influxdb3 write game_metrics "test,host=host1 value=1"
   
   # 데이터 쿼리
   influxdb3 query "SELECT * FROM test"
   ```

## Nginx 설치

1. [Nginx Windows 다운로드](https://nginx.org/en/download.html)에서 안정 버전 다운로드
2. 다운로드한 zip 파일을 `C:\nginx`에 압축 해제
3. Nginx 설정 파일 복사:
   ```powershell
   copy C:\pypjt\test2\nginx.conf C:\nginx\conf\nginx.conf
   ```
4. Nginx 실행:
   ```powershell
   cd C:\nginx
   .\nginx.exe
   ```
5. 설치 확인: 브라우저에서 `http://localhost` 접속

## 서비스 실행

### 환경 변수 설정

각 서비스 디렉토리에 `.env` 파일 생성:

```powershell
# User Service
copy services\user-service\sample.env services\user-service\.env

# Game Service
copy services\game-service\sample.env services\game-service\.env

# Event Processor Service
copy services\event-processor-service\sample.env services\event-processor-service\.env
```

필요에 따라 `.env` 파일의 설정 값을 수정하세요.

### 서비스 실행

```powershell
# User Service 실행
cd services\user-service
npm install
npm run dev

# 새 터미널에서 Game Service 실행
cd services\game-service
npm install
npm run dev

# 새 터미널에서 Event Processor Service 실행
cd services\event-processor-service
npm install
npm run dev
```

### 전체 시스템 실행 순서

1. PostgreSQL 실행 확인
2. Redis 서버 실행
3. InfluxDB 서버 실행: `influxdb3 serve --node-id influx_node --object-store file --data-dir C:\InfluxDB3\data`
4. User Service 실행
5. Game Service 실행
6. Event Processor Service 실행
7. Nginx 실행: `cd C:\nginx; .\nginx.exe`

브라우저에서 `http://localhost`로 접속하여 게임 클라이언트를 확인하세요.

## 테스트 이벤트 발행자 사용하기

게임 서비스를 실행하지 않고 이벤트 처리 시스템을 테스트하려면 테스트 이벤트 발행자를 사용할 수 있습니다.

### 설정 및 실행

```powershell
# 테스트 이벤트 발행자 디렉토리로 이동
cd services\test-event-publisher

# 의존성 설치
npm install

# 환경 변수 설정
copy sample.env .env

# 기본 설정으로 실행
npm start

# 또는 특정 시나리오 실행
node src\index.js --scenario vehicle-destroyed --count 20 --interval 500
```

### 사용 가능한 시나리오

```powershell
# 사용 가능한 시나리오 목록 보기
node src\index.js --list
```

주요 시나리오:
- `vehicle-destroyed`: 차량 파괴 이벤트
- `player-score`: 플레이어 점수 변경 이벤트
- `game-state`: 게임 상태 변경 이벤트
- `explosion`: 폭발 효과 이벤트
- `billboard-destroyed`: 광고판 파괴 이벤트

### 모든 시나리오 테스트

```powershell
# 모든 시나리오 테스트 실행
npm test
```

## 문제 해결

### PostgreSQL 연결 오류

- 오류: `사용자 "app_user"의 password 인증에 실패했습니다`
- 해결: 사용자 및 비밀번호 재설정
  ```sql
  DROP USER IF EXISTS app_user;
  CREATE USER app_user WITH PASSWORD 'app123!@#';
  GRANT ALL PRIVILEGES ON DATABASE user_service TO app_user;
  ```

### PostgreSQL에 TimescaleDB 설치

시계열 데이터를 효율적으로 처리하기 위해 TimescaleDB 확장 모듈을 설치할 수 있습니다.

1. **공식 설치 프로그램 사용**
   - [TimescaleDB 다운로드 페이지](https://docs.timescale.com/install/latest/self-hosted/installation-windows/)에서 Windows용 설치 프로그램 다운로드
   - 설치 프로그램 실행 및 안내에 따라 설치
   - 설치 과정에서 기존 PostgreSQL 인스턴스 선택

2. **PostgreSQL 확장으로 직접 설치**
   ```powershell
   # PostgreSQL bin 디렉토리로 이동 (버전에 따라 경로가 다를 수 있음)
   cd "C:\Program Files\PostgreSQL\14\bin"
   
   # TimescaleDB 확장 설치
   .\psql -U postgres -c "CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"
   ```

3. **설치 확인**
   ```powershell
   # PostgreSQL에 연결
   .\psql -U postgres
   
   # TimescaleDB 확장 확인
   SELECT default_version, installed_version FROM pg_available_extensions WHERE name = 'timescaledb';
   ```

4. **PostgreSQL 설정 파일 수정**
   ```powershell
   # 설정 파일 위치 (경로는 다를 수 있음)
   notepad "C:\Program Files\PostgreSQL\14\data\postgresql.conf"
   ```
   
   파일에 다음 줄을 추가 또는 수정:
   ```
   shared_preload_libraries = 'timescaledb'
   ```

5. **PostgreSQL 서비스 재시작**
   ```powershell
   # PostgreSQL 서비스 재시작
   net stop postgresql
   net start postgresql
   ```

### Redis 서버 실행 오류

- 오류: `Redis server is already running`
- 해결: 작업 관리자에서 기존 Redis 서버 프로세스 종료 후 재시작

### InfluxDB 연결 오류

- 오류: 연결 거부 또는 인증 실패
- 해결: 
  - 서버가 실행 중인지 확인
  - 토큰이 올바르게 설정되었는지 확인
  - 데이터베이스 이름이 올바른지 확인

### Nginx 포트 충돌

- 오류: `bind() to 0.0.0.0:80 failed`
- 해결: 
  - 작업 관리자에서 포트 80을 사용 중인 프로세스 확인 및 종료
  - 또는 nginx.conf에서 다른 포트 사용하도록 설정 