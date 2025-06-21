import { v4 as uuidv4 } from 'uuid';
import Vehicle from '../entities/Vehicle.js';
import Billboard from '../entities/Billboard.js';
import { WeaponSystem } from './WeaponSystem.js';
import { EffectSystem } from './EffectSystem.js';
import { VehicleFactory } from './VehicleFactory.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';
import { TargetingSystem } from './TargetingSystem.js';
import { TerrainManager } from './TerrainManager.js';
import { PlayerManager } from './PlayerManager.js';
import { VehicleManager } from './VehicleManager.js';

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
        this.billboards = new Map();
        
        // 시스템들 (Dependency Injection)
        this.playerManager = new PlayerManager(config, eventEmitter);
        this.terrainManager = new TerrainManager(config);
        this.vehicleFactory = new VehicleFactory(config);
        this.vehicleManager = new VehicleManager(config, eventEmitter, this.vehicleFactory, this.terrainManager);
        this.weaponSystem = new WeaponSystem(this.config);
        this.effectSystem = new EffectSystem(this.eventEmitter);
        this.performanceMonitor = new PerformanceMonitor(this.config);
        this.targetingSystem = new TargetingSystem(
            this.config, 
            (x, z) => this.terrainManager.getTerrainHeight(x, z)
        );
        
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
                
                const terrainHeight = this.terrainManager.getTerrainHeight(x, z);
                
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
        return this.terrainManager.getTerrainHeight(x, z);
    }

    /**
     * 지형이 평평한지 확인
     */
    isTerrainFlat(x, z, radius) {
        return this.terrainManager.isTerrainFlat(x, z, radius);
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
        const playerResult = this.playerManager.addPlayer(playerId, playerName, vehicleType);

        if (!playerResult.success) {
            return { success: false, reason: playerResult.reason };
        }

        const { player } = playerResult;

        // 차량 생성 (VehicleManager 위임)
        const vehicle = this.vehicleManager.createVehicleForPlayer(player.id, vehicleType, player.color);

        const vehicleConfig = this.config.vehicles[vehicleType] || this.config.vehicles.fighter;

        // 무기 장착 (기본 기관총) - 기체별 설정 적용
        this.weaponSystem.equipWeapon(player.id, 'machinegun', {
            damage: vehicleConfig.bulletDamage,
            speed: vehicleConfig.bulletSpeed,
            range: vehicleConfig.bulletRange,
            cooldown: 1000 / vehicleConfig.fireRate
        });
        
        // 미사일 무기 장착
        this.weaponSystem.equipWeapon(player.id, 'missile', {
            ammo: vehicleConfig.missileCount || 4,
            maxAmmo: vehicleConfig.missileCount || 4,
            reloadTime: (vehicleConfig.missileReloadTime || 25) * 1000
        });

        this.checkGameStart();
        this.syncGameState();

        return { 
            success: true, 
            player: player,
            vehicle: vehicle.serialize(),
            weapons: this.weaponSystem.getPlayerWeapons(player.id)
        };
    }

    /**
     * 플레이어 제거
     */
    removePlayer(playerId) {
        const player = this.playerManager.getPlayer(playerId);
        if (!player) return false;

        // 차량 제거 (VehicleManager 위임)
        this.vehicleManager.removeVehicleForPlayer(playerId);

        // 무기 제거
        this.weaponSystem.removePlayerWeapons(playerId);

        // 플레이어 제거 (PlayerManager 위임)
        this.playerManager.removePlayer(playerId);

        this.checkGameEnd();
        this.syncGameState();

        return true;
    }

    /**
     * 플레이어 입력 처리
     */
    handlePlayerInput(playerId, inputs) {
        const vehicle = this.vehicleManager.getPlayerVehicle(playerId);
        if (!vehicle) return;

        // 차량 입력 처리
        vehicle.handleInput(inputs);

        // 무기 발사 처리
        if (inputs.fire) {
            const projectile = this.weaponSystem.fireWeapon(
                playerId, 
                'machinegun', 
                vehicle.position, 
                vehicle.rotation,
                this.vehicleManager.getAllVehicles()
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
        
        // 미사일 발사 처리
        if (inputs.fireMissile) {
            const player = this.playerManager.getPlayer(playerId);
            let targetId = null;

            // 락온이 완료된 상태에서만 타겟 ID 설정
            if (player && player.lockOnState?.isLocked && player.lockOnTargetId) {
                targetId = player.lockOnTargetId;
            } else {
                // 락온되지 않은 경우, 미사일 발사 실패 처리 (또는 비유도 발사)
                console.log(`Player ${playerId} tried to fire missile without lock-on.`);
                return; // 락온 없이는 발사되지 않음
            }
            
            const missile = this.weaponSystem.fireWeapon(
                playerId, 
                'missile', 
                vehicle.position, 
                vehicle.rotation,
                this.vehicleManager.getAllVehicles(),
                targetId
            );

            if (missile) {
                // 미사일 발사 이벤트 전송 (추후 효과 추가)
                this.eventEmitter.emit('missileLaunched', {
                    playerId: playerId,
                    vehicleId: vehicle.id,
                    missileId: missile.id,
                    targetId: targetId // 타겟 정보 추가
                });
                
                console.log(`Player ${playerId} launched missile ${missile.id} targeting ${targetId}`);
            }
        }
    }

    /**
     * 가장 가까운 적 타겟을 찾음
     */
    findNearestTarget(playerId) {
        const playerVehicle = this.vehicleManager.getPlayerVehicle(playerId);
        if (!playerVehicle) return null;

        // 미사일 설정값 가져오기
        const missileConfig = this.config.weapons?.missile || {};
        const maxRange = missileConfig.maxRange;
        const lockAngle = missileConfig.missileLockAngle; // 미사일 락온 각도
        const cosMaxLockAngle = Math.cos(lockAngle * (Math.PI / 180)); // 비교를 위해 코사인 값 미리 계산

        // 플레이어의 정면 벡터 계산
        const forwardVector = {
            x: Math.sin(playerVehicle.rotation.y) * Math.cos(playerVehicle.rotation.x),
            y: -Math.sin(playerVehicle.rotation.x),
            z: Math.cos(playerVehicle.rotation.y) * Math.cos(playerVehicle.rotation.x)
        };

        let bestTarget = null;
        let minDistanceSq = Infinity;

        for (const vehicle of this.vehicleManager.getAllVehicles()) {
            if (vehicle.playerId === playerId || !vehicle.active) {
                continue;
            }

            const dx = vehicle.position.x - playerVehicle.position.x;
            const dy = vehicle.position.y - playerVehicle.position.y;
            const dz = vehicle.position.z - playerVehicle.position.z;
            const distanceSq = dx * dx + dy * dy + dz * dz;

            // 1. 최대 사정거리 체크
            if (distanceSq > maxRange * maxRange) {
                continue;
            }

            // 2. 락온 각도 체크
            const directionToTarget = { x: dx, y: dy, z: dz };
            const distance = Math.sqrt(distanceSq);
            if (distance > 0.001) {
                directionToTarget.x /= distance;
                directionToTarget.y /= distance;
                directionToTarget.z /= distance;
            }

            const dotProduct = forwardVector.x * directionToTarget.x + 
                               forwardVector.y * directionToTarget.y + 
                               forwardVector.z * directionToTarget.z;
            
            // 내적 값이 미리 계산한 코사인 값보다 커야 각도 내에 있는 것
            if (dotProduct < cosMaxLockAngle) {
                continue;
            }

            // 3. 모든 조건을 통과한 타겟 중 가장 가까운 타겟 선택
            if (distanceSq < minDistanceSq) {
                minDistanceSq = distanceSq;
                bestTarget = vehicle;
            }
        }

        return bestTarget;
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
        return this.vehicleManager.getPlayerVehicle(playerId);
    }

    /**
     * 스폰 위치 계산
     */
    getSpawnPosition() {
        return this.vehicleManager.getSpawnPosition();
    }

    /**
     * 게임 시작 확인
     */
    checkGameStart() {
        if (this.gameState === 'waiting' && this.playerManager.getAllPlayers().length >= this.minPlayersToStart) {
            this.startGame();
        }
    }

    /**
     * 게임 시작
     */
    startGame() {
        this.gameState = 'playing';
        console.log(`Game started with ${this.playerManager.getAllPlayers().length} players`);
        this.eventEmitter.emit('gameStarted', {
            playerCount: this.playerManager.getAllPlayers().length
        });
    }

    /**
     * 게임 종료 확인
     */
    checkGameEnd() {
        if (this.gameState === 'playing' && this.playerManager.getAllPlayers().length < this.minPlayersToStart) {
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
            this.vehicleManager.update(deltaTime);
            this.updatePlayerTargetsAndLockOn(deltaTime);
            this.updateWeapons(deltaTime);
            this.updateEffects(deltaTime);
            this.checkCollisions();
        }

        this.syncGameState();
    }

    /**
     * 플레이어들의 타겟 정보와 락온 상태를 업데이트
     */
    updatePlayerTargetsAndLockOn(deltaTime) {
        for (const player of this.playerManager.getAllPlayers()) {
            const playerVehicle = this.vehicleManager.getPlayerVehicle(player.id);
            if (!playerVehicle) continue;

            const enemies = this.vehicleManager.getAllVehicles().filter(v => v.playerId !== player.id && v.active);

            this.targetingSystem.update(
                player,
                playerVehicle,
                enemies,
                deltaTime
            );
        }
    }

    /**
     * 플레이어들의 타겟 정보를 업데이트
     * @deprecated 이제 updatePlayerTargetsAndLockOn을 사용합니다.
     */
    updatePlayerTargets() {
        for (const player of this.playerManager.getAllPlayers()) {
            const target = this.findNearestTarget(player.id);
            if (player) { // player가 null이 아닌지 확인
                player.currentTargetId = target ? target.id : null;
            }
        }
    }

    /**
     * 차량 업데이트
     */
    updateVehicles(deltaTime) {
        this.vehicleManager.update(deltaTime);
        for (const vehicle of this.vehicleManager.getAllVehicles()) {
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
                                (collisionConfig.safeDistance);
            
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
            const velocityReflection = collisionConfig.velocityReflection;
            
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
        const removedProjectiles = this.weaponSystem.updateProjectiles(deltaTime, this.vehicleManager.getAllVehicles());
        
        // 제거된 발사체들에 대한 이벤트 발생
        if (removedProjectiles.length > 0) {
            this.eventEmitter.emit('projectilesRemoved', removedProjectiles);
        }
    }

    /**
     * 효과 시스템 업데이트
     */
    updateEffects(deltaTime) {
        const removedEffects = this.effectSystem.update(deltaTime);
        
        // 제거된 효과들에 대한 이벤트 발생
        if (removedEffects.length > 0) {
            this.eventEmitter.emit('effectsRemoved', removedEffects);
        }
    }

    /**
     * 충돌 검사
     */
    checkCollisions() {
        const collisions = this.weaponSystem.checkCollisions(this.vehicleManager.getAllVehicles(), this.billboards);

        for (const collision of collisions) {
            this.handleCollision(collision);
        }
    }

    /**
     * 충돌 처리
     */
    handleCollision(collision) {
        // 순서 변경: 피격 처리를 먼저 수행
        if (collision.type === 'vehicle') {
            this.handleVehicleHit(collision);
        } else if (collision.type === 'billboard') {
            this.handleBillboardHit(collision);
        }

        // 모든 피격 처리가 끝난 후 발사체를 제거
        this.weaponSystem.removeProjectile(collision.projectileId);
    }

    /**
     * 차량 피격 처리
     */
    handleVehicleHit(collision) {
        const vehicle = this.vehicleManager.getVehicle(collision.targetId);
        if (!vehicle) return;

        // 이미 비활성 차량인 경우 처리하지 않음
        if (!vehicle.active) {
            return;
        }
        
        const wasDestroyed = vehicle.takeDamage(collision.damage);

        if (wasDestroyed) {
            // 차량 파괴 처리
            this.handleVehicleDestroyed(vehicle, collision);
        } else {
            // 일반 피격 효과 (작은 폭발)
            const collisionConfig = this.config.collision || {};
            const explosionRadius = collisionConfig.explosionRadiusSmall;
            const explosionDuration = collisionConfig.explosionDurationSmall;
            const explosionIntensity = collisionConfig.explosionIntensitySmall;
            
            console.log(`Vehicle hit (not destroyed): Creating small explosion with duration ${explosionDuration}ms`);
            
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
        
        const billboardConfig = this.config.billboards;
        // 파괴 효과 생성
        this.effectSystem.createExplosion(
            billboard.position,
            billboardConfig.destruction.explosionRadius,    // radius
            billboardConfig.destruction.explosionDuration,  // duration
            billboardConfig.destruction.explosionIntensity    // intensity
        );

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

        // 플레이어 사망 처리
        const player = this.playerManager.getPlayer(billboard.playerId);
        if (player) {
            player.deaths++;
        }

        // 킬 점수 처리 (발사체 소유자)
        if (collision.ownerId && collision.ownerId !== billboard.playerId) {
            const killer = this.playerManager.getPlayer(collision.ownerId);
            if (killer) {
                killer.kills++;
                // config에서 킬 보상 점수 가져오기
                const scoringConfig = this.config.scoring || {};
                const killReward = scoringConfig.killReward;
                killer.score += killReward;
                console.log(`Player ${killer.name} got a kill! Kills: ${killer.kills}, Score: ${killer.score}`);
            }
        }

        // 차량 파괴 이벤트 발생 (더 상세한 정보 포함)
        this.eventEmitter.emit('vehicleDestroyed', {
            vehicleId: billboard.id,
            playerId: billboard.playerId,
            killedBy: collision.ownerId || null,
            position: billboard.position,
            shouldHide: true // 클라이언트에서 즉시 숨기라는 플래그
        });

        // 큰 폭발 효과 생성 (차량 파괴 시)
        const collisionConfig = this.config.collision || {};
        const explosionRadius = collisionConfig.explosionRadiusLarge || 25;
        const explosionDuration = collisionConfig.explosionDurationLarge || 3000;
        const explosionIntensity = collisionConfig.explosionIntensityLarge || 1.5;
        
        console.log(`Vehicle destroyed: Creating large explosion with duration ${explosionDuration}ms`);
        
        this.effectSystem.createExplosion(
            billboard.position,
            explosionRadius,
            explosionDuration,
            explosionIntensity
        );

        // 4. 점수 및 통계 업데이트
        this.playerManager.updatePlayerStats(billboard.playerId, collision.ownerId);

        // 5. 리스폰 타이머 설정
        const respawnTime = this.config.game.respawnTime;
        setTimeout(() => {
            this.vehicleManager.respawnVehicle(billboard);
        }, respawnTime);
    }

    /**
     * 비행체가 파괴되었을 때의 로직을 처리합니다.
     * @param {Vehicle} vehicle - 파괴된 비행체
     * @param {object} collision - 충돌 정보
     */
    handleVehicleDestroyed(vehicle, collision) {
        if (!vehicle) {
            return;
        }

        const victimId = vehicle.playerId;
        const attackerId = collision.ownerId;

        // 1. 비행체 비활성화
        vehicle.active = false;
        
        // 2. 파괴 이벤트 전송 (클라이언트에서 숨김 처리 및 효과 생성)
        this.eventEmitter.emit('vehicleDestroyed', {
            vehicleId: vehicle.id,
            playerId: victimId,
            killedBy: attackerId || null,
            position: vehicle.position,
            shouldHide: true
        });

        // 3. 서버 측 대형 폭발 효과 생성
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

        // 4. 점수 및 통계 업데이트
        this.playerManager.updatePlayerStats(victimId, attackerId);

        // 5. 리스폰 타이머 설정
        const respawnTime = this.config.game.respawnTime || 5000;
        setTimeout(() => {
            this.vehicleManager.respawnVehicle(vehicle);
        }, respawnTime);

        // 6. 게임 상태 동기화
        this.syncGameState();
    }

    /**
     * 차량 리스폰
     */
    respawnVehicle(vehicle) {
        this.vehicleManager.respawnVehicle(vehicle);
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
            vehicles: this.vehicleManager.getAllVehicles().filter(v => v.active).map(v => v.serialize()),
            players: this.playerManager.getAllPlayers().map(p => {
                return {
                    id: p.id,
                    name: p.name,
                    score: p.score,
                    kills: p.kills,
                    deaths: p.deaths,
                    color: p.color,
                    vehicleType: p.vehicleType,
                    awarenessTargetId: p.awarenessTargetId,
                    lockOnTargetId: p.lockOnTargetId,
                    lockOnState: p.lockOnState,
                    weapons: this.weaponSystem.getPlayerWeapons(p.id)
                };
            }),
            billboards: Array.from(this.billboards.values()).map(b => b.serialize()),
            projectiles: this.weaponSystem.getAllProjectiles().map(p => p.serialize()),
            effects: this.effectSystem.serialize(),
            gameState: this.gameState,
            timestamp: Date.now()
        };
    }
} 