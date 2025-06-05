# Multiplayer 3D Vehicle Combat Game

SOLID 원칙을 적용한 실시간 멀티플레이어 3D 비행체 전투 게임입니다.

## 🎮 게임 특징

- **멀티플레이어**: 최대 8명까지 동시 플레이 (최소 1명으로 게임 시작 가능)
- **3D 비행체 전투**: Three.js 기반 3D 그래픽
- **실시간 동기화**: Socket.IO를 통한 실시간 플레이어 동기화
- **플레이어별 고유 색상**: 각 플레이어마다 다른 색상의 비행체
- **물리 엔진**: 현실적인 비행 물리 법칙 적용
- **충돌 감지**: 총알, 비행체, 지형 간 충돌 감지
- **폭발 효과**: 충돌 시 파티클 폭발 효과
- **리스폰 시스템**: 파괴된 비행체 자동 재생성
- **카메라 시점**: 1인칭/3인칭 시점 전환 (C키)
- **🌐 외부 접근**: 인터넷을 통한 원격 플레이 지원

## 🏗️ 아키텍처

### SOLID 원칙 적용

- **Single Responsibility**: 각 클래스는 하나의 책임만 가짐
- **Open/Closed**: 새로운 엔티티는 기존 코드 수정 없이 확장 가능
- **Liskov Substitution**: 모든 엔티티는 GameEntity를 대체 가능
- **Interface Segregation**: 클라이언트는 필요한 인터페이스만 의존
- **Dependency Inversion**: 고수준 모듈은 추상화에 의존

### 프로젝트 구조

```
├── server/                 # 백엔드 서버
│   ├── entities/           # 게임 엔티티 클래스들
│   │   ├── GameEntity.js   # 기본 엔티티 클래스
│   │   ├── Vehicle.js      # 비행체 클래스
│   │   ├── Bullet.js       # 총알 클래스
│   │   └── Explosion.js    # 폭발 효과 클래스
│   ├── services/           # 서비스 레이어
│   │   └── GameManager.js  # 게임 매니저
│   ├── config/             # 설정 파일
│   │   └── game-config.yaml # 게임 설정
│   └── index.js            # 메인 서버 파일
├── client/                 # 프론트엔드 클라이언트
│   ├── index.html          # 메인 HTML
│   └── js/
│       └── GameClient.js   # 게임 클라이언트 로직
└── package.json            # 프로젝트 설정
```

## 🚀 설치 및 실행

### 필요 조건

- Node.js 14.0 이상
- npm 또는 yarn

### 설치

```bash
# 저장소 클론
git clone <repository-url>
cd multiplayer-vehicle-game

# 의존성 설치
npm install
```

### 실행

```bash
# 서버 시작
npm start

# 또는
node server/index.js
```

서버가 시작되면 다음 주소로 접속:
- **게임 클라이언트**: http://localhost:3001
- **서버 상태**: http://localhost:3001/api/status
- **네트워크 정보**: http://localhost:3001/api/network

## 🌐 외부 접근 설정

### 네트워크 설정

`server/config/game-config.yaml` 파일에서 외부 접근을 설정할 수 있습니다:

```yaml
server:
  port: 3001
  host: "0.0.0.0"  # 모든 인터페이스에서 접근 허용

# 네트워크 설정
network:
  allowExternalAccess: true  # 외부 접근 허용 여부
  cors:
    enabled: true
    origins: "*"  # 허용할 도메인 (* = 모든 도메인)
  publicUrl: ""  # 공개 URL (비어있으면 자동 감지)
```

### 외부 접근 활성화

1. **설정 파일 수정**: `game-config.yaml`에서 `allowExternalAccess: true` 설정
2. **서버 재시작**: `npm start`로 서버 재시작
3. **네트워크 정보 확인**: 게임 로딩 화면에서 "네트워크 정보" 버튼 클릭
4. **외부 접속**: 표시된 외부 IP 주소로 다른 기기에서 접속

### 보안 고려사항

⚠️ **외부 접근 활성화 시 주의사항:**
- 서버가 인터넷에 노출됩니다
- 방화벽 설정을 확인하세요
- 필요시 특정 IP만 허용하도록 설정하세요
- 프로덕션 환경에서는 HTTPS 사용을 권장합니다

### 방화벽 설정 (Windows)

```powershell
# Windows 방화벽에서 포트 3001 허용
netsh advfirewall firewall add rule name="Game Server" dir=in action=allow protocol=TCP localport=3001
```

### 공유기 포트포워딩

외부 인터넷에서 접속하려면 공유기에서 포트포워딩 설정이 필요할 수 있습니다:
1. 공유기 관리 페이지 접속
2. 포트포워딩/가상서버 설정
3. 포트 3001을 서버 컴퓨터 IP로 포워딩

## 🎯 게임 조작법

