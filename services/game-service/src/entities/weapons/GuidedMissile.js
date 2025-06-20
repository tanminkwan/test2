import { Weapon } from './Weapon.js';
import Missile from '../Missile.js';

/**
 * 유도 미사일 클래스
 * Weapon 추상 클래스를 확장하여 구현
 */
export class GuidedMissile extends Weapon {
    constructor(id, ownerId, config) {
        // 무기 기본 설정
        super(id, ownerId, {
            damage: 30,
            speed: 150,
            range: 600,
            cooldown: 2000, // 재사용 시간 2초
            ammo: config.ammo || 6,
            maxAmmo: config.maxAmmo || 6,
            ...config
        });
        
        // 1단계에서는 기본 속성만 설정하고 실제 구현은 추후 단계에서 진행
        this.trackingPower = config.trackingPower || 2.0;
        this.maxTurnRate = config.maxTurnRate || 0.08;
        this.reloadTime = config.reloadTime || 30000; // 30초 재장전 시간
        this.lastReloadTime = Date.now();
    }

    /**
     * 발사체(미사일) 생성 - 1단계에서는 기본 생성만 구현
     */
    createProjectile(position, rotation, targetId) {
        // 미사일 ID 생성
        const missileId = `missile_${this.ownerId}_${Date.now()}_${Math.random()}`;
        
        // 발사 위치 계산 (비행체 하단 또는 날개)
        const launchOffset = {
            x: Math.sin(rotation.y) * Math.cos(rotation.x) * 5,
            y: -Math.sin(rotation.x) * 5 - 2, // 약간 아래쪽에서 발사
            z: Math.cos(rotation.y) * Math.cos(rotation.x) * 5
        };

        const missilePosition = {
            x: position.x + launchOffset.x,
            y: position.y + launchOffset.y,
            z: position.z + launchOffset.z
        };

        // 초기 방향 계산
        const direction = {
            x: Math.sin(rotation.y) * Math.cos(rotation.x),
            y: -Math.sin(rotation.x),
            z: Math.cos(rotation.y) * Math.cos(rotation.x)
        };

        // 초기 속도 벡터
        const velocity = {
            x: direction.x * this.speed,
            y: direction.y * this.speed,
            z: direction.z * this.speed
        };

        // 기본 미사일 생성 (1단계에서는 targetId를 전달하지만 실제로 사용하지 않음)
        return new Missile(missileId, this.ownerId, missilePosition, velocity, targetId, {
            damage: this.damage,
            range: this.range,
            speed: this.speed,
            trackingPower: this.trackingPower,
            maxTurnRate: this.maxTurnRate,
            config: this.config // 전체 설정을 전달
        });
    }

    /**
     * 미사일 특화 정보
     */
    serialize() {
        return {
            ...super.serialize(),
            weaponType: 'guidedmissile',
            trackingPower: this.trackingPower,
            ammo: this.ammo,
            maxAmmo: this.maxAmmo,
            reloadProgress: Math.min(1, (Date.now() - this.lastReloadTime) / this.reloadTime)
        };
    }
} 