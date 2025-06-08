import { v4 as uuidv4 } from 'uuid';
import Vehicle from '../entities/Vehicle.js';
import Billboard from '../entities/Billboard.js';
import { WeaponSystem } from './WeaponSystem.js';
import { EffectSystem } from './EffectSystem.js';
import { VehicleFactory } from './VehicleFactory.js';

/**
 * 게임 매니저 클래스 (Dependency Inversion Principle)
 * 게임의 전체적인 상태와 로직을 관리
 * SOLID 원칙에 따라 리팩토링됨
 */
export default class GameManager {
    constructor(config, eventEmitter) {
        this.config = config;
        this.eventEmitter = eventEmitter;
        
        // 게임 상태
        this.gameState = 'waiting'; // waiting, playing, ended
        this.players = new Map();
        this.vehicles = new Map();
        this.billboards = new Map();
        
        // 시스템들 (Dependency Injection)
        this.weaponSystem = new WeaponSystem();
        this.effectSystem = new EffectSystem();
        this.vehicleFactory = new VehicleFactory(config); // Factory 패턴 적용
        
        // WeaponSystem에 이벤트 에미터 설정
        this.weaponSystem.setEventEmitter(this.eventEmitter);
        
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
                
                const terrainHeight = this.getTerrainHeight(x, z);
                
                position = {
                    x: x,
                    y: Math.max(terrainHeight + billboardConfig.height / 2 + 5, this.config.world.waterLevel + billboardConfig.height / 2 + 5),
                    z: z
                };
                
                attempts++;
            } while (attempts < maxAttempts && 
                    (!this.isTerrainFlat(position.x, position.z, billboardConfig.terrainFlatness?.checkRadius || 15) || 
                     this.isTooCloseToOtherBillboards(position, positions, minDistance) ||
                     this.getTerrainHeight(position.x, position.z) < this.config.world.waterLevel + 5));

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
                    gameConfig: this.config // 게임 설정 전달
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
        const checkPoints = this.config.billboards?.terrainFlatness?.checkPoints || 8;
        const maxHeightDiff = this.config.billboards?.terrainFlatness?.maxHeightDiff || 10;
        
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

        const color = this.assignColor();
        if (!color) {
            return { success: false, reason: 'No available colors' };
        }

        // 플레이어 생성
        const player = {
            id: playerId,
            name: playerName,
            score: 0,
            kills: 0,
            deaths: 0,
            color: color,
            vehicleType: vehicleType,
            joinedAt: Date.now()
        };

        // 차량 생성
        const vehicleId = uuidv4();
        const spawnPosition = this.getSpawnPosition();
        
        // Factory 패턴을 사용하여 비행체 생성
        const vehicle = this.vehicleFactory.createVehicle(vehicleId, playerId, spawnPosition, {
            color: color,
            vehicleType: vehicleType
        });

        // 무기 장착 (기본 기관총)
        this.weaponSystem.equipWeapon(playerId, 'machinegun');

        this.players.set(playerId, player);
        this.vehicles.set(vehicleId, vehicle);

        console.log(`Player ${playerName} (${playerId}) joined the game with ${vehicleType} vehicle`);

        this.checkGameStart();
        this.syncGameState();

