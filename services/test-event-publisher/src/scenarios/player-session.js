/**
 * 플레이어 세션 이벤트 시나리오
 */
export class PlayerSessionScenario {
  constructor() {
    this.description = '플레이어 세션 시작/종료 이벤트를 생성합니다';
    this.playerIds = ['player1', 'player2', 'player3', 'player4', 'player5'];
    this.gameIds = ['game1', 'game2', 'game3'];
  }

  /**
   * 플레이어 세션 이벤트 생성
   * @param {number} index 이벤트 인덱스
   * @returns {Object} 이벤트 객체
   */
  generateEvent(index) {
    const playerId = this.playerIds[Math.floor(Math.random() * this.playerIds.length)];
    const gameId = this.gameIds[Math.floor(Math.random() * this.gameIds.length)];
    const joinedAt = Date.now() - Math.floor(Math.random() * 1000000);
    const leftAt = Math.random() < 0.5 ? null : Date.now();
    return {
      type: leftAt ? 'playerSessionEnded' : 'playerSessionStarted',
      data: {
        playerId,
        gameId,
        joinedAt,
        leftAt,
        sessionId: `session_${Math.floor(Math.random() * 10000)}`
      }
    };
  }
} 