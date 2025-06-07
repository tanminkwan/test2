const { v4: uuidv4 } = require('uuid');
const Vehicle = require('../entities/Vehicle');
const Bullet = require('../entities/Bullet');
const Explosion = require('../entities/Explosion');
const Billboard = require('../entities/Billboard');

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
        this.billboards = new Map(); // 광고판 추가
        
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
        
        // 광고판 생성
        this.createBillboards();
        
        this.startGameLoop();
    }

    /**
     * 광고판 생성
     */
    createBillboards() {
        if (!this.config.billboards || !this.config.billboards.enabled) {
            return;
        }

        const billboardConfig = this.config.billboards;
        const worldSize = this.config.world.size;
        const count = billboardConfig.count || 5;
        const minDistance = billboardConfig.minDistance || 80;

        const positions = [];

        for (let i = 0; i < count; i++) {
            let position;
            let attempts = 0;
            const maxAttempts = 100; // 더 많은 시도 횟수

            // 다른 광고판과 충분한 거리를 두고 평평한 지역에 배치
            do {
                // 더 넓은 범위에서 위치 선택 (중앙 지역 선호)
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * worldSize * 0.3 + 50; // 중심에서 50-200 거리
                
                const x = Math.cos(angle) * distance;
                const z = Math.sin(angle) * distance;
                
                // 지형 높이 계산 (클라이언트와 동일한 공식 사용)
                const terrainHeight = this.getTerrainHeight(x, z);
                
                // 평평한 지역인지 확인 (주변 높이 차이 검사)
                const isFlat = this.isTerrainFlat(x, z, 20); // 20 단위 반경 내 평평함 검사
                
                position = {
                    x: x,
                    y: Math.max(terrainHeight + billboardConfig.height / 2 + 5, this.config.world.waterLevel + billboardConfig.height / 2 + 5), // 지형 위 5 단위 여유
                    z: z
                };
                
                attempts++;
            } while (attempts < maxAttempts && 
                    (!this.isTerrainFlat(position.x, position.z, 15) || 
                     this.isTooCloseToOtherBillboards(position, positions, minDistance) ||
                     this.getTerrainHeight(position.x, position.z) < this.config.world.waterLevel + 5)); // 물 위 5 단위 이상

            if (attempts < maxAttempts) {
                positions.push(position);

                const billboardId = uuidv4();
                const rotation = {
                    x: 0,
                    y: Math.random() * Math.PI * 2, // 랜덤 방향
                    z: 0
                };

                // 이미지 선택 (배열인 경우 랜덤 선택)
                const frontImage = this.selectRandomImage(billboardConfig.images.front);
                const backImage = this.selectRandomImage(billboardConfig.images.back);

                const billboard = new Billboard(billboardId, position, rotation, {
                    width: billboardConfig.width,
                    height: billboardConfig.height,
                    thickness: billboardConfig.thickness,
                    frontImage: frontImage,
                    backImage: backImage
                });

                this.billboards.set(billboardId, billboard);
            }
        }

        console.log(`Created ${this.billboards.size} billboards`);
    }

    /**
     * 지형 높이 계산 (클라이언트와 동일한 공식)
     */
    getTerrainHeight(x, z) {
        const height = 
            Math.sin(x * 0.008) * 25 +
            Math.cos(z * 0.008) * 25 +
            Math.sin(x * 0.015) * 15 +
            Math.cos(z * 0.015) * 15 +
            Math.sin(x * 0.03) * 8 +
            Math.cos(z * 0.03) * 8 +
            Math.sin(x * 0.05) * 4 +
            Math.cos(z * 0.05) * 4;
            
        return height;
    }

    /**
     * 지형이 평평한지 확인
     */
    isTerrainFlat(x, z, radius) {
        const centerHeight = this.getTerrainHeight(x, z);
        const checkPoints = 8; // 8방향 체크
        const maxHeightDiff = 10; // 최대 높이 차이 허용값
        
        for (let i = 0; i < checkPoints; i++) {
            const angle = (i / checkPoints) * Math.PI * 2;
            const checkX = x + Math.cos(angle) * radius;
            const checkZ = z + Math.sin(angle) * radius;
            const checkHeight = this.getTerrainHeight(checkX, checkZ);
            
            if (Math.abs(checkHeight - centerHeight) > maxHeightDiff) {
                return false; // 높이 차이가 너무 크면 평평하지 않음
            }
        }
        
        return true;
    }

    /**
     * 다른 광고판과의 거리 체크
     */
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

    /**
     * 이미지 선택 (배열인 경우 랜덤 선택)
     */
    selectRandomImage(imageConfig) {
        if (Array.isArray(imageConfig)) {
            return imageConfig[Math.floor(Math.random() * imageConfig.length)];
        }
        return imageConfig;
    }

    /**
     * 플레이어 추가
     */
    addPlayer(playerId, playerName, vehicleType = 'fighter') {
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
        const vehicle = new Vehicle(vehicleId, playerId, color, this.config, vehicleType);
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

            // 비행체와의 충돌 검사
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
            
            // 총알이 이미 제거되었으면 다음 총알로
            if (!bullet.active) continue;
            
            // 광고판과의 충돌 검사
            for (const [billboardId, billboard] of this.billboards) {
                if (billboard.checkCollision(bullet)) {
                    // 광고판에 데미지 적용
                    const destroyed = billboard.takeDamage(bullet.damage);
                    
                    if (destroyed) {
                        // 광고판 파괴 시 폭발 효과
                        this.createExplosion(billboard.position);
                        
                        // 파편 생성
                        const debrisData = billboard.getDebrisData();
                        
                        // 광고판 파괴 이벤트 발생
                        this.eventEmitter.emit('billboardDestroyed', {
                            billboardId: billboardId,
                            billboard: billboard.toClientData(),
                            debris: debrisData,
                            destroyedBy: bullet.shooterId
                        });
                        
                        // 파괴자에게 점수 추가
                        const shooter = this.players.get(bullet.shooterId);
                        if (shooter) {
                            shooter.score += 50; // 광고판 파괴 점수
                        }
                        
                        console.log(`Billboard ${billboardId} destroyed by player ${bullet.shooterId}`);
                    } else {
                        // 파괴되지 않았다면 총알 자국 추가
                        const bulletHole = billboard.addBulletHole(bullet.position, bullet.velocity);
                        
                        if (bulletHole) {
                            // 총알 자국 생성 이벤트 발생
                            this.eventEmitter.emit('bulletHoleCreated', {
                                billboardId: billboardId,
                                bulletHole: bulletHole
                            });
                        }
                    }
                    
                    // 총알 제거
                    bullet.destroy();
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
            billboards: Array.from(this.billboards.values())
                .filter(b => !b.isDestroyed)
                .map(b => b.toClientData()),
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
            explosions: Array.from(this.explosions.values()).map(e => e.toClientData()),
            billboards: Array.from(this.billboards.values())
                .filter(b => !b.isDestroyed) // 파괴된 광고판 제외
                .map(b => b.toClientData())
        };
    }
}

module.exports = GameManager; 