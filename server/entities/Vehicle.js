import GameEntity from './GameEntity.js';

/**
 * 기본 비행체 클래스 (Liskov Substitution Principle)
 * GameEntity를 확장하여 비행체 특화 기능 구현
 */
export default class Vehicle extends GameEntity {
    constructor(id, playerId, spawnPosition, options = {}) {
        super(id, spawnPosition);
        
        this.playerId = playerId;
        this.color = options.color || '#ff0000';
        this.vehicleType = options.vehicleType || 'fighter';
        
        // 게임 설정 저장 (맵 경계 계산용)
        this.config = options.config || null;
        
        // 타입별 기본 설정
        const typeConfig = this.getTypeConfig(this.vehicleType);
        
        this.health = typeConfig.health;
        this.maxHealth = typeConfig.health;
        this.maxSpeed = typeConfig.maxSpeed;
        this.acceleration = typeConfig.acceleration;
        this.turnSpeed = typeConfig.turnSpeed;
        this.rollSpeed = typeConfig.rollSpeed;
        this.pitchSpeed = typeConfig.pitchSpeed;
        this.yawSpeed = typeConfig.yawSpeed;
        
        // 물리 속성
        this.thrust = 0;
        this.angularVelocity = { x: 0, y: 0, z: 0 };
        this.airResistance = 0.98;
        this.groundFriction = 0.9;
        
        // 입력 상태
        this.inputs = {
            thrust: 0,      // -1 to 1
            pitch: 0,       // -1 to 1
            yaw: 0,         // -1 to 1
            roll: 0,        // -1 to 1
            vertical: 0,    // -1 to 1
            fire: false
        };
        
        // 무기 상태 (WeaponSystem으로 이동됨)
        this.lastFireTime = 0;
        this.fireRate = typeConfig.fireRate;
        
        // 활성 상태
        this.active = true;
    }

    /**
     * 비행체 타입별 설정 가져오기
     */
    getTypeConfig(vehicleType) {
        const configs = {
            fighter: {
                health: 80,
                maxSpeed: 120,
                acceleration: 80,
                turnSpeed: 2.0,
                rollSpeed: 3.0,
                pitchSpeed: 2.0,
                yawSpeed: 2.0,
                fireRate: 100,
                bulletDamage: 10,
                bulletSpeed: 200,
                bulletRange: 300
            },
            heavy: {
                health: 150,
                maxSpeed: 80,
                acceleration: 50,
                turnSpeed: 1.5,
                rollSpeed: 2.0,
                pitchSpeed: 1.5,
                yawSpeed: 1.5,
                fireRate: 150,
                bulletDamage: 15,
                bulletSpeed: 180,
                bulletRange: 350
            }
        };
        
        return configs[vehicleType] || configs.fighter;
    }

    /**
     * 입력 처리
     */
    handleInput(inputs) {
        this.inputs = { ...this.inputs, ...inputs };
    }

    /**
     * 차량 업데이트
     */
    update(deltaTime) {
        if (!this.active) return;
        
        this.updateRotation(deltaTime);
        this.updatePosition(deltaTime);
    }

    /**
     * 비행체 물리 업데이트
     */
    updatePosition(deltaTime) {
        // 추력 적용
        const thrustForce = this.inputs.thrust * this.acceleration;
        
        // 전진 방향 계산 (뾰족한 부분이 앞쪽 +Z 방향)
        const forward = {
            x: Math.sin(this.rotation.y) * Math.cos(this.rotation.x),
            y: -Math.sin(this.rotation.x),
            z: Math.cos(this.rotation.y) * Math.cos(this.rotation.x)
        };
        
        // 추력을 속도에 적용
        this.velocity.x += forward.x * thrustForce * deltaTime;
        this.velocity.y += forward.y * thrustForce * deltaTime;
        this.velocity.z += forward.z * thrustForce * deltaTime;
        
        // 수직 이동 (상승/하강)
        this.velocity.y += this.inputs.vertical * this.acceleration * 0.5 * deltaTime;
        
        // 공기 저항 적용
        this.velocity.x *= this.airResistance;
        this.velocity.y *= this.airResistance;
        this.velocity.z *= this.airResistance;
        
        // 속도 제한
        const speed = Math.sqrt(
            this.velocity.x * this.velocity.x + 
            this.velocity.y * this.velocity.y + 
            this.velocity.z * this.velocity.z
        );
        
        if (speed > this.maxSpeed) {
            const factor = this.maxSpeed / speed;
            this.velocity.x *= factor;
            this.velocity.y *= factor;
            this.velocity.z *= factor;
        }
        
        // 위치 업데이트
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.position.z += this.velocity.z * deltaTime;
        
        // 맵 경계 제한 (config에서 월드 크기 가져오기)
        if (this.config && this.config.world) {
            const mapBoundary = this.config.world.size / 2; // 맵 크기의 절반
            const boundaryBuffer = this.config.world.boundaryBuffer || 10; // config에서 경계 여유 공간 가져오기
            
            // X축 경계 검사
            if (this.position.x > mapBoundary - boundaryBuffer) {
                this.position.x = mapBoundary - boundaryBuffer;
                this.velocity.x = Math.min(0, this.velocity.x); // 바깥쪽 속도 제거
            } else if (this.position.x < -mapBoundary + boundaryBuffer) {
                this.position.x = -mapBoundary + boundaryBuffer;
                this.velocity.x = Math.max(0, this.velocity.x); // 바깥쪽 속도 제거
            }
            
            // Z축 경계 검사
            if (this.position.z > mapBoundary - boundaryBuffer) {
                this.position.z = mapBoundary - boundaryBuffer;
                this.velocity.z = Math.min(0, this.velocity.z); // 바깥쪽 속도 제거
            } else if (this.position.z < -mapBoundary + boundaryBuffer) {
                this.position.z = -mapBoundary + boundaryBuffer;
                this.velocity.z = Math.max(0, this.velocity.z); // 바깥쪽 속도 제거
            }
            
            // Y축 경계 검사 (높이 제한)
            const maxHeight = this.config.world.maxHeight || 200; // config에서 최대 높이 가져오기
            if (this.position.y > maxHeight) {
                this.position.y = maxHeight;
                this.velocity.y = Math.min(0, this.velocity.y); // 위쪽 속도 제거
            }
        }
        
        // 지형 충돌 검사
        const terrainHeight = this.getTerrainHeight(this.position.x, this.position.z);
        const minHeight = terrainHeight + 5;
        
        if (this.position.y < minHeight) {
            this.position.y = minHeight;
            this.velocity.y = Math.max(0, this.velocity.y);
        }
    }

