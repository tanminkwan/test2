import * as THREE from 'three';

/**
 * 카메라 관리자 클래스
 * 1인칭/3인칭 카메라 제어, 시점 전환, OrbitControls 관리를 담당
 */
export class CameraManager {
    constructor(camera, controls, config) {
        this.camera = camera;
        this.controls = controls;
        this.config = config;
        
        // 카메라 상태
        this.isFirstPerson = false;
        this.myVehicle = null;
        
        // 마우스 상태 (1인칭용)
        this.mouseX = 0;
        this.mouseY = 0;
        
        // 카메라 설정
        this.cameraConfig = {
            followDistance: this.config?.camera?.followDistance || 50,
            followHeight: this.config?.camera?.followHeight || 20,
            smoothing: this.config?.camera?.smoothing || 0.1,
            cockpitOffset: new THREE.Vector3(0, 2, 1), // 조종석 위치
            forwardDirection: new THREE.Vector3(0, 0, 1) // 앞쪽 방향 (+Z)
        };
        
        // 콜백 함수들
        this.callbacks = {
            onFirstPersonToggle: null
        };
    }
    
    /**
     * 내 비행체 설정
     */
    setMyVehicle(vehicle) {
        this.myVehicle = vehicle;
    }
    
    /**
     * 마우스 위치 업데이트 (1인칭용)
     */
    updateMousePosition(mouseX, mouseY) {
        this.mouseX = mouseX;
        this.mouseY = mouseY;
    }
    
    /**
     * 시점 전환
     */
    toggleFirstPerson() {
        this.isFirstPerson = !this.isFirstPerson;
        
        if (this.isFirstPerson) {
            // 1인칭 시점으로 전환
            this.controls.enabled = false;
            document.body.requestPointerLock();
            if (this.myVehicle) {
                this.myVehicle.visible = false; // 1인칭에서는 내 비행체 숨기기
            }
        } else {
            // 3인칭 시점으로 전환
            this.controls.enabled = true;
            document.exitPointerLock();
            this.mouseX = 0;
            this.mouseY = 0;
            if (this.myVehicle) {
                this.myVehicle.visible = true; // 3인칭에서는 내 비행체 보이기
            }
        }
        
        // 콜백 호출
        if (this.callbacks.onFirstPersonToggle) {
            this.callbacks.onFirstPersonToggle(this.isFirstPerson);
        }
    }
    
    /**
     * 카메라 업데이트
     */
    updateCamera() {
        if (!this.myVehicle) return;
        
        const vehiclePosition = this.myVehicle.position;
        const vehicleRotation = this.myVehicle.rotation;
        
        if (this.isFirstPerson) {
            this.updateFirstPersonCamera(vehiclePosition, vehicleRotation);
        } else {
            this.updateThirdPersonCamera(vehiclePosition, vehicleRotation);
        }
    }
    
    /**
     * 1인칭 카메라 업데이트
     */
    updateFirstPersonCamera(vehiclePosition, vehicleRotation) {
        // 조종석 위치로 카메라 이동
        const cockpitOffset = this.cameraConfig.cockpitOffset.clone();
        
        // 비행체 회전을 고려한 조종석 위치 계산
        const rotatedOffset = cockpitOffset.clone();
        rotatedOffset.applyEuler(new THREE.Euler(
            vehicleRotation.x,
            vehicleRotation.y, 
            vehicleRotation.z,
            'YXZ'
        ));
        
        this.camera.position.copy(vehiclePosition);
        this.camera.position.add(rotatedOffset);
        
        // 비행체의 앞쪽 방향 계산
        const forwardDirection = this.cameraConfig.forwardDirection.clone();
        forwardDirection.applyEuler(new THREE.Euler(
            vehicleRotation.x,
            vehicleRotation.y,
            vehicleRotation.z,
            'YXZ'
        ));
        
        // 카메라가 앞쪽을 바라보도록 설정
        const lookAtTarget = this.camera.position.clone().add(forwardDirection);
        this.camera.lookAt(lookAtTarget);
    }
    
