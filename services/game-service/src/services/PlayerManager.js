/**
 * 플레이어와 관련된 로직(추가, 제거, 상태 관리 등)을 담당하는 클래스
 */
export class PlayerManager {
    constructor(config, eventEmitter) {
        this.gameConfig = config.game;
        this.vehicleConfig = config.vehicles;
        this.scoringConfig = config.scoring;
        this.eventEmitter = eventEmitter;

        this.players = new Map();
        this.availableColors = [...this.vehicleConfig.colors];
        this.usedColors = new Set();
    }

    /**
     * 새로운 플레이어를 게임에 추가합니다.
     * @param {string} playerId 
     * @param {string} playerName 
     * @param {string} vehicleType 
     * @returns {{success: boolean, reason?: string, player?: object}}
     */
    addPlayer(playerId, playerName, vehicleType = 'fighter') {
        if (this.players.size >= this.gameConfig.maxPlayers) {
            return { success: false, reason: 'Game is full' };
        }

        const color = this.assignColor();
        if (!color) {
            return { success: false, reason: 'No available colors' };
        }

        const player = {
            id: playerId,
            name: playerName,
            score: 0,
            kills: 0,
            deaths: 0,
            color: color,
            vehicleType: vehicleType,
            joinedAt: Date.now(),
            awarenessTargetId: null,
            lockOnTargetId: null,
            lockOnState: { isLocked: false, progress: 0 }
        };

        this.players.set(playerId, player);
        console.log(`[PlayerManager] Player ${playerName} (${playerId}) joined with color ${color}`);
        
        return { success: true, player };
    }

    /**
     * 게임에서 플레이어를 제거합니다.
     * @param {string} playerId 
     * @returns {boolean}
     */
    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player) {
            return false;
        }

        this.returnColor(player.color);
        this.players.delete(playerId);
        console.log(`[PlayerManager] Player ${player.name} (${playerId}) left.`);
        
        return true;
    }

    /**
     * 플레이어의 통계(킬, 데스, 점수)를 업데이트합니다.
     * @param {string} victimId - 사망한 플레이어 ID
     * @param {string | null} attackerId - 공격한 플레이어 ID
     */
    updatePlayerStats(victimId, attackerId) {
        const victimPlayer = this.getPlayer(victimId);
        if (victimPlayer) {
            victimPlayer.deaths += 1;
            console.log(`[PlayerManager] ${victimPlayer.name}'s deaths updated to ${victimPlayer.deaths}`);
        }

        if (attackerId && attackerId !== victimId) {
            const attackerPlayer = this.getPlayer(attackerId);
            if (attackerPlayer) {
                attackerPlayer.kills += 1;
                attackerPlayer.score += this.scoringConfig.killReward || 100;
                console.log(`[PlayerManager] ${attackerPlayer.name}'s stats updated. Kills: ${attackerPlayer.kills}, Score: ${attackerPlayer.score}`);
            }
        }
    }

    getPlayer(playerId) {
        return this.players.get(playerId);
    }
    
    getAllPlayers() {
        return Array.from(this.players.values());
    }

    /**
     * 사용 가능한 색상을 할당합니다.
     * @returns {string | null}
     */
    assignColor() {
        for (const color of this.availableColors) {
            if (!this.usedColors.has(color)) {
                this.usedColors.add(color);
                return color;
            }
        }
        return null;
    }

    /**
     * 사용했던 색상을 반환합니다.
     * @param {string} color 
     */
    returnColor(color) {
        this.usedColors.delete(color);
    }
} 