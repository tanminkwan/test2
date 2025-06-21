import { v4 as uuidv4 } from 'uuid';

/**
 * 게임 월드에 떠 있는 선물 상자 엔티티
 */
export class GiftBox {
    constructor(config, position) {
        this.id = uuidv4();
        this.type = 'GiftBox';
        this.health = config.health;
        this.size = config.size;
        this.position = position;
        this.active = true;
    }

    /**
     * 데미지를 받고, 파괴되었는지 여부를 반환합니다.
     * @param {number} damage 
     * @returns {boolean} 파괴 여부
     */
    takeDamage(damage) {
        if (!this.active) return false;

        this.health -= damage;
        if (this.health <= 0) {
            this.active = false;
            return true; // 파괴됨
        }
        return false; // 아직 파괴되지 않음
    }

    /**
     * 클라이언트에 전송할 상태를 직렬화합니다.
     * @returns {object}
     */
    serialize() {
        return {
            id: this.id,
            type: this.type,
            position: this.position,
            size: this.size,
            active: this.active
        };
    }
} 