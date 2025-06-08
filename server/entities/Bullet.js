import GameEntity from './GameEntity.js';

/**
 * 총알 클래스 (Single Responsibility Principle)
 * 발사체의 물리 시뮬레이션과 충돌 검사를 담당
 */
export default class Bullet extends GameEntity {
    constructor(id, ownerId, position, velocity, config = {}) {
        super(id, position);
        
        this.ownerId = ownerId;
        this.velocity = { ...velocity };
        this.damage = config.damage || 10;
        this.speed = config.speed || 200;
        this.range = config.range || 300;
        
        // 발사체 상태
        this.distanceTraveled = 0;
        this.startPosition = { ...position };
        this.createdAt = Date.now();
    }

    /**
     * 총알 업데이트
     */
    update(deltaTime) {
        if (!this.active) return;
        
        // 이전 위치 저장
        const prevPosition = { ...this.position };
        
        // 위치 업데이트
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.position.z += this.velocity.z * deltaTime;
        
        // 이동 거리 계산
        const dx = this.position.x - prevPosition.x;
        const dy = this.position.y - prevPosition.y;
        const dz = this.position.z - prevPosition.z;
        this.distanceTraveled += Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // 사거리 초과 시 제거
        if (this.distanceTraveled > this.range) {
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
            damage: this.damage,
            speed: this.speed,
            range: this.range,
            distanceTraveled: this.distanceTraveled,
            type: 'bullet'
        };
    }
} 