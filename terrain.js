// 전역 변수
let scene, camera, renderer, controls;
let terrain, sky, clouds = [];
let vehicle, vehicleGroup;
let isFirstPerson = false;
let keys = {};
let animationId;
let clock = new THREE.Clock();
let mouseX = 0, mouseY = 0;
let targetRotationX = 0, targetRotationY = 0;
let targets = []; // 타겟 오브젝트들
let bullets = []; // 총알들
let explosions = []; // 폭발 효과들

// 초기화 함수
function init() {
    // 씬 생성
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87CEEB, 100, 1000);

    // 시계 초기화
    clock = new THREE.Clock();

    // 카메라 설정
    camera = new THREE.PerspectiveCamera(
        75, 
        window.innerWidth / window.innerHeight, 
        0.1, 
        2000
    );
    camera.position.set(0, 50, 100);

    // 렌더러 설정
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x87CEEB);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    document.getElementById('container').appendChild(renderer.domElement);

    // 컨트롤 설정
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 500;
    controls.maxPolarAngle = Math.PI / 2;

    // 조명 설정
    setupLighting();
    
    // 지형 생성
    createTerrain();
    
    // 하늘 생성
    createSky();
    
    // 구름 생성
    createClouds();
    
    // 나무들 생성
    createTrees();
    
    // 비행체 생성
    createVehicle();
    
    // 타겟 오브젝트 생성
    createTargets();
    
    // 키보드 이벤트 설정
    setupControls();
    
    // 애니메이션 시작
    animate();
}

// 조명 설정
function setupLighting() {
    // 태양광 (방향성 조명)
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
    scene.add(directionalLight);

    // 환경광
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);
}

// 지형 생성
function createTerrain() {
    const geometry = new THREE.PlaneGeometry(400, 400, 100, 100);
    
    // 높이 맵 생성 (노이즈 함수 사용)
    const vertices = geometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const y = vertices[i + 1];
        
        // 간단한 노이즈 함수로 높이 생성
        const height = 
            Math.sin(x * 0.01) * 10 +
            Math.cos(y * 0.01) * 10 +
            Math.sin(x * 0.02) * 5 +
            Math.cos(y * 0.02) * 5 +
            Math.random() * 3;
            
        vertices[i + 2] = height;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    // 지형 재질
    const material = new THREE.MeshLambertMaterial({
        color: 0x3a5f3a,
        wireframe: false
    });

    terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);
}

// 하늘 생성
function createSky() {
    const skyGeometry = new THREE.SphereGeometry(800, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
        color: 0x87CEEB,
        side: THREE.BackSide
    });
    
    sky = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(sky);
}

// 구름 생성 (안정적인 기본 재질 사용)
function createClouds() {
    // 구름 텍스처 생성 (캔버스 기반)
    function createCloudTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d');
        
        // 그라디언트 배경
        const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 256, 256);
        
        // 노이즈 추가
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const radius = Math.random() * 20 + 5;
            const opacity = Math.random() * 0.3 + 0.1;
            
            const cloudGradient = context.createRadialGradient(x, y, 0, x, y, radius);
            cloudGradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
            cloudGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            context.fillStyle = cloudGradient;
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fill();
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    // 여러 개의 구름 클러스터 생성
    for (let i = 0; i < 15; i++) {
        const cloudGroup = new THREE.Group();
        
        // 각 클러스터에 여러 개의 구름 파티클 추가
        for (let j = 0; j < 8; j++) {
            const cloudGeometry = new THREE.SphereGeometry(
                15 + Math.random() * 25, // 반지름
                16, // 가로 세그먼트
                12  // 세로 세그먼트
            );
            
            const cloudTexture = createCloudTexture();
            const cloudMaterial = new THREE.MeshLambertMaterial({
                map: cloudTexture,
                transparent: true,
                opacity: 0.6 + Math.random() * 0.3,
                color: 0xffffff,
                fog: true
            });
            
            const cloudPart = new THREE.Mesh(cloudGeometry, cloudMaterial);
            
            // 클러스터 내에서 랜덤 위치
            cloudPart.position.set(
                (Math.random() - 0.5) * 60,
                (Math.random() - 0.5) * 30,
                (Math.random() - 0.5) * 60
            );
            
            // 랜덤 크기
            const scale = 0.5 + Math.random() * 0.8;
            cloudPart.scale.set(scale, scale * 0.6, scale);
            
            // 랜덤 회전
            cloudPart.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            
            cloudGroup.add(cloudPart);
        }
        
        // 클러스터 전체 위치
        cloudGroup.position.set(
            (Math.random() - 0.5) * 800,
            100 + Math.random() * 80,
            (Math.random() - 0.5) * 800
        );
        
        // 클러스터 회전
        cloudGroup.rotation.y = Math.random() * Math.PI * 2;
        
        // 애니메이션을 위한 속도 저장
        cloudGroup.userData = {
            speed: 0.02 + Math.random() * 0.03,
            rotationSpeed: (Math.random() - 0.5) * 0.002
        };
        
        clouds.push(cloudGroup);
        scene.add(cloudGroup);
    }
}

