const { v4: uuidv4 } = require('uuid');
const Vehicle = require('../entities/Vehicle');
const Bullet = require('../entities/Bullet');
const Explosion = require('../entities/Explosion');

/**
 * 게임 매니저 클래스 (Dependency Inversion Principle)
 * 게임의 전체적인 상태와 로직을 관리
 */
class GameManager {
    constructor(config, eventEmitter) {
        this.config = config;
        this.eventEmitter = eventEmitter;
        
        // 게임 상태
        this.gameState = 'waiting'; // waiting, playing, ended
        this.players = new Map();
        this.vehicles = new Map();
        this.bullets = new Map();
        this.explosions = new Map();
        
        // 게임 설정
        this.maxPlayers = config.game.maxPlayers;
        this.minPlayersToStart = config.game.minPlayersToStart;
        
        // 색상 관리
        this.availableColors = [...config.vehicles.colors];
        this.usedColors = new Set();
        
        // 게임 루프
        this.lastUpdateTime = Date.now();
        this.tickRate = config.server.tickRate;
        this.tickInterval = 1000 / this.tickRate;
        
        this.startGameLoop();
    }

    /**
     * 플레이어 추가
     */
    addPlayer(playerId, playerName) {
        if (this.players.size >= this.maxPlayers) {
            return { success: false, reason: 'Game is full' };
        }

        // 색상 할당
        const color = this.assignColor();
        if (!color) {
            return { success: false, reason: 'No available colors' };
        }

        // 플레이어 생성
        const player = {
            id: playerId,
            name: playerName,
            color: color,
            score: 0,
            kills: 0,
            deaths: 0,
            joinedAt: Date.now()
        };

        this.players.set(playerId, player);

        // 비행체 생성
        const vehicleId = uuidv4();
        const vehicle = new Vehicle(vehicleId, playerId, color, this.config);
        this.vehicles.set(vehicleId, vehicle);

        // 게임 시작 체크
        this.checkGameStart();

        this.eventEmitter.emit('playerJoined', {
            player: player,
            vehicle: vehicle.toClientData()
        });

        return { 
            success: true, 
            player: player,
            vehicle: vehicle.toClientData()
        };
    }