    /**
     * 3인칭 카메라 업데이트
     */
    updateThirdPersonCamera(vehiclePosition, vehicleRotation) {
        const distance = this.cameraConfig.followDistance;
        const height = this.cameraConfig.followHeight;
        
        // 비행체 뒤쪽 위치 계산 (뾰족한 부분이 앞이므로 반대 방향)
        const cameraPosition = new THREE.Vector3(
            vehiclePosition.x - Math.sin(vehicleRotation.y) * distance,
            vehiclePosition.y + height,
            vehiclePosition.z - Math.cos(vehicleRotation.y) * distance
        );
        
        // 카메라 위치를 부드럽게 이동
        this.camera.position.lerp(cameraPosition, this.cameraConfig.smoothing);
        
        // 카메라가 비행체를 바라보도록 설정
        this.camera.lookAt(vehiclePosition);
        
        // OrbitControls 타겟도 비행체로 설정
        this.controls.target.copy(vehiclePosition);
    }
    
    /**
     * OrbitControls 업데이트
     */
    updateControls() {
        // 3인칭이고 컨트롤이 활성화된 경우에만 업데이트
        if (!this.isFirstPerson && this.controls.enabled) {
            this.controls.update();
        }
    }
    
    /**
     * 윈도우 리사이즈 처리
     */
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }
    
    /**
     * 1인칭 상태 확인
     */
    getFirstPersonState() {
        return this.isFirstPerson;
    }
    
    /**
     * 카메라 설정 업데이트
     */
    updateConfig(newConfig) {
        if (newConfig.camera) {
            this.cameraConfig.followDistance = newConfig.camera.followDistance || this.cameraConfig.followDistance;
            this.cameraConfig.followHeight = newConfig.camera.followHeight || this.cameraConfig.followHeight;
            this.cameraConfig.smoothing = newConfig.camera.smoothing || this.cameraConfig.smoothing;
        }
    }
    
    /**
     * 콜백 함수 설정
     */
    setCallback(eventName, callback) {
        if (this.callbacks.hasOwnProperty(eventName)) {
            this.callbacks[eventName] = callback;
        } else {
            console.warn(`Unknown camera callback: ${eventName}`);
        }
    }
    
    /**
     * 카메라 초기 위치 설정
     */
    setInitialPosition(position, target) {
        this.camera.position.copy(position);
        this.camera.lookAt(target);
        this.controls.target.copy(target);
        this.controls.update();
    }
    
    /**
     * 카메라 애니메이션 (부드러운 전환)
     */
    animateToPosition(targetPosition, targetLookAt, duration = 1000) {
        const startPosition = this.camera.position.clone();
        const startLookAt = new THREE.Vector3();
        this.camera.getWorldDirection(startLookAt);
        startLookAt.add(this.camera.position);
        
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 이징 함수 (부드러운 전환)
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            // 위치 보간
            this.camera.position.lerpVectors(startPosition, targetPosition, easeProgress);
            
            // 시선 방향 보간
            const currentLookAt = new THREE.Vector3();
            currentLookAt.lerpVectors(startLookAt, targetLookAt, easeProgress);
            this.camera.lookAt(currentLookAt);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // 애니메이션 완료
                this.controls.target.copy(targetLookAt);
                this.controls.update();
            }
        };
        
        animate();
    }
    
    /**
     * 카메라 흔들림 효과
     */
    addShakeEffect(intensity = 1, duration = 500) {
        const originalPosition = this.camera.position.clone();
        const startTime = Date.now();
        
        const shake = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                // 흔들림 종료, 원래 위치로 복원
                this.camera.position.copy(originalPosition);
                return;
            }
            
            // 흔들림 강도는 시간에 따라 감소
            const currentIntensity = intensity * (1 - progress);
            
            // 랜덤한 방향으로 흔들림
            const shakeX = (Math.random() - 0.5) * currentIntensity;
            const shakeY = (Math.random() - 0.5) * currentIntensity;
            const shakeZ = (Math.random() - 0.5) * currentIntensity;
            
            this.camera.position.set(
                originalPosition.x + shakeX,
                originalPosition.y + shakeY,
                originalPosition.z + shakeZ
            );
            
            requestAnimationFrame(shake);
        };
        
        shake();
    }
    
    /**
     * 정리 작업
     */
    cleanup() {
        // 포인터 락 해제
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        
        // 콜백 초기화
        Object.keys(this.callbacks).forEach(key => {
            this.callbacks[key] = null;
        });
        
        // 참조 해제
        this.myVehicle = null;
    }
} 