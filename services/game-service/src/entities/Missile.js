import GameEntity from './GameEntity.js';
import * as THREE from 'three';

/**
 * 유도 미사일 클래스
 * 타겟을 추적하는 발사체
 */
export default class Missile extends GameEntity {
    constructor(id, ownerId, position, initialVelocity, targetId, options = {}) {
        super(id, position);
        
        this.ownerId = ownerId;
        this.targetId = targetId;
        this.velocity.set(initialVelocity.x, initialVelocity.y, initialVelocity.z);
        
        const missileConfig = options.config?.weapons?.missile || {};
        
        this.damage = options.damage || missileConfig.damage || 30;
        this.speed = options.speed || missileConfig.speed || 150;
        this.range = options.range || missileConfig.range || 600;
        this.trackingPower = options.trackingPower || missileConfig.trackingPower || 2.0;
        this.maxTurnRate = options.maxTurnRate || missileConfig.maxTurnRate || 0.08;
        this.lifeTime = options.lifeTime || missileConfig.lifeTime || 6000;
        this.armingTime = options.armingTime || missileConfig.armingTime || 300;
        this.directHitDistance = missileConfig.directHitDistance || 15;

        this.distanceTraveled = 0;
        this.createdAt = Date.now();
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
                // 타겟과의 거리를 확인
                const distanceToTarget = this.position.distanceTo(targetVehicle.position);

                // "근접 신관" 로직: 타겟이 너무 가까우면 유도를 멈추고 직진
                if (distanceToTarget > this.directHitDistance) {
                    this.trackTarget(targetVehicle, deltaTime);
                }
            }
        }
        
        // 이동 거리 계산 (속도 벡터의 길이를 사용)
        this.distanceTraveled += this.velocity.length() * deltaTime;
        
        // 위치 업데이트 (부모 클래스 GameEntity의 updatePosition 사용)
        super.updatePosition(deltaTime);
        
        // 사거리 초과 또는 유효 시간 초과 시 제거
        if (this.distanceTraveled > this.range || Date.now() - this.createdAt > this.lifeTime) {
            this.destroy();
        }
    }
    
    /**
     * 타겟 추적 로직 (단순화 및 개선)
     * @param {Vehicle} targetVehicle - 추적할 타겟 차량
     * @param {number} deltaTime - 프레임 시간
     */
    trackTarget(targetVehicle, deltaTime) {
        // 1. 타겟 방향 벡터 계산
        const directionToTarget = new THREE.Vector3().subVectors(targetVehicle.position, this.position).normalize();

        // 2. 현재 속도 방향(진행 방향)을 정규화
        const currentDirection = this.velocity.clone().normalize();
        
        // 3. 현재 방향에서 목표 방향으로 점진적으로 회전 (보간)
        // lerp는 두 벡터 사이를 선형 보간합니다. trackingPower가 클수록 더 빨리 방향을 바꿉니다.
        currentDirection.lerp(directionToTarget, this.trackingPower * deltaTime);

        // 4. 새로운 속도 벡터 계산 및 적용
        this.velocity.copy(currentDirection).multiplyScalar(this.speed);
    }

    /**
     * 파괴 여부 확인
     */
    shouldDestroy() {
        return !this.active || this.distanceTraveled > this.range;
    }

    /**
     * 직렬화
     */
    serialize() {
        return {
            ...super.serialize(),
            ownerId: this.ownerId,
            targetId: this.targetId,
            damage: this.damage,
            speed: this.speed,
            range: this.range,
            distanceTraveled: this.distanceTraveled,
            type: 'missile'
        };
    }
} 