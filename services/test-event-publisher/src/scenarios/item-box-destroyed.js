/**
 * 아이템 상자 파괴 이벤트 시나리오
 */
export class ItemBoxDestroyedScenario {
  constructor() {
    this.description = '아이템 상자 파괴 이벤트를 생성합니다';
    this.playerIds = ['player1', 'player2', 'player3', 'player4', 'player5'];
    this.itemBoxTypes = ['health', 'ammo', 'boost', 'shield', 'random'];
  }

  /**
   * 아이템 상자 파괴 이벤트 생성
   * @param {number} index 이벤트 인덱스
   * @returns {Object} 이벤트 객체
   */
  generateEvent(index) {
    const itemBoxId = `itembox_${Math.floor(Math.random() * 100)}`;
    const itemBoxType = this.itemBoxTypes[Math.floor(Math.random() * this.itemBoxTypes.length)];
    const playerId = this.playerIds[Math.floor(Math.random() * this.playerIds.length)];
    const position = {
      x: Math.random() * 1000 - 500,
      y: Math.random() * 20 + 5,
      z: Math.random() * 1000 - 500
    };
    const rewards = [{ type: itemBoxType, amount: Math.floor(Math.random() * 5) + 1 }];
    return {
      type: 'itemBoxDestroyed',
      data: {
        itemBoxId,
        playerId,
        position,
        rewards,
        destroyedAt: Date.now(),
        matchId: 'match_123456',
        gameMode: 'battle_royale',
        mapId: 'desert_map',
        sessionId: `session_${Math.floor(Math.random() * 1000)}`
      }
    };
  }
} 