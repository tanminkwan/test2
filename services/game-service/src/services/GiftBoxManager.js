import { GiftBox } from '../entities/GiftBox.js';

/**
 * 선물 상자의 생성, 파괴, 재생성을 관리하는 클래스
 */
export class GiftBoxManager {
    constructor(config) {
        this.config = config.giftBoxes;
        this.worldConfig = config.world;
        this.giftBoxes = new Map();

        if (this.config.enabled) {
            this.createInitialGiftBoxes();
        }
    }

    /**
     * 설정된 개수만큼 초기 선물 상자를 생성합니다.
     */
    createInitialGiftBoxes() {
        for (let i = 0; i < this.config.count; i++) {
            this.spawnNewGiftBox();
        }
        console.log(`[GiftBoxManager] Created ${this.giftBoxes.size} gift boxes.`);
    }

    /**
     * 새로운 선물 상자 하나를 무작위 위치에 스폰합니다.
     */
    spawnNewGiftBox() {
        const { minHeight, maxHeight } = this.config.spawnOptions;
        const { size } = this.worldConfig;

        const x = (Math.random() - 0.5) * size.x;
        const z = (Math.random() - 0.5) * size.z;
        const y = Math.random() * (maxHeight - minHeight) + minHeight;

        const position = { x, y, z };
        const giftBox = new GiftBox(this.config, position);

        this.giftBoxes.set(giftBox.id, giftBox);
        return giftBox;
    }

    /**
     * 선물 상자가 파괴되었을 때, 해당 상자를 제거하고 새로운 상자를 스폰합니다.
     * @param {string} id - 파괴된 선물 상자의 ID
     */
    destroyAndRespawn(id) {
        const destroyed = this.giftBoxes.delete(id);
        if (destroyed) {
            this.spawnNewGiftBox();
        }
        return destroyed;
    }

    getGiftBox(id) {
        return this.giftBoxes.get(id);
    }

    getAllGiftBoxes() {
        return Array.from(this.giftBoxes.values());
    }
} 