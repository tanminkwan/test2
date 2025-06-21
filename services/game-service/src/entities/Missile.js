import Projectile from './Projectile.js';
import * as THREE from 'three';

/**
 * 유도 미사일 클래스
 * 타겟을 추적하는 발사체
 */
export default class Missile extends Projectile {
    constructor(id, ownerId, position, initialVelocity, targetId, options = {}) {
        // Projectile의 생성자 호출
        super(id, ownerId, position, initialVelocity, {
            damage: options.config?.weapons?.missile?.damage || 30,
            range: options.config?.weapons?.missile?.range || 600,
            lifeTime: options.config?.weapons?.missile?.lifeTime || 6000
        });
        
        this.targetId = targetId;
        
        const missileConfig = options.config?.weapons?.missile || {};
        
        this.speed = options.speed || missileConfig.speed || 150;
        this.trackingPower = options.trackingPower || missileConfig.trackingPower || 2.0;
        this.armingTime = options.armingTime || missileConfig.armingTime || 300;
        this.directHitDistance = missileConfig.directHitDistance || 15;
    }

    /**
     * 미사일 업데이트 - 유도 기능 추가
     * @param {number} deltaTime - 프레임 시간
     * @param {Vehicle} [targetVehicle] - 추적할 타겟 차량 객체 (선택 사항)
     */
    update(deltaTime, targetVehicle) {
        if (!this.active) return;
        
        // Arming Time (활성화 시간) 체크
        const timeSinceCreation = Date.now() - this.createdAt;
        if (timeSinceCreation > this.armingTime) {
            if (targetVehicle && targetVehicle.active) {
                const distanceToTarget = this.position.distanceTo(targetVehicle.position);

                if (distanceToTarget > this.directHitDistance) {
                    this.trackTarget(targetVehicle, deltaTime);
                }
            }
        }
        
        // 이동 거리 및 위치 업데이트 (부모 Projectile의 update 사용)
        super.update(deltaTime);
    }
    
    /**
     * 타겟 추적 로직 (단순화 및 개선)
     * @param {Vehicle} targetVehicle - 추적할 타겟 차량
     * @param {number} deltaTime - 프레임 시간
     */
    trackTarget(targetVehicle, deltaTime) {
        // 1. 현재 방향과 목표 방향의 단위 벡터를 계산
        const currentDirection = this.velocity.clone().normalize();
        const targetDirection = new THREE.Vector3().subVectors(targetVehicle.position, this.position).normalize();

        // 2. lerp를 사용하여 현재 방향을 목표 방향으로 점진적으로 보간
        // trackingPower가 클수록 더 빨리 방향을 바꿉니다.
        currentDirection.lerp(targetDirection, this.trackingPower * deltaTime);

        // 3. 보간된 새로운 방향으로 속도 벡터를 업데이트
        this.velocity.copy(currentDirection).multiplyScalar(this.speed);
    }

    /**
     * 직렬화
     */
    serialize() {
        return {
            ...super.serialize(),
            targetId: this.targetId,
            speed: this.speed,
            type: 'missile'
        };
    }
} 