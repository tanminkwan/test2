# 유도 미사일 무기 시스템 구현 계획

## 개요
비행체(Vehicle)에 유도 미사일 무기를 추가하여 타겟을 추적하는 기능을 구현합니다. 미사일은 발사 시 지정된 타겟을 자동으로 추적하며, 일반 기관총과 달리 제한된 수량과 재장전 시간을 갖습니다.

## 구현 단계

### 단계 1: 기본 설정 및 구조 구축
**작업:**
- `game-config.yaml`에 미사일 기본 설정 추가
- 빈 `Missile.js` 및 `GuidedMissile.js` 파일 생성 (기본 클래스만 구현)
- `WeaponSystem.js`에 미사일 무기 타입 등록 (실제 기능 없이)

**테스트:**
- 설정 파일이 올바르게 로드되는지 확인 (로그 출력)
- 게임이 crash 없이 시작되는지 확인

### 단계 2: 미사일 발사체 기본 구현 
**작업:**
- `Missile.js`에 기본 물리 동작 구현 (일반 총알과 유사하게)
- `GuidedMissile.js`에서 미사일 생성 로직 구현
- `WeaponSystem.js`에 미사일 발사 기능 추가

**테스트:**
- 키보드/버튼으로 미사일 발사 시도
- 미사일이 총알처럼 직선으로 발사되는지 확인
- 미사일 제한 수량이 적용되는지 확인

### 단계 3: 클라이언트 렌더링 구현
**작업:**
- 클라이언트에 미사일 3D 모델 추가
- 미사일 발사 이벤트 및 렌더링 연결
- 기본 발사 효과 추가

**테스트:**
- 미사일이 화면에 제대로 렌더링되는지 확인
- 발사 위치가 비행체 적절한 위치인지 확인
- 발사 시 시각/음향 효과가 재생되는지 확인

### 단계 4: 타겟팅 시스템 기본 구조
**작업:**
- `TargetingSystem.js` 생성 및 기본 구조 구현
- 가장 가까운 적 자동 타겟팅 로직 추가
- 입력 시스템에 타겟 선택 기능 추가

**테스트:**
- 적 비행체 근처에서 타겟팅 키 누를 때 타겟 선택되는지 확인
- 콘솔에 타겟 정보 출력되는지 확인
- 여러 적 중 가장 가까운 적이 선택되는지 확인

### 단계 5: 미사일 추적 기능 구현
**작업:**
- `Missile.js`에 타겟 추적 알고리즘 추가
- `WeaponSystem.updateProjectiles()`에 타겟 위치 전달 기능 구현
- 타겟 정보 네트워크 동기화 구현

**테스트:**
- 발사된 미사일이 타겟을 향해 방향 전환하는지 확인
- 타겟이 회피 기동해도 계속 추적하는지 확인
- 타겟이 파괴되면 미사일이 직진하는지 확인

### 단계 6: 타겟팅 UI 구현
**작업:**
- HUD에 타겟 표시 요소 추가
- 타겟 락온 표시 및 효과 구현
- 미사일 재고/재장전 UI 추가

**테스트:**
- 타겟팅된 적 주변에 박스/화살표 표시되는지 확인
- 락온 시 UI 색상 변경 및 효과 표시되는지 확인
- 미사일 발사 가능/불가능 상태가 UI에 반영되는지 확인

### 단계 7: 충돌 및 폭발 구현
**작업:**
- 미사일 충돌 판정 및 폭발 로직 구현
- 폭발 효과 및 데미지 적용
- 범위 데미지 기능 구현 (설정에 따라)

**테스트:**
- 미사일이 적과 충돌 시 폭발하는지 확인
- 폭발 효과(시각/음향)가 재생되는지 확인
- 적절한 데미지가 적용되어 체력이 감소하는지 확인
- 범위 데미지가 주변 물체에 적용되는지 확인

## 수정 및 추가할 파일 목록

### 새로 추가할 파일
1. `services/game-service/src/entities/Missile.js` - 유도 미사일 발사체 엔티티
2. `services/game-service/src/entities/weapons/GuidedMissile.js` - 유도 미사일 무기 클래스
3. `client/js/ui/TargetingSystem.js` - 타겟팅 시스템 구현

### 수정해야 할 서버 측 파일
1. `services/game-service/src/services/WeaponSystem.js` - 미사일 무기 지원 및 타겟팅 기능 추가
2. `services/game-service/src/services/GameManager.js` - 미사일 발사 입력 처리 및 업데이트 로직 수정
3. `services/game-service/src/entities/Vehicle.js` - 미사일 무기 슬롯 및 입력 처리 확장
4. `services/game-service/src/config/game-config.yaml` - 미사일 속성 및 차량별 미사일 설정 추가

