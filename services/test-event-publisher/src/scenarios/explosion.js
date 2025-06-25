/**
 * 폭발 이벤트 시나리오
 */
export class ExplosionScenario {
  constructor() {
    this.description = '폭발 효과 이벤트를 생성합니다';
    this.explosionTypes = ['missile', 'grenade', 'bomb', 'fuel_tank', 'barrel'];
    this.playerIds = ['player1', 'player2', 'player3', 'player4', 'player5'];
  }

  /**
   * 폭발 이벤트 생성
   * @param {number} index 이벤트 인덱스
   * @returns {Object} 이벤트 객체
   */
  generateEvent(index) {
    const explosionId = `explosion_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const explosionType = this.explosionTypes[Math.floor(Math.random() * this.explosionTypes.length)];
    const causedByPlayerId = Math.random() < 0.8 ? 
      this.playerIds[Math.floor(Math.random() * this.playerIds.length)] : null;
    
    // 폭발 위치
    const position = {
      x: Math.random() * 1000 - 500,
      y: Math.random() * 50,
      z: Math.random() * 1000 - 500
    };
    
    // 폭발 속성
    const radius = this.getExplosionRadius(explosionType);
    const damage = this.getExplosionDamage(explosionType);
    const duration = this.getExplosionDuration(explosionType);
    
    // 영향을 받은 개체들
    const affectedEntities = this.generateAffectedEntities(radius, position);
    
    return {
      type: 'explosionCreated',
      data: {
        explosionId,
        explosionType,
        position,
        radius,
        damage,
        duration,
        causedByPlayerId,
        affectedEntities,
        timestamp: Date.now(),
        matchId: 'match_123456',
        gameMode: 'battle_royale',
        mapId: 'desert_map',
        sessionId: `session_${Math.floor(Math.random() * 1000)}`
      }
    };
  }
  
  /**
   * 폭발 유형에 따른 반경 결정
   * @param {string} explosionType 폭발 유형
   * @returns {number} 폭발 반경
   */
  getExplosionRadius(explosionType) {
    switch(explosionType) {
      case 'missile': return 15 + Math.random() * 5;
      case 'grenade': return 8 + Math.random() * 3;
      case 'bomb': return 20 + Math.random() * 10;
      case 'fuel_tank': return 12 + Math.random() * 8;
      case 'barrel': return 5 + Math.random() * 3;
      default: return 10;
    }
  }
  
  /**
   * 폭발 유형에 따른 데미지 결정
   * @param {string} explosionType 폭발 유형
   * @returns {number} 폭발 데미지
   */
  getExplosionDamage(explosionType) {
    switch(explosionType) {
      case 'missile': return 100 + Math.random() * 50;
      case 'grenade': return 75 + Math.random() * 25;
      case 'bomb': return 150 + Math.random() * 50;
      case 'fuel_tank': return 90 + Math.random() * 30;
      case 'barrel': return 50 + Math.random() * 20;
      default: return 50;
    }
  }
  
  /**
   * 폭발 유형에 따른 지속 시간 결정
   * @param {string} explosionType 폭발 유형
   * @returns {number} 폭발 지속 시간(ms)
   */
  getExplosionDuration(explosionType) {
    switch(explosionType) {
      case 'missile': return 1500 + Math.random() * 500;
      case 'grenade': return 1000 + Math.random() * 300;
      case 'bomb': return 2000 + Math.random() * 1000;
      case 'fuel_tank': return 3000 + Math.random() * 1000;
      case 'barrel': return 800 + Math.random() * 200;
      default: return 1000;
    }
  }
  
  /**
   * 폭발에 영향을 받은 개체 생성
   * @param {number} radius 폭발 반경
   * @param {Object} position 폭발 위치
   * @returns {Array} 영향을 받은 개체 목록
   */
  generateAffectedEntities(radius, position) {
    const entityCount = Math.floor(Math.random() * 5) + 1;
    const entities = [];
    
    for (let i = 0; i < entityCount; i++) {
      // 폭발 반경 내 랜덤 위치 계산
      const distance = Math.random() * radius;
      const angle = Math.random() * Math.PI * 2;
      
      const entityPosition = {
        x: position.x + Math.cos(angle) * distance,
        y: position.y + (Math.random() * 2 - 1) * 3, // 약간의 높이 변화
        z: position.z + Math.sin(angle) * distance
      };
      
      // 거리에 따른 데미지 계산 (가까울수록 큰 데미지)
      const damagePercent = 1 - (distance / radius);
      
      // 개체 유형 랜덤 선택
      const entityTypes = ['vehicle', 'player', 'structure', 'prop'];
      const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)];
      
      entities.push({
        entityId: `entity_${Math.floor(Math.random() * 1000)}`,
        entityType,
        position: entityPosition,
        distance,
        damageReceived: Math.floor(damagePercent * 100),
        wasDestroyed: damagePercent > 0.7 // 70% 이상 데미지면 파괴됨
      });
    }
    
    return entities;
  }
} 