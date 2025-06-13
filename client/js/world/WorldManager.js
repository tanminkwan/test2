import * as THREE from 'three';

/**
 * 월드 관리자 클래스
 * 게임 월드의 지형, 하늘, 구름, 나무 등 환경 요소 생성 및 관리
 */
export class WorldManager {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        
        // 월드 객체들
        this.terrain = null;
        this.sky = null;
        this.water = null;
        this.clouds = [];
        this.trees = [];
        this.boundaries = [];
    }
    
    /**
     * 월드 생성 (메인 메서드)
     */
    createWorld() {
        this.createTerrain();
        this.createSky();
        this.createClouds();
        this.createTrees();
        this.createMapBoundaries();
        
        console.log('🌍 월드 생성 완료:', {
            terrain: !!this.terrain,
            sky: !!this.sky,
            water: !!this.water,
            clouds: this.clouds.length,
            trees: this.trees.length,
            boundaries: this.boundaries.length
        });
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
            color: this.config?.world?.terrainColor || 0x4a6741
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
            color: this.config?.world?.waterColor || 0x006994,
            transparent: true,
            opacity: this.config?.world?.waterOpacity || 0.6,
            shininess: this.config?.world?.waterShininess || 100
        });
        
        this.water = new THREE.Mesh(waterGeometry, waterMaterial);
        this.water.rotation.x = -Math.PI / 2;
        this.water.position.y = this.config.world.waterLevel;
        this.water.receiveShadow = true;
        this.scene.add(this.water);
    }
    
    /**
     * 하늘 생성
     */
    createSky() {
        const skyRadius = this.config?.world?.skyRadius || 1500;
        const skyGeometry = new THREE.SphereGeometry(skyRadius, 32, 32);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: this.config?.world?.skyColor || 0x87CEEB,
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
        const cloudSize = this.config?.client?.clouds?.size || 20;
        const cloudOpacity = this.config?.client?.clouds?.opacity || 0.7;
        const spreadRange = this.config?.client?.clouds?.spreadRange || 800;
        
        for (let i = 0; i < cloudCount; i++) {
            const cloudGeometry = new THREE.SphereGeometry(cloudSize, 8, 8);
            const cloudMaterial = new THREE.MeshBasicMaterial({
                color: this.config?.client?.clouds?.color || 0xffffff,
                transparent: true,
                opacity: cloudOpacity
            });
            
            const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
            cloud.position.set(
                (Math.random() - 0.5) * spreadRange,
                heightMin + Math.random() * (heightMax - heightMin),
                (Math.random() - 0.5) * spreadRange
            );
            cloud.scale.setScalar(0.5 + Math.random() * 0.5);
            
            // 구름 애니메이션을 위한 속도 저장
            cloud.userData = {
                velocity: this.config?.client?.clouds?.velocity || 0.1,
                resetPosition: spreadRange
            };
            
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
        const spreadRange = this.config?.client?.trees?.spreadRange || 300;
        
        for (let i = 0; i < treeCount; i++) {
            const tree = this.createTree();
            let x, z, terrainHeight;
            let attempts = 0;
            
            // 적절한 위치를 찾을 때까지 시도 (최대 10번)
            do {
                x = (Math.random() - 0.5) * spreadRange;
                z = (Math.random() - 0.5) * spreadRange;
                terrainHeight = this.getTerrainHeight(x, z);
                attempts++;
            } while (terrainHeight <= this.config.world.waterLevel + minHeightAboveWater && attempts < 10);
            
            // 나무를 지형 위에 배치
            tree.position.set(x, terrainHeight, z);
            this.trees.push(tree);
            this.scene.add(tree);
        }
    }
    
    /**
     * 개별 나무 생성
     */
    createTree() {
        const treeGroup = new THREE.Group();
        
        // config에서 나무 설정 가져오기
        const treeConfig = this.config?.client?.trees || {};
        const trunkHeight = treeConfig.trunkHeight || 8;
        const trunkRadius = treeConfig.trunkRadius || { bottom: 1, top: 0.5 };
        const leavesRadius = treeConfig.leavesRadius || 4;
        const trunkColor = treeConfig.trunkColor || 0x8B4513;
        const leavesColor = treeConfig.leavesColor || 0x228B22;
        
        // 나무 줄기
        const trunkGeometry = new THREE.CylinderGeometry(
            trunkRadius.top, 
            trunkRadius.bottom, 
            trunkHeight
        );
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: trunkColor });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        treeGroup.add(trunk);
        
        // 나무 잎
        const leavesGeometry = new THREE.SphereGeometry(leavesRadius, 8, 8);
        const leavesMaterial = new THREE.MeshLambertMaterial({ color: leavesColor });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = trunkHeight + leavesRadius / 2;
        leaves.castShadow = true;
        treeGroup.add(leaves);
        
        // 나무 크기 변화 (다양성)
        const scale = 0.8 + Math.random() * 0.4; // 0.8 ~ 1.2
        treeGroup.scale.setScalar(scale);
        
        return treeGroup;
    }
    
    /**
     * 맵 경계 표시 생성
     */
    createMapBoundaries() {
        const mapSize = this.config.world.size;
        const boundaryHeight = this.config.world.maxHeight / 2 || 100;
        const boundaryConfig = this.config?.world?.boundaries || {};
        
        // 경계 벽 재질 (반투명한 빨간색)
        const boundaryMaterial = new THREE.MeshBasicMaterial({
            color: boundaryConfig.color || 0xff0000,
            transparent: true,
            opacity: boundaryConfig.opacity || 0.3,
            side: THREE.DoubleSide
        });
        
        // 북쪽 벽
        const northWall = new THREE.PlaneGeometry(mapSize, boundaryHeight);
        const northMesh = new THREE.Mesh(northWall, boundaryMaterial);
        northMesh.position.set(0, boundaryHeight / 2, mapSize / 2);
        northMesh.rotation.x = 0;
        this.boundaries.push(northMesh);
        this.scene.add(northMesh);
        
        // 남쪽 벽
        const southWall = new THREE.PlaneGeometry(mapSize, boundaryHeight);
        const southMesh = new THREE.Mesh(southWall, boundaryMaterial);
        southMesh.position.set(0, boundaryHeight / 2, -mapSize / 2);
        southMesh.rotation.x = 0;
        southMesh.rotation.y = Math.PI;
        this.boundaries.push(southMesh);
        this.scene.add(southMesh);
        
        // 동쪽 벽
        const eastWall = new THREE.PlaneGeometry(mapSize, boundaryHeight);
        const eastMesh = new THREE.Mesh(eastWall, boundaryMaterial);
        eastMesh.position.set(mapSize / 2, boundaryHeight / 2, 0);
        eastMesh.rotation.y = -Math.PI / 2;
        this.boundaries.push(eastMesh);
        this.scene.add(eastMesh);
        
        // 서쪽 벽
        const westWall = new THREE.PlaneGeometry(mapSize, boundaryHeight);
        const westMesh = new THREE.Mesh(westWall, boundaryMaterial);
        westMesh.position.set(-mapSize / 2, boundaryHeight / 2, 0);
        westMesh.rotation.y = Math.PI / 2;
        this.boundaries.push(westMesh);
        this.scene.add(westMesh);
        
        // 천장 (높이 제한 표시)
        const ceilingGeometry = new THREE.PlaneGeometry(mapSize, mapSize);
        const ceilingMaterial = new THREE.MeshBasicMaterial({
            color: boundaryConfig.ceilingColor || 0xff0000,
            transparent: true,
            opacity: boundaryConfig.ceilingOpacity || 0.1,
            side: THREE.DoubleSide
        });
        const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
        ceiling.position.set(0, this.config.world.maxHeight, 0);
        ceiling.rotation.x = -Math.PI / 2;
        this.boundaries.push(ceiling);
        this.scene.add(ceiling);
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
     * 구름 애니메이션 업데이트
     */
    updateClouds() {
        this.clouds.forEach(cloud => {
            cloud.position.x += cloud.userData.velocity;
            if (cloud.position.x > cloud.userData.resetPosition) {
                cloud.position.x = -cloud.userData.resetPosition;
            }
        });
    }
    
    /**
     * 월드 정리 (메모리 해제)
     */
    cleanup() {
        // 지형 제거
        if (this.terrain) {
            this.scene.remove(this.terrain);
            this.terrain.geometry.dispose();
            this.terrain.material.dispose();
            this.terrain = null;
        }
        
        // 물 제거
        if (this.water) {
            this.scene.remove(this.water);
            this.water.geometry.dispose();
            this.water.material.dispose();
            this.water = null;
        }
        
        // 하늘 제거
        if (this.sky) {
            this.scene.remove(this.sky);
            this.sky.geometry.dispose();
            this.sky.material.dispose();
            this.sky = null;
        }
        
        // 구름 제거
        this.clouds.forEach(cloud => {
            this.scene.remove(cloud);
            cloud.geometry.dispose();
            cloud.material.dispose();
        });
        this.clouds = [];
        
        // 나무 제거
        this.trees.forEach(tree => {
            this.scene.remove(tree);
            tree.children.forEach(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        });
        this.trees = [];
        
        // 경계 제거
        this.boundaries.forEach(boundary => {
            this.scene.remove(boundary);
            boundary.geometry.dispose();
            boundary.material.dispose();
        });
        this.boundaries = [];
        
        console.log('🌍 월드 정리 완료');
    }
    
    /**
     * 월드 통계 반환
     */
    getWorldStats() {
        return {
            terrain: !!this.terrain,
            water: !!this.water,
            sky: !!this.sky,
            cloudsCount: this.clouds.length,
            treesCount: this.trees.length,
            boundariesCount: this.boundaries.length
        };
    }
} 