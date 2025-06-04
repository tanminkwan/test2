// 전역 변수
let scene, camera, renderer, controls;
let terrain, sky, clouds = [];
let vehicle, vehicleGroup;
let isFirstPerson = false;
let keys = {};
let animationId;
let clock = new THREE.Clock();

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
    
    // 메인 바디 (유선형 형태)
    const bodyGeometry = new THREE.CapsuleGeometry(2, 8, 4, 8);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x2c3e50,
        shininess: 100,
        specular: 0x111111
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.z = Math.PI / 2;
    body.castShadow = true;
    vehicleGroup.add(body);
    
    // 조종석 (투명한 돔)
    const cockpitGeometry = new THREE.SphereGeometry(1.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const cockpitMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x3498db,
        transparent: true,
        opacity: 0.3,
        shininess: 100
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.set(0, 1.5, 2);
    vehicleGroup.add(cockpit);
    
    // 엔진 (좌우)
    const engineGeometry = new THREE.CylinderGeometry(0.8, 1.2, 3, 8);
    const engineMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x34495e,
        emissive: 0x001122
    });
    
    const leftEngine = new THREE.Mesh(engineGeometry, engineMaterial);
    leftEngine.position.set(-3, -0.5, -2);
    leftEngine.rotation.z = Math.PI / 2;
    leftEngine.castShadow = true;
    vehicleGroup.add(leftEngine);
    
    const rightEngine = new THREE.Mesh(engineGeometry, engineMaterial);
    rightEngine.position.set(3, -0.5, -2);
    rightEngine.rotation.z = Math.PI / 2;
    rightEngine.castShadow = true;
    vehicleGroup.add(rightEngine);
    
    // 엔진 글로우 효과
    const glowGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ffff,
        transparent: true,
        opacity: 0.6
    });
    
    const leftGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    leftGlow.position.set(-4.5, -0.5, -2);
    vehicleGroup.add(leftGlow);
    
    const rightGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    rightGlow.position.set(4.5, -0.5, -2);
    vehicleGroup.add(rightGlow);
    
    // 날개
    const wingGeometry = new THREE.BoxGeometry(8, 0.2, 2);
    const wingMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x2c3e50,
        shininess: 50
    });
    const wings = new THREE.Mesh(wingGeometry, wingMaterial);
    wings.position.set(0, 0, -1);
    wings.castShadow = true;
    vehicleGroup.add(wings);
    
    // 안테나/센서
    const antennaGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 6);
    const antennaMaterial = new THREE.MeshPhongMaterial({ color: 0xe74c3c });
    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.set(0, 2, 1);
    vehicleGroup.add(antenna);
    
    // 비행체 초기 위치 설정
    vehicleGroup.position.set(0, 80, 0);
    vehicleGroup.userData = {
        velocity: new THREE.Vector3(0, 0, 0),
        speed: 0,
        maxSpeed: 2,
        acceleration: 0.1,
        rotationSpeed: 0.02
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
    });
    
    document.addEventListener('keyup', (event) => {
        keys[event.code] = false;
    });
    
    // 마우스 이벤트 (1인칭 시점에서 시선 조절)
    document.addEventListener('mousemove', (event) => {
        if (isFirstPerson) {
            const movementX = event.movementX || 0;
            const movementY = event.movementY || 0;
            
            vehicleGroup.rotation.y -= movementX * 0.002;
            vehicleGroup.rotation.x -= movementY * 0.002;
            
            // 상하 회전 제한
            vehicleGroup.rotation.x = Math.max(-Math.PI/4, Math.min(Math.PI/4, vehicleGroup.rotation.x));
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
        
        // 마우스 포인터 잠금
        renderer.domElement.requestPointerLock();
    } else {
        // 3인칭 시점: 카메라를 씬으로 복귀
        vehicleGroup.remove(camera);
        scene.add(camera);
        camera.position.set(0, 50, 100);
        controls.enabled = true;
        
        // 마우스 포인터 잠금 해제
        document.exitPointerLock();
    }
}

// 애니메이션 루프
function animate() {
    animationId = requestAnimationFrame(animate);
    
    const elapsedTime = clock.getElapsedTime();
    const deltaTime = clock.getDelta();
    
    // 비행체 업데이트
    updateVehicle(deltaTime);
    
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
        controls.update();
    }
    
    // 렌더링
    renderer.render(scene, camera);
}

