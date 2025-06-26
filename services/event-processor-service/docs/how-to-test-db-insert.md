# player_sessions, game_sessions 적재 테스트 방법

## 1. player_sessions 적재 테스트

1. 아래 명령어로 player-session 시나리오 이벤트를 발행한다.

```sh
npm run start:test-publisher -- --scenario player-session --count 5 --interval 100
```

2. event-processor-service가 실행 중이어야 하며, 이벤트가 정상적으로 처리되면 player_sessions 테이블에 데이터가 적재된다.

3. DB에서 아래 쿼리로 적재 결과를 확인한다.

```sql
SELECT * FROM player_sessions;
```


## 2. game_sessions 적재 테스트

1. 아래 명령어로 game-state 시나리오 이벤트를 발행한다.

```sh
npm run start:test-publisher -- --scenario game-state --count 5 --interval 100
```

2. event-processor-service가 실행 중이어야 하며, 이벤트가 정상적으로 처리되면 game_sessions 테이블에 데이터가 적재된다.

3. DB에서 아래 쿼리로 적재 결과를 확인한다.

```sql
SELECT * FROM game_sessions;
```


## 3. 참고
- 반드시 event-processor-service가 실행 중이어야 이벤트가 DB에 적재된다.
- 옵션 오타/누락이 없도록 주의한다.
- 결과가 적재되지 않으면 event-processor-service 로그를 확인한다.
- 만약 위 명령어로 실행 시 문제가 있다면, 아래 직접 실행 방식을 사용한다:
  ```sh
  node services/test-event-publisher/src/index.js --scenario player-session --count 5 --interval 100
  node services/test-event-publisher/src/index.js --scenario game-state --count 5 --interval 100
  ``` 