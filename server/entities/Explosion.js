import GameEntity from './GameEntity.js';

/**
 * 폭발 클래스 (Single Responsibility Principle)
 * 폭발 효과의 생명주기와 시각적 표현을 담당
 */
export default class Explosion extends GameEntity {
    constructor(id, position, config = {}) {
        super(id, position);
        
        this.damage = config.damage || 0; // 시각 효과용은 데미지 0
        this.radius = config.radius || 10;
        this.duration = config.duration || 2000; // 2초
        this.color = config.color || 0xff4400;
        
        // 폭발 상태
        this.age = 0;
        this.intensity = 1.0; // 0.0 ~ 1.0
        this.createdAt = Date.now();
        this.timestamp = this.createdAt; // EffectSystem과의 호환성을 위해
        
        console.log(`Explosion ${id} created with duration ${this.duration}ms`);
    }

    /**
     * 폭발 업데이트
     */
    update(deltaTime) {
        if (!this.active) return;
        
        this.age += deltaTime * 1000; // 밀리초로 변환
        
        // 강도 계산 (시간에 따라 감소)
        this.intensity = Math.max(0, 1.0 - (this.age / this.duration));
        
        // 지속시간 초과 시 제거
        if (this.age >= this.duration) {
            console.log(`Explosion ${this.id} expired (age: ${this.age}ms, duration: ${this.duration}ms)`);
            this.destroy();
        }
        
        this.lastUpdated = Date.now();
    }

    /**
     * 폭발이 파괴되어야 하는지 확인
     */
    shouldDestroy() {
        const age = Date.now() - this.timestamp;
        const shouldDestroy = age > this.duration;
        
        if (shouldDestroy && this.active) {
            this.active = false;
        }
        
        return shouldDestroy;
    }

    /**
     * 폭발 파괴
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
            damage: this.damage,
            radius: this.radius,
            duration: this.duration,
            color: this.color,
            age: this.age,
            intensity: this.intensity,
            type: 'explosion'
        };
    }
} 