### 클라이언트 측 수정 파일
1. `client/js/renderers/ProjectileRenderer.js` - 미사일 렌더링 지원 추가
2. `client/js/effects/EffectSystem.js` - 미사일 발사/폭발 효과 추가
3. `client/js/controls/InputHandler.js` - 미사일 발사 및 타겟팅 입력 처리
4. `client/js/ui/HUD.js` - 미사일 잔량 및 타겟팅 UI 추가

### 네트워크 관련 파일
1. `services/game-service/src/networking/GameState.js` - 미사일 상태 및 타겟팅 정보 동기화
2. `client/js/networking/GameStateHandler.js` - 클라이언트 측 미사일 데이터 처리

## 설정 요소 (game-config.yaml)

```yaml
weapons:
  missile:
    damage: 30                  # 미사일 기본 데미지
    speed: 150                  # 미사일 기본 속도
    range: 600                  # 미사일 최대 사거리
    cooldown: 2000              # 발사 간 쿨다운(ms)
    trackingPower: 2.0          # 추적 강도 (높을수록 더 빠르게 회전)
    maxTurnRate: 0.08           # 최대 회전 속도 (라디안/프레임)
    lifeTime: 6000              # 미사일 생존 시간(ms)
    armingTime: 300             # 발사체 무장 시간(ms)
    explosionRadius: 8          # 폭발 반경
    splashDamage: true          # 범위 데미지 여부
    trailEffect: "smoke"        # 미사일 궤적 효과
    
    visual:
      length: 5                 # 미사일 길이
      radius: 0.8               # 미사일 반지름
      engineGlow: "#FF6600"     # 엔진 불빛 색상
      smokeColor: "#888888"     # 연기 색상
      smokeRate: 0.05           # 연기 생성률
      explosionSize: 3.0        # 폭발 효과 크기

vehicles:
  fighter:
    # 기존 속성...
    missileType: "agile"        # 전투기용 미사일 타입
    missileTrackingPower: 2.5   # 전투기용 미사일 추적 능력
    missileDamage: 25           # 전투기용 미사일 데미지
    missileSpeed: 170           # 전투기용 미사일 속도
    missileHardpoints:          # 미사일 장착 위치
      - { x: -5, y: -1, z: 0 }  # 좌측 날개
      - { x: 5, y: -1, z: 0 }   # 우측 날개
      - { x: -3, y: -1, z: 1 }  # 좌측 내부
      - { x: 3, y: -1, z: 1 }   # 우측 내부
  
targeting:
  lockRange: 800               # 타겟 감지 최대 거리
  lockTime: 1.5                # 타겟 락온 소요 시간(초)
  maxTargets: 3                # 동시 락온 가능 타겟 수
  targetBoxColor: "#FF0000"    # 타겟 UI 색상
  lockedTargetColor: "#FFFF00" # 락온 완료 UI 색상
```

## 고려해야 할 Side Effects

### 성능 영향
- 유도 미사일의 타겟 추적 알고리즘은 계산 비용이 높음
- 다수의 미사일이 동시에 추적할 경우 서버 부하 증가
- 매 프레임 타겟 위치 계산 및 방향 보정이 필요

### 게임 밸런스 문제
- 미사일의 높은 데미지가 게임 밸런스를 무너뜨릴 수 있음
- 회피하기 어려운 미사일은 게임의 공정성에 영향
- 타겟팅 시스템으로 인한 상대적 전투력 차이 발생

### 네트워크 부하 증가
- 타겟 추적을 위한 추가 데이터 동기화 필요
- 클라이언트-서버 간 타겟 정보 지연 시 예측 오차 발생

### 시스템 복잡성 증가
- 타겟팅, 발사, 추적, 회피 등 새로운 로직 추가
- 미사일과 다른 오브젝트 간 충돌 처리 로직 필요

### 잠재적 버그 발생 영역
1. **객체 수명주기 충돌**: 미사일 추적 중 타겟이 파괴될 경우 null 참조 오류
2. **물리 엔진 충돌**: 미사일의 빠른 방향 전환이 물리 계산에 불안정성 초래
3. **네트워크 동기화 문제**: 미사일 추적 정보 동기화 지연으로 클라이언트 간 불일치
4. **입력 처리 오염**: inputs 객체에 fireMissile, targetId 추가로 기존 입력 처리 로직 영향
5. **자원 경쟁**: 제한된 projectiles 컬렉션에 미사일과 총알이 경쟁하며 오버헤드 발생

## 설계 원칙

1. **하드코딩 방지**: 모든 설정값은 game-config.yaml에서 관리
2. **단계적 구현**: 한 기능씩 구현하고 테스트 후 다음 단계로 진행
3. **기존 코드 호환성 유지**: 기존 무기 시스템 아키텍처 확장
4. **확장성 고려**: 다른 유도 무기 타입도 추가할 수 있도록 설계 