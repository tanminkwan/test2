import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { InputManager } from './input/InputManager.js';
import { NetworkManager } from './network/NetworkManager.js';
import { UIManager } from './ui/UIManager.js';
import { CameraManager } from './camera/CameraManager.js';
import { EffectManager } from './effects/EffectManager.js';
import { VehicleFactory } from './entities/VehicleFactory.js';
import { WorldManager } from './world/WorldManager.js';
import { EFFECT_DEFAULTS, CANVAS_DEFAULTS, UI_COLORS } from './config/Constants.js';

/**
 * 게임 클라이언트 클래스
 * 원래 단일 파일 게임의 특성을 그대로 계승
 * InputManager, NetworkManager, UIManager, CameraManager, EffectManager, VehicleFactory, WorldManager를 점진적으로 도입
 */
export class GameClient {
    constructor(socket, gameData) {
        this.socket = socket;
        this.gameData = gameData;
        this.config = gameData.config;
        
        // Three.js 객체들
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // 게임 객체들
        this.vehicles = new Map();
        this.bullets = new Map();
        this.explosions = new Map();
        this.billboards = new Map();
        
        // 플레이어 상태
        this.myPlayer = gameData.player;
        this.myVehicle = null;
        this.isFirstPerson = false;
        
        // 입력 상태 - InputManager와 동기화용
        this.keys = {};
        this.mouseX = 0;
        this.mouseY = 0;
        this.inputs = {
            thrust: 0,
            pitch: 0,
            yaw: 0,
            roll: 0,
            vertical: 0,
            fire: false
        };
        
        // 매니저들 초기화
        this.inputManager = new InputManager();
        this.setupInputManagerCallbacks();
        
        this.networkManager = new NetworkManager(socket, gameData.config);
        this.setupNetworkManagerCallbacks();
        
        this.uiManager = new UIManager();
        this.setupUIManagerCallbacks();
        
        this.cameraManager = new CameraManager();
        
        // init()에서 초기화될 매니저들
        this.effectManager = null;
        this.vehicleFactory = null;
        this.worldManager = null;
        
        // 시간 관리
        this.clock = new THREE.Clock();
    }

    /**
     * InputManager 콜백 설정
     */
    setupInputManagerCallbacks() {
        // 시점 전환 콜백 - 상태만 동기화 (실제 전환은 InputManager에서 처리)
        this.inputManager.setCallback('onFirstPersonToggle', (isFirstPerson) => {
            // 기존 코드와 동기화 (호환성 유지)
            this.isFirstPerson = isFirstPerson;
        });
    }

    /**
     * UIManager 콜백 설정
     */
    setupUIManagerCallbacks() {
        // UIManager 초기 설정
        this.uiManager.setupUI(this.myPlayer, this.gameData.gameState);
    }

    /**
     * CameraManager 콜백 설정
     */
    setupCameraManagerCallbacks() {
        // CameraManager는 init() 후에 초기화되므로 여기서는 콜백만 준비
        // 실제 초기화는 init() 메서드에서 수행
    }

    /**
     * EffectManager 콜백 설정
     */
    setupEffectManagerCallbacks() {
        // EffectManager는 init() 후에 초기화되므로 여기서는 콜백만 준비
        // 실제 초기화는 init() 메서드에서 수행
    }

