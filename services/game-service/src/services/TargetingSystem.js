import * as THREE from 'three';

/**
 * 서버 측 타겟팅 및 락온 시스템 클래스
 */
export class TargetingSystem {
    constructor(config, getTerrainHeight) {
        this.config = config.targeting || {};
        this.getTerrainHeight = getTerrainHeight; // 지형 높이 함수 저장
        this.raycaster = new THREE.Raycaster();

        // config에서 값을 가져오거나 기본값 설정
        this.lockOnTime = (this.config.lockOnTime || 2) * 1000; // ms
        this.tickRate = config.server?.tickRate || 30;
        this.lockLostCooldown = this.config.lockLostCooldown || 1000; // ms
        this.maxDistance = this.config.maxDistance || 1000;
        this.maxAngle = this.config.maxAngle || 15;
    }

    /**
     * 매 틱마다 호출되어 플레이어의 타겟팅 상태를 업데이트합니다.
     * @param {object} player - 현재 플레이어 객체
     * @param {Vehicle} vehicle - 현재 플레이어의 비행체
     * @param {Array<Vehicle>} enemies - 모든 적 비행체 배열
     * @param {number} deltaTime - 델타 타임
     */
    update(player, vehicle, enemies, deltaTime) {
        if (!vehicle || !vehicle.active) {
            this.clearAllTargets(player);
            return;
        }

        // 1. 상황 인식 타겟(녹색 박스) 탐색
        const awarenessTarget = this.findBestAwarenessTarget(vehicle, enemies);
        player.awarenessTargetId = awarenessTarget ? awarenessTarget.id : null;

        // 2. 락온 타겟(노란색 박스) 유효성 검사 및 업데이트
        let lockOnTarget = enemies.find(e => e.id === player.lockOnTargetId);

        // 현재 락온 타겟이 유효하지 않은 경우, 상황 인식 타겟을 락온 타겟 후보로 설정
        if (!lockOnTarget || !this.isTargetValidForLockOn(vehicle, lockOnTarget, enemies)) {
            lockOnTarget = null; // 기존 락온 타겟 해제
            // 상황인식 타겟이 락온 가능한지 체크
            if (awarenessTarget && this.isTargetValidForLockOn(vehicle, awarenessTarget, enemies)) {
                lockOnTarget = awarenessTarget;
            }
        }
        player.lockOnTargetId = lockOnTarget ? lockOnTarget.id : null;
        
        // 3. 락온 진행도 업데이트
        this.updateLockOnProgress(player, lockOnTarget, deltaTime);
    }

    /**
     * 플레이어의 락온 진행 상태를 업데이트합니다.
     * @param {object} player 
     * @param {Vehicle | null} target 
     * @param {number} deltaTime 
     */
    updateLockOnProgress(player, target, deltaTime) {
        if (!target) {
            this.resetLockOn(player);
            return;
        }
        
        // 조준 중일 때 락온 진행도 증가
        const progressIncrease = (deltaTime * 1000) / this.lockOnTime;
        player.lockOnState.progress = Math.min(1, (player.lockOnState.progress || 0) + progressIncrease);
        if (player.lockOnState.progress >= 1) {
            player.lockOnState.isLocked = true;
        }
    }

    /**
     * 가장 적합한 상황 인식용 타겟을 찾습니다. (녹색 박스 대상)
     * @param {Vehicle} vehicle 
     * @param {Array<Vehicle>} enemies 
     * @returns {Vehicle|null}
     */
    findBestAwarenessTarget(vehicle, enemies) {
        let bestTarget = null;
        let minDistanceSq = Infinity;

        for (const target of enemies) {
            if (!target.active) continue;

            const distanceSq = vehicle.position.distanceToSquared(target.position);
            if (distanceSq < minDistanceSq) {
                // 시야각 체크 (전방 180도 정도의 넓은 범위)
                const angle = this.getAngleToTarget(vehicle, target);
                if (angle < 90) { // 90도 = 전방 반구
                    minDistanceSq = distanceSq;
                    bestTarget = target;
                }
            }
        }
        return bestTarget;
    }

