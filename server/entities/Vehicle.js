const GameEntity = require('./GameEntity');

/**
 * 비행체 클래스 (Liskov Substitution Principle)
 * GameEntity를 확장하여 비행체 특화 기능 구현
 */
class Vehicle extends GameEntity {
    constructor(id, playerId, color, config) {
        super(id, 'vehicle');
        
        this.playerId = playerId;
        this.color = color;
        this.health = config.vehicles.health;
        this.maxHealth = config.vehicles.health;
        this.maxSpeed = config.vehicles.maxSpeed;
        this.acceleration = config.vehicles.acceleration;
        this.turnSpeed = config.vehicles.turnSpeed;
        this.rollSpeed = config.vehicles.rollSpeed;
        this.pitchSpeed = config.vehicles.pitchSpeed;
        this.yawSpeed = config.vehicles.yawSpeed;
        
        // 물리 속성
        this.thrust = 0;
        this.angularVelocity = { x: 0, y: 0, z: 0 };
        this.airResistance = config.physics.airResistance;
        this.groundFriction = config.physics.groundFriction;
        
        // 입력 상태
        this.inputs = {
            thrust: 0,      // -1 to 1
            pitch: 0,       // -1 to 1
            yaw: 0,         // -1 to 1
            roll: 0,        // -1 to 1
            vertical: 0,    // -1 to 1
            fire: false
        };
        
        // 무기 상태
        this.lastFireTime = 0;
        this.fireRate = config.weapons.machineGun.fireRate;
        
        // 스폰 위치 설정
        this.setRandomSpawnPosition();
    }

    /**
     * 랜덤 스폰 위치 설정
     */
    setRandomSpawnPosition() {
        const angle = Math.random() * Math.PI * 2;
        const distance = 50 + Math.random() * 100;
        
        this.position.x = Math.cos(angle) * distance;
        this.position.z = Math.sin(angle) * distance;
        this.position.y = 80 + Math.random() * 40; // 더 높은 고도에서 스폰 (80-120)
        
        this.rotation.y = angle + Math.PI; // 중앙을 향하도록
    }

    /**
     * 입력 업데이트
     */
    updateInputs(inputs) {
        this.inputs = { ...this.inputs, ...inputs };
    }

    /**
     * 비행체 물리 업데이트
     */
    updatePosition(deltaTime) {
        // 추력 적용
        const thrustForce = this.inputs.thrust * this.acceleration;
        
        // 전진 방향 계산 (뾰족한 부분이 앞쪽 +Z 방향)
        // Y축 회전(요)과 X축 회전(피치)을 고려
        const forward = {
            x: Math.sin(this.rotation.y) * Math.cos(this.rotation.x),
            y: -Math.sin(this.rotation.x), // 피치에 따른 상하 방향
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
        
        // 중력 제거 - 원래 게임에는 중력이 없었음
        // this.velocity.y += -9.81 * deltaTime;
        
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
        super.updatePosition(deltaTime);
        
        // 지형 충돌 검사 - 실제 지형 높이 계산
        const terrainHeight = this.getTerrainHeight(this.position.x, this.position.z);
        const minHeight = terrainHeight + 5; // 지형 위 최소 5 단위
        
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
            
        return Math.max(height, -5 + 1); // 물 레벨(-5) 위에만
    }

    /**
     * 회전 업데이트
     */
    updateRotation(deltaTime) {
        // 직접적인 회전 제어 (원래 게임 방식)
        // 각속도 대신 직접 회전값 변경
        
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
        
        // 롤 제한 (-π ~ π)
        this.rotation.z = Math.max(-Math.PI, Math.min(Math.PI, this.rotation.z));
        
        // 롤 자동 복원 (원래 게임처럼)
        if (this.inputs.roll === 0) {
            this.rotation.z *= 0.95; // 부드럽게 0으로 복원
        }
    }

    /**
     * 발사 가능 여부 확인
     */
    canFire() {
        const now = Date.now();
        const fireInterval = 1000 / this.fireRate;
        return (now - this.lastFireTime) >= fireInterval;
    }

    /**
     * 발사 실행
     */
    fire() {
        if (!this.canFire()) return null;
        
        this.lastFireTime = Date.now();
        
        // 총구 위치 계산 (비행체 앞쪽)
        const muzzleOffset = {
            x: Math.sin(this.rotation.y) * Math.cos(this.rotation.x) * 8,
            y: -Math.sin(this.rotation.x) * 8,
            z: Math.cos(this.rotation.y) * Math.cos(this.rotation.x) * 8
        };
        
        const muzzlePosition = {
            x: this.position.x + muzzleOffset.x,
            y: this.position.y + muzzleOffset.y,
            z: this.position.z + muzzleOffset.z
        };
        
        // 발사 방향 계산 (전진 방향과 동일)
        const direction = {
            x: Math.sin(this.rotation.y) * Math.cos(this.rotation.x),
            y: -Math.sin(this.rotation.x),
            z: Math.cos(this.rotation.y) * Math.cos(this.rotation.x)
        };
        
        return {
            position: muzzlePosition,
            direction: direction,
            shooterId: this.playerId
        };
    }

    /**
     * 데미지 적용
     */
    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.health = 0;
            this.destroy();
        }
        return this.health <= 0;
    }

    /**
     * 리스폰
     */
    respawn() {
        this.health = this.maxHealth;
        this.active = true;
        this.velocity = { x: 0, y: 0, z: 0 };
        this.angularVelocity = { x: 0, y: 0, z: 0 };
        this.setRandomSpawnPosition();
    }

    /**
     * 클라이언트 전송용 데이터
     */
    toClientData() {
        return {
            ...super.toClientData(),
            playerId: this.playerId,
            color: this.color,
            health: this.health,
            maxHealth: this.maxHealth,
            velocity: this.velocity,
            angularVelocity: this.angularVelocity
        };
    }
}

module.exports = Vehicle; 