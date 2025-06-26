# 게임 이벤트 저장 정책 및 구조 (EventProcessor 기준)

## 1. 게임 이벤트 정의 및 구조

### 1.1. 주요 이벤트 타입 (EventManager 기준)
- **플레이어 관련**
  - `playerJoined`
  - `playerLeft`
  - `playerScoreChanged`
- **게임 상태 관련**
  - `gameStarted`
  - `gameEnded`
  - `gameStateUpdate`
- **전투/오브젝트 관련**
  - `vehicleDestroyed`
  - `vehicleRespawned`
  - `vehicleHit`
  - `billboardDestroyed`
  - `billboardHit`
  - `itemBoxDestroyed`
  - `itemBoxHit`
- **효과/시스템 관련**
  - `explosionCreated`
  - `muzzleFlash`
  - `projectilesRemoved`
  - `effectsRemoved`
  - `serverStarted`
  - `serverError`
  - `performanceWarning`

### 1.2. 이벤트 데이터 구조 예시
- 모든 이벤트는 `{ type, data, timestamp }` 형태
- 예시:
  - `vehicleDestroyed`:
    ```json
    {
      "type": "vehicleDestroyed",
      "data": {
        "vehicleId": "...",
        "playerId": "...",
        "killerId": "...",
        "weaponType": "...",
        "position": {...}
      },
      "timestamp": 1234567890
    }
    ```
  - `billboardDestroyed`:
    ```json
    {
      "type": "billboardDestroyed",
      "data": {
        "billboardId": "...",
        "destroyedBy": "...",
        "position": {...},
        "reward": 50
      },
      "timestamp": 1234567890
    }
    ```
  - `playerScoreChanged`:
    ```json
    {
      "type": "playerScoreChanged",
      "data": {
        "playerId": "...",
        "scoreDelta": 10
      },
      "timestamp": 1234567890
    }
    ```

---

## 2. EventProcessor의 저장 정책 (완성형)

### 2.1. 테이블별 저장 규칙

| 이벤트 타입                | game_events 저장 | game_metrics 저장 | 기타 테이블 저장(상세)         |
|---------------------------|:---------------:|:----------------:|:------------------------------|
| playerJoined              | O               | O (player_joined)| players, player_statistics    |
| playerLeft                | O               | O (player_left)  | player_sessions               |
| playerScoreChanged        | O               | O (player_score_changed, scoreDelta) | player_statistics |
| gameStarted               | O               | O (game_started) | game_sessions                 |
| gameEnded                 | O               | O (game_ended)   | game_sessions                 |
| vehicleDestroyed          | O               | O (vehicle_destroyed, 필요시) | vehicles, player_statistics   |
| vehicleHit                | O               | O (vehicle_hit, damage) | player_statistics         |
| billboardDestroyed        | O               | O (billboard_destroyed, reward) | billboard_destructions, player_statistics |
| billboardHit              | O               | O (billboard_hit, damage) |                              |
| itemBoxDestroyed          | O               | O (item_box_destroyed, score/missiles) | item_box_destructions, player_statistics |
| itemBoxHit                | O               | O (item_box_hit, damage) |                              |
| explosionCreated/explosion| O               | O (explosion, damage) |                              |
| 기타(정의되지 않은 이벤트)| O               | O (raw metric)   |                              |

- **game_events**: 모든 이벤트의 원본 기록
- **game_metrics**: 통계/지표로 의미 있는 이벤트만 기록 (type, value, playerId, timestamp, additionalFields)
- **상세 테이블**: 각 이벤트별로 의미 있는 엔티티(예: billboard_destructions, item_box_destructions 등)

### 2.2. 저장 정책의 일관성 원칙

- **모든 이벤트는 game_events에 저장** (원본 이벤트 로그)
- **통계/지표로 의미 있는 이벤트는 반드시 game_metrics에도 저장**
  - playerScoreChanged, explosion 등도 포함
- **엔티티별 상세 테이블은 해당 이벤트에만 저장**
  - 예: billboardDestroyed → billboard_destructions

---

## 3. 저장 정책의 공식 문서화 예시

> ### 이벤트 저장 정책
> - 모든 게임 이벤트는 game_events 테이블에 원본으로 저장됩니다.
> - 통계/지표로 활용할 이벤트는 game_metrics에도 저장됩니다.
> - 각 이벤트별로 필요한 경우 별도의 상세 테이블(예: billboard_destructions)에 추가 저장됩니다.
> - 이벤트 타입/데이터 구조는 EventManager.EVENTS 및 각 서비스의 publishEvent 참고. 