    /**
     * NetworkManager 콜백 설정
     */
    setupNetworkManagerCallbacks() {
        this.networkManager.setCallbacks({
            onGameStateUpdate: (gameState) => {
                this.updateGameState(gameState);
            },
            
            onBulletCreated: (data) => {
                this.createBullet(data.bullet);
                
                // 총구 스파크 효과 생성 (발사한 비행체에서) - EffectManager로 위임
                if (data.shooterId && this.effectManager) {
                    // 발사한 플레이어의 비행체 찾기
                    for (const [vehicleId, vehicle] of this.vehicles) {
                        if (vehicle.userData.vehicleData && vehicle.userData.vehicleData.playerId === data.shooterId) {
                            this.effectManager.createMuzzleFlash(vehicleId, this.vehicles);
                            break;
                        }
                    }
                }
            },
            
            onMuzzleFlash: (data) => {
                // 서버에서 직접 총구 효과 이벤트를 받은 경우 - EffectManager로 위임
                if (data.playerId && this.effectManager) {
                    for (const [vehicleId, vehicle] of this.vehicles) {
                        if (vehicle.userData.vehicleData && vehicle.userData.vehicleData.playerId === data.playerId) {
                            this.effectManager.createMuzzleFlash(vehicleId, this.vehicles);
                            break;
                        }
                    }
                }
            },
            
            onBulletDestroyed: (data) => {
                const bullet = this.bullets.get(data.bulletId);
                if (bullet) {
                    this.scene.remove(bullet);
                    this.bullets.delete(data.bulletId);
                }
            },
            
            onExplosionCreated: (data) => {
                // EffectManager로 위임
                if (this.effectManager) {
                    this.effectManager.createExplosion(data.explosion);
                }
            },
            
            onExplosionDestroyed: (data) => {
                // EffectManager로 위임
                if (this.effectManager) {
                    this.effectManager.removeExplosion(data.explosionId);
                } else {
                    // 폴백: 기존 방식
                    const explosion = this.explosions.get(data.explosionId);
                    if (explosion) {
                        this.scene.remove(explosion);
                        this.explosions.delete(data.explosionId);
                    }
                }
            },
            
            onBulletHoleCreated: (data) => {
                const billboard = this.billboards.get(data.billboardId);
                if (billboard) {
                    this.createBulletHole(billboard, data.bulletHole);
                }
            },
            
            onBillboardDestroyed: (data) => {
                const billboard = this.billboards.get(data.billboardId);
                if (billboard) {
                    console.log(`Billboard ${data.billboardId} destroyed by player ${data.destroyedBy}`);
                    
                    // 광고판 즉시 제거
                    this.scene.remove(billboard);
                    this.billboards.delete(data.billboardId);
                    
                    // UI 알림
                    this.uiManager.showGameEvent('billboardDestroyed', data);
                }
            },
            
            onVehicleDestroyed: (data) => {
                console.log('Vehicle destroyed:', data);
                
                // 파괴된 차량을 즉시 숨기기
                if (data.shouldHide) {
                    const vehicle = this.vehicles.get(data.vehicleId);
                    if (vehicle) {
                        vehicle.visible = false;
                        console.log(`Vehicle ${data.vehicleId} hidden after destruction`);
                    }
                }
                
                // UI 알림
                this.uiManager.showGameEvent('vehicleDestroyed', data);
            },
            
            onVehicleRespawned: (data) => {
                const vehicle = this.vehicles.get(data.vehicle.id);
                if (vehicle) {
                    // 위치와 회전 업데이트
                    vehicle.position.set(
                        data.vehicle.position.x || 0,
                        data.vehicle.position.y || 50,
                        data.vehicle.position.z || 0
                    );
                    vehicle.rotation.set(
                        data.vehicle.rotation.x || 0,
                        data.vehicle.rotation.y || 0,
                        data.vehicle.rotation.z || 0
                    );
                    
                    // 차량 데이터 업데이트
                    vehicle.userData.vehicleData = data.vehicle;
                    
                    // 차량을 다시 보이게 만들기
                    if (data.shouldShow) {
                        vehicle.visible = true;
                        console.log(`Vehicle ${data.vehicle.id} shown after respawn`);
                    }
                }
                
                // UI 알림
                this.uiManager.showGameEvent('vehicleRespawned', data);
            },
            
            onGameStarted: (data) => {
                this.uiManager.showGameEvent('gameStarted', data);
            },
            
            onGameEnded: () => {
                this.uiManager.showGameEvent('gameEnded');
            }
        });
    }

    /**
     * 게임 클라이언트 초기화
     */
    async init() {
        const webglSuccess = this.initThreeJS();
        if (!webglSuccess) {
            console.error('WebGL 초기화 실패');
            return false;
        }
        
        // WorldManager 초기화 (scene이 생성된 후)
        this.worldManager = new WorldManager(this.scene, this.config);
        this.worldManager.createWorld();
        
        // CameraManager 초기화 (camera와 controls가 생성된 후)
        this.cameraManager = new CameraManager(this.camera, this.controls, this.config);
        
        // EffectManager 초기화 (scene이 생성된 후)
        this.effectManager = new EffectManager(this.scene, this.config);
        
        // VehicleFactory 초기화 (scene이 생성된 후)
        this.vehicleFactory = new VehicleFactory(this.scene, this.config);
        
        // InputManager에 CameraManager 설정
        this.inputManager.setCameraManager(this.cameraManager);
        
        // InputManager 캔버스 포커스 설정
        this.inputManager.setupCanvasFocus();
        
        this.setupUI();
        
        // 초기 게임 상태 적용
        this.updateGameState(this.gameData.gameState);
        
        this.animate();
        return true;
    }

    /**
     * Three.js 초기화 - 원래 게임과 동일
     */
    initThreeJS() {
        // WebGL 지원 확인
        if (!this.checkWebGLSupport()) {
            this.showWebGLError();
            return false;
        }

        // 씬 생성
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x87CEEB, 100, 1000);

