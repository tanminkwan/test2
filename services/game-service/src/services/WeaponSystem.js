import { MachineGun } from '../entities/weapons/MachineGun.js';
import { GuidedMissile } from '../entities/weapons/GuidedMissile.js';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import Projectile from '../entities/Projectile.js';

/**
 * 무기 시스템 서비스 (Single Responsibility Principle)
 * 무기 관련 로직만 담당
 */
export class WeaponSystem {
    constructor(config) {
        this.config = config; // config 저장
        this.weapons = new Map(); // playerId -> weapon instances
        this.projectiles = new Map(); // projectileId -> projectile instance
        this.eventEmitter = null; // GameManager에서 설정
    }

    /**
     * 이벤트 에미터 설정
     */
    setEventEmitter(eventEmitter) {
        this.eventEmitter = eventEmitter;
    }

    /**
     * 플레이어에게 무기 장착
     */
    equipWeapon(playerId, weaponType, config = {}) {
        const weaponId = `weapon_${playerId}_${weaponType}`;
        
        // 전체 게임 설정을 무기 생성자에 전달
        const weaponConfig = { ...this.config, ...config };

        let weapon;
        switch (weaponType) {
            case 'machinegun':
                weapon = new MachineGun(weaponId, playerId, weaponConfig);
                break;
            case 'missile':
                weapon = new GuidedMissile(weaponId, playerId, weaponConfig);
                break;
            default:
                throw new Error(`Unknown weapon type: ${weaponType}`);
        }

        if (!this.weapons.has(playerId)) {
            this.weapons.set(playerId, new Map());
        }
        
        this.weapons.get(playerId).set(weaponType, weapon);
        return weapon;
    }

    /**
     * 무기 발사
     */
    fireWeapon(playerId, weaponType, position, rotation, vehicles, targetId = null) {
        const playerWeapons = this.weapons.get(playerId);
        if (!playerWeapons) {
            return null;
        }

        const weapon = playerWeapons.get(weaponType);
        if (!weapon) {
            return null;
        }
        
        // 무기 클래스가 발사체를 생성하고 초기 속도를 계산하도록 모든 정보를 전달합니다.
        // WeaponSystem은 더 이상 속도 계산 로직을 갖지 않습니다.
        const projectile = weapon.fire(position, rotation, vehicles, targetId);

        if (projectile) {
            this.projectiles.set(projectile.id, projectile);
            
            // 총알 생성 이벤트 발생 (shooterId 포함)
            if (this.eventEmitter) {
                this.eventEmitter.emit('bulletCreated', {
                    bullet: projectile.serialize(),
                    shooterId: playerId // shooterId 추가
                });
            }
        }

        return projectile;
    }

    /**
     * 발사체 업데이트
     */
    updateProjectiles(deltaTime, vehicles) {
        const toRemove = [];

        for (const [id, projectile] of this.projectiles) {
            // 미사일인 경우, 타겟 정보를 찾아서 update에 넘겨줌
            if (projectile.targetId && vehicles) {
                const targetVehicle = vehicles.find(v => v.id === projectile.targetId);
                projectile.update(deltaTime, targetVehicle);
            } else {
                projectile.update(deltaTime);
            }

            // 사거리 초과 또는 충돌 시 제거
            if (projectile.shouldDestroy()) {
                toRemove.push(id);
            }
        }

        // 제거할 발사체들 정리
        toRemove.forEach(id => {
            this.removeProjectile(id);
        });

        return toRemove;
    }

