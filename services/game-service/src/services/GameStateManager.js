/**
 * 게임의 상태(waiting, playing, ended)와 상태 전환 로직을 관리하는 클래스
 */
export class GameStateManager {
    constructor(config, eventEmitter) {
        this.config = config.game;
        this.eventEmitter = eventEmitter;
        this.gameState = 'waiting'; // 'waiting', 'playing', 'ended'
    }

    /**
     * 현재 게임 상태를 반환합니다.
     * @returns {string}
     */
    getGameState() {
        return this.gameState;
    }

    /**
     * 플레이어 수에 따라 게임 상태를 업데이트합니다.
     * @param {number} playerCount 
     */
    updatePlayerCount(playerCount) {
        if (this.gameState === 'waiting' && playerCount >= this.config.minPlayersToStart) {
            this.startGame(playerCount);
        } else if (this.gameState === 'playing' && playerCount < this.config.minPlayersToStart) {
            this.endGame();
        }
    }

    /**
     * 게임을 시작합니다.
     * @param {number} playerCount 
     */
    startGame(playerCount) {
        this.gameState = 'playing';
        console.log(`[GameStateManager] Game started with ${playerCount} players.`);
        this.eventEmitter.emit('gameStarted', { playerCount });
    }

    /**
     * 게임을 종료하고 대기 상태로 변경합니다.
     */
    endGame() {
        this.gameState = 'waiting';
        console.log('[GameStateManager] Game ended. Waiting for players...');
        this.eventEmitter.emit('gameEnded');
    }

    /**
     * 시스템 상태를 직렬화합니다.
     * @returns {{gameState: string}}
     */
    serialize() {
        return {
            gameState: this.gameState,
        };
    }
} 