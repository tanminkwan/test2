import GameEntity from './GameEntity.js';

/**
 * 기본 발사체 클래스
 * 모든 발사체(총알, 미사일 등)의 기반
 */
export default class Projectile extends GameEntity {
    constructor(id, ownerId, position, initialVelocity, options = {}) {
        super(id, position);
        
        this.ownerId = ownerId;
        this.velocity.copy(initialVelocity); // THREE.Vector3를 복사
        
        this.damage = options.damage || 10;
        this.range = options.range || 500;
        this.lifeTime = options.lifeTime || 3000; // ms
        
        this.distanceTraveled = 0;
        this.createdAt = Date.now();
    }

    /**
     * 발사체 업데이트
     * @param {number} deltaTime 
     */
    update(deltaTime) {
        if (!this.active) return;
        
        const distanceStep = this.velocity.length() * deltaTime;
        this.distanceTraveled += distanceStep;

        super.updatePosition(deltaTime);

        if (this.shouldDestroy()) {
            this.destroy();
        }
    }

    /**
     * 파괴 여부 확인
     */
    shouldDestroy() {
        return !this.active || 
               this.distanceTraveled > this.range || 
               Date.now() - this.createdAt > this.lifeTime;
    }
    
    /**
     * 파괴 처리
     */
    destroy() {
        this.active = false;
    }

    /**
     * 직렬화
     */
    serialize() {
        return {
            ...super.serialize(),
            ownerId: this.ownerId,
            damage: this.damage,
            range: this.range,
            distanceTraveled: this.distanceTraveled,
            type: 'projectile'
        };
    }
} 