// 나무 생성
function createTrees() {
    for (let i = 0; i < 50; i++) {
        createTree(
            (Math.random() - 0.5) * 300,
            (Math.random() - 0.5) * 300
        );
    }
}

// 개별 나무 생성
function createTree(x, z) {
    // 나무 줄기
    const trunkGeometry = new THREE.CylinderGeometry(1, 2, 10, 8);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    
    // 나무 잎
    const leavesGeometry = new THREE.SphereGeometry(8, 8, 8);
    const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    
    // 지형 높이에 맞춰 위치 조정
    const height = getTerrainHeight(x, z);
    
    trunk.position.set(x, height + 5, z);
    leaves.position.set(x, height + 12, z);
    
    trunk.castShadow = true;
    leaves.castShadow = true;
    
    scene.add(trunk);
    scene.add(leaves);
}

// 지형 높이 계산 (간단한 근사치)
function getTerrainHeight(x, z) {
    return Math.sin(x * 0.01) * 10 + Math.cos(z * 0.01) * 10 + Math.sin(x * 0.02) * 5 + Math.cos(z * 0.02) * 5;
}

// 비행체 생성
function createVehicle() {
    vehicleGroup = new THREE.Group();
    
    // 메인 바디 (유선형 형태) - 앞쪽이 뾰족한 형태로 변경
    const bodyGeometry = new THREE.ConeGeometry(2, 8, 16);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x2c3e50,
        shininess: 100,
        specular: 0x111111
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = -Math.PI / 2; // 뾰족한 부분이 앞쪽(+Z)을 향하도록 (180도 회전)
    body.position.set(0, 0, 0);
    body.castShadow = true;
    vehicleGroup.add(body);
    
    // 조종석 (투명한 돔) - 위치 조정
    const cockpitGeometry = new THREE.SphereGeometry(1.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const cockpitMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x3498db,
        transparent: true,
        opacity: 0.4,
        shininess: 100
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.set(0, 1.2, 1);
    vehicleGroup.add(cockpit);
    
    // 꼬리 원판 (추진기)
    const tailDiscGeometry = new THREE.CylinderGeometry(2.5, 2.5, 0.3, 16);
    const tailDiscMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x34495e,
        emissive: 0x001122,
        shininess: 50
    });
    const tailDisc = new THREE.Mesh(tailDiscGeometry, tailDiscMaterial);
    tailDisc.position.set(0, 0, 4); // 꼬리 쪽으로 이동 (양수 Z 방향)
    tailDisc.rotation.x = Math.PI / 2; // 원판이 수직으로 서도록
    tailDisc.castShadow = true;
    tailDisc.userData.isTailDisc = true; // 식별용
    vehicleGroup.add(tailDisc);
    
    // 꼬리 원판 중앙 엔진 코어
    const engineCoreGeometry = new THREE.CylinderGeometry(1, 1, 0.2, 12);
    const engineCoreMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x1a1a1a,
        emissive: 0x000000
    });
    const engineCore = new THREE.Mesh(engineCoreGeometry, engineCoreMaterial);
    engineCore.position.set(0, 0, 3.9); // 꼬리 쪽으로 이동 (양수 Z 방향)
    engineCore.rotation.x = Math.PI / 2; // 원판과 같은 방향
    engineCore.userData.isEngineCore = true; // 식별용
    vehicleGroup.add(engineCore);
    
    // 엔진 글로우 효과 (꼬리 원판 뒤쪽)
    const glowGeometry = new THREE.CylinderGeometry(2.2, 2.2, 0.1, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x0088ff,
        transparent: true,
        opacity: 0.6
    });
    
    const engineGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    engineGlow.position.set(0, 0, 4.2); // 꼬리 쪽으로 이동 (양수 Z 방향)
    engineGlow.rotation.x = Math.PI / 2; // 원판과 같은 방향
    engineGlow.userData.isEngineGlow = true; // 식별용
    vehicleGroup.add(engineGlow);
    
    // 날개 (더 작고 날렵하게)
    const wingGeometry = new THREE.BoxGeometry(6, 0.2, 1.5);
    const wingMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x2c3e50,
        shininess: 50
    });
    const wings = new THREE.Mesh(wingGeometry, wingMaterial);
    wings.position.set(0, 0, -1);
    wings.castShadow = true;
    vehicleGroup.add(wings);
    
    // 안테나/센서 (더 작게)
    const antennaGeometry = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 6);
    const antennaMaterial = new THREE.MeshPhongMaterial({ color: 0xe74c3c });
    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.set(0, 1.8, 1.5);
    vehicleGroup.add(antenna);
    
    // 비행체 초기 위치 설정
    vehicleGroup.position.set(0, 80, 0);
    vehicleGroup.userData = {
        velocity: new THREE.Vector3(0, 0, 0),
        speed: 0,
        maxSpeed: 3.0,        // 최대 속도 증가
        acceleration: 0.15,   // 가속도 증가
        rotationSpeed: 0.03   // 회전 속도 증가
    };
    
    vehicle = vehicleGroup;
    scene.add(vehicleGroup);
}

