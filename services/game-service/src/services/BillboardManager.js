import { v4 as uuidv4 } from 'uuid';
import Billboard from '../entities/Billboard.js';

/**
 * 게임 내 광고판의 생성 및 관리를 담당하는 클래스
 */
export class BillboardManager {
    constructor(config, terrainManager) {
        this.config = config;
        this.terrainManager = terrainManager;
        this.billboards = new Map();

        if (this.config.billboards?.enabled) {
            this.createBillboards();
        }
    }

    /**
     * 설정에 따라 광고판들을 생성합니다.
     */
    createBillboards() {
        const billboardConfig = this.config.billboards;
        const worldSize = this.config.world.size;
        const count = billboardConfig.count || 5;
        const minDistance = billboardConfig.minDistance || 80;
        const maxAttempts = billboardConfig.maxPlacementAttempts || 100;

        const positions = [];

        for (let i = 0; i < count; i++) {
            let position;
            let attempts = 0;

            do {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * worldSize * 0.3 + 50;
                
                const x = Math.cos(angle) * distance;
                const z = Math.sin(angle) * distance;
                
                const terrainHeight = this.terrainManager.getTerrainHeight(x, z);
                
                position = {
                    x: x,
                    y: Math.max(terrainHeight + billboardConfig.height / 2 + 5, this.config.world.waterLevel + billboardConfig.height / 2 + 5),
                    z: z
                };
                
                attempts++;
            } while (attempts < maxAttempts && 
                    (!this.terrainManager.isTerrainFlat(position.x, position.z, billboardConfig.terrainFlatness?.checkRadius || 15) || 
                     this.isTooCloseToOtherBillboards(position, positions, minDistance) ||
                     this.terrainManager.getTerrainHeight(position.x, position.z) < this.config.world.waterLevel + 5));

            if (attempts < maxAttempts) {
                positions.push(position);

                const billboardId = uuidv4();
                const rotation = {
                    x: 0,
                    y: Math.random() * Math.PI * 2,
                    z: 0
                };

                const frontImage = this.selectRandomImage(billboardConfig.images.front);
                const backImage = this.selectRandomImage(billboardConfig.images.back);

                const billboard = new Billboard(billboardId, position, rotation, {
                    width: billboardConfig.width,
                    height: billboardConfig.height,
                    thickness: billboardConfig.thickness,
                    frontImage: frontImage,
                    backImage: backImage,
                    gameConfig: this.config
                });

                this.billboards.set(billboardId, billboard);
            }
        }

        console.log(`[BillboardManager] Created ${this.billboards.size} billboards`);
    }

    isTooCloseToOtherBillboards(position, existingPositions, minDistance) {
        for (const existingPos of existingPositions) {
            const dx = position.x - existingPos.x;
            const dz = position.z - existingPos.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance < minDistance) {
                return true;
            }
        }
        return false;
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