// 비행체 업데이트
function updateVehicle(deltaTime) {
    if (!vehicle) return;
    
    const userData = vehicle.userData;
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);
    const up = new THREE.Vector3(0, 1, 0);
    
    // 비행체의 현재 방향 벡터 계산
    forward.applyQuaternion(vehicle.quaternion);
    right.applyQuaternion(vehicle.quaternion);
    up.applyQuaternion(vehicle.quaternion);
    
    // 키보드 입력 처리
    let thrust = 0;
    let yaw = 0;
    let pitch = 0;
    let roll = 0;
    let verticalThrust = 0;
    
    if (keys['KeyW'] || keys['ArrowUp']) thrust = 1;           // 전진
    if (keys['KeyS'] || keys['ArrowDown']) thrust = -0.5;      // 후진
    if (keys['KeyA'] || keys['ArrowLeft']) yaw = 1;            // 좌회전
    if (keys['KeyD'] || keys['ArrowRight']) yaw = -1;          // 우회전
    if (keys['KeyQ']) roll = -1;                               // 좌측 롤
    if (keys['KeyE']) roll = 1;                                // 우측 롤
    if (keys['Space']) verticalThrust = 1;                     // 상승
    if (keys['ShiftLeft']) verticalThrust = -1;                // 하강
    if (keys['KeyR']) pitch = -1;                              // 기수 올리기
    if (keys['KeyF']) pitch = 1;                               // 기수 내리기
    
    // 회전 적용 (1인칭 시점이 아닐 때만)
    if (!isFirstPerson) {
        vehicle.rotation.y += yaw * userData.rotationSpeed;
        vehicle.rotation.x += pitch * userData.rotationSpeed;
        vehicle.rotation.z += roll * userData.rotationSpeed * 0.5;
    }
    
    // 추진력 계산
    const thrustForce = forward.clone().multiplyScalar(thrust * userData.acceleration);
    const verticalForce = up.clone().multiplyScalar(verticalThrust * userData.acceleration * 0.5);
    
    // 속도 업데이트
    userData.velocity.add(thrustForce);
    userData.velocity.add(verticalForce);
    
    // 공기 저항 (감속)
    userData.velocity.multiplyScalar(0.98);
    
    // 최대 속도 제한
    if (userData.velocity.length() > userData.maxSpeed) {
        userData.velocity.normalize().multiplyScalar(userData.maxSpeed);
    }
    
    // 위치 업데이트
    vehicle.position.add(userData.velocity);
    
    // 지형 충돌 방지 (최소 높이 제한)
    const minHeight = 15;
    if (vehicle.position.y < minHeight) {
        vehicle.position.y = minHeight;
        userData.velocity.y = Math.max(0, userData.velocity.y);
    }
    
    // 엔진 글로우 효과 애니메이션
    const glowIntensity = Math.abs(thrust) * 0.3 + 0.3;
    vehicle.children.forEach(child => {
        if (child.material && child.material.color && child.material.color.getHex() === 0x00ffff) {
            child.material.opacity = glowIntensity + Math.sin(Date.now() * 0.01) * 0.2;
        }
    });
    
    // 3인칭 시점에서 카메라가 비행체를 따라가도록
    if (!isFirstPerson) {
        const targetPosition = vehicle.position.clone().add(new THREE.Vector3(0, 20, 30));
        controls.target.copy(vehicle.position);
    }
}

// 윈도우 리사이즈 처리
function onWindowResize() {
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