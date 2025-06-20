import GameEntity from './GameEntity.js';
import * as THREE from 'three';

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
            fire: false,    // 기관총 발사
            fireMissile: false, // 미사일 발사
            targetId: null  // 미사일 타겟 ID
        };
        
        // 무기 상태 (WeaponSystem으로 이동됨)
        this.lastFireTime = 0;
        this.fireRate = typeConfig.fireRate;
        
        // 활성 상태
        this.active = true;
        this.visible = true; // 가시성 상태 (기본적으로 보임)

        // Raycasting을 위한 간단한 메쉬 및 경계 상자
        this.geometry = new THREE.BoxGeometry(10, 5, 15); // 비행기 크기에 맞는 박스
        this.material = new THREE.MeshBasicMaterial(); // 서버에서는 재질이 필요 없음
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.updateMesh();
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
            },
            test: {
                health: 20,  // 매우 낮은 체력 (총알 2발로 파괴)
                maxSpeed: 100,
                acceleration: 60,
                turnSpeed: 2.5,
                rollSpeed: 3.5,
                pitchSpeed: 2.5,
                yawSpeed: 2.5,
                fireRate: 80,
                bulletDamage: 8,
                bulletSpeed: 220,
                bulletRange: 280
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
        this.updateMesh();
    }

    /**
     * 메쉬 위치와 회전을 현재 비행체 상태와 동기화
     */
    updateMesh() {
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
            this.mesh.updateMatrixWorld(); // 월드 매트릭스 업데이트
        }
    }

    /**
     * 비행체 물리 업데이트
     */
    updatePosition(deltaTime) {
        // 추력 적용
        const thrustForce = this.inputs.thrust * this.acceleration;
        
        // 전진 방향 계산 (Quaternion 기반으로 변경)
        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(this.mesh.quaternion);
        
        // 추력을 속도에 적용
        this.velocity.addScaledVector(forward, thrustForce * deltaTime);
        
        // 수직 이동 (상승/하강)
        this.velocity.y += this.inputs.vertical * this.acceleration * 0.5 * deltaTime;
        
        // 공기 저항 적용
        this.velocity.multiplyScalar(this.airResistance);
        
        // 속도 제한
        if (this.velocity.lengthSq() > this.maxSpeed * this.maxSpeed) {
            this.velocity.normalize().multiplyScalar(this.maxSpeed);
        }
        
        // 위치 업데이트 (부모 클래스가 처리)
        super.updatePosition(deltaTime);
        
        // 맵 경계 제한
        if (this.config && this.config.world) {
            const mapBoundary = this.config.world.size / 2;
            const boundaryBuffer = this.config.world.boundaryBuffer || 10;
            
            this.position.x = Math.max(-mapBoundary + boundaryBuffer, Math.min(mapBoundary - boundaryBuffer, this.position.x));
            this.position.z = Math.max(-mapBoundary + boundaryBuffer, Math.min(mapBoundary - boundaryBuffer, this.position.z));
            
            const maxHeight = this.config.world.maxHeight || 200;
            this.position.y = Math.min(maxHeight, this.position.y);
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
     * 데미지 처리
     */
    takeDamage(damage) {
        if (!this.active) return false;
        
        this.health -= damage;
        
        if (this.health <= 0) {
            this.health = 0;
            this.active = false;
            return true; // 파괴됨
        }
        
        return false; // 파괴되지 않음
    }

    /**
     * 리스폰
     */
    respawn(spawnPosition = null) {
        if (spawnPosition) {
            this.position.set(spawnPosition.x, spawnPosition.y, spawnPosition.z);
        } else {
            // 랜덤 스폰 위치 (config에서 값 가져오기)
            const angle = Math.random() * Math.PI * 2;
            const minDistance = this.config?.world?.spawnDistance?.min || 50;
            const maxDistance = this.config?.world?.spawnDistance?.max || 150;
            const distance = minDistance + Math.random() * (maxDistance - minDistance);
            
            const minHeight = this.config?.world?.spawnHeight?.min || 80;
            const maxHeight = this.config?.world?.spawnHeight?.max || 120;

            this.position.set(
                Math.cos(angle) * distance,
                minHeight + Math.random() * (maxHeight - minHeight),
                Math.sin(angle) * distance
            );
        }
        
        this.rotation = { x: 0, y: 0, z: 0 };
        this.velocity.set(0, 0, 0);
        this.health = this.maxHealth;
        this.active = true;
        this.visible = true; // 리스폰 시 다시 보이게
    }

    /**
     * 직렬화
     */
    serialize() {
        return {
            id: this.id,
            playerId: this.playerId,
            position: { x: this.position.x, y: this.position.y, z: this.position.z },
            rotation: this.rotation,
            velocity: { x: this.velocity.x, y: this.velocity.y, z: this.velocity.z },
            health: this.health,
            maxHealth: this.maxHealth,
            color: this.color,
            vehicleType: this.vehicleType,
            active: this.active,
            visible: this.visible,
            timestamp: Date.now()
        };
    }
} 