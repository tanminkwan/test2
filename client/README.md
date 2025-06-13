# 🎮 게임 클라이언트

3D 멀티플레이어 비행 전투 게임의 클라이언트 사이드 구현입니다.

## 📁 프로젝트 구조

```
client/
├── js/
│   ├── GameClient.js          # 메인 게임 클라이언트 (1,227라인)
│   ├── camera/
│   │   └── CameraManager.js   # 카메라 제어 (320라인)
│   ├── config/
│   │   └── Constants.js       # 상수 및 기본값 관리 (신규)
│   ├── effects/
│   │   └── EffectManager.js   # 시각 효과 관리 (519라인)
│   ├── entities/
│   │   └── VehicleFactory.js  # 비행체 생성 (442라인)
│   ├── input/
│   │   └── InputManager.js    # 입력 처리 (267라인)
│   ├── network/
│   │   └── NetworkManager.js  # 네트워크 통신 (170라인)
│   ├── ui/
│   │   └── UIManager.js       # UI 관리 (280라인)
│   └── world/
│       └── WorldManager.js    # 월드 환경 (393라인)
├── index.html                 # 메인 HTML 파일
└── README.md                  # 이 파일
```

## 🏗️ 아키텍처 개요

### 리팩터링 성과
- **원본**: 2,300라인의 단일 파일 (God Object)
- **현재**: 9개 모듈로 분리된 3,600라인
- **GameClient.js**: 1,227라인 (46.7% 감소)
- **매니저 클래스들**: 2,373라인

### 설계 원칙
- ✅ **단일 책임 원칙** (Single Responsibility Principle)
- ✅ **의존성 역전** (Dependency Inversion)
- ✅ **느슨한 결합** (Loose Coupling)
- ✅ **Factory Pattern** 적용
- ✅ **상수 중앙 집중화** (Constants Pattern)

## 🆕 최근 개선사항 (v1.1)

### 📋 하드코딩 제거 및 상수 중앙화
- **새로운 Constants.js 파일 추가**: 모든 하드코딩된 값들을 중앙 집중화
- **색상값 표준화**: 엔진, 글로우, UI 색상 등 통합 관리
- **투명도 및 크기값 상수화**: MATERIAL_OPACITY, EFFECT_DEFAULTS 등
- **부스터 효과 색상 통합**: BOOSTER_COLORS로 일관된 효과 제공

### 🔧 중복 코드 제거
- **부스터 효과 로직 통합**: GameClient와 EffectManager의 중복 코드 제거
- **VehicleFactory 개선**: 테스트기의 완전 하드코딩 값들을 상수로 이동
- **UI 색상 표준화**: 알림 시스템 색상 통일

### ⚡ 버그 수정
- **InputManager**: `isBoosterActive()` 메서드 추가
- **EffectManager**: userData 누락으로 인한 폭발 애니메이션 오류 수정
- **GameClient**: 총알 생성 시 위치 설정 완성

### 📈 개선 효과
- **유지보수성 향상**: 모든 설정값이 한 곳에서 관리
- **일관성 확보**: 비행체 타입별 통일된 설정 구조
- **확장성 개선**: 새로운 비행체 타입 추가 용이
- **코드 품질**: 중복 제거로 코드 복잡도 감소

## 🎯 핵심 매니저들

### 🔧 Constants.js (신규)
**역할**: 모든 하드코딩된 값들의 중앙 집중 관리
- 비행체 기본 설정값 (VEHICLE_DEFAULTS)
- 색상 및 투명도 (MATERIAL_OPACITY, UI_COLORS)
- 효과 설정 (EFFECT_DEFAULTS, BOOSTER_COLORS)
- 회전 및 렌더링 설정

**주요 상수들**:
```javascript
VEHICLE_DEFAULTS    // 비행체 타입별 기본값
EFFECT_DEFAULTS     // 폭발, 총알 등 효과 기본값
BOOSTER_COLORS      // 부스터 효과 색상
UI_COLORS          // UI 요소 색상
MATERIAL_OPACITY   // 재질 투명도
```

### 🎮 GameClient.js
**역할**: 메인 게임 루프와 매니저들 간의 조율
- Three.js 초기화 및 렌더링
- 게임 상태 관리
- 매니저들 간의 통신 중재
- 애니메이션 루프 제어