    /**
     * 지형 높이 계산 (클라이언트와 동일)
     */
    getTerrainHeight(x, z) {
        const height = 
            Math.sin(x * 0.008) * 25 +
            Math.cos(z * 0.008) * 25 +
            Math.sin(x * 0.015) * 15 +
            Math.cos(z * 0.015) * 15 +
            Math.sin(x * 0.03) * 8 +
            Math.cos(z * 0.03) * 8 +
            Math.sin(x * 0.05) * 4 +
            Math.cos(z * 0.05) * 4;
            
        return Math.max(height, -4); // 물 레벨 위에만
    }

    /**
     * 회전 업데이트
     */
    updateRotation(deltaTime) {
        // 피치 (W/S): 기수 위아래 - X축 회전
        this.rotation.x += this.inputs.pitch * this.pitchSpeed * deltaTime;
        
        // 요 (A/D): 좌우 회전 - Y축 회전  
        this.rotation.y += this.inputs.yaw * this.yawSpeed * deltaTime;
        
        // 롤 (Q/E): 좌우 기울어짐 - Z축 회전
        this.rotation.z += this.inputs.roll * this.rollSpeed * deltaTime;
        
        // 피치 제한 (-90도 ~ 90도)
        this.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.rotation.x));
        
        // 요 각도 정규화 (-π ~ π)
        while (this.rotation.y > Math.PI) {
            this.rotation.y -= Math.PI * 2;
        }
        while (this.rotation.y < -Math.PI) {
            this.rotation.y += Math.PI * 2;
        }
        
        // 롤 제한 (-45도 ~ 45도)
        this.rotation.z = Math.max(-Math.PI/4, Math.min(Math.PI/4, this.rotation.z));
    }

    /**
     * 데미지 받기
     */
    takeDamage(damage) {
        if (!this.active) return false;
        
        this.health -= damage;
        
        if (this.health <= 0) {
            this.health = 0;
            this.active = false;
            return true; // 파괴됨
        }
        
        return false;
    }

    /**
     * 리스폰
     */
    respawn(spawnPosition = null) {
        if (spawnPosition) {
            this.position = { ...spawnPosition };
        } else {
            // 랜덤 스폰 위치 (config에서 값 가져오기)
            const angle = Math.random() * Math.PI * 2;
            const minDistance = this.config?.world?.spawnDistance?.min || 50;
            const maxDistance = this.config?.world?.spawnDistance?.max || 150;
            const distance = minDistance + Math.random() * (maxDistance - minDistance);
            
            this.position.x = Math.cos(angle) * distance;
            this.position.z = Math.sin(angle) * distance;
            
            const minHeight = this.config?.world?.spawnHeight?.min || 80;
            const maxHeight = this.config?.world?.spawnHeight?.max || 120;
            this.position.y = minHeight + Math.random() * (maxHeight - minHeight);
        }
        
        this.rotation = { x: 0, y: 0, z: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.health = this.maxHealth;
        this.active = true;
    }

    /**
     * 직렬화
     */
    serialize() {
        return {
            id: this.id,
            playerId: this.playerId,
            position: this.position,
            rotation: this.rotation,
            velocity: this.velocity,
            health: this.health,
            maxHealth: this.maxHealth,
            color: this.color,
            vehicleType: this.vehicleType,
            active: this.active,
            timestamp: Date.now()
        };
    }
} 