### 키보드 조작

- **W/S**: 비행체 상하 회전 (피치)
- **A/D**: 비행체 좌우 회전 (요)
- **Q/E**: 비행체 롤링
- **스페이스바**: 기관총 발사
- **C**: 1인칭/3인칭 시점 전환

### 마우스 조작

- **마우스 이동**: 카메라 회전 (3인칭 모드)
- **마우스 클릭**: 미사일 발사

## 🛠️ 기술 스택

### 백엔드
- **Node.js**: 서버 런타임
- **Express**: 웹 서버 프레임워크
- **Socket.IO**: 실시간 통신
- **YAML**: 설정 파일 관리
- **UUID**: 고유 ID 생성

### 프론트엔드
- **Three.js**: 3D 그래픽 렌더링
- **Socket.IO Client**: 서버 통신
- **HTML5 Canvas**: 렌더링 컨텍스트

## ⚙️ 게임 설정

`server/config/game-config.yaml` 파일에서 게임 설정을 변경할 수 있습니다:

```yaml
game:
  maxPlayers: 8
  minPlayers: 1
  respawnTime: 3000
  
server:
  port: 3001
  host: "0.0.0.0"  # 외부 접근용
  tickRate: 60
  
network:
  allowExternalAccess: true  # 외부 접근 허용
  cors:
    enabled: true
    origins: "*"
  publicUrl: ""  # 공개 URL (선택사항)
  
world:
  size: 2000
  gravity: 0
  
vehicle:
  speed: 50
  rotationSpeed: 2.5
  health: 100
  
weapons:
  bullet:
    speed: 200
    damage: 25
    lifetime: 3000
  missile:
    speed: 150
    damage: 50
    lifetime: 5000
```

## 🎨 게임 특징 상세

### 비행체 시스템
- 현실적인 비행 물리 법칙
- 관성과 가속도 적용
- 3축 회전 (피치, 요, 롤)
- 플레이어별 고유 색상

### 무기 시스템
- **기관총**: 연속 발사 가능, 빠른 속도
- **미사일**: 강력한 데미지, 느린 속도

### 지형 시스템
- 절차적 생성 지형
- 높이맵 기반 충돌 감지
- 나무와 환경 오브젝트 배치

### 멀티플레이어
- 실시간 플레이어 동기화
- 지연 보상 시스템
- 안정적인 서버-클라이언트 통신
- 외부 네트워크 접근 지원

## 🌐 네트워크 기능

### 자동 네트워크 감지
- 서버 시작 시 사용 가능한 네트워크 인터페이스 자동 감지
- 외부 접속 가능한 IP 주소 표시
- 실시간 네트워크 상태 모니터링

### API 엔드포인트
- `GET /api/status`: 서버 상태 및 게임 정보
- `GET /api/network`: 네트워크 접속 정보
- `GET /api/config`: 게임 설정 정보

### 클라이언트 네트워크 정보
게임 로딩 화면에서 "네트워크 정보" 버튼을 클릭하면:
- 현재 서버 접근 설정 확인
- 외부 접속 가능한 IP 주소 목록
- 보안 주의사항 안내

## 🐛 문제 해결

### 일반적인 문제들

1. **게임이 로드되지 않음**
   - 브라우저 콘솔에서 오류 확인
   - 서버가 정상 실행 중인지 확인

2. **조작이 안됨**
   - 게임 화면을 클릭하여 포커스 설정
   - 키보드 레이아웃 확인

3. **연결 문제**
   - 방화벽 설정 확인
   - 포트 3001이 사용 가능한지 확인

4. **외부 접근 불가**
   - `game-config.yaml`에서 `allowExternalAccess: true` 확인
   - 방화벽에서 포트 3001 허용 확인
   - 공유기 포트포워딩 설정 확인

## 📝 개발 로그

이 게임은 단일 파일 3D 비행체 시뮬레이션을 멀티플레이어 게임으로 발전시킨 프로젝트입니다. 개발 과정에서 해결한 주요 문제들:

- Three.js Quaternion 호환성 문제
- 키보드 입력 처리 최적화
- 카메라 시스템 개선
- 비행체 물리 법칙 조정
- 지형 충돌 감지 정확도 향상
- **외부 네트워크 접근 기능 추가**
- **CORS 설정 및 보안 강화**
- **자동 네트워크 인터페이스 감지**

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 🎯 향후 계획

- [ ] 팀 모드 추가
- [ ] 다양한 무기 시스템
- [ ] 업그레이드 시스템
- [ ] 맵 에디터
- [ ] 리플레이 시스템
- [ ] 랭킹 시스템
- [x] 외부 네트워크 접근 지원
- [ ] HTTPS/WSS 보안 연결
- [ ] 서버 클러스터링
- [ ] 게임 룸 시스템 