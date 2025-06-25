# 📊 비동기 통계 마이크로서비스 구축 계획서 (Windows Native Dev)

**Version:** 1.2  
**작성일:** 2025-06-24  
**업데이트:** Redis Subscriber와 통계 서비스 분리  
**프로젝트 목표:** 게임 서비스의 성능에 영향을 주지 않는 완전 비동기 방식의 통계 및 업적 마이크로서비스를 구축하고, 이를 클라이언트에 시각화하여 제공한다.

---

## 🗺️ 전체 아키텍처 개요 (업데이트)

```mermaid
graph TD
    subgraph "Tier 1: Client"
        Client[Game Client]
    end

    subgraph "Tier 2: Gateway"
        Nginx[Nginx API Gateway]
    end

    subgraph "Tier 3: Application Services"
        GameSvc[Game Service]
        StatsSvc[Statistics API Service]
        EventProcessor[Event Processor Service]
    end

    subgraph "Tier 4: Data & Messaging"
        Redis[Redis Pub/Sub]
        InfluxDB["InfluxDB<br/>Time-Series"]
        PostgreSQL_TS["PostgreSQL + TimescaleDB<br/>Analytics & Sessions"]
        RedisCache[Redis<br/>Real-time Cache]
    end
    
    %% Define connections between tiers
    Client -- "HTTP / WebSocket" --> Nginx
    
    Nginx -- "/ (client files)" --> Client
    Nginx -- "/api/game/*" --> GameSvc
    Nginx -- "/api/statistics/*" --> StatsSvc
    
    GameSvc -- "Publishes Game Events" --> Redis
    EventProcessor -- "Subscribes to Events" --> Redis
    EventProcessor -- "Processes & Stores Data" --> PostgreSQL_TS
    EventProcessor -- "Writes Time-Series Metrics" --> InfluxDB
    EventProcessor -- "Updates Real-time Cache" --> RedisCache
    
    StatsSvc -- "Reads Analytics Data" --> PostgreSQL_TS
    StatsSvc -- "Reads Time-Series Metrics" --> InfluxDB
    StatsSvc -- "Reads Cached Data" --> RedisCache

    style Client fill:#cde4ff
    style Nginx fill:#e5e5e5
    style GameSvc fill:#d4edda
    style StatsSvc fill:#d1ecf1
    style EventProcessor fill:#fff2cc
    style Redis fill:#f8d7da
```

---

## 📝 단계별 실행 계획

### 1단계: Game Service → Redis 비동기 이벤트 전송 (성능 영향 없음, 인터페이스 계층 및 우선순위 config 포함)

- **목표:**
    - game-service에서 발생하는 모든 게임 이벤트를 **이벤트 발행 인터페이스 계층**을 통해 비동기(Fire & Forget) 방식으로 전송한다.
    - 1단계에서는 Redis Pub/Sub을 기본 타겟으로 사용하지만, 이 계층을 통해 향후 Kafka, 파일, 기타 메시지 브로커 등 다양한 타겟으로 확장 가능하도록 설계한다.
    - **인터페이스 계층에 어댑트되는 구현체 중 하나가 file log 방식이며, Redis가 끊기거나 연결 불가/에러 발생 시 즉시 file log 방식으로 자동 전환(fallback)되어야 한다.**
    - **이벤트 발행 우선순위 및 각 구현체의 속성은 별도의 yaml config 파일(`event-publisher-config.yaml`)에서 정의하며, game-config와 분리하여 관리한다.**
    - 이 파일 로그는 추후 batch로 통계에 반영할 예정이지만, 1단계에서는 파일 적재만 신경쓰고 통계 반영은 신경쓰지 않는다.
    - Redis 전송/로그 적재 작업은 game-service의 실시간 성능(게임 플레이)에 절대 영향을 주지 않아야 한다.

- **주요 기술:**
    - Node.js, ioredis, 비동기 파일 입출력(fs/promises)
    - **이벤트 발행 인터페이스(추상화) 계층**: 다양한 백엔드(Redis, Kafka, 파일 등)로의 확장성 확보 및 file log 방식의 어댑터 구현
    - **우선순위 및 속성 config**: yaml 포맷, game-config와 분리

