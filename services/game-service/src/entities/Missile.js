import GameEntity from './GameEntity.js';

/**
 * 유도 미사일 클래스
 * 타겟을 추적하는 발사체
 */
export default class Missile extends GameEntity {
    constructor(id, ownerId, position, initialVelocity, targetId, config = {}) {
        super(id, position);
        
        this.ownerId = ownerId;
        this.targetId = targetId;
        this.velocity = { ...initialVelocity };
        this.damage = config.damage || 30;
        this.speed = config.speed || 150;
        this.range = config.range || 600;
        
        // 기본 설정값 (아직 실제 추적 기능은 구현하지 않음)
        this.trackingPower = config.trackingPower || 2.0;
        this.maxTurnRate = config.maxTurnRate || 0.08;
        
        this.distanceTraveled = 0;
        this.startPosition = { ...position };
        this.createdAt = Date.now();
        this.lifeTime = config.lifeTime || 6000;
        this.armingTime = config.armingTime || 300;
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
            // 타겟이 있고, 타겟이 활성화 상태일 때만 유도 로직 실행
            if (targetVehicle && targetVehicle.active) {
                this.trackTarget(targetVehicle, deltaTime);
            }
        }
        
        // 이전 위치 저장
        const prevPosition = { ...this.position };
        
        // 위치 업데이트 (직선 이동)
        super.updatePosition(deltaTime);
        
        // 이동 거리 계산
        const dx = this.position.x - prevPosition.x;
        const dy = this.position.y - prevPosition.y;
        const dz = this.position.z - prevPosition.z;
        this.distanceTraveled += Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // 사거리 초과 또는 유효 시간 초과 시 제거
        if (this.distanceTraveled > this.range || Date.now() - this.createdAt > this.lifeTime) {
            this.destroy();
        }
    }
    
    /**
     * 타겟 추적 로직
     * @param {Vehicle} targetVehicle - 추적할 타겟 차량
     * @param {number} deltaTime - 프레임 시간
     */
    trackTarget(targetVehicle, deltaTime) {
        const targetPosition = targetVehicle.position;
        
        // 1. 타겟 방향 벡터 계산
        const directionToTarget = {
            x: targetPosition.x - this.position.x,
            y: targetPosition.y - this.position.y,
            z: targetPosition.z - this.position.z
        };
        const magnitude = Math.sqrt(directionToTarget.x**2 + directionToTarget.y**2 + directionToTarget.z**2);
        
        if (magnitude < 0.001) return; // 이미 타겟에 도달했거나 너무 가까움
        
        // 타겟 방향 벡터 정규화
        directionToTarget.x /= magnitude;
        directionToTarget.y /= magnitude;
        directionToTarget.z /= magnitude;

        // 2. 현재 속도 벡터 정규화
        const currentDirection = { ...this.velocity };
        const currentSpeed = Math.sqrt(currentDirection.x**2 + currentDirection.y**2 + currentDirection.z**2);
        
        if (currentSpeed > 0.001) {
            currentDirection.x /= currentSpeed;
            currentDirection.y /= currentSpeed;
            currentDirection.z /= currentSpeed;
        } else {
            // 속도가 없는 경우 (예: 초기 발사), 발사체의 앞쪽 방향을 사용 (모델 방향에 따라 조정 필요)
            // 여기서는 간단히 타겟 방향으로 초기 방향 설정
            currentDirection.x = directionToTarget.x;
            currentDirection.y = directionToTarget.y;
            currentDirection.z = directionToTarget.z;
        }

        // 3. 현재 방향과 목표 방향 사이의 각도 계산
        const dotProduct = currentDirection.x * directionToTarget.x + currentDirection.y * directionToTarget.y + currentDirection.z * directionToTarget.z;
        const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct))); // clamp dotProduct to [-1, 1]

        // 4. 최대 회전각 제한
        const maxTurnAngle = this.maxTurnRate; // 프레임당 최대 회전각 (config에서 설정)
        let rotationAngle = angle;
        
        if (angle > maxTurnAngle) {
            rotationAngle = maxTurnAngle;
        }

        // 5. 회전 축 계산 (외적)
        const rotationAxis = {
            x: currentDirection.y * directionToTarget.z - currentDirection.z * directionToTarget.y,
            y: currentDirection.z * directionToTarget.x - currentDirection.x * directionToTarget.z,
            z: currentDirection.x * directionToTarget.y - currentDirection.y * directionToTarget.x
        };
        const axisMagnitude = Math.sqrt(rotationAxis.x**2 + rotationAxis.y**2 + rotationAxis.z**2);

        let newDirection;
        if (axisMagnitude < 0.001) {
            // 현재 방향과 목표 방향이 거의 평행 (또는 반대)
            newDirection = { ...currentDirection };
        } else {
            // 회전 축 정규화
            rotationAxis.x /= axisMagnitude;
            rotationAxis.y /= axisMagnitude;
            rotationAxis.z /= axisMagnitude;

            // 6. 로드리게스 회전 공식 또는 쿼터니언을 사용하여 벡터 회전
            // 여기서는 간단한 구면 선형 보간(Slerp)의 근사치 사용
            const cosAngle = Math.cos(rotationAngle);
            const sinAngle = Math.sin(rotationAngle);
            
            newDirection = {
                x: currentDirection.x * cosAngle + (rotationAxis.y * currentDirection.z - rotationAxis.z * currentDirection.y) * sinAngle + rotationAxis.x * (rotationAxis.x * currentDirection.x + rotationAxis.y * currentDirection.y + rotationAxis.z * currentDirection.z) * (1 - cosAngle),
                y: currentDirection.y * cosAngle + (rotationAxis.z * currentDirection.x - rotationAxis.x * currentDirection.z) * sinAngle + rotationAxis.y * (rotationAxis.x * currentDirection.x + rotationAxis.y * currentDirection.y + rotationAxis.z * currentDirection.z) * (1 - cosAngle),
                z: currentDirection.z * cosAngle + (rotationAxis.x * currentDirection.y - rotationAxis.y * currentDirection.x) * sinAngle + rotationAxis.z * (rotationAxis.x * currentDirection.x + rotationAxis.y * currentDirection.y + rotationAxis.z * currentDirection.z) * (1 - cosAngle)
            };
        }

        // 7. 새로운 속도 벡터 계산 및 적용
        this.velocity.x = newDirection.x * this.speed;
        this.velocity.y = newDirection.y * this.speed;
        this.velocity.z = newDirection.z * this.speed;
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