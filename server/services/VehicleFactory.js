import Vehicle from '../entities/Vehicle.js';

/**
 * Vehicle Factory 클래스 (Factory Pattern + Open/Closed Principle)
 * 새로운 비행체 타입을 쉽게 추가할 수 있도록 설계
 */
export class VehicleFactory {
    constructor(config) {
        this.config = config;
        this.vehicleTypes = new Map();
        
        // 기본 비행체 타입들 등록
        this.registerVehicleType('fighter', this.createFighter.bind(this));
        this.registerVehicleType('heavy', this.createHeavy.bind(this));
        this.registerVehicleType('test', this.createTest.bind(this));
    }

    /**
     * 새로운 비행체 타입 등록 (확장성)
     */
    registerVehicleType(type, creatorFunction) {
        this.vehicleTypes.set(type, creatorFunction);
    }

    /**
     * 비행체 생성 (Factory Method)
     */
    createVehicle(id, playerId, spawnPosition, options = {}) {
        const vehicleType = options.vehicleType || 'fighter';
        const creator = this.vehicleTypes.get(vehicleType);
        
        if (!creator) {
            console.warn(`Unknown vehicle type: ${vehicleType}, using fighter as default`);
            return this.createFighter(id, playerId, spawnPosition, options);
        }
        
        return creator(id, playerId, spawnPosition, options);
    }

    /**
     * 전투기 생성
     */
    createFighter(id, playerId, spawnPosition, options) {
        return new Vehicle(id, playerId, spawnPosition, {
            ...options,
            vehicleType: 'fighter',
            config: this.config
        });
    }

    /**
     * 중형기 생성
     */
    createHeavy(id, playerId, spawnPosition, options) {
        return new Vehicle(id, playerId, spawnPosition, {
            ...options,
            vehicleType: 'heavy',
            config: this.config
        });
    }

    /**
     * 테스트기 생성
     */
    createTest(id, playerId, spawnPosition, options) {
        return new Vehicle(id, playerId, spawnPosition, {
            ...options,
            vehicleType: 'test',
            config: this.config
        });
    }

    /**
     * 사용 가능한 비행체 타입 목록
     */
    getAvailableTypes() {
        return Array.from(this.vehicleTypes.keys());
    }

    /**
     * 비행체 타입 설정 가져오기
     */
    getVehicleTypeConfig(vehicleType) {
        const vehicleConfig = this.config.vehicles?.[vehicleType];
        if (!vehicleConfig) {
            console.warn(`No config found for vehicle type: ${vehicleType}`);
            return this.config.vehicles?.fighter || {};
        }
        return vehicleConfig;
    }
} 