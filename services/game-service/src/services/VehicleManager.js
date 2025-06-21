import { v4 as uuidv4 } from 'uuid';

/**
 * 차량(Vehicle)의 생성, 제거, 업데이트 등 생명주기를 관리하는 클래스
 */
export class VehicleManager {
    constructor(config, eventEmitter, vehicleFactory, terrainManager) {
        this.config = config;
        this.eventEmitter = eventEmitter;
        this.vehicleFactory = vehicleFactory;
        this.terrainManager = terrainManager;

        this.vehicles = new Map();
    }

    /**
     * 특정 플레이어를 위한 차량을 생성합니다.
     * @param {string} playerId 
     * @param {string} vehicleType 
     * @param {string} color 
     * @returns {Vehicle}
     */
    createVehicleForPlayer(playerId, vehicleType, color) {
        const vehicleId = uuidv4();
        const spawnPosition = this.getSpawnPosition();
        
        const vehicle = this.vehicleFactory.createVehicle(vehicleId, playerId, spawnPosition, {
            color: color,
            vehicleType: vehicleType,
            config: this.config
        });

        this.vehicles.set(vehicleId, vehicle);
        console.log(`[VehicleManager] Created ${vehicleType} for player ${playerId}`);
        
        return vehicle;
    }

    /**
     * 특정 플레이어의 차량을 제거합니다.
     * @param {string} playerId 
     */
    removeVehicleForPlayer(playerId) {
        for (const [vehicleId, vehicle] of this.vehicles) {
            if (vehicle.playerId === playerId) {
                this.vehicles.delete(vehicleId);
                console.log(`[VehicleManager] Removed vehicle for player ${playerId}`);
                break;
            }
        }
    }

    /**
     * 파괴된 차량을 리스폰시킵니다.
     * @param {Vehicle} vehicle 
     */
    respawnVehicle(vehicle) {
        const spawnPosition = this.getSpawnPosition();
        vehicle.respawn(spawnPosition);
        
        this.eventEmitter.emit('vehicleRespawned', {
            vehicle: vehicle.serialize(),
            shouldShow: true 
        });
        console.log(`[VehicleManager] Respawned vehicle for player ${vehicle.playerId}`);
    }

    /**
     * 모든 차량의 상태를 업데이트합니다.
     * @param {number} deltaTime 
     */
    update(deltaTime) {
        for (const vehicle of this.vehicles.values()) {
            vehicle.update(deltaTime);
        }
    }
    
    getSpawnPosition() {
        const angle = Math.random() * Math.PI * 2;
        const minDistance = this.config.world?.spawnDistance?.min || 50;
        const maxDistance = this.config.world?.spawnDistance?.max || 150;
        const distance = minDistance + Math.random() * (maxDistance - minDistance);
        
        const minHeight = this.config.world?.spawnHeight?.min || 50;
        const maxHeight = this.config.world?.spawnHeight?.max || 70;
        
        return {
            x: Math.cos(angle) * distance,
            y: minHeight + Math.random() * (maxHeight - minHeight),
            z: Math.sin(angle) * distance
        };
    }

    getPlayerVehicle(playerId) {
        for (const vehicle of this.vehicles.values()) {
            if (vehicle.playerId === playerId) {
                return vehicle;
            }
        }
        return null;
    }

    getVehicle(vehicleId) {
        return this.vehicles.get(vehicleId);
    }
    
    getAllVehicles() {
        return Array.from(this.vehicles.values());
    }
} 