- **이벤트 발행 config 예시 (`event-publisher-config.yaml`)**

```yaml
publishers:
  - type: redis
    host: 127.0.0.1
    port: 6379
    channel: game_events
    password: ""
    db: 0
    retryCount: 3
    retryDelayMs: 1000
  - type: file
    logDir: ./logs/events
    filePrefix: game_events_
    fileExt: .jsonl
    maxFileSize: 10485760 # 10MB
    flushIntervalMs: 100
    rotationPolicy: size
    maxRetry: 3
    encoding: utf8
```

- **주요 속성 설명:**
    - `publishers`: 우선순위대로 나열 (첫 번째가 실패하면 두 번째로 자동 전환)
    - `type`: redis, file 등 구현체 구분
    - redis 관련: host, port, channel, password, db, retryCount, retryDelayMs 등
    - file 관련: logDir, filePrefix, fileExt, maxFileSize, flushIntervalMs, rotationPolicy(size/time), maxRetry, encoding 등

| 단계 | 작업 내용 | 결과물 확인 방법 |
|---|---|---|
| **1.1** | **이벤트 발행 인터페이스 계층 설계/구현**<br/>- Redis, 파일, 기타 타겟을 위한 공통 인터페이스(추상 클래스/함수) 정의<br/>- 실제 구현체(RedisPublisher, FileLogger 등)는 이 인터페이스를 구현 | 각 구현체 단위 테스트 및 인터페이스 교체 시 정상 동작 확인 |
| **1.2** | **event-publisher-config.yaml 설계/적용**<br/>- 이벤트 발행 우선순위 및 각 구현체 속성을 yaml로 정의<br/>- game-config와 분리하여 관리 | config 파일에 우선순위 및 속성 정의, 서비스에서 정상적으로 읽어오는지 확인 |
| **1.3** | **Redis Publisher 구현**<br/>- ioredis로 Redis Pub/Sub 비동기 발행 모듈 작성<br/>- 이벤트 발생 시 await 없이 Fire & Forget 방식으로 Redis에 전송 | 테스트 코드에서 Redis에 메시지가 정상적으로 발행되는지 확인 (`redis-cli MONITOR` 등) |
| **1.4** | **File Logger(Fallback) 구현 및 전환 로직**<br/>- Redis 연결 실패(끊김/에러) 시 이벤트를 JSONL 형식으로 파일에 기록<br/>- 이 전환(fallback)은 자동으로 즉시 이루어져야 하며, 파일 기록도 비동기로 처리 | Redis를 중지한 상태에서 이벤트 발생 시 파일에 이벤트가 정상적으로 기록되는지 확인 |
| **1.5** | **EventManager 통합**<br/>- EventManager에서 이벤트 발생 시 인터페이스 계층을 통해 Redis Publisher와 File Logger를 활용<br/>- 두 작업 모두 await 없이 비동기로 처리, Redis 장애 시 자동으로 file log로 전환되는지 확인 | 게임 플레이 중 이벤트가 발생해도 게임 성능 저하 없이 Redis 또는 파일에 이벤트가 기록되는지 확인 |

---

### 2단계: 이벤트 프로세서 서비스 구현 (Redis Subscriber 역할 분리)

- **목표:** 
  - `game-service`가 Redis Pub/Sub을 통해 이벤트를 비동기적으로 발행(Fire & Forget)하고, 별도의 `event-processor-service`가 이를 구독하여 수신하는 파이프라인을 완성한다.
  - 이벤트 프로세서 서비스는 Redis에서 이벤트를 수신하여 데이터베이스에 저장하는 역할만 수행하며, API 제공 기능은 분리한다.

- **주요 기술:** 
  - Redis Pub/Sub, ioredis (npm package)
  - Node.js, Express.js (최소한의 헬스 체크 API만 제공)

