import { MachineGun } from '../entities/weapons/MachineGun.js';

/**
 * 무기 시스템 서비스 (Single Responsibility Principle)
 * 무기 관련 로직만 담당
 */
export class WeaponSystem {
    constructor() {
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
        
        let weapon;
        switch (weaponType) {
            case 'machinegun':
                weapon = new MachineGun(weaponId, playerId, config);
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
    fireWeapon(playerId, weaponType, position, rotation, targetId = null) {
        const playerWeapons = this.weapons.get(playerId);
        if (!playerWeapons) {
            return null;
        }

        const weapon = playerWeapons.get(weaponType);
        if (!weapon) {
            return null;
        }

        const projectile = weapon.fire(position, rotation, targetId);
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
    updateProjectiles(deltaTime) {
        const toRemove = [];

        for (const [id, projectile] of this.projectiles) {
            projectile.update(deltaTime);

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
    checkCollisions(vehicles, billboards) {
        const collisions = [];

        for (const [projectileId, projectile] of this.projectiles) {
            // 차량과의 충돌 검사
            for (const [vehicleId, vehicle] of vehicles) {
                if (vehicle.playerId === projectile.ownerId) continue; // 자신의 발사체는 제외

                const distance = this.calculateDistance(projectile.position, vehicle.position);
                if (distance < 5) { // 충돌 반경
                    collisions.push({
                        type: 'vehicle',
                        projectileId,
                        targetId: vehicleId,
                        damage: projectile.damage,
                        position: projectile.position,
                        ownerId: projectile.ownerId
                    });
                }
            }

            // 광고판과의 충돌 검사
            for (const [billboardId, billboard] of billboards) {
                if (this.checkBillboardCollision(projectile, billboard)) {
                    collisions.push({
                        type: 'billboard',
                        projectileId,
                        targetId: billboardId,
                        damage: projectile.damage,
                        position: projectile.position,
                        ownerId: projectile.ownerId
                    });
                }
            }
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

    /**
     * 광고판 충돌 검사
     */
    checkBillboardCollision(projectile, billboard) {
        const dx = projectile.position.x - billboard.position.x;
        const dy = projectile.position.y - billboard.position.y;
        const dz = projectile.position.z - billboard.position.z;
        
        // 광고판 크기 고려한 충돌 검사
        return Math.abs(dx) < billboard.width / 2 && 
               Math.abs(dy) < billboard.height / 2 && 
               Math.abs(dz) < billboard.thickness / 2;
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
} 