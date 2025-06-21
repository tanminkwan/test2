import { v4 as uuidv4 } from 'uuid';
import { Billboard } from '../entities/Billboard.js';
import * as THREE from 'three';

/**
 * 게임 내 광고판의 생성 및 관리를 담당하는 클래스
 */
export class BillboardManager {
    constructor(config, terrainManager) {
        this.config = config;
        this.billboardConfig = config.billboards;
        this.worldConfig = config.world;
        this.terrainManager = terrainManager;
        this.billboards = new Map();

        if (this.billboardConfig?.enabled) {
            this.createBillboards();
        }
    }

    /**
     * 설정에 따라 광고판들을 생성합니다.
     */
    createBillboards() {
        if (!this.billboardConfig?.enabled) return;

        for (let i = 0; i < this.billboardConfig.count; i++) {
            this.createBillboard();
        }
        console.log(`[BillboardManager] Created ${this.billboards.size} billboards.`);
    }

    createBillboard() {
        const placement = this.findPlacement();
        if (placement) {
            const geometry = new THREE.BoxGeometry(this.billboardConfig.width, this.billboardConfig.height, this.billboardConfig.thickness);
            const material = new THREE.MeshStandardMaterial({ color: 0x888888 }); // 기본 재질
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(placement.position.x, placement.position.y, placement.position.z);
            mesh.rotation.y = placement.rotationY;

            const frontImage = this.selectRandomImage(this.billboardConfig.images.front);
            const backImage = this.selectRandomImage(this.billboardConfig.images.back);
            
            const billboard = new Billboard(this.config, mesh, frontImage, backImage);
            this.billboards.set(billboard.id, billboard);
            return billboard;
        }
        return null;
    }

    findPlacement() {
        for (let i = 0; i < this.billboardConfig.maxPlacementAttempts; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.worldConfig.size * 0.4 + (this.worldConfig.size * 0.1);
            
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            const terrainHeight = this.terrainManager.getTerrainHeight(x, z);
            
            const y = terrainHeight + (this.billboardConfig.height / 2) + 2; // 지면에서 살짝 띄움
            const position = new THREE.Vector3(x, y, z);

            if (this.isValidPlacement(position)) {
                return {
                    position: { x, y, z },
                    rotationY: Math.random() * Math.PI * 2
                };
            }
        }
        console.warn('[BillboardManager] Could not find a valid placement for a new billboard.');
        return null;
    }

    isValidPlacement(position) {
        // ... 다른 빌보드와 너무 가까운지 확인
        for (const existingBillboard of this.billboards.values()) {
            const distance = Math.sqrt(
                Math.pow(position.x - existingBillboard.position.x, 2) +
                Math.pow(position.z - existingBillboard.position.z, 2)
            );
            if (distance < this.billboardConfig.minDistance) {
                return false;
            }
        }
        return true;
    }

    selectRandomImage(imageConfig) {
        if (Array.isArray(imageConfig)) {
            return imageConfig[Math.floor(Math.random() * imageConfig.length)];
        }
        return imageConfig;
    }

    getBillboard(id) {
        return this.billboards.get(id);
    }

    getAllBillboards() {
        return this.billboards;
    }

    removeBillboard(id) {
        return this.billboards.delete(id);
    }
} 