        // 카메라 설정 - 원래 게임과 동일
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            2000
        );
        this.camera.position.set(0, 50, 100);

        try {
            // 렌더러 설정 (config에서 성능 설정 가져오기)
            const perfConfig = this.config?.client?.performance || {};
            
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('gameCanvas'),
                antialias: perfConfig.antialias !== false, // 기본값 true
                alpha: false,
                powerPreference: perfConfig.powerPreference || "high-performance", // 고성능 GPU 사용
                failIfMajorPerformanceCaveat: false,
                preserveDrawingBuffer: false, // ReadPixels 방지
                premultipliedAlpha: false,
                depth: true,
                stencil: false,
                logarithmicDepthBuffer: false // 성능 최적화
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB);
            
            // 그림자 설정 (config에서 가져오기)
            if (perfConfig.enableShadows !== false) {
        this.renderer.shadowMap.enabled = true;
                
                // 그림자 타입 설정
                switch (perfConfig.shadowMapType) {
                    case 'pcf':
                        this.renderer.shadowMap.type = THREE.PCFShadowMap;
                        break;
                    case 'pcfsoft':
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                        break;
                    default:
                        this.renderer.shadowMap.type = THREE.BasicShadowMap;
                }
            } else {
                this.renderer.shadowMap.enabled = false;
            }
            
            // 추가 성능 최적화
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 고해상도 디스플레이 최적화
            this.renderer.outputColorSpace = THREE.SRGBColorSpace; // outputEncoding 대신 outputColorSpace 사용
            
            // GPU 최적화 설정
            this.renderer.info.autoReset = false; // 렌더링 통계 자동 리셋 비활성화
            this.renderer.sortObjects = true; // 객체 정렬로 드로우콜 최적화
            
            // 저성능 모드 추가 최적화
            if (perfConfig.lowPerformanceMode) {
                this.renderer.setPixelRatio(1); // 픽셀 비율을 1로 고정
                this.renderer.shadowMap.enabled = false; // 그림자 강제 비활성화
                console.log('저성능 모드 활성화: 그림자 및 고해상도 렌더링 비활성화');
            }
            
        } catch (error) {
            console.error('WebGL 렌더러 초기화 실패:', error);
            this.showWebGLError();
            return false;
        }

        // OrbitControls 설정
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = true;
        this.controls.enablePan = false;
        this.controls.minDistance = this.config?.camera?.minDistance || 10;
        this.controls.maxDistance = this.config?.camera?.maxDistance || 500;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.enabled = true;
        
        // 초기 카메라 타겟 설정
        this.controls.target.set(0, 0, 0);

        // 조명 설정
        this.setupLighting();

        // 윈도우 리사이즈 처리
        window.addEventListener('resize', () => this.onWindowResize());
        
        return true;
    }

    /**
     * WebGL 지원 확인
     */
    checkWebGLSupport() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        const gl2 = canvas.getContext('webgl2');
        
        let hardwareAccelerated = false;
        let gpuInfo = 'Unknown';
        
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                gpuInfo = `${vendor} - ${renderer}`;
                hardwareAccelerated = !renderer.toLowerCase().includes('software');
                
                // GPU 정보 출력
                console.log('🎮 GPU 정보:', {
                    vendor,
                    renderer,
                    hardwareAccelerated,
                    webglVersion: gl2 ? '2.0' : '1.0'
                });
            }
        }
        
        return {
            webgl: !!gl,
            webgl2: !!gl2,
            hardwareAccelerated,
            gpuInfo
        };
    }

    /**
     * WebGL 에러 메시지 표시
     */
    showWebGLError() {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.9); color: white; padding: 30px;
            border-radius: 10px; text-align: center; z-index: 10000;
            font-family: Arial, sans-serif; max-width: 600px;
        `;
        
        const webglSupport = this.checkWebGLSupport();
        
        errorDiv.innerHTML = `
            <h2>WebGL 오류</h2>
            <p><strong>WebGL 지원:</strong> ${webglSupport.webgl ? '✅' : '❌'}</p>
            <p><strong>WebGL2 지원:</strong> ${webglSupport.webgl2 ? '✅' : '❌'}</p>
            <p><strong>하드웨어 가속:</strong> ${webglSupport.hardwareAccelerated ? '✅' : '❌'}</p>
            <hr>
            <h3>해결 방법:</h3>
            <ol style="text-align: left;">
                <li><strong>Chrome 플래그 설정:</strong><br>
                    chrome://flags/ 에서 다음을 활성화:<br>
                    • #enable-unsafe-swiftshader<br>
                    • #ignore-gpu-blacklist<br>
                    • #enable-webgl
                </li>
                <li><strong>그래픽 드라이버 업데이트</strong></li>
                <li><strong>다른 브라우저 시도:</strong> Firefox, Edge</li>
                <li><strong>Chrome 시작 옵션:</strong><br>
                    --enable-unsafe-swiftshader<br>
                    --ignore-gpu-blacklist
                </li>
            </ol>
            <button onclick="location.reload()" style="
                background: #4CAF50; color: white; border: none; 
                padding: 10px 20px; border-radius: 5px; cursor: pointer;
                margin-top: 15px;
            ">다시 시도</button>
        `;
        document.body.appendChild(errorDiv);
    }

    /**
     * 조명 설정
     */
    setupLighting() {
        // 태양광
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(100, 100, 50);
        directionalLight.castShadow = true;
        
        const shadowMapSize = this.config?.client?.lighting?.shadowMapSize || 2048;
        const shadowCameraFar = this.config?.client?.lighting?.shadowCameraFar || 500;
        const shadowCameraBounds = this.config?.client?.lighting?.shadowCameraBounds || 100;
        
        directionalLight.shadow.mapSize.width = shadowMapSize;
        directionalLight.shadow.mapSize.height = shadowMapSize;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = shadowCameraFar;
        directionalLight.shadow.camera.left = -shadowCameraBounds;
        directionalLight.shadow.camera.right = shadowCameraBounds;
        directionalLight.shadow.camera.top = shadowCameraBounds;
        directionalLight.shadow.camera.bottom = -shadowCameraBounds;
        this.scene.add(directionalLight);

        // 환경광
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
    }

    /**
     * 시점 전환 - CameraManager로 위임
     */
    toggleFirstPerson() {
        if (this.cameraManager) {
            this.cameraManager.toggleFirstPerson();
            this.isFirstPerson = this.cameraManager.getFirstPersonState();
        }
    }

    /**
     * 카메라 업데이트 - CameraManager로 위임
     */
    updateCamera() {
        if (this.cameraManager) {
            // 내 비행체 정보 업데이트
            this.cameraManager.setMyVehicle(this.myVehicle);
            
            // 마우스 위치 업데이트
            this.cameraManager.updateMousePosition(this.mouseX, this.mouseY);
            
            // 카메라 업데이트
            this.cameraManager.updateCamera();
        }
    }

    /**
     * UI 설정 - UIManager로 위임
     */
    setupUI() {
        this.uiManager.setupUI(this.myPlayer, this.gameData.gameState);
    }

    /**
     * 플레이어 정보 업데이트 - UIManager로 위임
     */
    updatePlayerInfo() {
        this.uiManager.updatePlayerInfo(this.myVehicle);
    }

    /**
     * 플레이어 목록 업데이트 - UIManager로 위임
     */
    updatePlayerList() {
        this.uiManager.updatePlayerList(this.vehicles);
    }

    /**
     * 입력을 서버로 전송 - NetworkManager 사용
     */
    sendInputs() {
        // NetworkManager에 입력 전송 위임
        const sent = this.networkManager.sendInputs(this.inputs);
        
        // 발사 입력은 한 번만 전송 (기존 로직 유지)
        if (this.inputs.fire) {
            this.inputs.fire = false;
        }
    }

    /**
     * 윈도우 리사이즈 처리 - CameraManager로 위임
     */
    onWindowResize() {
        if (this.cameraManager) {
            this.cameraManager.onWindowResize();
        }
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * 애니메이션 루프 - 원래 게임과 동일
     */
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = this.clock.getDelta();
        
        // 프레임 제한 (60fps 이상일 때 성능 최적화)
        if (deltaTime < 0.016) return; // 60fps 제한
        
        // 입력 업데이트 - InputManager 사용
        this.inputManager.updateInputs();
        const managerInputs = this.inputManager.getInputs();
        
        // 기존 입력과 동기화 (호환성 유지)
        this.inputs = { ...managerInputs };
        this.isFirstPerson = this.inputManager.getFirstPersonState();
        const mousePos = this.inputManager.getMousePosition();
        this.mouseX = mousePos.x;
        this.mouseY = mousePos.y;
        
        this.sendInputs();
        
        // 발사 입력 리셋 (네트워크 전송 후)
        if (this.inputs.fire) {
            this.inputManager.resetFireInput();
        }
        
        // 내 비행체 부스터 효과 업데이트
        this.updateMyVehicleBooster();
        
        // 카메라 업데이트
        this.updateCamera();
        
        // OrbitControls 업데이트 - CameraManager로 위임
        if (this.cameraManager) {
            this.cameraManager.updateControls();
        }
        
        // 구름 애니메이션 - WorldManager로 위임
        if (this.worldManager) {
            this.worldManager.updateClouds();
        }
        
        // 렌더링 통계 리셋 (성능 최적화)
        this.renderer.info.reset();
        
        // 렌더링
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * 각도 보간 (각도 래핑 문제 해결)
     */
    lerpAngle(current, target, factor) {
        // 각도 차이 계산
        let diff = target - current;
        
        // 차이가 π보다 크면 반대 방향으로 회전하는 것이 더 짧음
        if (diff > Math.PI) {
            diff -= Math.PI * 2;
        } else if (diff < -Math.PI) {
            diff += Math.PI * 2;
        }
        
        return current + diff * factor;
    }

    /**
     * 내 비행체 부스터 효과 업데이트 (EffectManager로 위임)
     */
    updateMyVehicleBooster() {
        if (!this.myVehicle || !this.myVehicle.userData.vehicleData || !this.effectManager) return;
        
        const vehicleData = this.myVehicle.userData.vehicleData;
        const isBoosterActive = this.inputManager.isBoosterActive();
        
        // EffectManager의 부스터 효과 메서드 사용
        this.effectManager.updateVehicleBooster(
            this.myVehicle, 
            isBoosterActive, 
            vehicleData.vehicleType || 'fighter'
        );
    }

    /**
     * 레거시 부스터 효과 (제거됨 - EffectManager로 통합)
     */
    updateMyVehicleBoosterLegacy(isBoosterActive, vehicleData) {
        // 이 메서드는 더 이상 사용되지 않습니다.
        // updateMyVehicleBooster()를 사용하세요.
        console.warn('updateMyVehicleBoosterLegacy is deprecated. Use updateMyVehicleBooster instead.');
    }

    /**
     * 총알 생성
     */
    createBullet(bulletData) {
        // config에서 총알 설정 가져오기 (폴백은 Constants에서)
        const bulletConfig = this.config?.effects?.bullet || {};
        
        const bulletGroup = new THREE.Group();
        
        // 총알 메시
        const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const bulletMaterial = new THREE.MeshBasicMaterial({
            color: bulletConfig.color || EFFECT_DEFAULTS.BULLET.color
        });
        const bulletMesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
        bulletGroup.add(bulletMesh);
        
        // 총알 트레일 (선택적)
        if (bulletConfig.enableTrail !== false) {
            const trailGeometry = new THREE.CylinderGeometry(0.02, 0.05, 2, 6);
            const trailMaterial = new THREE.MeshBasicMaterial({
                color: bulletConfig.trailColor || EFFECT_DEFAULTS.BULLET.trailColor,
                transparent: true,
                opacity: 0.6
            });
            const trail = new THREE.Mesh(trailGeometry, trailMaterial);
            trail.rotation.x = Math.PI / 2;
            trail.position.z = -1;
            bulletGroup.add(trail);
        }
        
        // 총알 글로우 효과 (선택적)
        if (bulletConfig.enableGlow !== false) {
            const glowGeometry = new THREE.SphereGeometry(0.15, 8, 8);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: bulletConfig.color || EFFECT_DEFAULTS.BULLET.color,
                transparent: true,
                opacity: 0.3
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            bulletGroup.add(glow);
        }

        // 총알 위치 설정
        bulletGroup.position.set(
            bulletData.position.x || 0,
            bulletData.position.y || 0,
            bulletData.position.z || 0
        );
        
        // 총알 회전 설정
        bulletGroup.rotation.set(
            bulletData.rotation.x || 0,
            bulletData.rotation.y || 0,
            bulletData.rotation.z || 0
        );
        
        // 총알 데이터 설정
        bulletGroup.userData.bulletData = bulletData;
        
        // 총알 그림자 설정
        bulletGroup.castShadow = true;
        bulletGroup.receiveShadow = true;
        
        // 총알 추가
        this.scene.add(bulletGroup);
        this.bullets.set(bulletData.id, bulletGroup);
        
        return bulletGroup;
    }

    /**
     * 지형 높이 계산 - WorldManager로 위임
     */
    getTerrainHeight(x, z) {
        if (this.worldManager) {
            return this.worldManager.getTerrainHeight(x, z);
        } else {
            // 폴백: 기본 높이 반환
            return this.config?.world?.waterLevel + 1 || 1;
        }
    }

    /**
     * 게임 상태 업데이트
     */
    updateGameState(gameState) {
        // 최신 게임 상태 저장 (플레이어 목록 업데이트에서 사용)
        this.latestGameState = gameState;
        
        // 비행체 업데이트
        if (gameState.vehicles && gameState.vehicles.length > 0) {
        gameState.vehicles.forEach(vehicleData => {
            let vehicle = this.vehicles.get(vehicleData.id);
            if (!vehicle) {
                vehicle = this.createVehicle(vehicleData);
            } else {
                // 위치 업데이트 (부드러운 보간)
                vehicle.position.lerp(new THREE.Vector3(
                    vehicleData.position.x,
                    vehicleData.position.y,
                    vehicleData.position.z
                ), 0.3);
                
                // 회전 순서 설정 (기존 비행체에도 적용)
                vehicle.rotation.order = 'YXZ';
                
                // 회전 업데이트 - 각도 래핑 문제 해결된 보간 적용
                vehicle.rotation.x = this.lerpAngle(
                    vehicle.rotation.x, 
                    vehicleData.rotation.x || 0, 
                    0.3
                ); // 피치 (W/S)
                
                vehicle.rotation.y = this.lerpAngle(
                    vehicle.rotation.y, 
                    vehicleData.rotation.y || 0, 
                    0.3
                ); // 요 (A/D)
                
                vehicle.rotation.z = this.lerpAngle(
                    vehicle.rotation.z, 
                    vehicleData.rotation.z || 0, 
                    0.3
                ); // 롤 (Q/E)
                
                // 차량 가시성 상태 업데이트 (서버에서 visible 정보가 있는 경우)
                if (vehicleData.hasOwnProperty('visible')) {
                    vehicle.visible = vehicleData.visible;
                } else if (vehicleData.hasOwnProperty('active')) {
                    // active 상태에 따라 가시성 결정 (fallback)
                    vehicle.visible = vehicleData.active;
                }
                
                // 엔진 글로우 효과 (추력에 따라 밝기 조절)
                if (vehicle.userData.engine && vehicle.userData.glow) {
                    const thrustLevel = Math.abs(vehicleData.velocity?.x || 0) + 
                                      Math.abs(vehicleData.velocity?.y || 0) + 
                                      Math.abs(vehicleData.velocity?.z || 0);
                    const intensity = Math.min(1, thrustLevel * 0.1 + 0.3);
                    
                    vehicle.userData.engine.material.opacity = intensity;
                    vehicle.userData.glow.material.opacity = intensity * 0.4;
                }
                
                vehicle.userData.vehicleData = vehicleData;
            }
        });
        }
        
        // 발사체 업데이트 (bullets -> projectiles)
        if (gameState.projectiles && gameState.projectiles.length > 0) {
            // 현재 서버에 존재하는 발사체 ID 목록
            const currentProjectileIds = new Set(gameState.projectiles.map(p => p.id));
            
            // 클라이언트에 있지만 서버에 없는 총알 제거
            for (const [bulletId, bullet] of this.bullets) {
                if (!currentProjectileIds.has(bulletId)) {
                    this.scene.remove(bullet);
                    this.bullets.delete(bulletId);
                }
            }
            
            gameState.projectiles.forEach(projectileData => {
                // 총알 타입만 처리 (미사일은 나중에 추가)
                if (projectileData.type === 'bullet') {
                    const bullet = this.bullets.get(projectileData.id);
                    if (!bullet) {
                        // 새로운 총알 생성
                        const newBullet = this.createBullet(projectileData);
                    } else {
                        // 기존 총알 위치 업데이트
                bullet.position.set(
                            projectileData.position.x || 0,
                            projectileData.position.y || 0,
                            projectileData.position.z || 0
                );
                bullet.rotation.set(
                            projectileData.rotation.x || 0,
                            projectileData.rotation.y || 0,
                            projectileData.rotation.z || 0
                );
                    }
            }
        });
        } else {
            // 서버에 발사체가 없으면 클라이언트의 모든 총알 제거
            for (const [bulletId, bullet] of this.bullets) {
                this.scene.remove(bullet);
                this.bullets.delete(bulletId);
            }
        }
        
        // 효과 업데이트 (explosions -> effects)
        if (gameState.effects && gameState.effects.effects) {
            gameState.effects.effects.forEach(effectData => {
                if (effectData.type === 'explosion') {
                    const explosion = this.explosions.get(effectData.id);
                    if (!explosion) {
                        // 새로운 폭발 생성 - EffectManager로 위임
                        if (this.effectManager) {
                            this.effectManager.createExplosion(effectData);
                        }
                    } else {
                        // 기존 폭발 업데이트
                        const intensity = effectData.intensity || 1;
                        const scale = intensity * (effectData.radius || 10) * 0.1;
                        explosion.scale.setScalar(scale);
                        
                        // 투명도 조절
                        const opacity = intensity;
                        explosion.children.forEach(child => {
                            if (child.material) {
                                child.material.opacity = opacity;
                            }
                        });
                    }
                }
            });
        }
        
        // 플레이어 정보 업데이트
        if (gameState.players) {
            // gameData에 플레이어 정보 저장 (플레이어 목록에서 사용)
            if (!this.gameData.gameState) {
                this.gameData.gameState = {};
            }
            this.gameData.gameState.players = gameState.players;
            
            const myPlayerData = gameState.players.find(p => p.id === this.myPlayer.id);
            if (myPlayerData) {
                this.myPlayer = myPlayerData;
                // UIManager에 플레이어 데이터 업데이트 알림
                this.uiManager.updateMyPlayer(myPlayerData);
            }
        }
        
        // 광고판 업데이트 (초기 로드 시에만)
        if (gameState.billboards && gameState.billboards.length >= 0) {
            // 현재 존재하는 광고판 ID 목록
            const currentBillboardIds = new Set(gameState.billboards.map(b => b.id));
            
            // 클라이언트에 있지만 서버에 없는 광고판 제거 (파괴된 광고판)
            for (const [billboardId, billboard] of this.billboards) {
                if (!currentBillboardIds.has(billboardId)) {
                    console.log(`Removing destroyed billboard: ${billboardId}`);
                    this.scene.remove(billboard);
                    this.billboards.delete(billboardId);
                }
            }
            
            // 새로운 광고판 생성 또는 기존 광고판 업데이트
            gameState.billboards.forEach(billboardData => {
                let billboard = this.billboards.get(billboardData.id);
                if (!billboard) {
                    billboard = this.createBillboard(billboardData);
                } else {
                    // 기존 광고판의 총알 자국 업데이트
                    if (billboardData.bulletHoles && billboardData.bulletHoles.length > 0) {
                        const currentHoleCount = billboard.userData.bulletHoles.children.length;
                        const newHoleCount = billboardData.bulletHoles.length;
                        
                        // 새로운 총알 자국이 추가된 경우
                        if (newHoleCount > currentHoleCount) {
                            for (let i = currentHoleCount; i < newHoleCount; i++) {
                                this.createBulletHole(billboard, billboardData.bulletHoles[i]);
                            }
                        }
                    }
                }
            });
        }
        
        // UIManager에 게임 상태 업데이트 알림
        this.uiManager.updateGameState(gameState);
        
        // UI 업데이트 (UIManager로 위임)
        this.updatePlayerInfo();
        this.updatePlayerList();
    }

    /**
     * 비행체 생성 - VehicleFactory로 위임
     */
    createVehicle(vehicleData) {
        if (this.vehicleFactory) {
            const vehicleGroup = this.vehicleFactory.createVehicle(
                vehicleData, 
                this.vehicles, 
                this.myPlayer, 
                this.cameraManager
            );
            
            // 내 비행체인 경우 참조 저장
            if (vehicleData.playerId === this.myPlayer.id) {
                this.myVehicle = vehicleGroup;
            }
            
            return vehicleGroup;
        } else {
            // 폴백: 기존 방식 (호환성 유지)
            console.warn('VehicleFactory not initialized, using fallback');
            return this.createVehicleFallback(vehicleData);
        }
    }
    
    /**
     * 폴백 비행체 생성 (VehicleFactory 초기화 전)
     */
    createVehicleFallback(vehicleData) {
        const vehicleGroup = new THREE.Group();
        vehicleGroup.rotation.order = 'YXZ';
        
        // 간단한 기본 모델 생성
        const geometry = new THREE.BoxGeometry(2, 1, 6);
        const material = new THREE.MeshLambertMaterial({ color: vehicleData.color });
        const mesh = new THREE.Mesh(geometry, material);
        vehicleGroup.add(mesh);
        
        vehicleGroup.position.set(
            vehicleData.position.x || 0,
            vehicleData.position.y || 50,
            vehicleData.position.z || 0
        );
        
        vehicleGroup.userData.vehicleData = vehicleData;
        this.vehicles.set(vehicleData.id, vehicleGroup);
        this.scene.add(vehicleGroup);
        
        return vehicleGroup;
    }

    /**
     * 광고판 생성
     */
    createBillboard(billboardData) {
        const billboardGroup = new THREE.Group();
        
        // 광고판 프레임 (지지대)
        const frameGeometry = new THREE.BoxGeometry(
            billboardData.width + 2, 
            billboardData.height + 2, 
            billboardData.thickness
        );
        const frameMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x444444 
        });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.castShadow = true;
        frame.receiveShadow = true;
        billboardGroup.add(frame);
        
        // 텍스처 로더
        const textureLoader = new THREE.TextureLoader();
        
        // 앞면 광고판
        const frontGeometry = new THREE.PlaneGeometry(
            billboardData.width, 
            billboardData.height
        );
        
        // 앞면 이미지 로드 (기본 이미지로 대체 가능)
        textureLoader.load(
            billboardData.frontImage,
            (texture) => {
                const frontMaterial = new THREE.MeshLambertMaterial({ 
                    map: texture 
                });
                const frontPanel = new THREE.Mesh(frontGeometry, frontMaterial);
                frontPanel.position.z = billboardData.thickness / 2 + 0.1;
                frontPanel.castShadow = true;
                frontPanel.userData.side = 'front';
                billboardGroup.add(frontPanel);
                billboardGroup.userData.frontPanel = frontPanel;
            },
            undefined,
            (error) => {
                console.warn('Failed to load front billboard image:', billboardData.frontImage);
                // 기본 텍스처 사용
                const frontMaterial = new THREE.MeshLambertMaterial({ 
                    color: 0x00ff00,
                    transparent: true,
                    opacity: 0.8
                });
                const frontPanel = new THREE.Mesh(frontGeometry, frontMaterial);
                frontPanel.position.z = billboardData.thickness / 2 + 0.1;
                frontPanel.castShadow = true;
                frontPanel.userData.side = 'front';
                billboardGroup.add(frontPanel);
                billboardGroup.userData.frontPanel = frontPanel;
                
                // 텍스트 추가 (기본 광고)
                this.addBillboardText(frontPanel, "GAME\nADVERTISEMENT", 0x000000);
            }
        );
        
        // 뒷면 광고판
        const backGeometry = new THREE.PlaneGeometry(
            billboardData.width, 
            billboardData.height
        );
        
        textureLoader.load(
            billboardData.backImage,
            (texture) => {
                const backMaterial = new THREE.MeshLambertMaterial({ 
                    map: texture 
                });
                const backPanel = new THREE.Mesh(backGeometry, backMaterial);
                backPanel.position.z = -(billboardData.thickness / 2 + 0.1);
                backPanel.rotation.y = Math.PI; // 뒤쪽을 향하도록 회전
                backPanel.castShadow = true;
                backPanel.userData.side = 'back';
                billboardGroup.add(backPanel);
                billboardGroup.userData.backPanel = backPanel;
            },
            undefined,
            (error) => {
                console.warn('Failed to load back billboard image:', billboardData.backImage);
                // 기본 텍스처 사용
                const backMaterial = new THREE.MeshLambertMaterial({ 
                    color: 0x0000ff,
                    transparent: true,
                    opacity: 0.8
                });
                const backPanel = new THREE.Mesh(backGeometry, backMaterial);
                backPanel.position.z = -(billboardData.thickness / 2 + 0.1);
                backPanel.rotation.y = Math.PI;
                backPanel.castShadow = true;
                backPanel.userData.side = 'back';
                billboardGroup.add(backPanel);
                billboardGroup.userData.backPanel = backPanel;
                
                // 텍스트 추가 (기본 광고)
                this.addBillboardText(backPanel, "MULTIPLAYER\nCOMBAT", 0xffffff);
            }
        );
        
        // 지지대 기둥들
        const poleGeometry = new THREE.CylinderGeometry(0.5, 0.5, billboardData.height);
        const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
        
        // 왼쪽 기둥
        const leftPole = new THREE.Mesh(poleGeometry, poleMaterial);
        leftPole.position.set(-billboardData.width / 2 - 1, -billboardData.height / 2, 0);
        leftPole.castShadow = true;
        billboardGroup.add(leftPole);
        
        // 오른쪽 기둥
        const rightPole = new THREE.Mesh(poleGeometry, poleMaterial);
        rightPole.position.set(billboardData.width / 2 + 1, -billboardData.height / 2, 0);
        rightPole.castShadow = true;
        billboardGroup.add(rightPole);
        
        // 위치 및 회전 설정
        billboardGroup.position.set(
            billboardData.position.x,
            billboardData.position.y,
            billboardData.position.z
        );
        
        billboardGroup.rotation.set(
            billboardData.rotation.x,
            billboardData.rotation.y,
            billboardData.rotation.z
        );
        
        billboardGroup.userData = { 
            billboardData: billboardData,
            bulletHoles: new THREE.Group() // 총알 자국 그룹
        };
        
        // 총알 자국 그룹 추가
        billboardGroup.add(billboardGroup.userData.bulletHoles);
        
        // 기존 총알 자국이 있다면 생성
        if (billboardData.bulletHoles && billboardData.bulletHoles.length > 0) {
            billboardData.bulletHoles.forEach(bulletHole => {
                this.createBulletHole(billboardGroup, bulletHole);
            });
        }
        
        this.billboards.set(billboardData.id, billboardGroup);
        this.scene.add(billboardGroup);
        
        return billboardGroup;
    }

    /**
     * 총알 자국 생성
     */
    createBulletHole(billboardGroup, bulletHoleData) {
        const bulletHoleGeometry = new THREE.CircleGeometry(bulletHoleData.size || 0.5, 8);
        const bulletHoleMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        const bulletHole = new THREE.Mesh(bulletHoleGeometry, bulletHoleMaterial);
        
        // 총알 자국 위치 설정
        bulletHole.position.set(
            bulletHoleData.position.x,
            bulletHoleData.position.y,
            bulletHoleData.position.z
        );
        
        // 앞면/뒷면에 따라 회전 조정
        if (bulletHoleData.side === 'back') {
            bulletHole.rotation.y = Math.PI;
        }
        
        // 약간의 랜덤 회전 추가 (자연스러운 효과)
        bulletHole.rotation.z = Math.random() * Math.PI * 2;
        
        // 총알 자국 그룹에 추가
        billboardGroup.userData.bulletHoles.add(bulletHole);
        
        return bulletHole;
    }

    /**
     * 광고판에 텍스트 추가 (기본 광고용)
     */
    addBillboardText(panel, text, color) {
        // Canvas를 사용하여 텍스트 텍스처 생성
        const canvas = document.createElement('canvas');
        canvas.width = this.config?.client?.ui?.canvas?.textWidth || CANVAS_DEFAULTS.TEXT_WIDTH;
        canvas.height = this.config?.client?.ui?.canvas?.textHeight || CANVAS_DEFAULTS.TEXT_HEIGHT;
        const context = canvas.getContext('2d');
        
        // 배경
        context.fillStyle = panel.material.color.getStyle();
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // 텍스트
        context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        context.font = 'bold 48px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        const lines = text.split('\n');
        const lineHeight = this.config?.client?.ui?.canvas?.lineHeight || CANVAS_DEFAULTS.LINE_HEIGHT;
        const startY = canvas.height / 2 - (lines.length - 1) * lineHeight / 2;
        
        lines.forEach((line, index) => {
            context.fillText(line, canvas.width / 2, startY + index * lineHeight);
        });
        
        // 텍스처 생성 및 적용
        const texture = new THREE.CanvasTexture(canvas);
        panel.material.map = texture;
        panel.material.needsUpdate = true;
    }
} 