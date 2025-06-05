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
        this.inputSendRate = 60; // Hz
        
        this.setupSocketListeners();
    }

    /**
     * 게임 클라이언트 초기화
     */
    async init() {
        this.initThreeJS();
        this.createWorld();
        this.setupControls();
        this.setupUI();
        
        // 초기 게임 상태 적용
        this.updateGameState(this.gameData.gameState);
        
        this.animate();
    }

    /**
     * Three.js 초기화 - 원래 게임과 동일
     */
    initThreeJS() {
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

        // 렌더러 설정
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('gameCanvas'),
            antialias: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // OrbitControls 설정 - 원래 게임과 동일
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 500;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.enabled = true; // 기본적으로 활성화
        
        // 초기 카메라 타겟 설정
        this.controls.target.set(0, 0, 0);

        // 조명 설정
        this.setupLighting();

        // 윈도우 리사이즈 처리
        window.addEventListener('resize', () => this.onWindowResize());
    }

    /**
     * 조명 설정
     */
    setupLighting() {
        // 태양광
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(100, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
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
        for (let i = 0; i < 20; i++) {
            const cloudGeometry = new THREE.SphereGeometry(20, 8, 8);
            const cloudMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.7
            });
            
            const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
            cloud.position.set(
                (Math.random() - 0.5) * 800,
                50 + Math.random() * 100,
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
        for (let i = 0; i < 100; i++) {
            const tree = this.createTree();
            let x, z, terrainHeight;
            let attempts = 0;
            
            // 적절한 위치를 찾을 때까지 시도 (최대 10번)
            do {
                x = (Math.random() - 0.5) * 300;
                z = (Math.random() - 0.5) * 300;
                terrainHeight = this.getTerrainHeight(x, z);
                attempts++;
            } while (terrainHeight <= this.config.world.waterLevel + 2 && attempts < 10);
            
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
        
        // 뾰족한 머리 (항상 앞쪽 +Z 방향)
        const headGeometry = new THREE.ConeGeometry(1.5, 8, 8);
        const headMaterial = new THREE.MeshLambertMaterial({ 
            color: vehicleData.color 
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.rotation.x = Math.PI / 2; // 앞을 향하도록 회전
        head.position.z = 4; // 앞쪽에 위치
        head.castShadow = true;
        vehicleGroup.add(head);
        
        // 조종석 (투명한 돔)
        const cockpitGeometry = new THREE.SphereGeometry(1.2, 8, 8);
        const cockpitMaterial = new THREE.MeshPhongMaterial({
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.3,
            shininess: 100
        });
        const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
        cockpit.position.y = 0.5;
        cockpit.position.z = 1;
        vehicleGroup.add(cockpit);
        
        // 메인 바디
        const bodyGeometry = new THREE.BoxGeometry(2, 1, 6);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: vehicleData.color 
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        vehicleGroup.add(body);
        
        // 날개 (좌우)
        const wingGeometry = new THREE.BoxGeometry(12, 0.5, 3);
        const wingMaterial = new THREE.MeshLambertMaterial({ 
            color: vehicleData.color 
        });
        const wings = new THREE.Mesh(wingGeometry, wingMaterial);
        wings.castShadow = true;
        vehicleGroup.add(wings);
        
        // 엔진 글로우 (뒤쪽 노란 발광)
        const engineGeometry = new THREE.CylinderGeometry(1.5, 1.5, 0.5, 16);
        const engineMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffaa00
        });
        const engine = new THREE.Mesh(engineGeometry, engineMaterial);
        engine.position.z = -4; // 뒤쪽에 위치
        engine.rotation.x = Math.PI / 2;
        vehicleGroup.add(engine);
        
        // 엔진 글로우 효과 (더 큰 반투명 원판)
        const glowGeometry = new THREE.CylinderGeometry(2.5, 2.5, 0.2, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.4
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.z = -4.5;
        glow.rotation.x = Math.PI / 2;
        vehicleGroup.add(glow);
        
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
        
        // 사용자 데이터 저장
        vehicleGroup.userData = {
            vehicleData: vehicleData,
            engine: engine,
            glow: glow
        };
        
        this.vehicles.set(vehicleData.id, vehicleGroup);
        this.scene.add(vehicleGroup);
        
        // 내 비행체인 경우 참조 저장
        if (vehicleData.playerId === this.myPlayer.id) {
            this.myVehicle = vehicleGroup;
        }
        
        return vehicleGroup;
    }

    /**
     * 총알 생성
     */
    createBullet(bulletData) {
        const bulletGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const bulletMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00
        });
        
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        bullet.position.set(
            bulletData.position.x || 0,
            bulletData.position.y || 0,
            bulletData.position.z || 0
        );
        bullet.userData = { bulletData: bulletData };
        
        // 총알 궤적 생성
        const trailGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3);
        const trailMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff8800,
            transparent: true,
            opacity: 0.8
        });
        const trail = new THREE.Mesh(trailGeometry, trailMaterial);
        trail.rotation.x = Math.PI / 2;
        trail.position.z = -1.5;
        bullet.add(trail);
        
        // 총알 글로우 효과 추가
        const glowGeometry = new THREE.SphereGeometry(0.8, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.3
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
        const explosionGroup = new THREE.Group();
        
        // 메인 폭발
        const explosionGeometry = new THREE.SphereGeometry(1, 16, 16);
        const explosionMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4400,
            transparent: true,
            opacity: 0.8
        });
        const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
        explosionGroup.add(explosion);
        
        // 파티클 효과
        for (let i = 0; i < 20; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.2, 4, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: Math.random() > 0.5 ? 0xff4400 : 0xffaa00,
                transparent: true,
                opacity: 0.7
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            particle.position.set(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10
            );
            
            explosionGroup.add(particle);
        }
        
        explosionGroup.position.set(
            explosionData.position.x || 0,
            explosionData.position.y || 0,
            explosionData.position.z || 0
        );
        explosionGroup.userData = { explosionData: explosionData };
        
        this.explosions.set(explosionData.id, explosionGroup);
        this.scene.add(explosionGroup);
        
        return explosionGroup;
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
        canvas.width = 512;
        canvas.height = 256;
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
        const lineHeight = 60;
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
            this.inputs.pitch = -1;
        } else if (this.keys['KeyS'] || this.keys['ArrowDown']) {
            this.inputs.pitch = 1;
        } else {
            this.inputs.pitch = 0;
        }
        
        // 요 (A: 좌회전, D: 우회전)
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
            this.inputs.yaw = -1;
        } else if (this.keys['KeyD'] || this.keys['ArrowRight']) {
            this.inputs.yaw = 1;
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
        
        // 1인칭 시점에서 마우스 입력 적용
        if (this.isFirstPerson && document.pointerLockElement) {
            this.inputs.yaw += this.mouseX * 0.5;
            this.inputs.pitch += this.mouseY * 0.5;
            this.mouseX *= 0.9;
            this.mouseY *= 0.9;
        }
    }

    /**
     * 카메라 업데이트 - 원래 게임 방식
     */
    updateCamera() {
        if (!this.myVehicle) return;
        
        const vehiclePosition = this.myVehicle.position;
        const vehicleRotation = this.myVehicle.rotation; // 전체 비행체의 회전 사용
        
        if (this.isFirstPerson) {
            // 1인칭 시점 - 비행체 내부에서 보기
            this.camera.position.copy(vehiclePosition);
            this.camera.position.y += 2; // 조종석 높이
            
            // 마우스 입력으로 시선 조절
            this.camera.rotation.x = vehicleRotation.x + this.mouseY;
            this.camera.rotation.y = vehicleRotation.y + this.mouseX;
            this.camera.rotation.z = vehicleRotation.z;
        } else {
            // 3인칭 시점 - 원래 게임처럼 비행체 뒤쪽에서 따라오기
            const distance = 50; // 비행체로부터의 거리
            const height = 20;   // 비행체 위쪽 높이
            
            // 비행체 뒤쪽 위치 계산 (뾰족한 부분이 앞이므로 반대 방향)
            const cameraPosition = new THREE.Vector3(
                vehiclePosition.x - Math.sin(vehicleRotation.y) * distance,
                vehiclePosition.y + height,
                vehiclePosition.z - Math.cos(vehicleRotation.y) * distance
            );
            
            // 카메라 위치를 부드럽게 이동
            this.camera.position.lerp(cameraPosition, 0.1);
            
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
        
        for (const [vehicleId, vehicle] of this.vehicles) {
            const vehicleData = vehicle.userData.vehicleData;
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-item';
            
            playerDiv.innerHTML = `
                <div style="display: flex; align-items: center;">
                    <div class="player-color" style="background-color: ${vehicleData.color}"></div>
                    <span>${vehicleData.playerId === this.myPlayer.id ? '(나)' : ''} Player</span>
                </div>
                <div>
                    <span>❤️ ${vehicleData.health}</span>
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
        });
        
        this.socket.on('vehicleRespawned', (data) => {
            const vehicle = this.vehicles.get(data.vehicle.id);
            if (vehicle) {
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
                vehicle.userData.vehicleData = data.vehicle;
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
        // 비행체 업데이트
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
                
                // 회전 업데이트 - 부드러운 보간 적용
                vehicle.rotation.x = THREE.MathUtils.lerp(
                    vehicle.rotation.x, 
                    vehicleData.rotation.x || 0, 
                    0.3
                ); // 피치 (W/S)
                
                vehicle.rotation.y = THREE.MathUtils.lerp(
                    vehicle.rotation.y, 
                    vehicleData.rotation.y || 0, 
                    0.3
                ); // 요 (A/D)
                
                vehicle.rotation.z = THREE.MathUtils.lerp(
                    vehicle.rotation.z, 
                    vehicleData.rotation.z || 0, 
                    0.3
                ); // 롤 (Q/E)
                
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
        
        // 총알 업데이트
        gameState.bullets.forEach(bulletData => {
            const bullet = this.bullets.get(bulletData.id);
            if (bullet) {
                bullet.position.set(
                    bulletData.position.x || 0,
                    bulletData.position.y || 0,
                    bulletData.position.z || 0
                );
                bullet.rotation.set(
                    bulletData.rotation.x || 0,
                    bulletData.rotation.y || 0,
                    bulletData.rotation.z || 0
                );
            }
        });
        
        // 폭발 업데이트
        gameState.explosions.forEach(explosionData => {
            const explosion = this.explosions.get(explosionData.id);
            if (explosion) {
                const scale = explosionData.scale?.x || 1;
                explosion.scale.setScalar(scale);
                
                // 투명도 조절
                const progress = explosionData.progress || 0;
                const opacity = 1 - progress;
                explosion.children.forEach(child => {
                    if (child.material) {
                        child.material.opacity = opacity;
                    }
                });
            }
        });
        
        // 플레이어 정보 업데이트
        if (gameState.players) {
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
        
        // 입력 업데이트
        this.updateInputs();
        this.sendInputs();
        
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
} 