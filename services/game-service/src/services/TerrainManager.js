import {
    getTerrainHeight
} from '../utils/terrain.js';

/**
 * 지형 관련 로직을 관리하는 클래스
 */
export class TerrainManager {
    constructor(config) {
        this.config = config.world;
        this.terrainConfig = config.terrain;
    }

    /**
     * 지형 높이 계산
     * @param {number} x 
     * @param {number} z 
     * @returns {number}
     */
    getTerrainHeight(x, z) {
        return getTerrainHeight(x, z, this.terrainConfig);
    }

    /**
     * 특정 위치의 지형이 평평한지 확인
     * @param {number} x 
     * @param {number} z 
     * @param {number} radius 
     * @returns {boolean}
     */
    isTerrainFlat(x, z, radius) {
        const centerHeight = this.getTerrainHeight(x, z);
        const checkPoints = this.terrainConfig?.flatness?.checkPoints || 8;
        const maxHeightDiff = this.terrainConfig?.flatness?.maxHeightDiff || 10;

        for (let i = 0; i < checkPoints; i++) {
            const angle = (i / checkPoints) * Math.PI * 2;
            const checkX = x + Math.cos(angle) * radius;
            const checkZ = z + Math.sin(angle) * radius;
            const checkHeight = this.getTerrainHeight(checkX, checkZ);

            if (Math.abs(checkHeight - centerHeight) > maxHeightDiff) {
                return false;
            }
        }
        return true;
    }
} 