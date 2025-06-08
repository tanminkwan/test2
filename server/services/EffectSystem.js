import Explosion from '../entities/Explosion.js';

/**
 * 효과 시스템 서비스 (Single Responsibility Principle)
 * 시각 효과 관련 로직만 담당
 */
export class EffectSystem {
    constructor() {
        this.effects = new Map(); // effectId -> effect instance
        this.muzzleFlashes = new Map(); // playerId -> muzzle flash data
    }

    /**
     * 폭발 효과 생성
     */
    createExplosion(position, config = {}) {
        const explosionId = `explosion_${Date.now()}_${Math.random()}`;
        const explosion = new Explosion(explosionId, position, {
            damage: 0, // 시각 효과만
            radius: 10,
            duration: 2000,
            ...config
        });

        // timestamp 명시적으로 설정
        explosion.timestamp = explosion.createdAt;
        
        this.effects.set(explosionId, explosion);
        console.log(`Created explosion ${explosionId} at (${position.x}, ${position.y}, ${position.z}) with duration ${explosion.duration}ms`);
        return explosion;
    }

    /**
     * 총구 스파크 효과 생성
     */
    createMuzzleFlash(playerId, position, rotation) {
        const muzzleFlash = {
            id: `muzzle_${playerId}_${Date.now()}`,
            playerId,
            position: { ...position },
            rotation: { ...rotation },
            timestamp: Date.now(),
            duration: 150 // 0.15초
        };

        this.muzzleFlashes.set(playerId, muzzleFlash);
        return muzzleFlash;
    }

    /**
     * 충돌 효과 생성
     */
    createImpactEffect(position, type = 'default') {
        const effectId = `impact_${Date.now()}_${Math.random()}`;
        const timestamp = Date.now();
        
        let effect;
        switch (type) {
            case 'vehicle':
                effect = this.createExplosion(position, {
                    radius: 5,
                    duration: 1000,
                    color: 0xff4400
                });
                break;
            case 'billboard':
                effect = {
                    id: effectId,
                    type: 'sparks',
                    position: { ...position },
                    timestamp: timestamp,
                    createdAt: timestamp,
                    duration: 500,
                    particles: 15
                };
                this.effects.set(effectId, effect);
                break;
            case 'collision':
                effect = {
                    id: effectId,
                    type: 'collision_sparks',
                    position: { ...position },
                    timestamp: timestamp,
                    createdAt: timestamp,
                    duration: 800,
                    particles: 10,
                    color: 0xffaa00
                };
                this.effects.set(effectId, effect);
                break;
            default:
                effect = this.createExplosion(position, {
                    radius: 3,
                    duration: 800
                });
        }

        return effect;
    }

    /**
     * 효과 업데이트
     */
    updateEffects(deltaTime) {
        const toRemove = [];
        const now = Date.now();

        // 일반 효과 업데이트
        for (const [id, effect] of this.effects) {
            // 효과 업데이트 (Explosion 객체인 경우)
            if (effect.update && typeof effect.update === 'function') {
                effect.update(deltaTime);
                
                // Explosion 객체가 파괴되었는지 확인
                if (effect.shouldDestroy && effect.shouldDestroy()) {
                    toRemove.push(id);
                    continue;
                }
                
                // active 상태 확인
                if (effect.active === false) {
                    toRemove.push(id);
                    continue;
                }
            }

            // 지속시간 확인 (timestamp 또는 createdAt 사용)
            const creationTime = effect.timestamp || effect.createdAt || 0;
            const elapsed = now - creationTime;
            const duration = effect.duration || 2000;
            
            if (elapsed > duration) {
                toRemove.push(id);
                console.log(`Removing expired effect ${id} (elapsed: ${elapsed}ms, duration: ${duration}ms)`);
            }
        }

        // 총구 스파크 효과 업데이트
        for (const [playerId, muzzleFlash] of this.muzzleFlashes) {
            const elapsed = now - muzzleFlash.timestamp;
            if (elapsed > muzzleFlash.duration) {
                this.muzzleFlashes.delete(playerId);
            }
        }

        // 만료된 효과 제거
        toRemove.forEach(id => {
            const effect = this.effects.get(id);
            if (effect) {
                console.log(`Removing effect ${id} of type ${effect.type || 'explosion'}`);
                this.effects.delete(id);
            }
        });

        return toRemove;
    }

    /**
     * 효과 제거
     */
    removeEffect(effectId) {
        const removed = this.effects.delete(effectId);
        if (removed) {
            console.log(`Manually removed effect ${effectId}`);
        }
        return removed;
    }

    /**
     * 플레이어 총구 스파크 제거
     */
    removeMuzzleFlash(playerId) {
        return this.muzzleFlashes.delete(playerId);
    }

    /**
     * 모든 효과 가져오기
     */
    getAllEffects() {
        return Array.from(this.effects.values());
    }

    /**
     * 모든 총구 스파크 가져오기
     */
    getAllMuzzleFlashes() {
        return Array.from(this.muzzleFlashes.values());
    }

    /**
     * 효과 시스템 정리
     */
    cleanup() {
        console.log(`Cleaning up ${this.effects.size} effects and ${this.muzzleFlashes.size} muzzle flashes`);
        this.effects.clear();
        this.muzzleFlashes.clear();
    }

    /**
     * 시스템 상태 직렬화
     */
    serialize() {
        return {
            effects: this.getAllEffects().map(effect => {
                if (effect.serialize) {
                    return effect.serialize();
                }
                return effect;
            }),
            muzzleFlashes: this.getAllMuzzleFlashes(),
            effectCount: this.effects.size,
            muzzleFlashCount: this.muzzleFlashes.size
        };
    }
} 