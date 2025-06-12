import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * 게임 클라이언트 클래스
 * 원래 단일 파일 게임의 특성을 그대로 계승
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
        this.terrain = null;
        this.sky = null;
        this.clouds = [];
        
        // 플레이어 상태
        this.myPlayer = gameData.player;
        this.myVehicle = null;
        this.isFirstPerson = false;
        
        // 입력 상태 - 원래 게임과 동일
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
        
        // 시간 관리
        this.clock = new THREE.Clock();
        this.lastInputSend = 0;
        this.inputSendRate = this.config?.client?.inputSendRate || 60; // Hz (config에서 가져오기)
        
        this.setupSocketListeners();
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
        
        this.createWorld();
        this.setupControls();
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

        // OrbitControls 설정 - 원래 게임과 동일
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = this.config?.camera?.minDistance || 10;
        this.controls.maxDistance = this.config?.camera?.maxDistance || 500;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.enabled = true; // 기본적으로 활성화
        
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
     * 월드 생성
     */
    createWorld() {
        this.createTerrain();
        this.createSky();
        this.createClouds();
        this.createTrees();
        this.createMapBoundaries(); // 맵 경계 표시 추가
    }

    /**
     * 지형 생성
     */
    createTerrain() {
        const size = this.config.world.size;
        const detail = this.config.world.terrainDetail;
        
        const geometry = new THREE.PlaneGeometry(size, size, detail, detail);
        
        // 높이 맵 생성
        const vertices = geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const y = vertices[i + 1];
            
            const height = 
                Math.sin(x * 0.008) * 25 +
                Math.cos(y * 0.008) * 25 +
                Math.sin(x * 0.015) * 15 +
                Math.cos(y * 0.015) * 15 +
                Math.sin(x * 0.03) * 8 +
                Math.cos(y * 0.03) * 8 +
                Math.sin(x * 0.05) * 4 +
                Math.cos(y * 0.05) * 4 +
                (Math.random() - 0.5) * 6;
                
            vertices[i + 2] = height;
        }
        
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();

        const material = new THREE.MeshLambertMaterial({
            color: 0x4a6741
        });

        this.terrain = new THREE.Mesh(geometry, material);
        this.terrain.rotation.x = -Math.PI / 2;
        this.terrain.receiveShadow = true;
        this.scene.add(this.terrain);

        // 물 생성
        this.createWater();
    }

    /**
     * 물 생성
     */
    createWater() {
        const size = this.config.world.size;
        const waterGeometry = new THREE.PlaneGeometry(size, size, 50, 50);
        const waterMaterial = new THREE.MeshPhongMaterial({
            color: 0x006994,
            transparent: true,
            opacity: 0.6,
            shininess: 100
        });
        
        const water = new THREE.Mesh(waterGeometry, waterMaterial);
        water.rotation.x = -Math.PI / 2;
        water.position.y = this.config.world.waterLevel;
        water.receiveShadow = true;
        this.scene.add(water);
    }

    /**
     * 하늘 생성
     */
    createSky() {
        const skyGeometry = new THREE.SphereGeometry(1500, 32, 32);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            side: THREE.BackSide
        });
        
        this.sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(this.sky);
    }

    /**
     * 구름 생성
     */
    createClouds() {
        const cloudCount = this.config?.client?.clouds?.count || 20;
        const heightMin = this.config?.client?.clouds?.heightMin || 50;
        const heightMax = this.config?.client?.clouds?.heightMax || 150;
        
        for (let i = 0; i < cloudCount; i++) {
            const cloudGeometry = new THREE.SphereGeometry(20, 8, 8);
            const cloudMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.7
            });
            
            const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
            cloud.position.set(
                (Math.random() - 0.5) * 800,
                heightMin + Math.random() * (heightMax - heightMin),
                (Math.random() - 0.5) * 800
            );
            cloud.scale.setScalar(0.5 + Math.random() * 0.5);
            
            this.clouds.push(cloud);
            this.scene.add(cloud);
        }
    }

    /**
     * 나무 생성
     */
    createTrees() {
        const treeCount = this.config?.client?.trees?.count || 100;
        const minHeightAboveWater = this.config?.client?.trees?.minHeightAboveWater || 2;
        
        for (let i = 0; i < treeCount; i++) {
            const tree = this.createTree();
            let x, z, terrainHeight;
            let attempts = 0;
            
            // 적절한 위치를 찾을 때까지 시도 (최대 10번)
            do {
                x = (Math.random() - 0.5) * 300;
                z = (Math.random() - 0.5) * 300;
                terrainHeight = this.getTerrainHeight(x, z);
                attempts++;
            } while (terrainHeight <= this.config.world.waterLevel + minHeightAboveWater && attempts < 10);
            
            // 나무를 지형 위에 배치
            tree.position.set(x, terrainHeight, z);
            this.scene.add(tree);
        }
    }

    /**
     * 개별 나무 생성
     */
    createTree() {
        const treeGroup = new THREE.Group();
        
        // 나무 줄기
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 1, 8);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 4;
        trunk.castShadow = true;
        treeGroup.add(trunk);
        
        // 나무 잎
        const leavesGeometry = new THREE.SphereGeometry(4, 8, 8);
        const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = 10;
        leaves.castShadow = true;
        treeGroup.add(leaves);
        
        return treeGroup;
    }

    /**
     * 지형 높이 계산
     */
    getTerrainHeight(x, z) {
        // 실제 지형 생성과 동일한 높이 계산
        const height = 
            Math.sin(x * 0.008) * 25 +
            Math.cos(z * 0.008) * 25 +
            Math.sin(x * 0.015) * 15 +
            Math.cos(z * 0.015) * 15 +
            Math.sin(x * 0.03) * 8 +
            Math.cos(z * 0.03) * 8 +
            Math.sin(x * 0.05) * 4 +
            Math.cos(z * 0.05) * 4;
            // 랜덤 요소는 제외 (일관성을 위해)
            
        return Math.max(height, this.config.world.waterLevel + 1); // 물 위에만 배치
    }

    /**
     * 비행체 생성
     */
    createVehicle(vehicleData) {
        const vehicleGroup = new THREE.Group();
        
        // Three.js 회전 순서 설정 (중요!)
        vehicleGroup.rotation.order = 'YXZ'; // 요(Y) -> 피치(X) -> 롤(Z) 순서
        
        // 비행체 타입에 따라 다른 모델 생성
        if (vehicleData.vehicleType === 'heavy') {
            this.createHeavyVehicleModel(vehicleGroup, vehicleData);
        } else if (vehicleData.vehicleType === 'test') {
            this.createTestVehicleModel(vehicleGroup, vehicleData);
        } else {
            this.createFighterVehicleModel(vehicleGroup, vehicleData);
        }
        
        // 위치 설정
        vehicleGroup.position.set(
            vehicleData.position.x || 0,
            vehicleData.position.y || 50,
            vehicleData.position.z || 0
        );
        
        // 회전 설정 - 서버에서 받은 회전값을 그대로 적용
        vehicleGroup.rotation.x = vehicleData.rotation.x || 0; // 피치 (W/S)
        vehicleGroup.rotation.y = vehicleData.rotation.y || 0; // 요 (A/D)
        vehicleGroup.rotation.z = vehicleData.rotation.z || 0; // 롤 (Q/E)
        
        // 사용자 데이터 저장 - 기존 엔진 정보를 보존
        vehicleGroup.userData.vehicleData = vehicleData;
        
        this.vehicles.set(vehicleData.id, vehicleGroup);
        this.scene.add(vehicleGroup);
        
        // 내 비행체인 경우 참조 저장
        if (vehicleData.playerId === this.myPlayer.id) {
            this.myVehicle = vehicleGroup;
        }
        
        return vehicleGroup;
    }

    /**
     * 전투기 모델 생성
     */
    createFighterVehicleModel(vehicleGroup, vehicleData) {
        // config에서 모델 설정 가져오기
        const modelConfig = this.config?.vehicles?.fighter?.model || {};
        const scale = this.config?.vehicles?.fighter?.scale || 1.0;
        const engineColor = this.config?.vehicles?.fighter?.engineColor || "#00AAFF";
        const glowColor = this.config?.vehicles?.fighter?.glowColor || "#0088FF";
        
        // 뾰족한 머리 (항상 앞쪽 +Z 방향)
        const headConfig = modelConfig.head || { radius: 1.5, length: 8 };
        const headGeometry = new THREE.ConeGeometry(headConfig.radius * scale, headConfig.length * scale, 8);
        const headMaterial = new THREE.MeshLambertMaterial({ 
            color: vehicleData.color 
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.rotation.x = Math.PI / 2; // 앞을 향하도록 회전
        head.position.z = 4 * scale; // 앞쪽에 위치
        head.castShadow = true;
        vehicleGroup.add(head);
        
        // 조종석 (투명한 돔)
        const cockpitConfig = modelConfig.cockpit || { radius: 1.2, position: { x: 0, y: 0.5, z: 1 } };
        const cockpitGeometry = new THREE.SphereGeometry(cockpitConfig.radius * scale, 8, 8);
        const cockpitMaterial = new THREE.MeshPhongMaterial({
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.3,
            shininess: 100
        });
        const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
        cockpit.position.set(
            cockpitConfig.position.x * scale,
            cockpitConfig.position.y * scale,
            cockpitConfig.position.z * scale
        );
        vehicleGroup.add(cockpit);
        
        // 메인 바디
        const bodyConfig = modelConfig.body || { width: 2, height: 1, length: 6 };
        const bodyGeometry = new THREE.BoxGeometry(
            bodyConfig.width * scale, 
            bodyConfig.height * scale, 
            bodyConfig.length * scale
        );
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: vehicleData.color 
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        vehicleGroup.add(body);
        
        // 날개 (좌우)
        const wingsConfig = modelConfig.wings || { width: 12, height: 0.5, length: 3 };
        const wingGeometry = new THREE.BoxGeometry(
            wingsConfig.width * scale, 
            wingsConfig.height * scale, 
            wingsConfig.length * scale
        );
        const wingMaterial = new THREE.MeshLambertMaterial({ 
            color: vehicleData.color 
        });
        const wings = new THREE.Mesh(wingGeometry, wingMaterial);
        wings.castShadow = true;
        vehicleGroup.add(wings);
        
        // 단일 엔진 글로우 (뒤쪽 파란 발광)
        const engineConfig = modelConfig.engine || { radius: 1.5, length: 0.5, position: { x: 0, y: 0, z: -4 } };
        const engineGeometry = new THREE.CylinderGeometry(
            engineConfig.radius * scale, 
            engineConfig.radius * scale, 
            engineConfig.length * scale, 
            16
        );
        const engineMaterial = new THREE.MeshBasicMaterial({ 
            color: engineColor
        });
        const engine = new THREE.Mesh(engineGeometry, engineMaterial);
        engine.position.set(
            engineConfig.position.x * scale,
            engineConfig.position.y * scale,
            engineConfig.position.z * scale
        );
        engine.rotation.x = Math.PI / 2;
        vehicleGroup.add(engine);
        
        // 엔진 글로우 효과
        const glowConfig = modelConfig.glow || { radius: 2.5, length: 0.2, position: { x: 0, y: 0, z: -4.5 } };
        const glowGeometry = new THREE.CylinderGeometry(
            glowConfig.radius * scale, 
            glowConfig.radius * scale, 
            glowConfig.length * scale, 
            16
        );
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: glowColor,
            transparent: true,
            opacity: 0.4
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.set(
            glowConfig.position.x * scale,
            glowConfig.position.y * scale,
            glowConfig.position.z * scale
        );
        glow.rotation.x = Math.PI / 2;
        vehicleGroup.add(glow);
        
        // 사용자 데이터에 엔진 정보 저장
        vehicleGroup.userData.engine = engine;
        vehicleGroup.userData.glow = glow;
    }

    /**
     * 중형기 모델 생성
     */
    createHeavyVehicleModel(vehicleGroup, vehicleData) {
        // config에서 모델 설정 가져오기
        const modelConfig = this.config?.vehicles?.heavy?.model || {};
        const scale = this.config?.vehicles?.heavy?.scale || 1.4;
        const engineColor = this.config?.vehicles?.heavy?.engineColor || "#FF4400";
        const glowColor = this.config?.vehicles?.heavy?.glowColor || "#FF6600";
        
        // 더 큰 뾰족한 머리
        const headConfig = modelConfig.head || { radius: 2, length: 10 };
        const headGeometry = new THREE.ConeGeometry(headConfig.radius * scale, headConfig.length * scale, 8);
        const headMaterial = new THREE.MeshLambertMaterial({ 
            color: vehicleData.color 
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.rotation.x = Math.PI / 2;
        head.position.z = 5 * scale;
        head.castShadow = true;
        vehicleGroup.add(head);
        
        // 더 큰 조종석
        const cockpitConfig = modelConfig.cockpit || { radius: 1.6, position: { x: 0, y: 0.8, z: 1.5 } };
        const cockpitGeometry = new THREE.SphereGeometry(cockpitConfig.radius * scale, 8, 8);
        const cockpitMaterial = new THREE.MeshPhongMaterial({
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.3,
            shininess: 100
        });
        const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
        cockpit.position.set(
            cockpitConfig.position.x * scale,
            cockpitConfig.position.y * scale,
            cockpitConfig.position.z * scale
        );
        vehicleGroup.add(cockpit);
        
        // 더 큰 메인 바디
        const bodyConfig = modelConfig.body || { width: 3, height: 1.5, length: 8 };
        const bodyGeometry = new THREE.BoxGeometry(
            bodyConfig.width * scale, 
            bodyConfig.height * scale, 
            bodyConfig.length * scale
        );
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: vehicleData.color 
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        vehicleGroup.add(body);
        
        // 더 큰 날개
        const wingsConfig = modelConfig.wings || { width: 16, height: 0.8, length: 4 };
        const wingGeometry = new THREE.BoxGeometry(
            wingsConfig.width * scale, 
            wingsConfig.height * scale, 
            wingsConfig.length * scale
        );
        const wingMaterial = new THREE.MeshLambertMaterial({ 
            color: vehicleData.color 
        });
        const wings = new THREE.Mesh(wingGeometry, wingMaterial);
        wings.castShadow = true;
        vehicleGroup.add(wings);
        
        // 듀얼 엔진 (좌우)
        const enginesConfig = modelConfig.engines || { 
            radius: 1.2, 
            length: 0.6, 
            positions: [{ x: -3, y: 0, z: -5 }, { x: 3, y: 0, z: -5 }] 
        };
        const engineGeometry = new THREE.CylinderGeometry(
            enginesConfig.radius * scale, 
            enginesConfig.radius * scale, 
            enginesConfig.length * scale, 
            16
        );
        const engineMaterial = new THREE.MeshBasicMaterial({ 
            color: engineColor
        });
        
        const engines = [];
        enginesConfig.positions.forEach((pos, index) => {
            const engine = new THREE.Mesh(engineGeometry, engineMaterial);
            engine.position.set(pos.x * scale, pos.y * scale, pos.z * scale);
            engine.rotation.x = Math.PI / 2;
            vehicleGroup.add(engine);
            engines.push(engine);
        });
        
        // 듀얼 엔진 글로우 효과
        const glowsConfig = modelConfig.glows || { 
            radius: 2, 
            length: 0.3, 
            positions: [{ x: -3, y: 0, z: -5.5 }, { x: 3, y: 0, z: -5.5 }] 
        };
        const glowGeometry = new THREE.CylinderGeometry(
            glowsConfig.radius * scale, 
            glowsConfig.radius * scale, 
            glowsConfig.length * scale, 
            16
        );
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: glowColor,
            transparent: true,
            opacity: 0.5
        });
        
        const glows = [];
        glowsConfig.positions.forEach((pos, index) => {
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.set(pos.x * scale, pos.y * scale, pos.z * scale);
            glow.rotation.x = Math.PI / 2;
            vehicleGroup.add(glow);
            glows.push(glow);
        });
        
        // 사용자 데이터에 엔진 정보 저장
        vehicleGroup.userData.engines = engines;
        vehicleGroup.userData.glows = glows;
    }

    /**
     * 테스트기 모델 생성 (작고 빠른 차량)
     */
    createTestVehicleModel(vehicleGroup, vehicleData) {
        // 작은 스케일
        const scale = 0.8;
        const engineColor = "#00FF88";
        const glowColor = "#00FFAA";
        
        // 작은 뾰족한 머리
        const headGeometry = new THREE.ConeGeometry(1.2 * scale, 6 * scale, 6);
        const headMaterial = new THREE.MeshLambertMaterial({ 
            color: vehicleData.color 
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.rotation.x = Math.PI / 2;
        head.position.z = 3 * scale;
        head.castShadow = true;
        vehicleGroup.add(head);
        
        // 작은 조종석
        const cockpitGeometry = new THREE.SphereGeometry(0.8 * scale, 6, 6);
        const cockpitMaterial = new THREE.MeshPhongMaterial({
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.4,
            shininess: 100
        });
        const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
        cockpit.position.set(0, 0.3 * scale, 0.5 * scale);
        vehicleGroup.add(cockpit);
        
        // 작은 메인 바디
        const bodyGeometry = new THREE.BoxGeometry(1.5 * scale, 0.8 * scale, 4 * scale);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: vehicleData.color 
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        vehicleGroup.add(body);
        
        // 작은 날개
        const wingGeometry = new THREE.BoxGeometry(8 * scale, 0.3 * scale, 2 * scale);
        const wingMaterial = new THREE.MeshLambertMaterial({ 
            color: vehicleData.color 
        });
        const wings = new THREE.Mesh(wingGeometry, wingMaterial);
        wings.castShadow = true;
        vehicleGroup.add(wings);
        
        // 작은 엔진
        const engineGeometry = new THREE.CylinderGeometry(1 * scale, 1 * scale, 0.4 * scale, 12);
        const engineMaterial = new THREE.MeshBasicMaterial({ 
            color: engineColor
        });
        const engine = new THREE.Mesh(engineGeometry, engineMaterial);
        engine.position.set(0, 0, -2.5 * scale);
        engine.rotation.x = Math.PI / 2;
        vehicleGroup.add(engine);
        
        // 작은 엔진 글로우 효과
        const glowGeometry = new THREE.CylinderGeometry(1.5 * scale, 1.5 * scale, 0.2 * scale, 12);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: glowColor,
            transparent: true,
            opacity: 0.6
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.set(0, 0, -3 * scale);
        glow.rotation.x = Math.PI / 2;
        vehicleGroup.add(glow);
        
        // 사용자 데이터에 엔진 정보 저장
        vehicleGroup.userData.engine = engine;
        vehicleGroup.userData.glow = glow;
    }

    /**
     * 총알 생성
     */
    createBullet(bulletData) {
        // config에서 총알 설정 가져오기
        const bulletConfig = this.config?.effects?.bullet || {};
        
        const bulletGeometry = new THREE.SphereGeometry(bulletConfig.radius || 0.5, 8, 8);
        const bulletMaterial = new THREE.MeshBasicMaterial({ 
            color: bulletConfig.color || "#FFFF00"
        });
        
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        bullet.position.set(
            bulletData.position.x || 0,
            bulletData.position.y || 0,
            bulletData.position.z || 0
        );
        bullet.userData = { bulletData: bulletData };
        
        // 총알 궤적 생성
        const trailGeometry = new THREE.CylinderGeometry(
            bulletConfig.trailRadius || 0.1, 
            bulletConfig.trailRadius || 0.1, 
            bulletConfig.trailLength || 3
        );
        const trailMaterial = new THREE.MeshBasicMaterial({ 
            color: bulletConfig.trailColor || "#FF8800",
            transparent: true,
            opacity: 0.8
        });
        const trail = new THREE.Mesh(trailGeometry, trailMaterial);
        trail.rotation.x = Math.PI / 2;
        trail.position.z = -(bulletConfig.trailLength || 3) / 2;
        bullet.add(trail);
        
        // 총알 글로우 효과 추가
        const glowGeometry = new THREE.SphereGeometry(bulletConfig.glowRadius || 0.8, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: bulletConfig.color || "#FFFF00",
            transparent: true,
            opacity: bulletConfig.glowOpacity || 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        bullet.add(glow);
        
        this.bullets.set(bulletData.id, bullet);
        this.scene.add(bullet);
        
        return bullet;
    }

    /**
     * 폭발 생성
     */
    createExplosion(explosionData) {
        // config에서 폭발 설정 가져오기
        const explosionConfig = this.config?.effects?.explosion || {};
        
        const explosionGroup = new THREE.Group();
        
        // 메인 폭발 (더 크게)
        const explosionRadius = (explosionConfig.radius || 1) * (explosionData.radius || 1);
        const explosionGeometry = new THREE.SphereGeometry(explosionRadius, 32, 32); // 더 세밀하게
        const explosionMaterial = new THREE.MeshBasicMaterial({
            color: explosionConfig.color || "#FF4400",
            transparent: true,
            opacity: explosionConfig.opacity || 1.0
        });
        const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
        explosionGroup.add(explosion);
        
        // 외부 글로우 효과 추가
        const glowGeometry = new THREE.SphereGeometry(explosionRadius * 1.5, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: "#FFAA00",
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        explosionGroup.add(glow);
        
        // 파티클 효과 (더 많이, 더 넓게)
        const particleCount = (explosionConfig.particleCount || 20) * 2; // 2배 증가
        const particleColors = explosionConfig.particleColors || ["#FF4400", "#FFAA00", "#FF0000", "#FFFF00"];
        const spreadRange = explosionRadius * 3; // 확산 범위 3배 증가
        
        for (let i = 0; i < particleCount; i++) {
            const particleRadius = (explosionConfig.particleRadius || 0.2) * (1 + Math.random());
            const particleGeometry = new THREE.SphereGeometry(particleRadius, 8, 8);
            const particleColor = particleColors[Math.floor(Math.random() * particleColors.length)];
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: particleColor,
                transparent: true,
                opacity: explosionConfig.particleOpacity || 0.9
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // 더 넓은 범위로 파티클 확산
            particle.position.set(
                (Math.random() - 0.5) * spreadRange,
                (Math.random() - 0.5) * spreadRange,
                (Math.random() - 0.5) * spreadRange
            );
            
            // 파티클에 속도 정보 저장 (애니메이션용)
            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20
            );
            
            explosionGroup.add(particle);
        }
        
        explosionGroup.position.set(
            explosionData.position.x || 0,
            explosionData.position.y || 0,
            explosionData.position.z || 0
        );
        explosionGroup.userData = { 
            explosionData: explosionData,
            createdAt: Date.now(),
            duration: explosionData.duration || 2000
        };
        
        this.explosions.set(explosionData.id, explosionGroup);
        this.scene.add(explosionGroup);
        
        // 폭발 애니메이션 시작
        this.animateExplosion(explosionGroup);
        
        return explosionGroup;
    }

    /**
     * 폭발 애니메이션
     */
    animateExplosion(explosionGroup) {
        const startTime = Date.now();
        const duration = explosionGroup.userData.duration || 2000;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1.0) {
                // 애니메이션 완료 - 폭발 제거
                this.scene.remove(explosionGroup);
                this.explosions.delete(explosionGroup.userData.explosionData.id);
                return;
            }
            
            // 메인 폭발 스케일 애니메이션 (확장 후 축소)
            const scaleProgress = progress < 0.3 ? progress / 0.3 : 1 - ((progress - 0.3) / 0.7);
            const scale = 0.5 + scaleProgress * 1.5; // 0.5에서 2.0까지 확장 후 축소
            
            explosionGroup.children.forEach((child, index) => {
                if (index === 0) {
                    // 메인 폭발
                    child.scale.setScalar(scale);
                    child.material.opacity = (1 - progress) * 1.0;
                } else if (index === 1) {
                    // 글로우 효과
                    child.scale.setScalar(scale * 1.2);
                    child.material.opacity = (1 - progress) * 0.3;
                } else {
                    // 파티클들
                    if (child.userData.velocity) {
                        // 파티클 이동
                        child.position.add(child.userData.velocity.clone().multiplyScalar(0.016)); // 60fps 기준
                        
                        // 중력 효과
                        child.userData.velocity.y -= 0.5;
                        
                        // 공기 저항
                        child.userData.velocity.multiplyScalar(0.98);
                        
                        // 파티클 페이드 아웃
                        child.material.opacity = (1 - progress) * 0.9;
                        
                        // 파티클 크기 변화
                        const particleScale = 1 - progress * 0.5;
                        child.scale.setScalar(particleScale);
                    }
                }
            });
            
            requestAnimationFrame(animate);
        };
        
        animate();
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
        canvas.width = this.config?.client?.ui?.canvas?.textWidth || 512;
        canvas.height = this.config?.client?.ui?.canvas?.textHeight || 256;
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
        const lineHeight = this.config?.client?.ui?.canvas?.lineHeight || 60;
        const startY = canvas.height / 2 - (lines.length - 1) * lineHeight / 2;
        
        lines.forEach((line, index) => {
            context.fillText(line, canvas.width / 2, startY + index * lineHeight);
        });
        
        // 텍스처 생성 및 적용
        const texture = new THREE.CanvasTexture(canvas);
        panel.material.map = texture;
        panel.material.needsUpdate = true;
    }

    /**
     * 입력 컨트롤 설정 - 원래 게임과 동일
     */
    setupControls() {
        // 키보드 이벤트
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            // 시점 전환
            if (e.code === 'KeyV') {
                this.toggleFirstPerson();
            }
            
            // 기본 동작 방지 (스페이스바 스크롤 등)
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            
            // 기본 동작 방지
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
        });
        
        // 마우스 이벤트 (1인칭 시점용)
        document.addEventListener('mousemove', (e) => {
            if (this.isFirstPerson && document.pointerLockElement) {
                this.mouseX += e.movementX * 0.002;
                this.mouseY += e.movementY * 0.002;
                this.mouseY = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.mouseY));
            }
        });
        
        document.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // 좌클릭
                this.inputs.fire = true;
            }
        });
        
        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.inputs.fire = false;
            }
        });
        
        // 게임 캔버스에 포커스 설정
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.setAttribute('tabindex', '0');
            canvas.focus();
            canvas.addEventListener('click', () => {
                canvas.focus();
            });
        }
    }

    /**
     * 시점 전환 - 원래 게임과 동일
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
    }

    /**
     * 입력 업데이트 - 원래 게임과 동일
     */
    updateInputs() {
        // 추력 (Shift: 가속, Ctrl: 감속)
        if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) {
            this.inputs.thrust = 1;
        } else if (this.keys['ControlLeft'] || this.keys['ControlRight']) {
            this.inputs.thrust = -1;
        } else {
            this.inputs.thrust = 0;
        }
        
        // 피치 (W: 기수 상승, S: 기수 하강)
        if (this.keys['KeyW'] || this.keys['ArrowUp']) {
            this.inputs.pitch = 1; // W키: 위로 보기 (양수)
        } else if (this.keys['KeyS'] || this.keys['ArrowDown']) {
            this.inputs.pitch = -1; // S키: 아래로 보기 (음수)
        } else {
            this.inputs.pitch = 0;
        }
        
        // 요 (A: 우회전, D: 좌회전)
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
            this.inputs.yaw = 1;
        } else if (this.keys['KeyD'] || this.keys['ArrowRight']) {
            this.inputs.yaw = -1;
        } else {
            this.inputs.yaw = 0;
        }
        
        // 롤 (Q: 좌롤, E: 우롤)
        if (this.keys['KeyQ']) {
            this.inputs.roll = -1;
        } else if (this.keys['KeyE']) {
            this.inputs.roll = 1;
        } else {
            this.inputs.roll = 0;
        }
        
        // 수직 이동 (Space: 상승, X: 하강)
        if (this.keys['Space']) {
            this.inputs.vertical = 1;
        } else if (this.keys['KeyX']) {
            this.inputs.vertical = -1;
        } else {
            this.inputs.vertical = 0;
        }
        
        // 발사 (P키 또는 마우스)
        if (this.keys['KeyP']) {
            this.inputs.fire = true;
        }
        
        // 1인칭 시점에서는 마우스 입력을 비행체 조작에 적용하지 않음
        // 카메라가 비행체 회전을 직접 따라가므로 별도 처리 불필요
    }

    /**
     * 카메라 업데이트 - 원래 게임 방식
     */
    updateCamera() {
        if (!this.myVehicle) return;
        
        const vehiclePosition = this.myVehicle.position;
        const vehicleRotation = this.myVehicle.rotation; // 전체 비행체의 회전 사용
        
        if (this.isFirstPerson) {
            // 1인칭 시점 - 비행체 조종석에서 앞쪽을 바라보기
            // 조종석 위치로 카메라 이동 (앞쪽으로 약간 이동)
            const cockpitOffset = new THREE.Vector3(0, 2, 1); // 조종석 위치
            
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
            
            // 비행체의 앞쪽 방향 계산 (머리가 있는 방향) - +Z 방향으로 수정
            const forwardDirection = new THREE.Vector3(0, 0, 1); // +Z 방향으로 변경 (머리 방향)
            forwardDirection.applyEuler(new THREE.Euler(
                vehicleRotation.x,
                vehicleRotation.y,
                vehicleRotation.z,
                'YXZ'
            ));
            
            // 카메라가 앞쪽을 바라보도록 설정
            const lookAtTarget = this.camera.position.clone().add(forwardDirection);
            this.camera.lookAt(lookAtTarget);
        } else {
            // 3인칭 시점 - 원래 게임처럼 비행체 뒤쪽에서 따라오기
            const distance = this.config?.camera?.followDistance || 50; // 비행체로부터의 거리
            const height = this.config?.camera?.followHeight || 20;   // 비행체 위쪽 높이
            
            // 비행체 뒤쪽 위치 계산 (뾰족한 부분이 앞이므로 반대 방향)
            const cameraPosition = new THREE.Vector3(
                vehiclePosition.x - Math.sin(vehicleRotation.y) * distance,
                vehiclePosition.y + height,
                vehiclePosition.z - Math.cos(vehicleRotation.y) * distance
            );
            
            // 카메라 위치를 부드럽게 이동
            this.camera.position.lerp(cameraPosition, this.config?.camera?.smoothing || 0.1);
            
            // 카메라가 비행체를 바라보도록 설정
            this.camera.lookAt(vehiclePosition);
            
            // OrbitControls 타겟도 비행체로 설정
            this.controls.target.copy(vehiclePosition);
        }
    }

    /**
     * UI 설정
     */
    setupUI() {
        this.updatePlayerInfo();
        this.updatePlayerList();
    }

    /**
     * 플레이어 정보 업데이트
     */
    updatePlayerInfo() {
        const playerInfoDiv = document.getElementById('playerInfo');
        if (this.myVehicle && this.myVehicle.userData.vehicleData) {
            const vehicleData = this.myVehicle.userData.vehicleData;
            playerInfoDiv.innerHTML = `
                <p><strong>이름:</strong> ${this.myPlayer.name}</p>
                <p><strong>점수:</strong> ${this.myPlayer.score}</p>
                <p><strong>킬:</strong> ${this.myPlayer.kills}</p>
                <p><strong>데스:</strong> ${this.myPlayer.deaths}</p>
                <p><strong>체력:</strong> ${vehicleData.health}/${vehicleData.maxHealth}</p>
            `;
            
            // 체력바 업데이트
            const healthPercent = (vehicleData.health / vehicleData.maxHealth) * 100;
            document.getElementById('healthFill').style.width = `${healthPercent}%`;
        }
    }

    /**
     * 플레이어 목록 업데이트
     */
    updatePlayerList() {
        const playersDiv = document.getElementById('players');
        playersDiv.innerHTML = '';
        
        // 최신 플레이어 정보를 저장할 맵
        const playerMap = new Map();
        
        // 현재 게임 상태의 플레이어 정보로 맵 생성
        if (this.latestGameState && this.latestGameState.players) {
            this.latestGameState.players.forEach(player => {
                playerMap.set(player.id, player);
            });
        }
        
        for (const [vehicleId, vehicle] of this.vehicles) {
            const vehicleData = vehicle.userData.vehicleData;
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-item';
            
            // 플레이어 이름 찾기
            let playerName = 'Unknown';
            let playerScore = 0;
            
            // 내 플레이어인 경우
            if (vehicleData.playerId === this.myPlayer.id) {
                playerName = this.myPlayer.name;
                playerScore = this.myPlayer.score || 0;
            } else {
                // 다른 플레이어인 경우 - 최신 gameState에서 찾기
                const player = playerMap.get(vehicleData.playerId);
                    if (player && player.name) {
                        playerName = player.name;
                    playerScore = player.score || 0;
                    }
                }
            
            // Unknown 플레이어는 표시하지 않음
            if (playerName === 'Unknown') {
                continue;
            }
            
            playerDiv.innerHTML = `
                <div style="display: flex; align-items: center;">
                    <div class="player-color" style="background-color: ${vehicleData.color}"></div>
                    <span>${vehicleData.playerId === this.myPlayer.id ? '(나) ' : ''}${playerName}</span>
                </div>
                <div>
                    <span>❤️ ${vehicleData.health} 🏆 ${playerScore}</span>
                </div>
            `;
            
            playersDiv.appendChild(playerDiv);
        }
    }

    /**
     * 소켓 이벤트 리스너 설정
     */
    setupSocketListeners() {
        this.socket.on('gameStateUpdate', (gameState) => {
            this.updateGameState(gameState);
        });
        
        this.socket.on('bulletCreated', (data) => {
            this.createBullet(data.bullet);
            
            // 총구 스파크 효과 생성 (발사한 비행체에서)
            if (data.shooterId) {
                // 발사한 플레이어의 비행체 찾기
                for (const [vehicleId, vehicle] of this.vehicles) {
                    if (vehicle.userData.vehicleData && vehicle.userData.vehicleData.playerId === data.shooterId) {
                        this.createMuzzleFlash(vehicleId);
                        break;
                    }
                }
            }
        });
        
        this.socket.on('muzzleFlash', (data) => {
            // 서버에서 직접 총구 효과 이벤트를 받은 경우
            if (data.playerId) {
                for (const [vehicleId, vehicle] of this.vehicles) {
                    if (vehicle.userData.vehicleData && vehicle.userData.vehicleData.playerId === data.playerId) {
                        this.createMuzzleFlash(vehicleId);
                        break;
                    }
                }
            }
        });
        
        this.socket.on('bulletDestroyed', (data) => {
            const bullet = this.bullets.get(data.bulletId);
            if (bullet) {
                this.scene.remove(bullet);
                this.bullets.delete(data.bulletId);
            }
        });
        
        this.socket.on('explosionCreated', (data) => {
            this.createExplosion(data.explosion);
        });
        
        this.socket.on('explosionDestroyed', (data) => {
            const explosion = this.explosions.get(data.explosionId);
            if (explosion) {
                this.scene.remove(explosion);
                this.explosions.delete(data.explosionId);
            }
        });
        
        this.socket.on('bulletHoleCreated', (data) => {
            const billboard = this.billboards.get(data.billboardId);
            if (billboard) {
                this.createBulletHole(billboard, data.bulletHole);
            }
        });
        
        this.socket.on('billboardDestroyed', (data) => {
            const billboard = this.billboards.get(data.billboardId);
            if (billboard) {
                console.log(`Billboard ${data.billboardId} destroyed by player ${data.destroyedBy}`);
                
                // 파편 효과 생성
                if (data.debris) {
                    this.createDebrisEffect(data.debris);
                }
                
                // 광고판 즉시 제거
                this.scene.remove(billboard);
                this.billboards.delete(data.billboardId);
            }
        });
        
        this.socket.on('vehicleDestroyed', (data) => {
            console.log('Vehicle destroyed:', data);
            
            // 파괴된 차량을 즉시 숨기기
            if (data.shouldHide) {
                const vehicle = this.vehicles.get(data.vehicleId);
                if (vehicle) {
                    vehicle.visible = false;
                    console.log(`Vehicle ${data.vehicleId} hidden after destruction`);
                }
            }
        });
        
        this.socket.on('vehicleRespawned', (data) => {
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
        });
        
        this.socket.on('gameStarted', (data) => {
            document.getElementById('gameStatus').textContent = '게임 진행 중';
        });
        
        this.socket.on('gameEnded', () => {
            document.getElementById('gameStatus').textContent = '게임 종료';
        });
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
                        // 새로운 폭발 생성
                        const newExplosion = this.createExplosion(effectData);
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
        
        this.updatePlayerInfo();
        this.updatePlayerList();
    }

    /**
     * 입력을 서버로 전송
     */
    sendInputs() {
        const now = Date.now();
        if (now - this.lastInputSend < 1000 / this.inputSendRate) {
            return;
        }
        
        // 입력이 있을 때만 전송하거나 주기적으로 전송
        const hasInput = Object.values(this.inputs).some(val => val !== 0 && val !== false);
        
        if (hasInput || (now - this.lastInputSend) > 100) { // 최소 100ms마다 전송
            this.socket.emit('playerInput', this.inputs);
            this.lastInputSend = now;
        }
        
        // 발사 입력은 한 번만 전송
        if (this.inputs.fire) {
            this.inputs.fire = false;
        }
    }

    /**
     * 윈도우 리사이즈 처리
     */
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
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
        
        // 입력 업데이트
        this.updateInputs();
        this.sendInputs();
        
        // 내 비행체 부스터 효과 업데이트
        this.updateMyVehicleBooster();
        
        // 카메라 업데이트
        this.updateCamera();
        
        // OrbitControls 업데이트 (1인칭이 아닐 때만, 그리고 사용자가 마우스로 조작할 때만)
        if (!this.isFirstPerson && this.controls.enabled) {
            this.controls.update();
        }
        
        // 구름 애니메이션
        this.clouds.forEach(cloud => {
            cloud.position.x += 0.1;
            if (cloud.position.x > 400) {
                cloud.position.x = -400;
            }
        });
        
        // 렌더링 통계 리셋 (성능 최적화)
        this.renderer.info.reset();
        
        // 렌더링
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * 파편 효과 생성
     */
    createDebrisEffect(debrisData) {
        debrisData.forEach(debris => {
            // 파편 지오메트리 (랜덤한 모양)
            const debrisGeometry = new THREE.BoxGeometry(
                debris.size,
                debris.size * (0.5 + Math.random() * 0.5),
                debris.size * (0.3 + Math.random() * 0.4)
            );
            
            const debrisMaterial = new THREE.MeshLambertMaterial({
                color: debris.color
            });
            
            const debrisMesh = new THREE.Mesh(debrisGeometry, debrisMaterial);
            
            // 초기 위치 설정
            debrisMesh.position.set(
                debris.position.x,
                debris.position.y,
                debris.position.z
            );
            
            // 초기 회전 설정
            debrisMesh.rotation.set(
                debris.rotation.x,
                debris.rotation.y,
                debris.rotation.z
            );
            
            debrisMesh.castShadow = true;
            
            // 파편 데이터 저장
            debrisMesh.userData = {
                velocity: { ...debris.velocity },
                angularVelocity: {
                    x: (Math.random() - 0.5) * 0.2,
                    y: (Math.random() - 0.5) * 0.2,
                    z: (Math.random() - 0.5) * 0.2
                },
                gravity: -30,
                lifeTime: debris.lifeTime,
                createdAt: Date.now()
            };
            
            this.scene.add(debrisMesh);
            
            // 파편 애니메이션 및 제거
            this.animateDebris(debrisMesh);
        });
    }
    
    /**
     * 파편 애니메이션
     */
    animateDebris(debrisMesh) {
        const animate = () => {
            const now = Date.now();
            const elapsed = now - debrisMesh.userData.createdAt;
            
            // 수명이 다했으면 제거
            if (elapsed >= debrisMesh.userData.lifeTime) {
                this.scene.remove(debrisMesh);
                return;
            }
            
            const deltaTime = 0.016; // 약 60fps
            
            // 중력 적용
            debrisMesh.userData.velocity.y += debrisMesh.userData.gravity * deltaTime;
            
            // 위치 업데이트
            debrisMesh.position.x += debrisMesh.userData.velocity.x * deltaTime;
            debrisMesh.position.y += debrisMesh.userData.velocity.y * deltaTime;
            debrisMesh.position.z += debrisMesh.userData.velocity.z * deltaTime;
            
            // 회전 업데이트
            debrisMesh.rotation.x += debrisMesh.userData.angularVelocity.x;
            debrisMesh.rotation.y += debrisMesh.userData.angularVelocity.y;
            debrisMesh.rotation.z += debrisMesh.userData.angularVelocity.z;
            
            // 지면 충돌 검사 (간단한 바운스)
            const groundHeight = this.getTerrainHeight(debrisMesh.position.x, debrisMesh.position.z);
            if (debrisMesh.position.y <= groundHeight) {
                debrisMesh.position.y = groundHeight;
                debrisMesh.userData.velocity.y *= -0.3; // 바운스 감쇠
                debrisMesh.userData.velocity.x *= 0.8; // 마찰
                debrisMesh.userData.velocity.z *= 0.8;
            }
            
            // 투명도 페이드 아웃 (수명의 마지막 30%에서)
            const fadeStart = debrisMesh.userData.lifeTime * 0.7;
            if (elapsed > fadeStart) {
                const fadeProgress = (elapsed - fadeStart) / (debrisMesh.userData.lifeTime - fadeStart);
                debrisMesh.material.opacity = 1 - fadeProgress;
                debrisMesh.material.transparent = true;
            }
            
            requestAnimationFrame(animate);
        };
        
        animate();
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
     * 총구 스파크 효과 생성
     */
    createMuzzleFlash(vehicleId) {
        const vehicle = this.vehicles.get(vehicleId);
        if (!vehicle) return;

        // 총구 위치 계산 (비행체 머리 부분)
        const vehicleRotation = vehicle.rotation;
        const muzzleOffset = {
            x: Math.sin(vehicleRotation.y) * Math.cos(vehicleRotation.x) * 8,
            y: -Math.sin(vehicleRotation.x) * 8,
            z: Math.cos(vehicleRotation.y) * Math.cos(vehicleRotation.x) * 8
        };

        const muzzlePosition = {
            x: vehicle.position.x + muzzleOffset.x,
            y: vehicle.position.y + muzzleOffset.y,
            z: vehicle.position.z + muzzleOffset.z
        };

        // 스파크 파티클 그룹 생성
        const sparkGroup = new THREE.Group();

        // 메인 플래시 (밝은 노란색 구)
        const flashGeometry = new THREE.SphereGeometry(1.5, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        });
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        sparkGroup.add(flash);

        // 스파크 파티클들 (작은 노란색/주황색 점들)
        const particleCount = this.config?.effects?.muzzleFlash?.particleCount || 15;
        for (let i = 0; i < particleCount; i++) {
            const sparkGeometry = new THREE.SphereGeometry(0.1, 4, 4);
            const sparkMaterial = new THREE.MeshBasicMaterial({
                color: Math.random() > 0.5 ? 0xffff00 : 0xff8800,
                transparent: true,
                opacity: 0.9
            });
            const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
            
            // 랜덤한 방향으로 스파크 배치
            const angle = Math.random() * Math.PI * 2;
            const distance = 1 + Math.random() * (this.config?.effects?.muzzleFlash?.spreadDistance || 3);
            const height = (Math.random() - 0.5) * 2;
            
            spark.position.set(
                Math.cos(angle) * distance,
                height,
                Math.sin(angle) * distance
            );
            
            sparkGroup.add(spark);
        }

        // 위치 설정
        sparkGroup.position.set(muzzlePosition.x, muzzlePosition.y, muzzlePosition.z);
        
        // 비행체 방향에 맞춰 회전
        sparkGroup.rotation.copy(vehicleRotation);

        this.scene.add(sparkGroup);

        // 스파크 애니메이션 및 제거
        this.animateMuzzleFlash(sparkGroup);
    }

    /**
     * 총구 스파크 애니메이션
     */
    animateMuzzleFlash(sparkGroup) {
        const startTime = Date.now();
        const duration = this.config?.effects?.muzzleFlash?.duration || 150; // 0.15초

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;

            if (progress >= 1) {
                // 애니메이션 완료, 제거
                this.scene.remove(sparkGroup);
                return;
            }

            // 페이드 아웃
            const opacity = 1 - progress;
            sparkGroup.children.forEach(child => {
                if (child.material) {
                    child.material.opacity = opacity;
                }
            });

            // 스파크 확산 효과
            sparkGroup.children.forEach((child, index) => {
                if (index > 0) { // 메인 플래시 제외
                    const scale = 1 + progress * 2;
                    child.scale.setScalar(scale);
                    
                    // 스파크가 바깥쪽으로 이동
                    const originalPos = child.position.clone().normalize();
                    child.position.copy(originalPos.multiplyScalar(1 + progress * 3));
                }
            });

            requestAnimationFrame(animate);
        };

        animate();
    }

    /**
     * 내 비행체 부스터 효과 업데이트
     */
    updateMyVehicleBooster() {
        if (!this.myVehicle) return;

        const vehicleData = this.myVehicle.userData.vehicleData;
        if (!vehicleData) return;
        
        // Shift 키 부스터 효과 확인
        const isBoosterActive = this.inputs.thrust > 0; // Shift 키가 눌렸을 때
        
        // 차량 타입에 따라 적절한 엔진 효과 적용
        if (vehicleData.vehicleType === 'heavy') {
            // 중형기 듀얼 엔진 효과
            if (this.myVehicle.userData.engines && this.myVehicle.userData.glows) {
                const engineColor = this.config?.vehicles?.heavy?.engineColor || "#FF4400";
                const glowColor = this.config?.vehicles?.heavy?.glowColor || "#FF6600";
                
                this.myVehicle.userData.engines.forEach((engine, index) => {
                    const glow = this.myVehicle.userData.glows[index];
                    
                    if (isBoosterActive) {
                        // 부스터 활성화 시 노란색 강화 효과
                        engine.material.color.setHex(0xFFFF00); // 노란색
                        engine.material.opacity = 1.0;
                        glow.material.color.setHex(0xFFAA00); // 주황-노랑
                        glow.material.opacity = 0.8;
                        
                        // 글로우 크기 증가
                        glow.scale.setScalar(1.5);
                    } else {
                        // 부스터 비활성화 시 엔진 완전히 끄기
                        engine.material.color.setHex(parseInt(engineColor.replace('#', '0x')));
                        engine.material.opacity = 0.0; // 완전히 끄기
                        glow.material.color.setHex(parseInt(glowColor.replace('#', '0x')));
                        glow.material.opacity = 0.0; // 완전히 끄기
                        
                        // 글로우 크기 원래대로
                        glow.scale.setScalar(1.0);
                    }
                });
            }
        } else {
            // 전투기 엔진 효과
            if (this.myVehicle.userData.engine && this.myVehicle.userData.glow) {
                const engineColor = this.config?.vehicles?.fighter?.engineColor || "#00AAFF";
                const glowColor = this.config?.vehicles?.fighter?.glowColor || "#0088FF";
                
                if (isBoosterActive) {
                    // 부스터 활성화 시 노란색 강화 효과
                    this.myVehicle.userData.engine.material.color.setHex(0xFFFF00); // 노란색
                    this.myVehicle.userData.engine.material.opacity = 1.0;
                    this.myVehicle.userData.glow.material.color.setHex(0xFFAA00); // 주황-노랑
                    this.myVehicle.userData.glow.material.opacity = 0.8;
                    
                    // 글로우 크기 증가
                    this.myVehicle.userData.glow.scale.setScalar(1.5);
                } else {
                    // 부스터 비활성화 시 엔진 완전히 끄기
                    this.myVehicle.userData.engine.material.color.setHex(parseInt(engineColor.replace('#', '0x')));
                    this.myVehicle.userData.glow.material.color.setHex(parseInt(glowColor.replace('#', '0x')));
                    // 엔진 완전히 끄기
                    this.myVehicle.userData.engine.material.opacity = 0.0;
                    this.myVehicle.userData.glow.material.opacity = 0.0;
                    
                    // 글로우 크기 원래대로
                    this.myVehicle.userData.glow.scale.setScalar(1.0);
                }
            }
        }
    }

    /**
     * 맵 경계 표시 생성
     */
    createMapBoundaries() {
        const mapSize = this.config.world.size;
        const boundaryHeight = this.config.world.maxHeight / 2 || 100; // 최대 높이의 절반
        
        // 경계 벽 재질 (반투명한 빨간색)
        const boundaryMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        
        // 북쪽 벽
        const northWall = new THREE.PlaneGeometry(mapSize, boundaryHeight);
        const northMesh = new THREE.Mesh(northWall, boundaryMaterial);
        northMesh.position.set(0, boundaryHeight / 2, mapSize / 2);
        northMesh.rotation.x = 0;
        this.scene.add(northMesh);
        
        // 남쪽 벽
        const southWall = new THREE.PlaneGeometry(mapSize, boundaryHeight);
        const southMesh = new THREE.Mesh(southWall, boundaryMaterial);
        southMesh.position.set(0, boundaryHeight / 2, -mapSize / 2);
        southMesh.rotation.x = 0;
        southMesh.rotation.y = Math.PI;
        this.scene.add(southMesh);
        
        // 동쪽 벽
        const eastWall = new THREE.PlaneGeometry(mapSize, boundaryHeight);
        const eastMesh = new THREE.Mesh(eastWall, boundaryMaterial);
        eastMesh.position.set(mapSize / 2, boundaryHeight / 2, 0);
        eastMesh.rotation.y = -Math.PI / 2;
        this.scene.add(eastMesh);
        
        // 서쪽 벽
        const westWall = new THREE.PlaneGeometry(mapSize, boundaryHeight);
        const westMesh = new THREE.Mesh(westWall, boundaryMaterial);
        westMesh.position.set(-mapSize / 2, boundaryHeight / 2, 0);
        westMesh.rotation.y = Math.PI / 2;
        this.scene.add(westMesh);
        
        // 천장 (높이 제한 표시)
        const ceilingGeometry = new THREE.PlaneGeometry(mapSize, mapSize);
        const ceilingMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide
        });
        const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
        ceiling.position.set(0, this.config.world.maxHeight, 0);
        ceiling.rotation.x = -Math.PI / 2;
        this.scene.add(ceiling);
    }
} 