# 테스트 이벤트 발행자

이 도구는 게임 서비스가 생성하는 이벤트와 동일한 형식의 테스트 이벤트를 Redis에 발행하는 유틸리티입니다. 실제 게임 서비스를 실행하지 않고도 이벤트 처리 시스템을 테스트할 수 있습니다.

## 기능

- 다양한 게임 이벤트 시나리오 지원
- 실제 게임 서비스와 동일한 형식의 이벤트 생성
- Redis를 통한 이벤트 발행
- 커맨드라인 인터페이스로 쉬운 사용
- 다양한 설정 옵션 지원

## 설치

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp sample.env .env
# .env 파일을 필요에 맞게 수정
```

## 사용 방법

### 기본 사용법

```bash
# 기본 설정으로 실행
npm start

# 또는 직접 실행
node src/index.js
```

### 명령행 옵션

```bash
# 도움말 보기
node src/index.js --help

# 특정 시나리오 실행
node src/index.js --scenario vehicle-destroyed

# 이벤트 수 지정
node src/index.js --count 20

# 이벤트 발행 간격 지정 (밀리초)
node src/index.js --interval 500

# 사용 가능한 시나리오 목록 보기
node src/index.js --list

# 상세 로깅 활성화
node src/index.js --verbose

# 무한 반복 실행
node src/index.js --repeat
```

### 모든 시나리오 테스트

```bash
# 모든 시나리오 테스트 실행
npm test

# 또는 직접 실행
node src/test-scenarios.js
```

## 지원하는 시나리오

1. **vehicle-destroyed**: 차량 파괴 이벤트
2. **player-score**: 플레이어 점수 변경 이벤트
3. **game-state**: 게임 상태 변경 이벤트
4. **explosion**: 폭발 효과 이벤트
5. **billboard-destroyed**: 광고판 파괴 이벤트

## 이벤트 형식

모든 이벤트는 다음과 같은 JSON 형식으로 발행됩니다:

```json
{
  "type": "이벤트타입",
  "data": {
    // 이벤트별 데이터
  },
  "timestamp": 1234567890,
  "service": "test-event-publisher"
}
```

## 환경 변수

`.env` 파일에서 다음 환경 변수를 설정할 수 있습니다:

- `REDIS_HOST`: Redis 서버 호스트 (기본값: localhost)
- `REDIS_PORT`: Redis 서버 포트 (기본값: 6379)
- `REDIS_PASSWORD`: Redis 서버 비밀번호 (필요한 경우)
- `REDIS_CHANNEL`: 이벤트 발행 채널 (기본값: game-events)
- `DEFAULT_SCENARIO`: 기본 시나리오 (기본값: vehicle-destroyed)
- `EVENT_INTERVAL`: 이벤트 발행 간격 (밀리초, 기본값: 1000)
- `EVENT_COUNT`: 발행할 이벤트 수 (기본값: 10)

## 커스텀 시나리오 추가

새로운 시나리오를 추가하려면:

1. `src/scenarios/` 디렉토리에 새 시나리오 클래스 파일 생성
2. `generateEvent(index)` 메서드 구현
3. `src/scenarios/index.js`에 시나리오 추가

## 의존성

- Node.js 14.x 이상
- Redis 서버 