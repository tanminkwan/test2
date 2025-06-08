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

        this.effects.set(explosionId, explosion);
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
                    timestamp: Date.now(),
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
                    timestamp: Date.now(),
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
            if (effect.update) {
                effect.update(deltaTime);
            }

            // 지속시간 확인
            const elapsed = now - (effect.timestamp || effect.createdAt || 0);
            if (elapsed > (effect.duration || 2000)) {
                toRemove.push(id);
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
            this.effects.delete(id);
        });

        return toRemove;
    }

    /**
     * 효과 제거
     */
    removeEffect(effectId) {
        return this.effects.delete(effectId);
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