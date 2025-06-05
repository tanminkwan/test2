const GameEntity = require('./GameEntity');

/**
 * 폭발 효과 클래스
 * GameEntity를 확장하여 폭발 효과 구현
 */
class Explosion extends GameEntity {
    constructor(id, position, config) {
        super(id, 'explosion', position);
        
        this.duration = config.effects.explosionDuration;
        this.maxScale = 10;
        this.startTime = Date.now();
        
        // 초기 스케일은 0
        this.scale = { x: 0, y: 0, z: 0 };
    }

    /**
     * 폭발 효과 업데이트
     */
    afterUpdate(deltaTime) {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const progress = elapsed / this.duration;
        
        if (progress >= 1) {
            this.destroy();
            return;
        }
        
        // 폭발 애니메이션 (빠르게 확장 후 서서히 축소)
        let scaleProgress;
        if (progress < 0.3) {
            // 빠른 확장
            scaleProgress = progress / 0.3;
        } else {
            // 서서히 축소
            scaleProgress = 1 - ((progress - 0.3) / 0.7);
        }
        
        const currentScale = scaleProgress * this.maxScale;
        this.scale.x = currentScale;
        this.scale.y = currentScale;
        this.scale.z = currentScale;
    }

    /**
     * 클라이언트 전송용 데이터
     */
    toClientData() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const progress = elapsed / this.duration;
        
        return {
            ...super.toClientData(),
            progress: progress,
            duration: this.duration
        };
    }
}

module.exports = Explosion; 