// 컨트롤 설정
function setupControls() {
    // 키보드 이벤트
    document.addEventListener('keydown', (event) => {
        keys[event.code] = true;
        
        // V키로 1인칭/3인칭 시점 전환
        if (event.code === 'KeyV') {
            toggleFirstPerson();
        }
        
        // P키로 발사
        if (event.code === 'KeyP') {
            fireBullet();
        }
    });
    
    document.addEventListener('keyup', (event) => {
        keys[event.code] = false;
    });
    
    // 마우스 클릭으로 발사
    document.addEventListener('mousedown', (event) => {
        if (event.button === 0) { // 좌클릭
            fireBullet();
        }
    });
    
    // 마우스 이벤트 (1인칭 시점에서 시선 조절)
    document.addEventListener('mousemove', (event) => {
        if (isFirstPerson) {
            const movementX = event.movementX || 0;
            const movementY = event.movementY || 0;
            
            // 마우스 움직임을 누적하여 부드러운 회전 구현
            mouseX += movementX;
            mouseY += movementY;
            
            // 목표 회전값 설정 (더 민감하게 조정)
            targetRotationY = -mouseX * 0.003;
            targetRotationX = -mouseY * 0.003;
            
            // 상하 회전 제한
            targetRotationX = Math.max(-Math.PI/3, Math.min(Math.PI/3, targetRotationX));
        }
    });
    
    // 포인터 락 변경 이벤트
    document.addEventListener('pointerlockchange', () => {
        if (!document.pointerLockElement && isFirstPerson) {
            // 포인터 락이 해제되면 3인칭으로 전환
            toggleFirstPerson();
        }
    });
}

