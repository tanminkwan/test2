const GameEntity = require('./GameEntity');

/**
 * 총알 클래스
 * GameEntity를 확장하여 총알 특화 기능 구현
 */
class Bullet extends GameEntity {
    constructor(id, position, direction, shooterId, config) {
        super(id, 'bullet', position);
        
        this.shooterId = shooterId;
        this.damage = config.weapons.machineGun.damage;
        this.speed = config.weapons.machineGun.bulletSpeed;
        this.range = config.weapons.machineGun.range;
        this.lifetime = config.weapons.machineGun.bulletLifetime;
        this.startPosition = { ...position };
        
        // 방향에 따른 속도 설정
        this.velocity.x = direction.x * this.speed;
        this.velocity.y = direction.y * this.speed;
        this.velocity.z = direction.z * this.speed;
        
        // 회전을 방향에 맞게 설정
        this.rotation.y = Math.atan2(direction.x, direction.z);
        this.rotation.x = -Math.asin(direction.y);
    }

    /**
     * 총알 업데이트
     */
    afterUpdate(deltaTime) {
        // 생존 시간 체크
        const age = (Date.now() - this.createdAt) / 1000;
        if (age > this.lifetime) {
            this.destroy();
            return;
        }
        
        // 사거리 체크
        const distance = this.distanceFromStart();
        if (distance > this.range) {
            this.destroy();
            return;
        }
        
        // 지형 충돌 체크 (간단한 높이 체크)
        if (this.position.y < 0) {
            this.destroy();
        }
    }

    /**
     * 시작 위치로부터의 거리 계산
     */
    distanceFromStart() {
        const dx = this.position.x - this.startPosition.x;
        const dy = this.position.y - this.startPosition.y;
        const dz = this.position.z - this.startPosition.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * 클라이언트 전송용 데이터
     */
    toClientData() {
        return {
            ...super.toClientData(),
            shooterId: this.shooterId,
            damage: this.damage
        };
    }
}

module.exports = Bullet; 