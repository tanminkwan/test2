/**
 * 게임 상태 이벤트 시나리오
 */
export class GameStateScenario {
  constructor() {
    this.description = '게임 상태 변경 이벤트를 생성합니다';
    this.gameStates = ['waiting', 'starting', 'in_progress', 'ending', 'completed'];
    this.currentStateIndex = 0;
    this.playerCounts = {
      min: 4,
      max: 16,
      current: 0
    };
  }

  /**
   * 게임 상태 이벤트 생성
   * @param {number} index 이벤트 인덱스
   * @returns {Object} 이벤트 객체
   */
  generateEvent(index) {
    // 이벤트 인덱스에 따라 게임 상태 변경
    if (index % 5 === 0) {
      this.currentStateIndex = (this.currentStateIndex + 1) % this.gameStates.length;
    }
    
    const currentState = this.gameStates[this.currentStateIndex];
    
    // 게임 상태에 따라 플레이어 수 조정
    switch(currentState) {
      case 'waiting':
        // 대기 중 - 플레이어 점진적으로 증가
        this.playerCounts.current = Math.min(
          this.playerCounts.max,
          this.playerCounts.current + Math.floor(Math.random() * 3)
        );
        break;
      case 'starting':
        // 시작 중 - 플레이어 수 고정
        break;
      case 'in_progress':
        // 진행 중 - 플레이어 가끔 감소 (탈락)
        if (Math.random() < 0.3) {
          this.playerCounts.current = Math.max(
            1,
            this.playerCounts.current - 1
          );
        }
        break;
      case 'ending':
        // 종료 중 - 플레이어 1-3명 남음
        this.playerCounts.current = Math.max(1, Math.min(3, this.playerCounts.current));
        break;
      case 'completed':
        // 완료 - 승자만 남음
        this.playerCounts.current = 1;
        break;
    }
    
    // 추가 게임 정보
    const timeElapsed = index * 10; // 10초씩 증가
    const timeRemaining = currentState === 'completed' ? 0 : Math.max(0, 600 - timeElapsed); // 최대 10분(600초)
    
    return {
      type: 'gameStateUpdate',
      data: {
        previousState: index === 0 ? null : this.gameStates[(this.currentStateIndex + this.gameStates.length - 1) % this.gameStates.length],
        currentState,
        playerCount: this.playerCounts.current,
        maxPlayers: this.playerCounts.max,
        timeElapsed,
        timeRemaining,
        matchId: 'match_123456',
        gameMode: 'battle_royale',
        mapId: 'desert_map',
        sessionId: `session_${Math.floor(Math.random() * 1000)}`,
        timestamp: Date.now(),
        serverLoad: Math.random() * 0.5 + 0.5, // 50-100% 서버 부하
        tickRate: Math.floor(Math.random() * 10) + 60 // 60-70 틱
      }
    };
  }
} 