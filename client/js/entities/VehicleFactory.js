import * as THREE from 'three';
import { VEHICLE_DEFAULTS, MATERIAL_OPACITY, COCKPIT_COLOR, ROTATION_SETTINGS } from '../config/Constants.js';

/**
 * 비행체 팩토리 클래스
 * 비행체 타입별 3D 모델 생성을 담당
 * Factory Pattern을 사용하여 확장성 제공
 */
export class VehicleFactory {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        
        // 비행체 타입별 생성 함수 등록
        this.vehicleCreators = new Map();
        this.registerVehicleCreators();
    }
    
    /**
     * 비행체 생성 함수들 등록
     */
    registerVehicleCreators() {
        this.vehicleCreators.set('fighter', this.createFighterVehicleModel.bind(this));
        this.vehicleCreators.set('heavy', this.createHeavyVehicleModel.bind(this));
        this.vehicleCreators.set('test', this.createTestVehicleModel.bind(this));
    }
    
    /**
     * 비행체 생성 (메인 팩토리 메서드)
     */
    createVehicle(vehicleData, vehicles, myPlayer, cameraManager) {
        const vehicleGroup = new THREE.Group();
        
        // Three.js 회전 순서 설정 (중요!)
        vehicleGroup.rotation.order = ROTATION_SETTINGS.ORDER;
        
        // 비행체 타입에 따라 다른 모델 생성
        const vehicleType = vehicleData.vehicleType || 'fighter';
        const creator = this.vehicleCreators.get(vehicleType);
        
        if (creator) {
            creator(vehicleGroup, vehicleData);
        } else {
            console.warn(`Unknown vehicle type: ${vehicleType}, using fighter as default`);
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
        
        vehicles.set(vehicleData.id, vehicleGroup);
        this.scene.add(vehicleGroup);
        
        // 내 비행체인 경우 CameraManager에 설정
        if (vehicleData.playerId === myPlayer.id && cameraManager) {
            cameraManager.setMyVehicle(vehicleGroup);
        }
        
        return vehicleGroup;
    }
    
    /**
     * 비행체 타입별 기본 설정 가져오기
     */
    getVehicleDefaults(vehicleType) {
        const typeKey = vehicleType.toUpperCase();
        return VEHICLE_DEFAULTS[typeKey] || VEHICLE_DEFAULTS.FIGHTER;
    }
    
    /**
     * 전투기 모델 생성
     */
    createFighterVehicleModel(vehicleGroup, vehicleData) {
        // config에서 모델 설정 가져오기 (폴백은 Constants에서)
        const defaults = this.getVehicleDefaults('fighter');
        const modelConfig = this.config?.vehicles?.fighter?.model || {};
        const scale = this.config?.vehicles?.fighter?.scale || defaults.scale;
        const engineColor = this.config?.vehicles?.fighter?.engineColor || defaults.engineColor;
        const glowColor = this.config?.vehicles?.fighter?.glowColor || defaults.glowColor;
        
        // 뾰족한 머리 (항상 앞쪽 +Z 방향)
        const headConfig = modelConfig.head || defaults.model.head;
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
        const cockpitConfig = modelConfig.cockpit || defaults.model.cockpit;
        const cockpitGeometry = new THREE.SphereGeometry(cockpitConfig.radius * scale, 8, 8);
        const cockpitMaterial = new THREE.MeshPhongMaterial({
            color: COCKPIT_COLOR,
            transparent: true,
            opacity: MATERIAL_OPACITY.COCKPIT,
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
        const bodyConfig = modelConfig.body || defaults.model.body;
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
        const wingsConfig = modelConfig.wings || defaults.model.wings;
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
        const engineConfig = modelConfig.engine || defaults.model.engine;
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
        const glowConfig = modelConfig.glow || defaults.model.glow;
        const glowGeometry = new THREE.CylinderGeometry(
            glowConfig.radius * scale, 
            glowConfig.radius * scale, 
            glowConfig.length * scale, 
            16
        );
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: glowColor,
            transparent: true,
            opacity: MATERIAL_OPACITY.FIGHTER_GLOW
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
        // config에서 모델 설정 가져오기 (폴백은 Constants에서)
        const defaults = this.getVehicleDefaults('heavy');
        const modelConfig = this.config?.vehicles?.heavy?.model || {};
        const scale = this.config?.vehicles?.heavy?.scale || defaults.scale;
        const engineColor = this.config?.vehicles?.heavy?.engineColor || defaults.engineColor;
        const glowColor = this.config?.vehicles?.heavy?.glowColor || defaults.glowColor;
        
        // 더 큰 뾰족한 머리
        const headConfig = modelConfig.head || defaults.model.head;
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
        const cockpitConfig = modelConfig.cockpit || defaults.model.cockpit;
        const cockpitGeometry = new THREE.SphereGeometry(cockpitConfig.radius * scale, 8, 8);
        const cockpitMaterial = new THREE.MeshPhongMaterial({
            color: COCKPIT_COLOR,
            transparent: true,
            opacity: MATERIAL_OPACITY.COCKPIT,
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
        const bodyConfig = modelConfig.body || defaults.model.body;
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
        const wingsConfig = modelConfig.wings || defaults.model.wings;
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
        const enginesConfig = modelConfig.engines || defaults.model.engines;
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
        const glowsConfig = modelConfig.glows || defaults.model.glows;
        const glowGeometry = new THREE.CylinderGeometry(
            glowsConfig.radius * scale, 
            glowsConfig.radius * scale, 
            glowsConfig.length * scale, 
            16
        );
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: glowColor,
            transparent: true,
            opacity: MATERIAL_OPACITY.HEAVY_GLOW
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
        // config에서 모델 설정 가져오기 (폴백은 Constants에서)
        const defaults = this.getVehicleDefaults('test');
        const modelConfig = this.config?.vehicles?.test?.model || {};
        const scale = this.config?.vehicles?.test?.scale || defaults.scale;
        const engineColor = this.config?.vehicles?.test?.engineColor || defaults.engineColor;
        const glowColor = this.config?.vehicles?.test?.glowColor || defaults.glowColor;
        
        // 작은 뾰족한 머리
        const headConfig = modelConfig.head || defaults.model.head;
        const headGeometry = new THREE.ConeGeometry(headConfig.radius * scale, headConfig.length * scale, 6);
        const headMaterial = new THREE.MeshLambertMaterial({ 
            color: vehicleData.color 
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.rotation.x = Math.PI / 2;
        head.position.z = 3 * scale;
        head.castShadow = true;
        vehicleGroup.add(head);
        
        // 작은 조종석
        const cockpitConfig = modelConfig.cockpit || defaults.model.cockpit;
        const cockpitGeometry = new THREE.SphereGeometry(cockpitConfig.radius * scale, 6, 6);
        const cockpitMaterial = new THREE.MeshPhongMaterial({
            color: COCKPIT_COLOR,
            transparent: true,
            opacity: MATERIAL_OPACITY.COCKPIT,
            shininess: 100
        });
        const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
        cockpit.position.set(
            cockpitConfig.position.x * scale,
            cockpitConfig.position.y * scale,
            cockpitConfig.position.z * scale
        );
        vehicleGroup.add(cockpit);
        
        // 작은 메인 바디
        const bodyConfig = modelConfig.body || defaults.model.body;
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
        
        // 작은 날개
        const wingsConfig = modelConfig.wings || defaults.model.wings;
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
        
        // 작은 엔진
        const engineConfig = modelConfig.engine || defaults.model.engine;
        const engineGeometry = new THREE.CylinderGeometry(
            engineConfig.radius * scale, 
            engineConfig.radius * scale, 
            engineConfig.length * scale, 
            12
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
        
        // 작은 엔진 글로우 효과
        const glowConfig = modelConfig.glow || defaults.model.glow;
        const glowGeometry = new THREE.CylinderGeometry(
            glowConfig.radius * scale, 
            glowConfig.radius * scale, 
            glowConfig.length * scale, 
            12
        );
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: glowColor,
            transparent: true,
            opacity: MATERIAL_OPACITY.TEST_GLOW
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
     * 새로운 비행체 타입 등록 (확장성)
     */
    registerVehicleType(typeName, creatorFunction) {
        this.vehicleCreators.set(typeName, creatorFunction);
    }
    
    /**
     * 등록된 비행체 타입 목록 반환
     */
    getRegisteredTypes() {
        return Array.from(this.vehicleCreators.keys());
    }
} 