        return { 
            success: true, 
            player: player,
            vehicle: vehicle.serialize(),
            weapons: this.weaponSystem.getPlayerWeapons(playerId)
        };
    }

    /**
     * 플레이어 제거
     */
    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player) return false;

        // 색상 반환
        this.returnColor(player.color);

        // 플레이어 차량 찾기 및 제거
        for (const [vehicleId, vehicle] of this.vehicles) {
            if (vehicle.playerId === playerId) {
                this.vehicles.delete(vehicleId);
                break;
            }
        }

        // 무기 제거
        this.weaponSystem.removePlayerWeapons(playerId);

        // 플레이어 제거
        this.players.delete(playerId);

        console.log(`Player ${player.name} (${playerId}) left the game`);

        this.checkGameEnd();
        this.syncGameState();

        return true;
    }

    /**
     * 플레이어 입력 처리
     */
    handlePlayerInput(playerId, inputs) {
        const vehicle = this.getPlayerVehicle(playerId);
        if (!vehicle) return;

        // 차량 입력 처리
        vehicle.handleInput(inputs);

        // 무기 발사 처리
        if (inputs.fire) {
            const projectile = this.weaponSystem.fireWeapon(
                playerId, 
                'machinegun', 
                vehicle.position, 
                vehicle.rotation
            );

            if (projectile) {
                // 총구 스파크 효과 생성
                this.effectSystem.createMuzzleFlash(playerId, vehicle.position, vehicle.rotation);
                
                // 클라이언트에 총구 스파크 이벤트 전송
                this.eventEmitter.emit('muzzleFlash', {
                    playerId: playerId,
                    vehicleId: vehicle.id
                });
            }
        }
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
     * 플레이어 차량 가져오기
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
     * 스폰 위치 계산
     */
    getSpawnPosition() {
        const angle = Math.random() * Math.PI * 2;
        const minDistance = this.config.world?.spawnDistance?.min || 50;
        const maxDistance = this.config.world?.spawnDistance?.max || 150;
        const distance = minDistance + Math.random() * (maxDistance - minDistance);
        
        const minHeight = this.config.world?.spawnHeight?.min || 50;
        const maxHeight = this.config.world?.spawnHeight?.max || 70;
        
        return {
            x: Math.cos(angle) * distance,
            y: minHeight + Math.random() * (maxHeight - minHeight),
            z: Math.sin(angle) * distance
        };
    }

    /**
     * 게임 시작 확인
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
        console.log(`Game started with ${this.players.size} players`);
        this.eventEmitter.emit('gameStarted', {
            playerCount: this.players.size
        });
    }

    /**
     * 게임 종료 확인
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
        console.log('Game ended');
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

        if (this.gameState === 'playing') {
        this.updateVehicles(deltaTime);
            this.updateWeapons(deltaTime);
            this.updateEffects(deltaTime);
        this.checkCollisions();
        }

        this.syncGameState();
    }

    /**
     * 차량 업데이트
     */
    updateVehicles(deltaTime) {
        for (const vehicle of this.vehicles.values()) {
            vehicle.update(deltaTime);
            
            // 비행체와 광고판 충돌 검사
            this.checkVehicleBillboardCollisions(vehicle);
        }
    }

    /**
     * 비행체와 광고판 충돌 검사
     */
    checkVehicleBillboardCollisions(vehicle) {
        for (const billboard of this.billboards.values()) {
            if (billboard.checkCollision(vehicle)) {
                // 충돌 시 비행체를 광고판에서 밀어내기
                this.resolveVehicleBillboardCollision(vehicle, billboard);
            }
        }
    }

    /**
     * 비행체-광고판 충돌 해결
     */
    resolveVehicleBillboardCollision(vehicle, billboard) {
        // 광고판 중심에서 비행체로의 벡터 계산
        const dx = vehicle.position.x - billboard.position.x;
        const dy = vehicle.position.y - billboard.position.y;
        const dz = vehicle.position.z - billboard.position.z;
        
        // 거리 계산
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distance > 0) {
            // 정규화된 방향 벡터
            const normalX = dx / distance;
            const normalY = dy / distance;
            const normalZ = dz / distance;
            
            // config에서 안전 거리 가져오기
            const collisionConfig = this.config.collision || {};
            const safeDistance = Math.max(billboard.width, billboard.height, billboard.thickness) / 2 + 
                                (collisionConfig.safeDistance || 15);
            
            // 강제로 안전한 위치로 이동
            vehicle.position.x = billboard.position.x + normalX * safeDistance;
            vehicle.position.y = billboard.position.y + normalY * safeDistance;
            vehicle.position.z = billboard.position.z + normalZ * safeDistance;
            
            // 속도를 충돌 방향으로 반사
            const velocityMagnitude = Math.sqrt(
                vehicle.velocity.x * vehicle.velocity.x + 
                vehicle.velocity.y * vehicle.velocity.y + 
                vehicle.velocity.z * vehicle.velocity.z
            );
            
            // config에서 속도 반사 계수 가져오기
            const velocityReflection = collisionConfig.velocityReflection || 0.5;
            
            // 반사된 속도 적용
            vehicle.velocity.x = normalX * velocityMagnitude * velocityReflection;
            vehicle.velocity.y = normalY * velocityMagnitude * velocityReflection;
            vehicle.velocity.z = normalZ * velocityMagnitude * velocityReflection;
            
            // 충돌 효과 생성
            this.effectSystem.createImpactEffect(vehicle.position, 'collision');
            
            console.log(`Vehicle collision with billboard at (${billboard.position.x}, ${billboard.position.y}, ${billboard.position.z})`);
        }
    }

    /**
     * 무기 시스템 업데이트
     */
    updateWeapons(deltaTime) {
        const removedProjectiles = this.weaponSystem.updateProjectiles(deltaTime);
        
        // 제거된 발사체들에 대한 이벤트 발생
        if (removedProjectiles.length > 0) {
            this.eventEmitter.emit('projectilesRemoved', removedProjectiles);
        }
    }

    /**
     * 효과 시스템 업데이트
     */
    updateEffects(deltaTime) {
        const removedEffects = this.effectSystem.updateEffects(deltaTime);
        
        // 제거된 효과들에 대한 이벤트 발생
        if (removedEffects.length > 0) {
            this.eventEmitter.emit('effectsRemoved', removedEffects);
        }
    }

    /**
     * 충돌 검사
     */
    checkCollisions() {
        const collisions = this.weaponSystem.checkCollisions(this.vehicles, this.billboards);

        for (const collision of collisions) {
            this.handleCollision(collision);
        }
    }

    /**
     * 충돌 처리
     */
    handleCollision(collision) {
        // 발사체 제거
        this.weaponSystem.removeProjectile(collision.projectileId);

        if (collision.type === 'vehicle') {
            this.handleVehicleHit(collision);
        } else if (collision.type === 'billboard') {
            this.handleBillboardHit(collision);
        }

        // 충돌 효과 생성
        this.effectSystem.createImpactEffect(collision.position, collision.type);
    }

    /**
     * 차량 피격 처리
     */
    handleVehicleHit(collision) {
        const vehicle = this.vehicles.get(collision.targetId);
        if (!vehicle) return;

        // 이미 비활성 차량인 경우 처리하지 않음
        if (!vehicle.active) {
            return;
        }
        
        // 파괴 여부를 미리 확인 (takeDamage 전에)
        const willBeDestroyed = (vehicle.health - collision.damage) <= 0;
        
        const wasDestroyed = vehicle.takeDamage(collision.damage);

        if (willBeDestroyed || wasDestroyed) {
            // 차량 파괴 처리
            this.handleVehicleDestroyed(vehicle, collision);
        } else {
            // 일반 피격 효과 (작은 폭발)
            const collisionConfig = this.config.collision || {};
            const explosionRadius = collisionConfig.explosionRadiusSmall || 5;
            const explosionDuration = collisionConfig.explosionDurationSmall || 1000;
            const explosionIntensity = collisionConfig.explosionIntensitySmall || 0.5;
            
            this.effectSystem.createExplosion(
                vehicle.position,
                explosionRadius,
                explosionDuration,
                explosionIntensity
            );
        }
    }

    /**
     * 광고판 피격 처리
     */
    handleBillboardHit(collision) {
        const billboard = this.billboards.get(collision.targetId);
        if (!billboard) return;

        // 총알 자국 추가
        billboard.addBulletHole(collision.position, collision.damage);

        // 광고판에 데미지 적용
        const isDestroyed = billboard.takeDamage(collision.damage);
        
        console.log(`Billboard hit! Health: ${billboard.health}/${billboard.maxHealth}, Damage: ${collision.damage}`);

        if (isDestroyed) {
            // 광고판 파괴 처리
            this.handleBillboardDestroyed(billboard, collision);
        } else {
            // 파편 효과 (파괴되지 않은 경우)
            this.effectSystem.createImpactEffect(collision.position, 'billboard');
        }
    }

    /**
     * 광고판 파괴 처리
     */
    handleBillboardDestroyed(billboard, collision) {
        console.log(`Billboard ${billboard.id} destroyed!`);
        
        // 파괴 효과 생성
        this.effectSystem.createExplosion(billboard.position, {
            radius: 15,
            duration: 2000
        });

        // 파편 효과 생성
        const debrisData = billboard.getDebrisData();
        if (debrisData) {
            // 클라이언트에 파편 효과 전송
            this.eventEmitter.emit('billboardDestroyed', {
                billboardId: billboard.id,
                debris: debrisData,
                destroyedBy: collision.ownerId || 'unknown'
            });
        }

        // 광고판을 맵에서 제거 (게임 상태 업데이트에서 자동으로 클라이언트에 반영됨)
        this.billboards.delete(billboard.id);
    }

    /**
     * 차량 파괴 처리
     */
    handleVehicleDestroyed(vehicle, collision) {
        // 이미 파괴 처리가 완료된 차량인지 확인 (중복 처리 방지)
        // active가 false이고 health가 maxHealth인 경우는 이미 리스폰 처리된 것
        if (!vehicle.active && vehicle.health === vehicle.maxHealth) {
            return;
        }

        // 차량을 비활성화하여 중복 처리 방지
        if (vehicle.active) {
            vehicle.active = false;
        }

        // 차량을 즉시 숨김 처리 (시각적으로 사라지게)
        vehicle.visible = false;

        // 플레이어 사망 처리
        const player = this.players.get(vehicle.playerId);
        if (player) {
            player.deaths++;
        }

        // 킬 점수 처리 (발사체 소유자)
        if (collision.ownerId && collision.ownerId !== vehicle.playerId) {
            const killer = this.players.get(collision.ownerId);
            if (killer) {
                killer.kills++;
                // config에서 킬 보상 점수 가져오기
                const scoringConfig = this.config.scoring || {};
                const killReward = scoringConfig.killReward || 100;
                killer.score += killReward;
                console.log(`Player ${killer.name} got a kill! Kills: ${killer.kills}, Score: ${killer.score}`);
            }
        }

        // 차량 파괴 이벤트 발생 (더 상세한 정보 포함)
        this.eventEmitter.emit('vehicleDestroyed', {
            vehicleId: vehicle.id,
            playerId: vehicle.playerId,
            killedBy: collision.ownerId || null,
            position: vehicle.position,
            shouldHide: true // 클라이언트에서 즉시 숨기라는 플래그
        });

        // 큰 폭발 효과 생성 (차량 파괴 시)
        const collisionConfig = this.config.collision || {};
        const explosionRadius = collisionConfig.explosionRadiusLarge || 25;
        const explosionDuration = collisionConfig.explosionDurationLarge || 3000;
        const explosionIntensity = collisionConfig.explosionIntensityLarge || 1.5;
        
        this.effectSystem.createExplosion(
            vehicle.position,
            explosionRadius,
            explosionDuration,
            explosionIntensity
        );

        // 리스폰 타이머 설정
        const respawnTime = this.config.game?.respawnTime || 5000;
        setTimeout(() => {
            this.respawnVehicle(vehicle);
        }, respawnTime);
    }

    /**
     * 차량 리스폰
     */
    respawnVehicle(vehicle) {
        const spawnPosition = this.getSpawnPosition();
        vehicle.respawn(spawnPosition);
        
        // 차량을 다시 보이게 만들기
        vehicle.visible = true;
        
        // 리스폰 이벤트 발생 (shouldShow 플래그 포함)
        this.eventEmitter.emit('vehicleRespawned', {
            vehicle: vehicle.serialize(),
            shouldShow: true // 클라이언트에서 다시 보이게 하라는 플래그
        });
    }

    /**
     * 게임 상태 동기화
     */
    syncGameState() {
        const gameState = this.getGameState();
        this.eventEmitter.emit('gameStateUpdate', gameState);
    }

    /**
     * 게임 상태 가져오기
     */
    getGameState() {
        return {
            gameState: this.gameState,
            players: Array.from(this.players.values()),
            vehicles: Array.from(this.vehicles.values()).map(v => v.serialize()),
            projectiles: this.weaponSystem.getAllProjectiles().map(p => p.serialize()),
            effects: this.effectSystem.serialize(),
            billboards: Array.from(this.billboards.values()).map(b => b.serialize()),
            timestamp: Date.now()
        };
    }
} 