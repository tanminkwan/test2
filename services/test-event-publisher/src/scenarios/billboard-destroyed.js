/**
 * 광고판 파괴 이벤트 시나리오
 */
export class BillboardDestroyedScenario {
  constructor() {
    this.description = '광고판 파괴 이벤트를 생성합니다';
    this.playerIds = ['player1', 'player2', 'player3', 'player4', 'player5'];
    this.weaponTypes = ['missile', 'cannon', 'machinegun', 'rocket', 'bomb', 'vehicle_collision'];
    this.billboardTypes = ['small', 'medium', 'large', 'electronic', 'animated'];
    this.advertisers = ['GameCorp', 'TechZone', 'SpeedRacer', 'MegaDrink', 'FoodChain', 'SportGear'];
  }

  /**
   * 광고판 파괴 이벤트 생성
   * @param {number} index 이벤트 인덱스
   * @returns {Object} 이벤트 객체
   */
  generateEvent(index) {
    const billboardId = `billboard_${Math.floor(Math.random() * 50)}`;
    const billboardType = this.billboardTypes[Math.floor(Math.random() * this.billboardTypes.length)];
    const advertiser = this.advertisers[Math.floor(Math.random() * this.advertisers.length)];
    const playerId = this.playerIds[Math.floor(Math.random() * this.playerIds.length)];
    const weaponType = this.weaponTypes[Math.floor(Math.random() * this.weaponTypes.length)];
    
    // 광고판 위치
    const position = {
      x: Math.random() * 1000 - 500,
      y: Math.random() * 20 + 10, // 지상에서 10-30 높이
      z: Math.random() * 1000 - 500
    };
    
    // 광고판 크기 (유형에 따라 다름)
    const size = this.getBillboardSize(billboardType);
    
    // 광고판 가치 (크기와 광고주에 따라 다름)
    const value = this.calculateBillboardValue(billboardType, advertiser);
    
    // 파괴 효과
    const destructionEffects = this.getDestructionEffects(billboardType, weaponType);
    
    return {
      type: 'billboardDestroyed',
      data: {
        billboardId,
        billboardType,
        advertiser,
        playerId,
        weaponType,
        position,
        size,
        value,
        destructionEffects,
        destroyedAt: Date.now(),
        matchId: 'match_123456',
        gameMode: 'battle_royale',
        mapId: 'desert_map',
        sessionId: `session_${Math.floor(Math.random() * 1000)}`,
        scoreAwarded: Math.floor(value / 10) // 가치의 1/10을 점수로 부여
      }
    };
  }
  
  /**
   * 광고판 유형에 따른 크기 반환
   * @param {string} billboardType 광고판 유형
   * @returns {Object} 광고판 크기
   */
  getBillboardSize(billboardType) {
    switch(billboardType) {
      case 'small':
        return { width: 3 + Math.random(), height: 2 + Math.random(), depth: 0.5 };
      case 'medium':
        return { width: 6 + Math.random() * 2, height: 3 + Math.random(), depth: 0.5 };
      case 'large':
        return { width: 10 + Math.random() * 5, height: 5 + Math.random() * 2, depth: 0.8 };
      case 'electronic':
        return { width: 8 + Math.random() * 2, height: 4 + Math.random(), depth: 1 };
      case 'animated':
        return { width: 7 + Math.random() * 3, height: 4 + Math.random() * 2, depth: 1.2 };
      default:
        return { width: 5, height: 3, depth: 0.5 };
    }
  }
  
  /**
   * 광고판 가치 계산
   * @param {string} billboardType 광고판 유형
   * @param {string} advertiser 광고주
   * @returns {number} 광고판 가치
   */
  calculateBillboardValue(billboardType, advertiser) {
    // 기본 가치
    let baseValue;
    switch(billboardType) {
      case 'small': baseValue = 100; break;
      case 'medium': baseValue = 250; break;
      case 'large': baseValue = 500; break;
      case 'electronic': baseValue = 750; break;
      case 'animated': baseValue = 1000; break;
      default: baseValue = 200;
    }
    
    // 광고주에 따른 가치 승수
    let multiplier;
    switch(advertiser) {
      case 'GameCorp': multiplier = 1.5; break;
      case 'TechZone': multiplier = 1.3; break;
      case 'SpeedRacer': multiplier = 1.2; break;
      case 'MegaDrink': multiplier = 1.1; break;
      case 'FoodChain': multiplier = 1.0; break;
      case 'SportGear': multiplier = 1.4; break;
      default: multiplier = 1.0;
    }
    
    return Math.floor(baseValue * multiplier);
  }
  
  /**
   * 파괴 효과 생성
   * @param {string} billboardType 광고판 유형
   * @param {string} weaponType 무기 유형
   * @returns {Array} 파괴 효과 목록
   */
  getDestructionEffects(billboardType, weaponType) {
    const effects = [];
    
    // 기본 파편 효과
    effects.push({
      type: 'debris',
      count: Math.floor(Math.random() * 10) + 5,
      lifetime: 3000 + Math.random() * 2000
    });
    
    // 유형별 특수 효과
    if (billboardType === 'electronic' || billboardType === 'animated') {
      effects.push({
        type: 'spark',
        count: Math.floor(Math.random() * 15) + 10,
        lifetime: 1000 + Math.random() * 1000
      });
    }
    
    // 무기 유형에 따른 효과
    switch(weaponType) {
      case 'missile':
      case 'rocket':
      case 'bomb':
        effects.push({
          type: 'explosion',
          radius: 3 + Math.random() * 2,
          lifetime: 1500 + Math.random() * 500
        });
        break;
      case 'vehicle_collision':
        effects.push({
          type: 'dust',
          radius: 2 + Math.random(),
          lifetime: 2000 + Math.random() * 1000
        });
        break;
    }
    
    return effects;
  }
} 