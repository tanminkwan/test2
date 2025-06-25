/**
 * 차량 파괴 이벤트 시나리오
 */
export class VehicleDestroyedScenario {
  constructor() {
    this.description = '차량 파괴 이벤트를 생성합니다';
    this.vehicleTypes = ['tank', 'jeep', 'helicopter', 'plane'];
    this.playerIds = ['player1', 'player2', 'player3', 'player4', 'player5'];
    this.weaponTypes = ['missile', 'cannon', 'machinegun', 'rocket', 'bomb'];
  }

  /**
   * 차량 파괴 이벤트 생성
   * @param {number} index 이벤트 인덱스
   * @returns {Object} 이벤트 객체
   */
  generateEvent(index) {
    const vehicleId = `vehicle_${Math.floor(Math.random() * 100)}`;
    const vehicleType = this.vehicleTypes[Math.floor(Math.random() * this.vehicleTypes.length)];
    const playerId = this.playerIds[Math.floor(Math.random() * this.playerIds.length)];
    const killerId = this.getRandomKillerId(playerId);
    const weaponType = this.weaponTypes[Math.floor(Math.random() * this.weaponTypes.length)];
    
    const position = {
      x: Math.random() * 1000 - 500,
      y: Math.random() * 100,
      z: Math.random() * 1000 - 500
    };
    
    const rotation = {
      x: Math.random() * 360,
      y: Math.random() * 360,
      z: Math.random() * 360
    };
    
    return {
      type: 'vehicleDestroyed',
      data: {
        vehicleId,
        vehicleType,
        playerId,
        killerId,
        weaponType,
        position,
        rotation,
        destroyedAt: Date.now(),
        matchId: 'match_123456',
        gameMode: 'battle_royale',
        mapId: 'desert_map',
        sessionId: `session_${Math.floor(Math.random() * 1000)}`,
        scoreAwarded: Math.floor(Math.random() * 100) + 50
      }
    };
  }
  
  /**
   * 랜덤한 킬러 ID 생성 (자살 가능성 포함)
   * @param {string} victimId 피해자 ID
   * @returns {string} 킬러 ID
   */
  getRandomKillerId(victimId) {
    // 20% 확률로 자살
    if (Math.random() < 0.2) {
      return victimId; // 자살
    }
    
    // 다른 플레이어에게 당함
    let killerId;
    do {
      killerId = this.playerIds[Math.floor(Math.random() * this.playerIds.length)];
    } while (killerId === victimId);
    
    return killerId;
  }
} 