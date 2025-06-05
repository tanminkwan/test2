/**
 * 기본 게임 엔티티 클래스 (Single Responsibility Principle)
 * 모든 게임 오브젝트의 기본 속성과 동작을 정의
 */
class GameEntity {
    constructor(id, type, position = { x: 0, y: 0, z: 0 }) {
        this.id = id;
        this.type = type;
        this.position = { ...position };
        this.rotation = { x: 0, y: 0, z: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.scale = { x: 1, y: 1, z: 1 };
        this.active = true;
        this.createdAt = Date.now();
        this.lastUpdated = Date.now();
    }

    /**
     * 엔티티 업데이트 (Template Method Pattern)
     */
    update(deltaTime) {
        if (!this.active) return;
        
        this.beforeUpdate(deltaTime);
        this.updatePosition(deltaTime);
        this.updateRotation(deltaTime);
        this.afterUpdate(deltaTime);
        
        this.lastUpdated = Date.now();
    }

    /**
     * 위치 업데이트
     */
    updatePosition(deltaTime) {
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.position.z += this.velocity.z * deltaTime;
    }

    /**
     * 회전 업데이트 (기본 구현)
     */
    updateRotation(deltaTime) {
        // 기본적으로는 아무것도 하지 않음
        // 하위 클래스에서 오버라이드
    }

    /**
     * 업데이트 전 처리 (Hook Method)
     */
    beforeUpdate(deltaTime) {
        // 하위 클래스에서 구현
    }

    /**
     * 업데이트 후 처리 (Hook Method)
     */
    afterUpdate(deltaTime) {
        // 하위 클래스에서 구현
    }

    /**
     * 엔티티 제거
     */
    destroy() {
        this.active = false;
    }

    /**
     * 클라이언트 전송용 데이터 생성
     */
    toClientData() {
        return {
            id: this.id,
            type: this.type,
            position: this.position,
            rotation: this.rotation,
            scale: this.scale,
            active: this.active
        };
    }

    /**
     * 다른 엔티티와의 거리 계산
     */
    distanceTo(other) {
        const dx = this.position.x - other.position.x;
        const dy = this.position.y - other.position.y;
        const dz = this.position.z - other.position.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * 경계 박스 충돌 검사
     */
    intersects(other, radius1 = 5, radius2 = 5) {
        return this.distanceTo(other) < (radius1 + radius2);
    }
}

module.exports = GameEntity; 