    /**
     * 충돌 검사
     */
    checkCollisions(vehicles, billboards, giftBoxes) {
        const collisions = [];

        for (const [projectileId, projectile] of this.projectiles) {
            if (!projectile.active) continue;

            // 차량과의 충돌 검사
            for (const vehicle of vehicles) {
                // 자신의 발사체는 제외
                if (vehicle.playerId === projectile.ownerId) continue;
                
                // 비활성 차량은 충돌 검사에서 제외
                if (!vehicle.active) continue;

                const distance = this.calculateDistance(projectile.position, vehicle.position);
                if (distance < 5) { // 충돌 반경
                    collisions.push({
                        type: 'vehicle',
                        projectileId,
                        targetId: vehicle.id,
                        damage: projectile.damage,
                        position: projectile.position,
                        ownerId: projectile.ownerId
                    });
                }
            }

            // 광고판과의 충돌 검사
            for (const billboard of billboards.values()) {
                if (this.checkBillboardCollision(projectile, billboard)) {
                    collisions.push({
                        type: 'billboard',
                        projectileId,
                        targetId: billboard.id,
                        damage: projectile.damage,
                        position: projectile.position,
                        ownerId: projectile.ownerId,
                        projectileType: projectile.type,
                    });
                }
            }

            // 선물 상자와의 충돌 검사
            if (giftBoxes) {
                for (const giftBox of giftBoxes) {
                    if (this.checkGiftBoxCollision(projectile, giftBox)) {
                        collisions.push({
                            type: 'giftBox',
                            projectileId,
                            targetId: giftBox.id,
                            damage: projectile.damage,
                            position: projectile.position,
                            ownerId: projectile.ownerId,
                            projectileType: projectile.type
                        });
                        // 충돌 시 루프를 멈춰 한 발사체가 여러 객체와 동시에 충돌하는 것을 방지
                        break; 
                    }
                }
            }

            if (!projectile.active) continue;
        }

        return collisions;
    }

    /**
     * 거리 계산
     */
    calculateDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    checkGiftBoxCollision(projectile, giftBox) {
        if (!projectile.position || !giftBox.position || !giftBox.active) {
            return false;
        }
        const distance = this.calculateDistance(projectile.position, giftBox.position);
        // 선물 상자 크기와 발사체 반경을 고려한 충돌 거리
        const minDistance = (giftBox.size / 2) + 0.5;
        return distance < minDistance;
    }

    /**
     * 광고판 충돌 검사
     */
    checkBillboardCollision(projectile, billboard) {
        if (!projectile.position || !billboard.position || !billboard.active) {
            return false;
        }

        const worldPosition = new THREE.Vector3();
        billboard.mesh.getWorldPosition(worldPosition);

        const localProjectilePos = new THREE.Vector3().copy(projectile.position);
        billboard.mesh.worldToLocal(localProjectilePos);

        const halfWidth = billboard.width / 2;
        const halfHeight = billboard.height / 2;
        const halfThickness = billboard.thickness / 2;

        return Math.abs(localProjectilePos.x) < halfWidth &&
               Math.abs(localProjectilePos.y) < halfHeight &&
               Math.abs(localProjectilePos.z) < halfThickness;
    }

    /**
     * 발사체 제거
     */
    removeProjectile(projectileId) {
        const projectile = this.projectiles.get(projectileId);
        if (projectile) {
            this.projectiles.delete(projectileId);
            
            // 총알 제거 이벤트 발생
            if (this.eventEmitter) {
                this.eventEmitter.emit('bulletDestroyed', {
                    bulletId: projectileId
                });
            }
            
            return true;
        }
        return false;
    }

    /**
     * 플레이어 무기 제거
     */
    removePlayerWeapons(playerId) {
        return this.weapons.delete(playerId);
    }

    /**
     * 모든 발사체 가져오기
     */
    getAllProjectiles() {
        return Array.from(this.projectiles.values());
    }

    /**
     * 플레이어 무기 정보 가져오기
     */
    getPlayerWeapons(playerId) {
        const playerWeapons = this.weapons.get(playerId);
        if (!playerWeapons) return {};

        const result = {};
        for (const [type, weapon] of playerWeapons) {
            result[type] = weapon.serialize();
        }
        return result;
    }

    /**
     * 시스템 상태 직렬화
     */
    serialize() {
        return {
            projectiles: this.getAllProjectiles().map(p => p.serialize()),
            weaponCount: this.weapons.size,
            projectileCount: this.projectiles.size
        };
    }

    /**
     * 특정 플레이어에게 미사일 탄약을 추가합니다.
     * @param {string} playerId 
     * @param {number} count 
     */
    addMissileAmmo(playerId, count) {
        const playerWeapons = this.weapons.get(playerId);
        const missileWeapon = playerWeapons?.get('missile');
        if (missileWeapon) {
            missileWeapon.ammo = Math.min(missileWeapon.maxAmmo, missileWeapon.ammo + count);
        }
    }
} 