// 1인칭/3인칭 시점 전환
function toggleFirstPerson() {
    isFirstPerson = !isFirstPerson;
    
    if (isFirstPerson) {
        // 1인칭 시점: 카메라를 비행체 내부로
        controls.enabled = false;
        camera.position.set(0, 1, 2);
        camera.rotation.set(0, 0, 0);
        vehicleGroup.add(camera);
        
        // 마우스 입력 초기화
        mouseX = 0;
        mouseY = 0;
        targetRotationX = vehicleGroup.rotation.x;
        targetRotationY = vehicleGroup.rotation.y;
        
        // 1인칭 시점에서 vehicle을 반투명하게 만들기
        vehicleGroup.children.forEach(child => {
            if (child.material) {
                // 원래 투명도 저장
                if (!child.userData.originalOpacity) {
                    child.userData.originalOpacity = child.material.opacity || 1.0;
                    child.userData.originalTransparent = child.material.transparent;
                }
                // 반투명 설정
                child.material.transparent = true;
                child.material.opacity = 0.3;
            }
        });
        
        // 마우스 포인터 잠금
        renderer.domElement.requestPointerLock();
    } else {
        // 3인칭 시점: 카메라를 씬으로 복귀
        vehicleGroup.remove(camera);
        scene.add(camera);
        camera.position.set(
            vehicle.position.x + 30,
            vehicle.position.y + 20,
            vehicle.position.z + 30
        );
        controls.enabled = true;
        controls.target.copy(vehicle.position);
        
        // 3인칭 시점에서 vehicle을 원래 투명도로 복원
        vehicleGroup.children.forEach(child => {
            if (child.material && child.userData.originalOpacity !== undefined) {
                child.material.opacity = child.userData.originalOpacity;
                child.material.transparent = child.userData.originalTransparent;
            }
        });
        
        // 마우스 포인터 잠금 해제
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }
}

// 애니메이션 루프
function animate() {
    animationId = requestAnimationFrame(animate);
    
    const elapsedTime = clock.getElapsedTime();
    const deltaTime = clock.getDelta();
    
    // 비행체 업데이트
    updateVehicle(deltaTime);
    
    // 총알 업데이트
    updateBullets();
    
    // 폭발 효과 업데이트
    updateExplosions();
    
    // 구름 애니메이션
    clouds.forEach((cloudGroup, index) => {
        // 구름 이동
        cloudGroup.position.x += cloudGroup.userData.speed;
        cloudGroup.rotation.y += cloudGroup.userData.rotationSpeed;
        
        // 각 구름 파티클 회전
        cloudGroup.children.forEach((cloudPart, partIndex) => {
            cloudPart.rotation.x += 0.001;
            cloudPart.rotation.y += 0.0005;
            cloudPart.rotation.z += 0.0008;
            
            // 부드러운 상하 움직임
            cloudPart.position.y += Math.sin(elapsedTime * 0.5 + partIndex) * 0.02;
        });
        
        // 구름이 화면 밖으로 나가면 다시 시작점으로
        if (cloudGroup.position.x > 400) {
            cloudGroup.position.x = -400;
            cloudGroup.position.z = (Math.random() - 0.5) * 800;
        }
    });
    
    // 컨트롤 업데이트 (3인칭 시점일 때만)
    if (!isFirstPerson) {
        // 카메라 업데이트는 이제 updateVehicle에서 처리됨
    }
    
    // 렌더링
    renderer.render(scene, camera);
}