**주요 메서드**:
```javascript
init()                    // 게임 초기화
animate()                 // 메인 게임 루프
updateGameState()         // 서버 상태 동기화
updateMyVehicleBooster()  // 부스터 효과 (EffectManager로 위임)
```

### 📹 CameraManager
**역할**: 1인칭/3인칭 카메라 제어
- 시점 전환 (V키)
- 카메라 애니메이션
- OrbitControls 관리
- 마우스 입력 처리

**주요 기능**:
```javascript
toggleFirstPerson()    // 시점 전환
updateCamera()         // 카메라 업데이트
setMyVehicle()        // 추적할 비행체 설정
```

### ✨ EffectManager (개선됨)
**역할**: 모든 시각 효과 생성 및 관리
- 폭발 효과 (개선된 파티클 시스템)
- 총구 스파크
- 파편 효과
- 부스터 글로우 (통합된 로직)

**주요 기능**:
```javascript
createExplosion()         // 폭발 효과 (Constants 사용)
createMuzzleFlash()       // 총구 스파크
createDebrisEffect()      // 파편 효과
updateVehicleBooster()    // 부스터 효과 (통합 로직)
```

### ✈️ VehicleFactory (개선됨)
**역할**: Factory Pattern으로 비행체 생성
- 전투기 (Fighter) 모델
- 중형기 (Heavy) 모델  
- 테스트 비행체 모델
- Constants 기반 설정 시스템

**주요 기능**:
```javascript
createVehicle()           // 비행체 생성
getVehicleDefaults()      // 타입별 기본값 가져오기
registerVehicleType()     // 새 타입 등록
createFighterVehicle()    // 전투기 생성 (Constants 사용)
createHeavyVehicle()      // 중형기 생성 (Constants 사용)
createTestVehicle()       // 테스트기 생성 (Constants 사용)
```

### ⌨️ InputManager (개선됨)
**역할**: 모든 입력 처리 및 관리
- 키보드/마우스 입력
- 시점 전환 (V키)
- 발사 제어 (P키, 마우스)
- 부스터 상태 확인

**주요 기능**:
```javascript
updateInputs()         // 입력 상태 업데이트
getInputs()           // 현재 입력 반환
resetFireInput()      // 발사 입력 리셋
isBoosterActive()     // 부스터 활성화 상태 확인 (신규)
```

### 🌐 NetworkManager
**역할**: 서버와의 모든 통신 관리
- Socket.IO 통신
- 게임 이벤트 처리
- 입력 전송
- 콜백 기반 통신

**주요 기능**:
```javascript
sendInputs()          // 입력 서버 전송
setCallbacks()        // 이벤트 콜백 설정
```

### 🖥️ UIManager (개선됨)
**역할**: 모든 UI 요소 관리
- 플레이어 정보 표시
- 게임 이벤트 알림 (표준화된 색상)
- 플레이어 목록
- 성능 통계

**주요 기능**:
```javascript
updatePlayerInfo()    // 플레이어 정보 업데이트
showGameEvent()       // 게임 이벤트 표시 (UI_COLORS 사용)
updatePlayerList()    // 플레이어 목록 업데이트
showNotification()    // 알림 표시 (표준화된 색상)
```

### 🌍 WorldManager
**역할**: 게임 월드 환경 생성 및 관리
- 지형 생성 (절차적)
- 하늘과 구름
- 나무와 식생
- 맵 경계

**주요 기능**:
```javascript
createWorld()         // 전체 월드 생성
createTerrain()       // 지형 생성
updateClouds()        // 구름 애니메이션
getTerrainHeight()    // 지형 높이 계산
```

## 🎮 게임 기능

### 비행체 조작
- **W/S**: 피치 (기수 상승/하강)
- **A/D**: 요 (좌우 회전)
- **Q/E**: 롤 (좌우 기울기)
- **Shift**: 부스터 (가속)
- **Ctrl**: 역추진 (감속)
- **Space**: 상승
- **X**: 하강

### 전투 시스템
- **P키/마우스**: 발사
- **V키**: 1인칭/3인칭 시점 전환
- **ESC**: 포인터 락 해제

### 시각 효과
- 폭발 효과 (파티클 시스템)
- 총구 스파크
- 부스터 글로우
- 파편 효과