| 단계 | 작업 내용 | 결과물 확인 방법 |
|---|---|---|
| **2.1** | **`event-processor-service` 프로젝트 생성**<br/>- 새 디렉토리 및 package.json 설정<br/>- 기본 서비스 구조 설계 | 프로젝트 구조 확인 및 기본 서비스 실행 테스트 |
| **2.2** | **Redis Subscriber 구현**<br/>- `ioredis` 패키지 추가<br/>- `RedisSubscriber.js` 모듈 작성 (채널 구독 및 메시지 수신) | `game-service`에서 발생시킨 게임 이벤트가 `event-processor-service`의 콘솔 로그에 실시간으로 출력되는 것을 확인. |
| **2.3** | **이벤트 처리 로직 구현**<br/>- 이벤트 타입별 처리기(handler) 구현<br/>- 이벤트 큐 및 배치 처리 메커니즘 구현 | 다양한 이벤트 타입이 적절한 처리기에 의해 처리되는지 로그로 확인 |
| **2.4** | **파일 로그 복구 메커니즘 구현**<br/>- Redis 장애 시 생성된 파일 로그를 읽어 처리하는 기능 구현<br/>- 서비스 시작 시 미처리된 로그 파일 확인 및 처리 | Redis를 중지했다가 재시작 후, 파일 로그에 기록된 이벤트가 정상적으로 처리되는지 확인 |

---

### 3단계: 데이터 저장소 연동

- **목표:** `event-processor-service`가 수신한 이벤트를 용도에 맞는 데이터베이스(InfluxDB, TimescaleDB, Redis)에 분산하여 저장하는 로직을 구현한다.
- **주요 기술:** InfluxDB, TimescaleDB, Redis, Node.js DB Clients

| 단계 | 작업 내용 | 결과물 확인 방법 |
|---|---|---|
| **3.1** | **DB 클라이언트 모듈 구현**<br/>- `influxdb-client`, `pg`, `ioredis` 패키지 설치<br/>- 각 DB 연결 및 기본操作을 담당하는 매니저 클래스 작성 | 각 매니저 클래스의 단위 테스트를 통해 로컬 DB 연결 및 간단한 Read/Write가 성공하는지 확인. |
| **3.2** | **이벤트 프로세서 고도화**<br/>- 수신 이벤트를 InfluxDB, TimescaleDB, Redis Cache에 분배하여 저장/업데이트 | 하나의 게임 이벤트 발생 시, 3개의 데이터 저장소에 데이터가 모두 올바르게 저장되는지 각 DB의 UI 또는 CLI로 확인. |
| **3.3** | **배치(Batch) 처리 구현**<br/>- 이벤트 큐와 `setInterval`을 이용한 배치 처리 로직 추가 | 다수의 이벤트를 짧은 시간에 발생시킨 후, DB 로그나 서비스 로그를 통해 이벤트가 묶어서 처리되는 것을 확인. DB 부하가 줄어드는지 모니터링. |

---

### 4단계: 통계 API 서비스 구현 (분리된 서비스)

- **목표:** 
  - 집계된 통계 데이터를 외부에서 조회할 수 있는 별도의 API 서비스를 구현한다.
  - 이 서비스는 데이터베이스에서 통계 데이터를 읽어 제공하는 역할만 수행하며, 이벤트 처리 및 데이터 저장 로직은 포함하지 않는다.

- **주요 기술:** 
  - Express.js, REST API
  - 데이터베이스 클라이언트 (InfluxDB, PostgreSQL, Redis)

| 단계 | 작업 내용 | 결과물 확인 방법 |
|---|---|---|
| **4.1** | **`statistics-service` 프로젝트 생성**<br/>- 새 디렉토리 및 package.json 설정<br/>- Express.js 기반 API 서버 구조 설계 | 프로젝트 구조 확인 및 기본 API 서버 실행 테스트 |
| **4.2** | **DB 연결 모듈 구현**<br/>- 각 데이터베이스(InfluxDB, TimescaleDB, Redis)에 연결하는 클라이언트 모듈 구현<br/>- 읽기 전용 쿼리 및 캐싱 전략 구현 | 각 DB에서 데이터를 정상적으로 읽어오는지 단위 테스트로 확인 |
| **4.3** | **통계 API 엔드포인트 구현**<br/>- `/leaderboard`, `/stats/:playerId`, `/game-history` 등 필요한 API 엔드포인트 구현<br/>- 데이터 형식 및 응답 구조 정의 | Postman 또는 curl을 사용하여 각 API를 호출했을 때, 정확한 JSON 데이터가 반환되는지 확인 |
| **4.4** | **성능 최적화**<br/>- 응답 캐싱 및 데이터 집계 최적화<br/>- 쿼리 성능 향상을 위한 전략 구현 | API 응답 시간 측정 및 부하 테스트를 통한 성능 확인 |

