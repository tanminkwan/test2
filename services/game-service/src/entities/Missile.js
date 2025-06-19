import GameEntity from './GameEntity.js';

/**
 * 유도 미사일 클래스
 * 타겟을 추적하는 발사체
 */
export default class Missile extends GameEntity {
    constructor(id, ownerId, position, initialVelocity, targetId, config = {}) {
        super(id, position);
        
        this.ownerId = ownerId;
        this.targetId = targetId;
        this.velocity = { ...initialVelocity };
        this.damage = config.damage || 30;
        this.speed = config.speed || 150;
        this.range = config.range || 600;
        
        // 기본 설정값 (아직 실제 추적 기능은 구현하지 않음)
        this.trackingPower = config.trackingPower || 2.0;
        this.maxTurnRate = config.maxTurnRate || 0.08;
        
        this.distanceTraveled = 0;
        this.startPosition = { ...position };
        this.createdAt = Date.now();
        this.lifeTime = config.lifeTime || 6000;
        this.armingTime = config.armingTime || 300;
    }

    /**
     * 미사일 업데이트 (1단계에서는 일반 총알과 유사하게 직선으로 움직임)
     */
    update(deltaTime) {
        if (!this.active) return;
        
        // 이전 위치 저장
        const prevPosition = { ...this.position };
        
        // 위치 업데이트 (직선 이동)
        super.updatePosition(deltaTime);
        
        // 이동 거리 계산
        const dx = this.position.x - prevPosition.x;
        const dy = this.position.y - prevPosition.y;
        const dz = this.position.z - prevPosition.z;
        this.distanceTraveled += Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // 사거리 초과 또는 유효 시간 초과 시 제거
        if (this.distanceTraveled > this.range || Date.now() - this.createdAt > this.lifeTime) {
            this.destroy();
        }
    }
    
    /**
     * 파괴 여부 확인
     */
    shouldDestroy() {
        return !this.active || this.distanceTraveled > this.range;
    }

    /**
     * 직렬화
     */
    serialize() {
        return {
            ...super.serialize(),
            ownerId: this.ownerId,
            targetId: this.targetId,
            damage: this.damage,
            speed: this.speed,
            range: this.range,
            distanceTraveled: this.distanceTraveled,
            type: 'missile'
        };
    }
} 