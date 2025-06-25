/**
 * 플레이어 점수 이벤트 시나리오
 */
export class PlayerScoreScenario {
  constructor() {
    this.description = '플레이어 점수 변경 이벤트를 생성합니다';
    this.playerIds = ['player1', 'player2', 'player3', 'player4', 'player5'];
    this.scoreReasons = [
      'kill', 
      'assist', 
      'objective_capture', 
      'vehicle_destroyed', 
      'survival_time',
      'headshot',
      'multi_kill'
    ];
  }

  /**
   * 플레이어 점수 이벤트 생성
   * @param {number} index 이벤트 인덱스
   * @returns {Object} 이벤트 객체
   */
  generateEvent(index) {
    const playerId = this.playerIds[Math.floor(Math.random() * this.playerIds.length)];
    const scoreReason = this.scoreReasons[Math.floor(Math.random() * this.scoreReasons.length)];
    
    // 이유에 따라 다른 점수 부여
    let scoreAmount;
    switch(scoreReason) {
      case 'kill':
        scoreAmount = 100;
        break;
      case 'assist':
        scoreAmount = 50;
        break;
      case 'objective_capture':
        scoreAmount = 200;
        break;
      case 'vehicle_destroyed':
        scoreAmount = 150;
        break;
      case 'survival_time':
        scoreAmount = 10 * Math.floor(Math.random() * 10);
        break;
      case 'headshot':
        scoreAmount = 150;
        break;
      case 'multi_kill':
        scoreAmount = 100 * (Math.floor(Math.random() * 3) + 2); // 2-4배
        break;
      default:
        scoreAmount = 50;
    }
    
    // 멀티킬 보너스 추가 정보
    const additionalData = {};
    if (scoreReason === 'multi_kill') {
      additionalData.killCount = Math.floor(scoreAmount / 100);
      additionalData.timeFrame = 5000; // 5초 이내
    }
    
    return {
      type: 'playerScoreChanged',
      data: {
        playerId,
        scoreChange: scoreAmount,
        totalScore: 1000 + index * 100 + scoreAmount, // 기본 1000점에 이벤트마다 100점씩 증가
        reason: scoreReason,
        timestamp: Date.now(),
        matchId: 'match_123456',
        gameMode: 'battle_royale',
        mapId: 'desert_map',
        sessionId: `session_${Math.floor(Math.random() * 1000)}`,
        ...additionalData
      }
    };
  }
} 