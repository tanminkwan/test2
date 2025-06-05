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
- **카메라 시점**: 1인칭/3인칭 시점 전환 (V키)
- **🌐 외부 접근**: 인터넷을 통한 원격 플레이 지원
- **📺 파괴 가능한 광고판**: 지상에 설치된 양면 텍스처 광고판
- **🎯 총알 자국 시스템**: 광고판에 총알이 맞으면 자국이 남음
- **💥 파편 효과**: 광고판 파괴 시 현실적인 파편 물리 시뮬레이션
- **🏞️ 지형 기반 배치**: 평평한 지역에만 광고판 자동 배치
- **🎮 점수 시스템**: 적 격추 및 광고판 파괴로 점수 획득

## 🆕 최신 업데이트 (v2.0)

### 🎯 광고판 파괴 시스템
- **체력 시스템**: 광고판이 80 HP를 가지며 총알 8발로 파괴 가능
- **총알 자국**: 파괴되기 전까지 총알이 맞은 위치에 검은 자국이 남음
- **파편 효과**: 파괴 시 8-20개의 파편이 물리 법칙에 따라 흩어짐
- **점수 보상**: 광고판 파괴 시 50점 획득
- **실시간 동기화**: 모든 플레이어가 동일한 파괴 효과 확인

### 🏞️ 개선된 지형 시스템
- **스마트 배치**: 광고판이 평평한 지역에만 자동 배치
- **지형 높이 계산**: 정확한 지형 높이에 맞춰 광고판 설치
- **가시성 최적화**: 산속에 묻히지 않고 잘 보이는 위치에 배치
- **충돌 회피**: 물 위와 급경사 지역 자동 회피

### 💥 향상된 시각 효과
- **파편 물리**: 중력, 바운스, 마찰 효과가 적용된 현실적인 파편
- **페이드 아웃**: 파편이 3-5초 후 서서히 투명해지며 사라짐
- **랜덤 효과**: 파편 크기, 색상, 회전이 랜덤하게 생성
- **지면 충돌**: 파편이 지면에 닿으면 바운스 효과

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
│   │   ├── Explosion.js    # 폭발 효과 클래스
│   │   └── Billboard.js    # 광고판 클래스 (NEW!)
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
  allowExternalAccess: true  # 외부 접근 허용
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
- **Shift**: 추력 증가 (가속)
- **Ctrl**: 추력 감소 (감속)
- **스페이스바**: 상승
- **X**: 하강
- **P**: 기관총 발사
- **V**: 1인칭/3인칭 시점 전환

### 마우스 조작 (1인칭 모드)

- **마우스 이동**: 시선 조절
- **마우스 클릭**: 기관총 발사

### 게임 목표

- **적 비행체 격추**: 100점 획득
- **광고판 파괴**: 50점 획득
- **생존**: 파괴되면 3초 후 리스폰

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
  
# 광고판 설정
billboards:
  enabled: true
  count: 5  # 광고판 개수
  width: 40  # 광고판 너비
  height: 20  # 광고판 높이
  thickness: 2  # 광고판 두께
  health: 80  # 광고판 체력 (총알 8발로 파괴)
  minDistance: 80  # 광고판 간 최소 거리
  images:
    front: "assets/billboards/front.svg"  # 앞면 이미지
    back: "assets/billboards/back.svg"    # 뒷면 이미지
  
world:
  size: 400  # 월드 크기
  terrainDetail: 100  # 지형 디테일
  waterLevel: -5  # 물 높이
  gravity: -9.81
  
vehicle:
  maxSpeed: 100
  acceleration: 50
  health: 100  # 비행체 체력
  colors:
    - "#FF0000"  # 빨강
    - "#00FF00"  # 초록
    - "#0000FF"  # 파랑
    - "#FFFF00"  # 노랑
    - "#FF00FF"  # 마젠타
    - "#00FFFF"  # 시안
    - "#FFA500"  # 주황
    - "#800080"  # 보라
  
