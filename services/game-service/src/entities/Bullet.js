import Projectile from './Projectile.js';

/**
 * 기관총 총알 클래스
 */
export default class Bullet extends Projectile {
    constructor(id, ownerId, position, initialVelocity, options = {}) {
        // Projectile의 생성자 호출
        super(id, ownerId, position, initialVelocity, {
            damage: options.config?.weapons?.machinegun?.damage || 10,
            range: options.config?.weapons?.machinegun?.range || 800,
            lifeTime: options.config?.weapons?.machinegun?.lifeTime || 2000
        });
    }

    /**
     * 직렬화 (타입 오버라이드)
     */
    serialize() {
        return {
            ...super.serialize(),
            type: 'bullet'
        };
    }
} 