## 🔧 기술 스택

### 핵심 라이브러리
- **Three.js**: 3D 렌더링 엔진
- **Socket.IO**: 실시간 통신
- **OrbitControls**: 카메라 제어

### 렌더링 기능
- WebGL 하드웨어 가속
- 그림자 매핑
- 안티앨리어싱
- 성능 최적화

### 성능 최적화
- 객체 풀링
- 프레임 제한 (60fps)
- GPU 최적화
- 메모리 관리

## 🚀 시작하기

### 📋 **배포 아키텍처**
클라이언트는 **nginx API Gateway에서 static 자원으로 서빙**됩니다:

```
브라우저 → nginx:80 → {
    /                    → client/ (static files)
    /api/auth/          → user-service:3002
    /api/game/          → game-service:3001  
    /socket.io/         → game-service:3001 (WebSocket)
}
```

### 🔧 **전체 시스템 실행**

#### 1. Docker Compose로 전체 시스템 실행 (권장)
```bash
# 프로젝트 루트에서
docker-compose up -d

# 또는 개발 환경용
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

#### 2. 개별 서비스 실행 (개발용)
```bash
# 1. PostgreSQL 실행 (Docker 또는 로컬)
docker run -d --name postgres \
  -e POSTGRES_PASSWORD=1q2w3e4r!! \
  -p 5432:5432 postgres:15

# 2. User Service 실행
cd services/user-service
npm install
npm start  # 포트 3002

# 3. Game Service 실행  
cd services/game-service
npm install
npm start  # 포트 3001

# 4. nginx 실행 (클라이언트 static 서빙)
nginx -c /path/to/project/nginx.conf
```

### 🌐 **클라이언트 접속**
- **URL**: `http://localhost` (nginx 포트 80)
- **개발 시**: nginx가 `client/` 디렉토리를 static으로 서빙
- **프로덕션**: Docker 볼륨 마운트로 배포

### 🎮 **게임 플레이**
1. 브라우저에서 `http://localhost` 접속
2. 닉네임 입력 후 게임 참가
3. 비행체 조작법 숙지
4. 다른 플레이어와 전투

### ⚠️ **중요 사항**
- 클라이언트는 **npm으로 실행하지 않습니다**
- nginx가 static 파일 서버 역할을 담당
- 모든 API 요청은 nginx를 통해 마이크로서비스로 라우팅
- WebSocket 연결도 nginx를 통해 Game Service로 프록시

## 🔧 개발 가이드

### 새로운 비행체 타입 추가
```javascript
// VehicleFactory.js에서
this.registerVehicleType('newType', {
    createModel: (config) => {
        // 새로운 3D 모델 생성 로직
    }
});
```

### 새로운 효과 추가
```javascript
// EffectManager.js에서
createNewEffect(data) {
    // 새로운 시각 효과 생성 로직
}
```

### UI 요소 추가
```javascript
// UIManager.js에서
addNewUIElement() {
    // 새로운 UI 요소 생성 로직
}
```

## 🐛 디버깅

### 성능 모니터링
- F12 개발자 도구에서 성능 탭 확인
- `renderer.info` 객체로 렌더링 통계 확인
- 메모리 사용량 모니터링

### 네트워크 디버깅
- Socket.IO 연결 상태 확인
- 네트워크 탭에서 WebSocket 통신 모니터링
- 서버 로그와 클라이언트 로그 대조

### WebGL 문제 해결
- 브라우저 WebGL 지원 확인
- 그래픽 드라이버 업데이트
- Chrome 플래그 설정

## 📈 성능 최적화 팁

### 렌더링 최적화
```javascript
// 저성능 모드 활성화
config.client.performance.lowPerformanceMode = true;

// 그림자 비활성화
config.client.performance.enableShadows = false;

// 안티앨리어싱 비활성화
config.client.performance.antialias = false;
```

### 메모리 최적화
- 사용하지 않는 객체 정리
- 텍스처 크기 최적화
- 지오메트리 재사용

## 🤝 기여하기

1. 이슈 생성 또는 기존 이슈 확인
2. 기능 브랜치 생성
3. 코드 작성 및 테스트
4. Pull Request 생성

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

---

**개발팀**: 게임 개발 프로젝트  
**버전**: 1.0.0  
**최종 업데이트**: 2024년 