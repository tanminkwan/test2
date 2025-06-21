/**
 * 게임 내 모든 충돌 감지 및 처리를 담당하는 시스템
 */
export class CollisionSystem {
    constructor(config, eventEmitter, weaponSystem) {
        this.config = config;
        this.eventEmitter = eventEmitter;
        this.weaponSystem = weaponSystem;

        // 이벤트 리스너 등록
        this.eventEmitter.on('vehicleDestroyed', this.handleVehicleDestroyed.bind(this));
    }

    /**
     * 매 프레임 충돌을 검사하고 처리합니다.
     * @param {Array<Vehicle>} vehicles 
     * @param {Map<string, Billboard>} billboards 
     */
    update(vehicles, billboards) {
        // 1. 발사체와 다른 엔티티들 간의 충돌 검사
        const projectileCollisions = this.weaponSystem.checkCollisions(vehicles, billboards);
        for (const collision of projectileCollisions) {
            this.handleProjectileCollision(collision);
        }

        // 2. 차량과 광고판 간의 충돌 검사
        for (const vehicle of vehicles) {
            for (const billboard of billboards.values()) {
                if (billboard.checkCollision(vehicle)) {
                    this.resolveVehicleBillboardCollision(vehicle, billboard);
                }
            }
        }
    }

    /**
     * 발사체 충돌 처리
     * @param {object} collision 
     */
    handleProjectileCollision(collision) {
        if (collision.type === 'vehicle') {
            this.eventEmitter.emit('vehicleHit', collision);
        } else if (collision.type === 'billboard') {
            this.eventEmitter.emit('billboardHit', collision);
        }
        
        this.weaponSystem.removeProjectile(collision.projectileId);
    }

    /**
     * 차량-광고판 충돌 해결
     * @param {Vehicle} vehicle 
     * @param {Billboard} billboard 
     */
    resolveVehicleBillboardCollision(vehicle, billboard) {
        const dx = vehicle.position.x - billboard.position.x;
        const dy = vehicle.position.y - billboard.position.y;
        const dz = vehicle.position.z - billboard.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance > 0) {
            const normalX = dx / distance;
            const normalY = dy / distance;
            const normalZ = dz / distance;

            const safeDistance = (Math.max(billboard.width, billboard.height, billboard.thickness) / 2) + 
                                 (this.config.collision?.safeDistance || 15);

            vehicle.position.x = billboard.position.x + normalX * safeDistance;
            vehicle.position.y = billboard.position.y + normalY * safeDistance;
            vehicle.position.z = billboard.position.z + normalZ * safeDistance;

            const velocityMagnitude = vehicle.velocity.length();
            const velocityReflection = this.config.collision?.velocityReflection || 0.5;

            vehicle.velocity.x = normalX * velocityMagnitude * velocityReflection;
            vehicle.velocity.y = normalY * velocityMagnitude * velocityReflection;
            vehicle.velocity.z = normalZ * velocityMagnitude * velocityReflection;

            this.eventEmitter.emit('createEffect', { type: 'impact', position: vehicle.position, effectType: 'collision' });
        }
    }

    /**
     * 차량 파괴 이벤트 핸들러 (점수 계산 등)
     * @param {object} data 
     */
    handleVehicleDestroyed(data) {
        // 이 부분은 PlayerManager로 이동할 수도 있음
        // console.log(`[CollisionSystem] Vehicle ${data.vehicleId} destroyed.`);
    }
} 