    /**
     * 플레이어 제거
     */
    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player) return;

        // 색상 반환
        this.returnColor(player.color);

        // 비행체 제거
        for (const [vehicleId, vehicle] of this.vehicles) {
            if (vehicle.playerId === playerId) {
                this.vehicles.delete(vehicleId);
                break;
            }
        }

        this.players.delete(playerId);

        this.eventEmitter.emit('playerLeft', { playerId });

        // 게임 종료 체크
        this.checkGameEnd();
    }

    /**
     * 플레이어 입력 처리
     */
    handlePlayerInput(playerId, inputs) {
        const vehicle = this.getPlayerVehicle(playerId);
        if (!vehicle || !vehicle.active) return;

        vehicle.updateInputs(inputs);

        // 발사 처리
        if (inputs.fire && vehicle.canFire()) {
            const bulletData = vehicle.fire();
            if (bulletData) {
                this.createBullet(bulletData);
            }
        }
    }

    /**
     * 총알 생성
     */
    createBullet(bulletData) {
        const bulletId = uuidv4();
        const bullet = new Bullet(
            bulletId,
            bulletData.position,
            bulletData.direction,
            bulletData.shooterId,
            this.config
        );

        this.bullets.set(bulletId, bullet);

        this.eventEmitter.emit('bulletCreated', {
            bullet: bullet.toClientData()
        });
    }

    /**
     * 폭발 생성
     */
    createExplosion(position) {
        const explosionId = uuidv4();
        const explosion = new Explosion(explosionId, position, this.config);

        this.explosions.set(explosionId, explosion);

        this.eventEmitter.emit('explosionCreated', {
            explosion: explosion.toClientData()
        });
    }

    /**
     * 색상 할당
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
     * 색상 반환
     */
    returnColor(color) {
        this.usedColors.delete(color);
    }

    /**
     * 플레이어 비행체 가져오기
     */
    getPlayerVehicle(playerId) {
        for (const vehicle of this.vehicles.values()) {
            if (vehicle.playerId === playerId) {
                return vehicle;
            }
        }
        return null;
    }

    /**
     * 게임 시작 체크
     */
    checkGameStart() {
        if (this.gameState === 'waiting' && this.players.size >= this.minPlayersToStart) {
            this.startGame();
        }
    }

    /**
     * 게임 시작
     */
    startGame() {
        this.gameState = 'playing';
        this.eventEmitter.emit('gameStarted', {
            players: Array.from(this.players.values()),
            vehicles: Array.from(this.vehicles.values()).map(v => v.toClientData())
        });
    }

    /**
     * 게임 종료 체크
     */
    checkGameEnd() {
        if (this.gameState === 'playing' && this.players.size < this.minPlayersToStart) {
            this.endGame();
        }
    }

    /**
     * 게임 종료
     */
    endGame() {
        this.gameState = 'waiting';
        this.eventEmitter.emit('gameEnded');
    }

    /**
     * 게임 루프 시작
     */
    startGameLoop() {
        setInterval(() => {
            this.update();
        }, this.tickInterval);
    }

    /**
     * 게임 업데이트
     */
    update() {
        const now = Date.now();
        const deltaTime = (now - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = now;

        if (this.gameState !== 'playing') return;

        // 엔티티 업데이트
        this.updateVehicles(deltaTime);
        this.updateBullets(deltaTime);
        this.updateExplosions(deltaTime);

        // 충돌 검사
        this.checkCollisions();

        // 상태 동기화
        this.syncGameState();
    }

    /**
     * 비행체 업데이트
     */
    updateVehicles(deltaTime) {
        for (const vehicle of this.vehicles.values()) {
            vehicle.update(deltaTime);
        }
    }

    /**
     * 총알 업데이트
     */
    updateBullets(deltaTime) {
        const bulletsToRemove = [];

        for (const [bulletId, bullet] of this.bullets) {
            bullet.update(deltaTime);
            
            if (!bullet.active) {
                bulletsToRemove.push(bulletId);
            }
        }

        // 비활성 총알 제거
        for (const bulletId of bulletsToRemove) {
            this.bullets.delete(bulletId);
            this.eventEmitter.emit('bulletDestroyed', { bulletId });
        }
    }

    /**
     * 폭발 업데이트
     */
    updateExplosions(deltaTime) {
        const explosionsToRemove = [];

        for (const [explosionId, explosion] of this.explosions) {
            explosion.update(deltaTime);
            
            if (!explosion.active) {
                explosionsToRemove.push(explosionId);
            }
        }

        // 비활성 폭발 제거
        for (const explosionId of explosionsToRemove) {
            this.explosions.delete(explosionId);
            this.eventEmitter.emit('explosionDestroyed', { explosionId });
        }
    }

    /**
     * 충돌 검사
     */
    checkCollisions() {
        // 총알과 비행체 충돌
        for (const [bulletId, bullet] of this.bullets) {
            if (!bullet.active) continue;

            for (const [vehicleId, vehicle] of this.vehicles) {
                if (!vehicle.active) continue;
                if (bullet.shooterId === vehicle.playerId) continue;

                if (bullet.intersects(vehicle, 2, 8)) {
                    // 충돌 처리
                    const destroyed = vehicle.takeDamage(bullet.damage);
                    
                    // 폭발 생성
                    this.createExplosion(vehicle.position);
                    
                    // 총알 제거
                    bullet.destroy();
                    
                    if (destroyed) {
                        // 킬/데스 점수 업데이트
                        const shooter = this.players.get(bullet.shooterId);
                        const victim = this.players.get(vehicle.playerId);
                        
                        if (shooter) {
                            shooter.kills++;
                            shooter.score += 100;
                        }
                        
                        if (victim) {
                            victim.deaths++;
                        }
                        
                        this.eventEmitter.emit('vehicleDestroyed', {
                            vehicleId: vehicleId,
                            shooterId: bullet.shooterId,
                            victimId: vehicle.playerId
                        });
                        
                        // 3초 후 리스폰
                        setTimeout(() => {
                            if (this.vehicles.has(vehicleId)) {
                                vehicle.respawn();
                                this.eventEmitter.emit('vehicleRespawned', {
                                    vehicle: vehicle.toClientData()
                                });
                            }
                        }, 3000);
                    }
                    
                    break;
                }
            }
        }
    }

    /**
     * 게임 상태 동기화
     */
    syncGameState() {
        const gameState = {
            vehicles: Array.from(this.vehicles.values())
                .filter(v => v.active)
                .map(v => v.toClientData()),
            bullets: Array.from(this.bullets.values())
                .filter(b => b.active)
                .map(b => b.toClientData()),
            explosions: Array.from(this.explosions.values())
                .filter(e => e.active)
                .map(e => e.toClientData()),
            players: Array.from(this.players.values())
        };

        this.eventEmitter.emit('gameStateUpdate', gameState);
    }

    /**
     * 현재 게임 상태 가져오기
     */
    getGameState() {
        return {
            state: this.gameState,
            players: Array.from(this.players.values()),
            vehicles: Array.from(this.vehicles.values()).map(v => v.toClientData()),
            bullets: Array.from(this.bullets.values()).map(b => b.toClientData()),
            explosions: Array.from(this.explosions.values()).map(e => e.toClientData())
        };
    }
}

module.exports = GameManager; 