---

### 5단계: 클라이언트 통합 및 배포

- **목표:** 
  - 통계 API 서비스를 게임 클라이언트에 연동하여 통계 데이터를 시각화한다.
  - 모든 서비스를 Docker를 사용하여 프로덕션 환경에 안정적으로 배포한다.

- **주요 기술:** 
  - Nginx, Docker (Multi-stage builds), Shell scripting

| 단계 | 작업 내용 | 결과물 확인 방법 |
|---|---|---|
| **5.1** | **Nginx 라우팅 설정**<br/>- 로컬 Nginx의 `nginx.conf`에 `/api/statistics/` 경로를 `statistics-service`로 프록시하는 `location` 블록 추가 | 브라우저에서 `http://localhost/api/statistics/leaderboard` 접속 시 Nginx를 통해 API 응답이 정상적으로 반환되는지 개발자 도구로 확인 |
| **5.2** | **게임 클라이언트에 통계 UI 연동**<br/>- `client/` 폴더에 통계/업적 표시 UI 추가<br/>- `fetch` API로 통계 API를 호출하고 결과 데이터를 화면에 렌더링 | 게임에 접속했을 때, 나의 킬/데스, 점수, 리더보드 순위가 UI에 정확하게 표시되는 것을 눈으로 확인 |
| **5.3** | **Docker 컨테이너화**<br/>- 각 서비스(`game-service`, `event-processor-service`, `statistics-service`)의 Dockerfile 작성<br/>- Multi-stage build를 적용하여 최종 이미지 용량 최소화 | `docker images` 명령어로 각 서비스의 이미지가 정상적으로 생성되었는지 확인 |
| **5.4** | **통합 배포 구성**<br/>- `docker-compose.yml` 파일 작성 (모든 서비스 및 데이터베이스 포함)<br/>- 배포 스크립트 작성 및 테스트 | `docker-compose up` 명령으로 모든 서비스가 정상적으로 구동되는지 확인 |
| **5.5** | **End-to-End(E2E) 테스트**<br/>- 게임 플레이로 이벤트 발생부터 클라이언트 UI 반영까지 전 과정 테스트 | 게임에서 특정 액션(예: 킬)을 수행한 후, 잠시 뒤에 클라이언트 UI에 해당 통계가 업데이트되는 것을 최종 확인 |

---

## 📋 서비스 분리 이점

1. **관심사 분리(Separation of Concerns)**
   - `event-processor-service`: 이벤트 수신 및 데이터 처리/저장에 집중
   - `statistics-service`: 통계 데이터 조회 및 API 제공에 집중

2. **독립적인 스케일링**
   - 이벤트 처리량이 많을 때는 `event-processor-service`만 스케일 업/아웃
   - API 요청이 많을 때는 `statistics-service`만 스케일 업/아웃

3. **장애 격리(Fault Isolation)**
   - 한 서비스의 장애가 다른 서비스에 영향을 미치지 않음
   - 예: API 서비스가 과부하로 다운되어도 이벤트 처리 및 데이터 저장은 계속 진행

4. **유지보수 및 배포 용이성**
   - 각 서비스를 독립적으로 업데이트/배포 가능
   - 코드베이스가 작고 집중되어 이해하기 쉬움

5. **기술 스택 유연성**
   - 필요에 따라 각 서비스에 최적화된 기술 선택 가능
   - 예: `event-processor-service`는 Node.js, `statistics-service`는 Go 등으로 구현 가능 