weapons:
  machineGun:
    damage: 10  # 총알 데미지
    fireRate: 10  # 초당 발사 수
    bulletSpeed: 200
    range: 300
    bulletLifetime: 3  # 초
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

### 광고판 시스템
- **대형 광고판**: 지상에 설치된 양면 텍스처 광고판
- **사용자 정의 이미지**: SVG, JPG, PNG 등 다양한 형식 지원
- **자동 배치**: 설정된 거리 간격으로 자동 배치
- **양면 텍스처**: 앞면과 뒷면에 서로 다른 이미지 적용
- **그림자 효과**: 실시간 그림자 렌더링

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

## 📺 광고판 설정

### 광고판 이미지 추가

1. **이미지 파일 준비**: 
   - 권장 크기: 1024x512 픽셀 (2:1 비율)
   - 지원 형식: JPG, PNG, SVG, GIF

2. **이미지 파일 배치**:
   ```
   client/assets/billboards/
   ├── front.svg    # 앞면 이미지
   ├── back.svg     # 뒷면 이미지
   ├── ad1.jpg      # 추가 광고 이미지
   └── ad2.png      # 추가 광고 이미지
   ```

3. **설정 파일 수정**:
   ```yaml
   billboards:
     enabled: true
     count: 10  # 광고판 개수 조정
     width: 50  # 크기 조정
     height: 25
     images:
       front: "assets/billboards/your-front-image.jpg"
       back: "assets/billboards/your-back-image.png"
       # 또는 여러 이미지 랜덤 사용
       # front: 
       #   - "assets/billboards/ad1.jpg"
       #   - "assets/billboards/ad2.png"
   ```

### 다중 광고 이미지

여러 광고 이미지를 랜덤하게 사용하려면:

```yaml
billboards:
  images:
    front: 
      - "assets/billboards/game-ad1.jpg"
      - "assets/billboards/game-ad2.png"
      - "assets/billboards/game-ad3.svg"
    back:
      - "assets/billboards/tech-ad1.jpg"
      - "assets/billboards/tech-ad2.png"
```

각 광고판마다 배열에서 랜덤하게 선택된 이미지가 적용됩니다. 

## 📈 성능 최적화

- **60Hz 서버 틱레이트**: 부드러운 게임플레이
- **효율적인 충돌 검사**: AABB 기반 충돌 감지
- **메모리 관리**: 최대 총알 자국 수 제한 (50개)
- **네트워크 최적화**: 필요한 데이터만 전송
- **파편 수명 관리**: 자동 정리로 메모리 누수 방지

## 🔧 개발자 정보

### 디버깅

서버 로그에서 다음 정보를 확인할 수 있습니다:
- 플레이어 연결/해제
- 광고판 파괴 이벤트
- 게임 시작/종료
- 네트워크 상태

### API 엔드포인트

- `GET /api/status` - 서버 상태 정보
- `GET /api/network` - 네트워크 정보
- `GET /` - 게임 클라이언트

## 📝 변경 로그

### v2.0.0 (2024-01-XX)
- ✨ 광고판 파괴 시스템 추가
- ✨ 총알 자국 시스템 구현
- ✨ 파편 물리 효과 추가
- 🏞️ 지형 기반 광고판 배치 개선
- 🎮 점수 시스템 확장
- 🔧 성능 최적화

### v1.0.0 (2024-01-XX)
- 🎮 기본 멀티플레이어 전투 시스템
- 🌐 외부 접근 지원
- 📺 기본 광고판 시스템
- 🎯 실시간 동기화

## 🤝 기여하기

1. 이 저장소를 포크합니다
2. 새로운 기능 브랜치를 만듭니다 (`git checkout -b feature/AmazingFeature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/AmazingFeature`)
5. Pull Request를 생성합니다

## 📄 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 🙏 감사의 말

- [Three.js](https://threejs.org/) - 3D 그래픽 라이브러리
- [Socket.IO](https://socket.io/) - 실시간 통신
- [Express](https://expressjs.com/) - 웹 서버 프레임워크

---

**즐거운 게임 되세요! 🎮✈️💥** 