// 비행체 업데이트
function updateVehicle(deltaTime) {
    if (!vehicle) return;
    
    const userData = vehicle.userData;
    const forward = new THREE.Vector3(0, 0, -1);  // 뾰족한 머리 방향 (-Z)
    const right = new THREE.Vector3(1, 0, 0);
    const up = new THREE.Vector3(0, 1, 0);
    
    // 키보드 입력 처리 - 새로운 방식
    let pitch = 0;      // W/S: 기수 위/아래 (머리 방향)
    let yaw = 0;        // A/D: 좌/우 회전 (머리 방향)
    let roll = 0;       // Q/E: 롤
    let thrust = 0;     // 추진력 (가속/감속)
    let verticalThrust = 0;
    
    // 머리 방향 제어 (WASD)
    if (keys['KeyW'] || keys['ArrowUp']) pitch = -1;           // 기수 올리기
    if (keys['KeyS'] || keys['ArrowDown']) pitch = 1;          // 기수 내리기
    if (keys['KeyA'] || keys['ArrowLeft']) yaw = 1;            // 좌회전
    if (keys['KeyD'] || keys['ArrowRight']) yaw = -1;          // 우회전
    
    // 롤 제어
    if (keys['KeyQ']) roll = -1;                               // 좌측 롤
    if (keys['KeyE']) roll = 1;                                // 우측 롤
    
    // 추진력 제어 (가속/감속)
    if (keys['ShiftLeft']) thrust = 1;                         // 가속 (Shift)
    if (keys['ControlLeft']) thrust = -0.5;                    // 감속/후진 (Ctrl)
    
    // 수직 이동
    if (keys['Space']) verticalThrust = 1;                     // 상승
    if (keys['KeyX']) verticalThrust = -1;                     // 하강
    
    // 1인칭 시점에서는 마우스로 머리 방향 제어
    if (isFirstPerson) {
        // 부드러운 회전 보간
        const rotationSpeed = 5.0 * deltaTime;
        vehicle.rotation.y += (targetRotationY - vehicle.rotation.y) * rotationSpeed;
        vehicle.rotation.x += (targetRotationX - vehicle.rotation.x) * rotationSpeed;
        
        // 키보드 입력으로 추가 회전 (마우스와 함께 사용)
        if (yaw !== 0) {
            targetRotationY += yaw * userData.rotationSpeed * 2;
            mouseX += yaw * 50;
        }
        if (pitch !== 0) {
            targetRotationX += pitch * userData.rotationSpeed * 2;
            mouseY += pitch * 50;
            targetRotationX = Math.max(-Math.PI/3, Math.min(Math.PI/3, targetRotationX));
        }
        
        // 롤 적용
        vehicle.rotation.z += roll * userData.rotationSpeed * 0.5;
    } else {
        // 3인칭 시점에서는 키보드로 머리 방향 제어
        vehicle.rotation.y += yaw * userData.rotationSpeed;
        vehicle.rotation.x += pitch * userData.rotationSpeed;
        vehicle.rotation.z += roll * userData.rotationSpeed * 0.5;
    }
    
    // 비행체의 현재 방향 벡터 계산
    forward.applyQuaternion(vehicle.quaternion);
    right.applyQuaternion(vehicle.quaternion);
    up.applyQuaternion(vehicle.quaternion);
    
    // 추진력 계산 - 머리가 향한 방향으로만 이동
    const thrustMultiplier = isFirstPerson ? 1.5 : 1.0;
    const thrustForce = forward.clone().multiplyScalar(thrust * userData.acceleration * thrustMultiplier);
    const verticalForce = up.clone().multiplyScalar(verticalThrust * userData.acceleration * 0.8);
    
    // 속도 업데이트
    userData.velocity.add(thrustForce);
    userData.velocity.add(verticalForce);
    
    // 공기 저항 (더 현실적으로)
    const dragFactor = isFirstPerson ? 0.985 : 0.98;
    userData.velocity.multiplyScalar(dragFactor);
    
    // 최대 속도 제한
    const maxSpeed = userData.maxSpeed * (isFirstPerson ? 1.5 : 1.0);
    if (userData.velocity.length() > maxSpeed) {
        userData.velocity.normalize().multiplyScalar(maxSpeed);
    }
    
    // 위치 업데이트
    vehicle.position.add(userData.velocity);
    
    // 지형 충돌 방지 (최소 높이 제한)
    const minHeight = 15;
    if (vehicle.position.y < minHeight) {
        vehicle.position.y = minHeight;
        userData.velocity.y = Math.max(0, userData.velocity.y);
    }
    
    // 경계 제한 (맵 밖으로 나가지 않도록)
    const mapBoundary = 180;
    vehicle.position.x = Math.max(-mapBoundary, Math.min(mapBoundary, vehicle.position.x));
    vehicle.position.z = Math.max(-mapBoundary, Math.min(mapBoundary, vehicle.position.z));
    
    // 엔진 글로우 효과 애니메이션 (추진력에 따라 강화)
    const time = Date.now() * 0.01;
    const baseIntensity = 0.3;
    const thrustIntensity = Math.abs(thrust) * 0.7;
    const glowIntensity = baseIntensity + thrustIntensity + Math.sin(time) * 0.2;
    
    vehicle.children.forEach(child => {
        // 엔진 글로우 효과 (꼬리 원판)
        if (child.userData.isEngineGlow && child.material) {
            child.material.opacity = Math.min(1.0, glowIntensity);
            
            if (thrust > 0) {
                // 가속 시: 노란색 빛
                if (child.material.color) child.material.color.setHex(0xffff00);
                child.scale.setScalar(1.0 + thrust * 0.8);
                if (child.material.emissive) child.material.emissive.setHex(0x444400);
            } else if (thrust < 0) {
                // 감속/후진 시: 빨간색
                if (child.material.color) child.material.color.setHex(0xff4400);
                child.scale.setScalar(1.0 + Math.abs(thrust) * 0.5);
                if (child.material.emissive) child.material.emissive.setHex(0x442200);
            } else {
                // 추진력 없을 때: 기본 파란색
                if (child.material.color) child.material.color.setHex(0x0088ff);
                child.scale.setScalar(1.0);
                if (child.material.emissive) child.material.emissive.setHex(0x000000);
            }
        }
        
        // 꼬리 원판 자체도 가속 시 빛나게
        if (child.userData.isTailDisc && child.material) {
            if (thrust > 0) {
                if (child.material.emissive) child.material.emissive.setHex(0x221100);
                if (child.material.color) child.material.color.setHex(0x4a5a6a);
            } else if (thrust < 0) {
                if (child.material.emissive) child.material.emissive.setHex(0x220000);
                if (child.material.color) child.material.color.setHex(0x5a4a4a);
            } else {
                if (child.material.emissive) child.material.emissive.setHex(0x001122);
                if (child.material.color) child.material.color.setHex(0x34495e);
            }
        }
        
        // 엔진 코어도 가속 시 빛나게
        if (child.userData.isEngineCore && child.material) {
            if (thrust > 0) {
                if (child.material.emissive) child.material.emissive.setHex(0x332200);
                if (child.material.color) child.material.color.setHex(0x3a3a1a);
            } else if (thrust < 0) {
                if (child.material.emissive) child.material.emissive.setHex(0x330000);
                if (child.material.color) child.material.color.setHex(0x3a1a1a);
            } else {
                if (child.material.emissive) child.material.emissive.setHex(0x000000);
                if (child.material.color) child.material.color.setHex(0x1a1a1a);
            }
        }
    });
    
    // 3인칭 시점에서 카메라가 비행체를 부드럽게 따라가도록
    if (!isFirstPerson) {
        const cameraOffset = new THREE.Vector3(0, 25, 40);
        cameraOffset.applyQuaternion(vehicle.quaternion);
        const targetCameraPosition = vehicle.position.clone().add(cameraOffset);
        
        // 부드러운 카메라 이동
        camera.position.lerp(targetCameraPosition, 0.05);
        controls.target.lerp(vehicle.position, 0.1);
        controls.update();
    }
}

