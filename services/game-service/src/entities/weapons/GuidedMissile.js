import { Weapon } from './Weapon.js';
import Missile from '../Missile.js';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';

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

    /**
     * 무기 발사
     */
    fire(position, rotation, vehicles, targetId = null) {
        if (!this.canFire()) return null;

        let initialVelocity;
        const weaponConfig = this.config.weapons.missile || {};
        const speed = weaponConfig.speed || 150;

        // 타겟이 있으면 타겟 방향으로, 없으면 정면으로 발사
        if (targetId && vehicles) {
            const target = vehicles.get(targetId);
            const shooterVehicle = vehicles.get(this.getVehicleIdByPlayerId(vehicles));

            if (target && shooterVehicle) {
                initialVelocity = new THREE.Vector3()
                    .subVectors(target.position, shooterVehicle.position)
                    .normalize()
                    .multiplyScalar(speed);
            }
        }
        
        // initialVelocity가 계산되지 않은 경우 (타겟이 없거나 못 찾았을 때)
        if (!initialVelocity) {
            const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(
                rotation.x, rotation.y, rotation.z, 'YXZ'
            ));
            initialVelocity = new THREE.Vector3(0, 0, 1);
            initialVelocity.applyQuaternion(quaternion).multiplyScalar(speed);
        }

        const missile = new Missile(
            `missile_${uuidv4()}`,
            this.ownerId,
            position,
            initialVelocity,
            targetId,
            { config: this.config }
        );
        
        this.lastFired = Date.now();
        this.ammo--;

        return missile;
    }

    /**
     * Player ID로 Vehicle ID를 찾는 헬퍼 함수
     * @param {Map<string, Vehicle>} vehicles 
     * @returns {string|null}
     */
    getVehicleIdByPlayerId(vehicles) {
        for (const [vehicleId, vehicle] of vehicles.entries()) {
            if (vehicle.playerId === this.ownerId) {
                return vehicleId;
            }
        }
        return null;
    }
} 