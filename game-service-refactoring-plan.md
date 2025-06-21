# Game Service 리팩토링 계획

## 1. 문제점 분석

현재 `game-service`의 핵심 로직은 `GameManager.js` 파일에 집중되어 있습니다. 이 파일은 955줄에 달하는 거대한 클래스로, 다음과 같은 문제점을 가지고 있습니다.

- **God Object**: `GameManager` 클래스는 플레이어 관리, 차량 관리, 무기 시스템, 이펙트 시스템, 충돌 처리, 게임 상태 관리 등 너무 많은 책임을 가지고 있습니다. 이는 단일 책임 원칙(SRP)에 위배됩니다.
- **낮은 응집도**: 클래스 내부의 여러 기능들이 서로에게 너무 깊게 의존하고 있어, 코드 변경 시 예상치 못한 부작용을 일으킬 수 있습니다.
- **높은 결합도**: `GameManager`가 다른 모든 시스템을 직접 생성하고 관리하고 있어, 시스템 간의 결합도가 높습니다. 이는 코드의 재사용성과 테스트 용이성을 저해합니다.
- **유지보수의 어려움**: 코드가 너무 길고 복잡하여 새로운 기능을 추가하거나 기존 로직을 수정하기 어렵습니다.

## 2. 리팩토링 목표

- **SOLID 원칙 준수**: 각 클래스가 하나의 책임만 갖도록 하여 코드의 응집도를 높이고 결합도를 낮춥니다.
- **모듈성 향상**: 각 기능을 독립적인 모듈로 분리하여 코드의 재사용성을 높이고, 테스트를 용이하게 만듭니다.
- **가독성 및 유지보수성 향상**: 코드를 더 작고 관리하기 쉬운 단위로 나누어 가독성을 높이고 유지보수를 용이하게 합니다.
- **이벤트 기반 아키텍처 강화**: 시스템 간의 직접적인 호출을 줄이고, 이벤트를 통해 통신하도록 하여 유연성을 높입니다.

## 3. 리팩토링 계획

### 3.1. `GameManager` 분해

`GameManager`를 다음과 같은 여러 개의 작은 클래스로 분해합니다.

- **`PlayerManager`**: 플레이어의 추가, 제거, 점수, 색상 할당 등 플레이어와 관련된 모든 로직을 담당합니다.
- **`VehicleManager`**: 차량의 생성(VehicleFactory 사용), 파괴, 리스폰 등 차량과 관련된 로직을 담당합니다.
- **`CollisionSystem`**: 발사체와 차량, 차량과 지형 등 모든 충돌 감지 및 처리를 담당합니다.
- **`TargetingManager`**: 타겟 탐색, 락온 등 타겟팅 관련 로직을 담당합니다.
- **`GameLoop`**: `update` 메서드를 포함하여 메인 게임 루프를 관리합니다.
- **`GameStateManager`**: 게임의 상태(waiting, playing, ended)를 관리하고, 게임 시작/종료 조건을 확인합니다.
- **`TerrainManager`**: 지형의 높이를 계산하고, 특정 지역의 평탄도를 확인하는 등 지형 관련 유틸리티를 제공합니다.
- **`BillboardManager`**: 광고판의 생성 및 관리를 담당합니다.

### 3.2. 의존성 주입(Dependency Injection) 강화

`index.js`에서 각 시스템(Manager, System)의 인스턴스를 생성하고, `GameManager` (또는 새롭게 만들어질 최상위 관리자)의 생성자를 통해 필요한 의존성을 주입합니다.

**`index.js` (예시):**

```javascript
// ... import
import { PlayerManager } from './services/PlayerManager.js';
import { VehicleManager } from './services/VehicleManager.js';
// ... 다른 매니저들 import

const eventEmitter = new EventEmitter();
const config = loadConfig();

const terrainManager = new TerrainManager(config.terrain);
const playerManager = new PlayerManager(config.game, eventEmitter);
const vehicleManager = new VehicleManager(config.vehicles, eventEmitter, terrainManager);
const collisionSystem = new CollisionSystem(eventEmitter);
const gameLoop = new GameLoop(eventEmitter, [playerManager, vehicleManager, collisionSystem]);
const gameStateManager = new GameStateManager(config.game, eventEmitter, playerManager);

// Socket.io 이벤트 핸들러에서 각 매니저의 메서드 호출
io.on('connection', (socket) => {
    socket.on('joinGame', (data) => {
        const player = playerManager.addPlayer(socket.id, socket.username);
        if (player) {
            vehicleManager.createVehicleForPlayer(player.id, data.vehicleType);
        }
    });
    // ...
});
```

### 3.3. 이벤트 기반 통신 강화

각 시스템은 `EventEmitter`를 통해 이벤트를 발생시키고, 다른 시스템은 이 이벤트를 구독하여 필요한 작업을 수행합니다.

- **예시**: `CollisionSystem`이 차량 파괴를 감지하면 `vehicleDestroyed` 이벤트를 발생시킵니다.
    - `PlayerManager`는 이 이벤트를 듣고 점수를 업데이트합니다.
    - `VehicleManager`는 이 이벤트를 듣고 차량 리스폰 로직을 처리합니다.
    - `EffectSystem`은 이 이벤트를 듣고 폭발 효과를 생성합니다.

### 3.4. 단계별 리팩토링 절차

1.  **새로운 Manager/System 클래스 파일 생성**: 위에서 정의한 새로운 클래스들의 파일을 `services/game-service/src/services` 디렉토리에 생성합니다.
2.  **`GameManager`에서 코드 이동**: `GameManager`의 관련 코드를 각 책임에 맞는 새로운 클래스로 점진적으로 이동시킵니다.
3.  **`GameManager` 리팩토링**: 모든 로직이 이동되면, `GameManager`는 각 시스템을 오케스트레이션하는 역할만 담당하도록 수정하거나, 혹은 완전히 제거하고 `index.js`에서 직접 관리하도록 합니다.
4.  **`index.js` 수정**: `index.js`에서 새로운 클래스들을 초기화하고 의존성을 주입하도록 수정합니다.
5.  **테스트**: 각 모듈별로 단위 테스트를 작성하고, 전체 시스템에 대한 통합 테스트를 수행하여 리팩토링이 기존 기능에 영향을 주지 않았는지 확인합니다.

## 4. 기대 효과

- **유연성 및 확장성 증가**: 새로운 기능(예: 새로운 무기, 새로운 게임 모드)을 추가할 때 관련된 시스템만 수정하면 되므로 확장성이 향상됩니다.
- **테스트 용이성**: 각 시스템을 독립적으로 테스트할 수 있어 코드의 안정성을 높일 수 있습니다.
- **팀 협업 용이**: 여러 개발자가 서로 다른 모듈을 동시에 작업하기 용이해집니다.