// 윈도우 리사이즈 처리
function onWindowResize() {
    if (!camera || !renderer) {
        return; // 아직 초기화되지 않았으면 리턴
    }
    
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 정리 함수
function cleanup() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    if (renderer) {
        renderer.dispose();
    }
    
    // 메모리 정리
    scene.traverse((object) => {
        if (object.geometry) {
            object.geometry.dispose();
        }
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(material => material.dispose());
            } else {
                object.material.dispose();
            }
        }
    });
}

// 이벤트 리스너
window.addEventListener('resize', onWindowResize, false);
window.addEventListener('beforeunload', cleanup);

// 페이지 로드 시 초기화
window.addEventListener('load', init);

// 타겟 오브젝트 생성
function createTargets() {
    for (let i = 0; i < 10; i++) {
        const targetGroup = new THREE.Group();
        
        // 타겟 메인 바디 (큐브)
        const bodyGeometry = new THREE.BoxGeometry(3, 3, 3);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xff4444,
            shininess: 50
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        targetGroup.add(body);
        
        // 타겟 표시 (십자가)
        const crossGeometry1 = new THREE.BoxGeometry(4, 0.5, 0.5);
        const crossGeometry2 = new THREE.BoxGeometry(0.5, 4, 0.5);
        const crossMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
        
        const cross1 = new THREE.Mesh(crossGeometry1, crossMaterial);
        const cross2 = new THREE.Mesh(crossGeometry2, crossMaterial);
        cross1.position.set(0, 0, 1.6);
        cross2.position.set(0, 0, 1.6);
        targetGroup.add(cross1);
        targetGroup.add(cross2);
        
        // 랜덤 위치 설정
        const x = (Math.random() - 0.5) * 300;
        const z = (Math.random() - 0.5) * 300;
        const y = getTerrainHeight(x, z) + 20 + Math.random() * 30;
        
        targetGroup.position.set(x, y, z);
        targetGroup.userData = {
            isTarget: true,
            health: 1,
            originalPosition: targetGroup.position.clone()
        };
        
        targets.push(targetGroup);
        scene.add(targetGroup);
    }
}

