import GameEntity from '../GameEntity.js';

/**
 * 무기 추상 클래스 (Open/Closed Principle)
 * 새로운 무기 타입을 쉽게 확장할 수 있도록 설계
 */
export class Weapon extends GameEntity {
    constructor(id, ownerId, config) {
        super(id, { x: 0, y: 0, z: 0 });
        this.ownerId = ownerId;
        this.config = config;
        this.damage = config.damage || 10;
        this.speed = config.speed || 100;
        this.range = config.range || 500;
        this.cooldown = config.cooldown || 100;
        this.lastFired = 0;
        this.ammo = config.ammo || Infinity;
        this.maxAmmo = config.maxAmmo || Infinity;
    }

    /**
     * 무기 발사 (Template Method Pattern)
     */
    fire(position, rotation, targetId = null) {
        if (!this.canFire()) {
            return null;
        }

        const projectile = this.createProjectile(position, rotation, targetId);
        this.onFire();
        return projectile;
    }

    /**
     * 발사 가능 여부 확인
     */
    canFire() {
        const now = Date.now();
        return (now - this.lastFired >= this.cooldown) && this.ammo > 0;
    }

    /**
     * 발사 후 처리
     */
    onFire() {
        this.lastFired = Date.now();
        if (this.ammo !== Infinity) {
            this.ammo--;
        }
    }

    /**
     * 탄약 재장전
     */
    reload() {
        this.ammo = this.maxAmmo;
    }

    /**
     * 무기별 고유 발사체 생성 (Abstract Method)
     * 하위 클래스에서 반드시 구현해야 함
     */
    createProjectile(position, rotation, targetId) {
        throw new Error('createProjectile method must be implemented by subclass');
    }

    /**
     * 무기 정보 직렬화
     */
    serialize() {
        return {
            ...super.serialize(),
            ownerId: this.ownerId,
            damage: this.damage,
            speed: this.speed,
            range: this.range,
            cooldown: this.cooldown,
            ammo: this.ammo,
            maxAmmo: this.maxAmmo,
            type: this.constructor.name.toLowerCase()
        };
    }
} 