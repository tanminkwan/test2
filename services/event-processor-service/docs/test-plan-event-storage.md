# Event Storage 통합 테스트 계획

## 1. 테스트 목적
- event-processor-service가 event-storage-policy에 따라 모든 주요 이벤트를 DB에 일관성 있게 저장하는지 검증
- test-event-publisher를 통해 다양한 이벤트를 Redis로 발행하고, DB 반영 결과를 자동 검증
- 장애 상황(누락, 실패, 재시도 등)도 포함한 실전 운영 수준의 신뢰성 확보

## 2. 테스트 환경 준비
- 반드시 workspace root(`C:/pypjt/test2`)에서 모든 명령 실행
- PowerShell에서는 명령어 연결 시 `;` 사용
- 각 서비스 디렉토리에서 `npm install`로 의존성 설치
- Redis, PostgreSQL, event-processor-service 모두 실행 상태여야 함
- 환경 변수는 각 서비스의 sample.env를 참고해 .env로 복사/수정

## 3. 테스트 시나리오
### 3.1 지원 이벤트 타입
- vehicle-destroyed
- player-score
- game-state
- explosion
- billboard-destroyed
- (event-storage-policy에 정의된 모든 주요 이벤트)

### 3.2 시나리오별 테스트
- test-event-publisher에서 각 시나리오별로 이벤트 발행
  - 예: `npm start --prefix services/test-event-publisher -- --scenario vehicle-destroyed --count 10`
  - 모든 시나리오 일괄 테스트: `npm test --prefix services/test-event-publisher`
- 발행된 이벤트가 event-processor-service를 통해 DB(game_events, game_metrics 등)에 저장되는지 확인

## 4. 테스트 데이터, 기대 결과, 검증 기준 (정교화)
### 4.1 테스트 데이터 정의
- 각 시나리오별로 발행되는 이벤트의 구조, 필드, 값의 예시를 명확히 정의한다.
  - 예: vehicle-destroyed → playerId, vehicleId, killerId, weaponType 등
  - playerId 등은 실제 DB 스키마와 타입(예: UUID/VARCHAR) 일치 여부를 반드시 확인
- 테스트 데이터는 정책 문서(event-storage-policy.md)와 100% 일치해야 하며, 임의/하드코딩된 값이 DB 타입과 불일치하면 테스트 실패로 간주

### 4.2 기대 결과 정의
- 발행한 이벤트 수와 DB에 저장된 row 수가 반드시 일치해야 한다.
- 각 이벤트 타입별로 저장되는 테이블(game_events, game_metrics, 상세 테이블 등)과 row 수를 명확히 정의한다.
- DB에 저장된 데이터의 필드 값이 테스트 데이터와 정확히 일치해야 한다.
- 장애/에러/누락/타입 불일치가 발생하면 테스트 실패로 간주한다.

### 4.3 검증 기준 및 절차
- **자동 검증 스크립트**는 다음을 모두 만족해야 한다:
  1. 최근 2분 이내 생성된 데이터만 집계(타임스탬프 기준)
  2. 각 테이블의 row 수가 발행 이벤트 수와 정확히 일치
  3. 주요 필드 값(playerId 등)이 DB 타입과 일치(예: UUID 컬럼에 UUID만)
  4. DB에 저장된 데이터의 JSON 필드 등도 테스트 데이터와 구조/값이 일치
  5. 서비스/DB/스크립트 실행 중 **에러/경고/타입 불일치/누락**이 로그에 1건이라도 발생하면 테스트 실패로 간주
- 검증 예시: `node scripts/verify-test-result.js --table game_events --minutes 2`
- 검증 결과는 반드시 로그/쿼리/파일 등 증거로 남긴다.
- 검증 실패 시, 원인(데이터 불일치, 타입 오류, 에러 로그 등)을 명확히 기록하고, 테스트를 중단한다.

## 5. 자동화 및 규칙
- 테스트 실행은 반드시 workspace root에서
- 서비스 실행: `npm run start:<서비스명>`
- PowerShell 명령어 연결: `;` 사용
- psql 접속 시 PGPASSWORD 환경변수 필수
- 버그/에러 조치 시 중간에 멈추지 않고, 자동으로 일관성 있게 해결

## 6. 장애/예외 상황 테스트
- DB 연결 실패, Redis 장애, 필수값 누락 등 상황에서 서비스가 정상적으로 재시도/로깅/복구하는지 확인
- 장애 상황 재현: Redis/DB 임시 중단 후 이벤트 발행, 서비스 로그 및 DB 상태 확인

## 7. 참고 정책/문서
- docs/event-storage-policy.md: 이벤트 저장 정책 및 구조
- 각 서비스의 README.md, dev-env-4windows.md: 실행/설정/운영 가이드

---

**이 문서는 event-storage-policy와 실제 서비스 구조, 자동화 규칙을 반영한 통합 테스트 표준 계획서다.** 