// 총알 생성
function createBullet(startPosition, direction) {
    const bulletGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff6600,
        emissive: 0x331100
    });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    bullet.position.copy(startPosition);
    bullet.userData = {
        velocity: direction.clone().multiplyScalar(5),
        life: 100
    };
    
    bullets.push(bullet);
    scene.add(bullet);
}

// 폭발 효과 생성
function createExplosion(position) {
    const explosionGroup = new THREE.Group();
    
    // 여러 개의 파티클로 폭발 효과
    for (let i = 0; i < 15; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.3 + Math.random() * 0.5, 6, 6);
        const particleMaterial = new THREE.MeshBasicMaterial({ 
            color: new THREE.Color().setHSL(Math.random() * 0.1, 1, 0.5 + Math.random() * 0.5),
            transparent: true,
            opacity: 0.8
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        particle.position.set(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4
        );
        
        particle.userData = {
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                Math.random() * 0.3,
                (Math.random() - 0.5) * 0.5
            ),
            life: 30 + Math.random() * 20
        };
        
        explosionGroup.add(particle);
    }
    
    explosionGroup.position.copy(position);
    explosionGroup.userData = { life: 50 };
    
    explosions.push(explosionGroup);
    scene.add(explosionGroup);
}

// 총알 발사 함수
function fireBullet() {
    if (!vehicle) return;
    
    // 비행체 머리 위치에서 발사
    const gunPosition = new THREE.Vector3(0, 0, -4); // 비행체 머리 부분
    gunPosition.applyMatrix4(vehicle.matrixWorld);
    
    // 발사 방향 (비행체가 향하는 방향)
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(vehicle.quaternion);
    direction.normalize();
    
    createBullet(gunPosition, direction);
}

// 총알 업데이트
function updateBullets() {
    bullets.forEach((bullet, bulletIndex) => {
        const userData = bullet.userData;
        bullet.position.add(userData.velocity);
        userData.life--;
        
        // 타겟과의 충돌 감지
        targets.forEach((target, targetIndex) => {
            if (target.userData.health > 0) {
                const distance = bullet.position.distanceTo(target.position);
                if (distance < 3) { // 충돌 거리
                    // 타겟 파괴
                    target.userData.health = 0;
                    
                    // 폭발 효과 생성
                    createExplosion(target.position);
                    
                    // 타겟 제거
                    targets.splice(targetIndex, 1);
                    scene.remove(target);
                    
                    // 총알 제거
                    bullets.splice(bulletIndex, 1);
                    scene.remove(bullet);
                    
                    console.log('Target hit! Remaining targets:', targets.length);
                }
            }
        });
        
        // 총알 수명 종료
        if (userData.life <= 0) {
            bullets.splice(bulletIndex, 1);
            scene.remove(bullet);
        }
    });
}

// 폭발 효과 업데이트
function updateExplosions() {
    explosions.forEach((explosionGroup, index) => {
        const userData = explosionGroup.userData;
        userData.life--;
        
        // 각 파티클 애니메이션
        explosionGroup.children.forEach(particle => {
            const particleData = particle.userData;
            particle.position.add(particleData.velocity);
            particleData.velocity.y -= 0.01; // 중력 효과
            particleData.life--;
            
            // 페이드 아웃 효과
            const fadeRatio = particleData.life / 50;
            particle.material.opacity = fadeRatio * 0.8;
            particle.scale.setScalar(1 + (1 - fadeRatio) * 2);
        });
        
        if (userData.life <= 0) {
            explosions.splice(index, 1);
            scene.remove(explosionGroup);
        }
    });
} 