    /**
     * 주어진 타겟이 락온에 유효한지 검사합니다.
     * @param {Vehicle} vehicle 
     * @param {Vehicle} target 
     * @param {Array<Vehicle>} enemies 
     * @returns {boolean}
     */
    isTargetValidForLockOn(vehicle, target, enemies) {
        if (!target || !target.active) return false;

        const distance = vehicle.position.distanceTo(target.position);
        if (distance > this.maxDistance) return false;
        if (distance < 10) return false;

        const angle = this.getAngleToTarget(vehicle, target);
        if (angle > this.maxAngle) return false;

        if (this.hasObstacle(vehicle, target, enemies)) return false;

        return true;
    }
    
    /**
     * @deprecated 이제 isTargetValidForLockOn 을 사용합니다.
     */
    isTargetValid(vehicle, target, enemies, checkObstacles = true) {
        return this.isTargetValidForLockOn(vehicle, target, enemies);
    }

    /**
     * 타겟과의 각도를 계산합니다 (도 단위).
     * @param {Vehicle} vehicle 
     * @param {Vehicle} target 
     * @returns {number} 각도 (degrees)
     */
    getAngleToTarget(vehicle, target) {
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(vehicle.mesh.quaternion);
        const toTarget = new THREE.Vector3().subVectors(target.position, vehicle.position).normalize();
        return forward.angleTo(toTarget) * (180 / Math.PI);
    }
    
    /**
     * 두 비행체 사이에 장애물이 있는지 확인합니다. (다른 비행체 및 지형 포함)
     * @param {Vehicle} from 
     * @param {Vehicle} to 
     * @param {Array<Vehicle>} enemies 
     * @returns {boolean}
     */
    hasObstacle(from, to, enemies) {
        const fromPos = from.position;
        const toPos = to.position;
        const distance = fromPos.distanceTo(toPos);
        const direction = new THREE.Vector3().subVectors(toPos, fromPos).normalize();
        
        // 1. 다른 비행체 충돌 검사
        this.raycaster.set(fromPos, direction);
        this.raycaster.far = distance;
        
        const enemyMeshes = enemies
            .filter(e => e.id !== from.playerId && e.id !== to.id)
            .map(e => e.mesh);

        if (enemyMeshes.length > 0) {
            const intersects = this.raycaster.intersectObjects(enemyMeshes);
            if (intersects.length > 0) {
                // 자신과 타겟 사이의 첫번째 충돌이 타겟보다 가까우면 장애물로 판단
                if (intersects[0].distance < distance - 1) { 
                    return true;
                }
            }
        }

        // 2. 지형 충돌 검사 (Ray Marching)
        if (this.getTerrainHeight) {
            const stepCount = Math.floor(distance / 10); // 10미터 간격으로 체크
            const step = direction.clone().multiplyScalar(10);
            let currentPos = fromPos.clone();

            for (let i = 0; i < stepCount; i++) {
                currentPos.add(step);
                const terrainHeight = this.getTerrainHeight(currentPos.x, currentPos.z);
                if (currentPos.y < terrainHeight) {
                    return true; // 광선이 지형 아래로 내려감
                }
            }
        }
        
        return false;
    }
    
    /**
     * 플레이어의 모든 타겟 정보를 초기화합니다.
     * @param {object} player 
     */
    clearAllTargets(player) {
        player.awarenessTargetId = null;
        player.lockOnTargetId = null;
        this.resetLockOn(player);
    }

    /**
     * @deprecated 이제 clearAllTargets를 사용합니다.
     */
    clearTarget(player) {
        this.clearAllTargets(player);
    }

    /**
     * 플레이어의 락온 상태를 리셋합니다.
     * @param {object} player 
     */
    resetLockOn(player) {
        if (!player.lockOnState) {
            player.lockOnState = {};
        }
        player.lockOnState.isLocked = false;
        player.lockOnState.progress = 0;
    }
} 