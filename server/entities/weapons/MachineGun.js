import { Weapon } from './Weapon.js';
import Bullet from '../Bullet.js';

/**
 * 기관총 클래스 (기존 총알 시스템)
 * Weapon 추상 클래스를 확장하여 구현
 */
export class MachineGun extends Weapon {
    constructor(id, ownerId, config) {
        super(id, ownerId, {
            damage: 10,
            speed: 200,
            range: 300,
            cooldown: 100,
            ammo: Infinity,
            maxAmmo: Infinity,
            ...config
        });
    }

    /**
     * 기관총 발사체(총알) 생성
     */
    createProjectile(position, rotation, targetId) {
        const bulletId = `bullet_${this.ownerId}_${Date.now()}_${Math.random()}`;
        
        // 총구 위치 계산 (비행체 앞쪽)
        const muzzleOffset = {
            x: Math.sin(rotation.y) * Math.cos(rotation.x) * 8,
            y: -Math.sin(rotation.x) * 8,
            z: Math.cos(rotation.y) * Math.cos(rotation.x) * 8
        };

        const bulletPosition = {
            x: position.x + muzzleOffset.x,
            y: position.y + muzzleOffset.y,
            z: position.z + muzzleOffset.z
        };

        // 발사 방향 계산
        const direction = {
            x: Math.sin(rotation.y) * Math.cos(rotation.x),
            y: -Math.sin(rotation.x),
            z: Math.cos(rotation.y) * Math.cos(rotation.x)
        };

        // 속도 벡터 계산
        const velocity = {
            x: direction.x * this.speed,
            y: direction.y * this.speed,
            z: direction.z * this.speed
        };

        return new Bullet(bulletId, this.ownerId, bulletPosition, velocity, {
            damage: this.damage,
            range: this.range,
            speed: this.speed
        });
    }

    /**
     * 기관총 특화 정보
     */
    serialize() {
        return {
            ...super.serialize(),
            weaponType: 'machinegun',
            fireRate: 1000 / this.cooldown // RPM 계산
        };
    }
} 