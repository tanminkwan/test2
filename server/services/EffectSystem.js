import Explosion from '../entities/Explosion.js';

/**
 * 효과 시스템 서비스 (Single Responsibility Principle)
 * 시각 효과 관련 로직만 담당
 */
export class EffectSystem {
    constructor(eventEmitter = null) {
        this.effects = new Map(); // effectId -> effect instance
        this.muzzleFlashes = new Map(); // playerId -> muzzle flash data
        this.eventEmitter = eventEmitter;
    }

    /**
     * 폭발 효과 생성
     */
    createExplosion(position, radius, duration, intensity = 1.0) {
        const explosion = new Explosion(
            `explosion_${Date.now()}_${Math.random()}`,
            position,
            {
                radius: radius,
                duration: duration,
                intensity: intensity
            }
        );
        
        // timestamp 설정 (EffectSystem과 호환성을 위해)
        explosion.timestamp = Date.now();
        
        this.effects.set(explosion.id, explosion);
        
        // 폭발 이벤트 발생 (eventEmitter가 있을 때만)
        if (this.eventEmitter) {
            this.eventEmitter.emit('explosionCreated', {
                explosion: explosion.serialize()
            });
        }
        
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
                effect = this.createExplosion(
                    position,
                    5,      // radius
                    1000,   // duration
                    0.5     // intensity
                );
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
                effect = this.createExplosion(
                    position,
                    3,      // radius
                    800,    // duration
                    0.3     // intensity
                );
        }

        return effect;
    }

    /**
     * 효과 업데이트
     */
    update(deltaTime) {
        const now = Date.now();
        const effectsToRemove = [];
        const removedEffects = [];
        
        // 일반 효과들 업데이트
        for (const [id, effect] of this.effects) {
            // 효과가 shouldDestroy() 메서드를 가지고 있는지 확인
            if (typeof effect.shouldDestroy === 'function') {
                if (effect.shouldDestroy()) {
                    effectsToRemove.push(id);
                    removedEffects.push(effect);
                    effect.destroy();
                }
            } else {
                // 폴백: timestamp 기반 만료 확인
                const age = now - (effect.timestamp || effect.createdAt || 0);
                if (age > (effect.duration || 2000)) {
                    effectsToRemove.push(id);
                    removedEffects.push(effect);
                    if (typeof effect.destroy === 'function') {
                        effect.destroy();
                    }
                }
            }
        }
        
        // 만료된 효과들 제거
        for (const id of effectsToRemove) {
            this.effects.delete(id);
        }

        // 총구 스파크 효과 업데이트
        const muzzleFlashesToRemove = [];
        for (const [playerId, muzzleFlash] of this.muzzleFlashes) {
            const age = now - muzzleFlash.timestamp;
            if (age > muzzleFlash.duration) {
                muzzleFlashesToRemove.push(playerId);
                removedEffects.push(muzzleFlash);
            }
        }

        // 만료된 총구 스파크 제거
        for (const playerId of muzzleFlashesToRemove) {
            this.muzzleFlashes.delete(playerId);
        }

        return removedEffects;
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