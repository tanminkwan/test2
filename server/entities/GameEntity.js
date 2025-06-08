/**
 * 기본 게임 엔티티 클래스 (Single Responsibility Principle)
 * 모든 게임 오브젝트의 기본 속성과 동작을 정의
 */
export default class GameEntity {
    constructor(id, position = { x: 0, y: 0, z: 0 }) {
        this.id = id;
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
     * 직렬화
     */
    serialize() {
        return {
            id: this.id,
            position: this.position,
            rotation: this.rotation,
            velocity: this.velocity,
            scale: this.scale,
            active: this.active,
            createdAt: this.createdAt,
            lastUpdated: this.lastUpdated
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
     * 다른 엔티티와의 충돌 검사 (구형 충돌)
     */
    intersects(other, radius1 = null, radius2 = null) {
        if (!other) return false;
        
        // config에서 기본 충돌 반지름 가져오기 (없으면 5 사용)
        const defaultRadius = this.config?.physics?.collisionRadius || 5;
        
        const r1 = radius1 !== null ? radius1 : defaultRadius;
        const r2 = radius2 !== null ? radius2 : defaultRadius;
        
        const dx = this.position.x - other.position.x;
        const dy = this.position.y - other.position.y;
        const dz = this.position.z - other.position.z;
        
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        return distance < (r1 + r2);
    }
} 