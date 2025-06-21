import * as THREE from 'three';

/**
 * 기본 게임 엔티티 클래스 (Single Responsibility Principle)
 * 모든 게임 오브젝트의 기본 속성과 동작을 정의
 */
export default class GameEntity {
    constructor(id, position = { x: 0, y: 0, z: 0 }) {
        this.id = id;
        this.position = new THREE.Vector3(position.x, position.y, position.z);
        this.rotation = { x: 0, y: 0, z: 0 };
        this.velocity = new THREE.Vector3();
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
        this.position.addScaledVector(this.velocity, deltaTime);
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
            position: { x: this.position.x, y: this.position.y, z: this.position.z },
            rotation: this.rotation,
            velocity: { x: this.velocity.x, y: this.velocity.y, z: this.velocity.z },
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
        return this.position.distanceTo(other.position);
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
        
        const distance = this.position.distanceTo(other.position);
        return distance < (r1 + r2);
    }
} 