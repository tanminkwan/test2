const logger = require('../utils/logger');
const { config } = require('../config/config');

/**
 * 이벤트 프로세서 클래스
 * 수신된 이벤트를 처리하고 적절한 데이터베이스에 저장합니다.
 */
class EventProcessor {
  constructor(dbManager) {
    this.dbManager = dbManager; // 데이터베이스 관리자 (PostgreSQL, InfluxDB, Redis 등)
    this.eventQueue = [];
    this.processingQueue = false;
    this.batchSize = config.eventProcessing.batchSize;
    this.batchIntervalMs = config.eventProcessing.batchIntervalMs;
    this.eventHandlers = this.initEventHandlers();
  }

  /**
   * 이벤트 타입별 핸들러 초기화
   */
  initEventHandlers() {
    return {
      // 플레이어 관련 이벤트
      playerJoined: this.handlePlayerJoined.bind(this),
      playerLeft: this.handlePlayerLeft.bind(this),
      
      // 게임 상태 관련 이벤트
      gameStarted: this.handleGameStarted.bind(this),
      gameEnded: this.handleGameEnded.bind(this),
      
      // 차량 관련 이벤트
      vehicleSpawned: this.handleVehicleSpawned.bind(this),
      vehicleDestroyed: this.handleVehicleDestroyed.bind(this),
      vehicleHit: this.handleVehicleHit.bind(this),
      
      // 무기/발사체 관련 이벤트
      bulletCreated: this.handleBulletCreated.bind(this),
      missileCreated: this.handleMissileCreated.bind(this),
      
      // 환경 오브젝트 관련 이벤트
      billboardHit: this.handleBillboardHit.bind(this),
      billboardDestroyed: this.handleBillboardDestroyed.bind(this),
      itemBoxHit: this.handleItemBoxHit.bind(this),
      itemBoxDestroyed: this.handleItemBoxDestroyed.bind(this),
      
      // 기타 이벤트
      default: this.handleDefaultEvent.bind(this),
      playerScoreChanged: this.handlePlayerScoreChanged.bind(this),
      explosion: this.handleExplosion.bind(this),
      playerSessionStarted: this.handlePlayerSessionStarted.bind(this),
      playerSessionEnded: this.handlePlayerSessionEnded.bind(this),
      gameStateUpdate: this.handleGameStateUpdate.bind(this)
    };
  }

  /**
   * 이벤트 처리 (이벤트 수신 시 호출)
   */
  async processEvent(event, fromLogFile = false) {
    logger.debugAlways('[EVENT] 수신:', event);
    if (!event || !event.type) {
      logger.warn('유효하지 않은 이벤트:', event);
      return;
    }
    // 타임스탬프가 없으면 현재 시간 추가
    if (!event.timestamp) {
      event.timestamp = Date.now();
    }
    // 로그 파일에서 읽은 이벤트는 바로 처리
    if (fromLogFile) {
      await this.processEventDirectly(event);
      return;
    }
    // 즉시 이벤트 타입별로 처리
    const handler = this.eventHandlers[event.type] || this.eventHandlers.default;
    try {
      await handler([event]);
    } catch (err) {
      logger.error(`[${event.type}] 이벤트 처리 중 오류:`, err);
    }
  }

  /**
   * 단일 이벤트 직접 처리 (로그 파일에서 읽은 이벤트용)
   */
  async processEventDirectly(event) {
    const eventType = event.type || 'unknown';
    const handler = this.eventHandlers[eventType] || this.eventHandlers.default;
    
    try {
      await handler([event]);
    } catch (err) {
      logger.error(`'${eventType}' 이벤트 직접 처리 중 오류:`, err);
    }
  }

  /**
   * 플레이어 참가 이벤트 처리
   */
  async handlePlayerJoined(events) {
    if (!this.dbManager) return;
    try {
      await this.dbManager.postgres.insertPlayers(events.map(e => ({
        player_id: e.data.playerId,
        player_name: e.data.playerName,
        joined_at: new Date(e.timestamp),
        vehicle_type: e.data.vehicleType || 'unknown'
      })));
      // TimescaleDB에 플레이어 접속 지표 저장
      for (const event of events) {
        await this.dbManager.saveGameMetric({
          type: 'player_joined',
          value: 1,
          playerId: event.data.playerId,
          timestamp: event.timestamp,
          additionalFields: { vehicle_type: event.data.vehicleType || 'unknown' }
        });
      }
      await this.dbManager.redis.incrementPlayerCount(events.length);
      logger.debug(`${events.length}명의 플레이어 참가 이벤트 처리 완료`);
    } catch (err) {
      logger.error('플레이어 참가 이벤트 처리 중 오류:', err);
    }
  }

  /**
   * 플레이어 퇴장 이벤트 처리
   */
  async handlePlayerLeft(events) {
    if (!this.dbManager) return;
    try {
      await this.dbManager.postgres.updatePlayerSessions(events.map(e => ({
        player_id: e.data.playerId,
        left_at: new Date(e.timestamp)
      })));
      // TimescaleDB에 플레이어 퇴장 지표 저장
      for (const event of events) {
        await this.dbManager.saveGameMetric({
          type: 'player_left',
          value: 1,
          playerId: event.data.playerId,
          timestamp: event.timestamp
        });
      }
      await this.dbManager.redis.decrementPlayerCount(events.length);
      logger.debug(`${events.length}명의 플레이어 퇴장 이벤트 처리 완료`);
    } catch (err) {
      logger.error('플레이어 퇴장 이벤트 처리 중 오류:', err);
    }
  }

  /**
   * 게임 시작 이벤트 처리
   */
  async handleGameStarted(events) {
    if (!this.dbManager) return;
    try {
      await this.dbManager.postgres.insertGameSessions(events.map(e => ({
        game_id: e.data.gameId || `game_${e.timestamp}`,
        started_at: new Date(e.timestamp),
        player_count: e.data.playerCount || 0,
        game_mode: e.data.gameMode || 'default'
      })));
      // TimescaleDB에 게임 시작 지표 저장
      for (const event of events) {
        await this.dbManager.saveGameMetric({
          type: 'game_started',
          value: event.data.playerCount || 0,
          playerId: null,
          timestamp: event.timestamp,
          additionalFields: { game_id: event.data.gameId, game_mode: event.data.gameMode }
        });
      }
      logger.debug(`${events.length}개의 게임 시작 이벤트 처리 완료`);
    } catch (err) {
      logger.error('게임 시작 이벤트 처리 중 오류:', err);
    }
  }

  /**
   * 게임 종료 이벤트 처리
   */
  async handleGameEnded(events) {
    if (!this.dbManager) return;
    try {
      await this.dbManager.postgres.updateGameSessions(events.map(e => ({
        game_id: e.data.gameId || `game_${e.data.startTimestamp || 0}`,
        ended_at: new Date(e.timestamp),
        winner_id: e.data.winnerId || null
      })));
      // TimescaleDB에 게임 종료 지표 저장
      for (const event of events) {
        await this.dbManager.saveGameMetric({
          type: 'game_ended',
          value: 1,
          playerId: event.data.winnerId || null,
          timestamp: event.timestamp,
          additionalFields: { game_id: event.data.gameId }
        });
      }
      logger.debug(`${events.length}개의 게임 종료 이벤트 처리 완료`);
    } catch (err) {
      logger.error('게임 종료 이벤트 처리 중 오류:', err);
    }
  }

  /**
   * 차량 생성 이벤트 처리
   */
  async handleVehicleSpawned(events) {
    if (!this.dbManager) return;
    
    try {
      // PostgreSQL에 차량 정보 저장
      await this.dbManager.postgres.insertVehicles(events.map(e => ({
        vehicle_id: e.data.vehicleId,
        player_id: e.data.playerId,
        vehicle_type: e.data.vehicleType || 'unknown',
        spawned_at: new Date(e.timestamp),
        position: e.data.position ? JSON.stringify(e.data.position) : null
      })));
      
      logger.debug(`${events.length}개의 차량 생성 이벤트 처리 완료`);
    } catch (err) {
      logger.error('차량 생성 이벤트 처리 중 오류:', err);
    }
  }

  /**
   * 차량 파괴 이벤트 처리
   */
  async handleVehicleDestroyed(events) {
    if (!this.dbManager) return;
    try {
      // 모든 이벤트를 game_events에 저장
      for (const event of events) {
        await this.dbManager.saveGameEvent(event);
      }
      // 기존 차량/통계 업데이트 로직 유지
      // 이벤트 유효성 검증
      const validatedEvents = events.filter(event => {
        // 필수 필드 확인
        if (!event.data || !event.data.vehicleId) {
          logger.warn('유효하지 않은 차량 파괴 이벤트, 필수 필드 누락:', event);
          return false;
        }
        return true;
      });
      
      if (validatedEvents.length === 0) {
        logger.warn('유효한 차량 파괴 이벤트가 없습니다.');
        return;
      }
      
      logger.debug(`처리 중인 차량 파괴 이벤트: ${validatedEvents.length}개`);
      
      // 킬 통계 업데이트 전에 플레이어가 존재하는지 확인하고 없으면 생성
      for (const event of validatedEvents) {
        try {
          // 플레이어 ID가 있는 경우 플레이어 생성 (없으면 생성)
          if (event.data.playerId) {
            try {
              await this.dbManager.postgres.insertPlayers([{
                player_id: event.data.playerId,
                player_name: `Player-${event.data.playerId}`,
                joined_at: new Date(event.timestamp),
                vehicle_type: event.data.vehicleType || 'unknown'
              }]);
              logger.debug(`플레이어 생성 또는 업데이트: ${event.data.playerId}`);
            } catch (playerErr) {
              logger.error(`플레이어 생성 중 오류: ${playerErr.message}`);
            }
          } else {
            logger.warn(`차량 파괴 이벤트에 플레이어 ID가 없습니다: ${event.data.vehicleId}`);
          }
          
          // 킬러 ID가 있고 플레이어 ID와 다른 경우 킬러도 생성 (없으면 생성)
          if (event.data.killerId && event.data.killerId !== event.data.playerId) {
            try {
              await this.dbManager.postgres.insertPlayers([{
                player_id: event.data.killerId,
                player_name: `Player-${event.data.killerId}`,
                joined_at: new Date(event.timestamp),
                vehicle_type: 'unknown'
              }]);
              logger.debug(`킬러 생성 또는 업데이트: ${event.data.killerId}`);
            } catch (killerErr) {
              logger.error(`킬러 생성 중 오류: ${killerErr.message}`);
            }
          }
        } catch (playerSetupErr) {
          logger.error(`플레이어 설정 중 오류: ${playerSetupErr.message}`);
          // 개별 플레이어 오류는 다른 이벤트 처리에 영향을 주지 않도록 계속 진행
        }
      }
      
      // PostgreSQL에 차량 정보 업데이트
      try {
        const vehicles = validatedEvents.map(e => ({
          vehicle_id: e.data.vehicleId,
          player_id: e.data.playerId || 'unknown',
          vehicle_type: e.data.vehicleType || 'unknown',
          destroyed_at: new Date(e.timestamp),
          destroyed_by: e.data.killerId || null,
          position: e.data.position ? JSON.stringify(e.data.position) : null,
          spawned_at: e.data.spawnedAt ? new Date(e.data.spawnedAt) : new Date()
        }));
        
        await this.dbManager.postgres.updateVehicles(vehicles);
        
        // 킬 통계 업데이트
        for (const event of validatedEvents) {
          try {
            // 킬러가 존재하고 자살이 아닌 경우
            if (event.data.killerId && event.data.playerId !== event.data.killerId) {
              const killerSuccess = await this.dbManager.postgres.incrementPlayerKills(event.data.killerId);
              if (killerSuccess) {
                await this.dbManager.redis.incrementPlayerKills(event.data.killerId);
              }
              
              const victimSuccess = await this.dbManager.postgres.incrementPlayerDeaths(event.data.playerId);
              if (victimSuccess) {
                await this.dbManager.redis.incrementPlayerDeaths(event.data.playerId);
              }
            } else if (event.data.playerId) {
              // 자살 또는 환경에 의한 파괴
              const victimSuccess = await this.dbManager.postgres.incrementPlayerDeaths(event.data.playerId);
              if (victimSuccess) {
                await this.dbManager.redis.incrementPlayerDeaths(event.data.playerId);
              }
            }
          } catch (statErr) {
            logger.error(`통계 업데이트 중 오류: ${statErr.message}`);
          }
        }
        
        logger.debug(`${validatedEvents.length}개의 차량 파괴 이벤트 처리 완료`);
      } catch (updateErr) {
        logger.error('차량 파괴 이벤트 처리 중 오류:', updateErr);
      }
    } catch (err) {
      logger.error('차량 파괴 이벤트 처리 중 오류:', err);
    }
  }

  /**
   * 차량 피격 이벤트 처리
   */
  async handleVehicleHit(events) {
    if (!this.dbManager) return;
    try {
      // TimescaleDB에 차량 피격 지표 저장
      for (const event of events) {
        await this.dbManager.saveGameMetric({
          type: 'vehicle_hit',
          value: event.data.damage || 0,
          playerId: event.data.ownerId || null,
          timestamp: event.timestamp,
          additionalFields: { vehicle_id: event.data.vehicleId }
        });
      }
      for (const event of events) {
        if (event.data.ownerId) {
          await this.dbManager.postgres.incrementPlayerHits(event.data.ownerId);
          await this.dbManager.redis.incrementPlayerHits(event.data.ownerId);
        }
      }
      logger.debug(`${events.length}개의 차량 피격 이벤트 처리 완료`);
    } catch (err) {
      logger.error('차량 피격 이벤트 처리 중 오류:', err);
    }
  }

  /**
   * 총알 생성 이벤트 처리
   */
  async handleBulletCreated(events) {
    if (!this.dbManager) return;
    try {
      // TimescaleDB에 총알 발사 지표 저장
      for (const event of events) {
        await this.dbManager.saveGameMetric({
          type: 'bullet_created',
          value: 1,
          playerId: event.data.playerId,
          timestamp: event.timestamp,
          additionalFields: { weapon_type: event.data.weaponType || 'default' }
        });
      }
      for (const event of events) {
        if (event.data.playerId) {
          await this.dbManager.postgres.incrementPlayerShots(event.data.playerId);
          await this.dbManager.redis.incrementPlayerShots(event.data.playerId);
        }
      }
      logger.debug(`${events.length}개의 총알 생성 이벤트 처리 완료`);
    } catch (err) {
      logger.error('총알 생성 이벤트 처리 중 오류:', err);
    }
  }

  /**
   * 미사일 생성 이벤트 처리
   */
  async handleMissileCreated(events) {
    if (!this.dbManager) return;
    try {
      // TimescaleDB에 미사일 발사 지표 저장
      for (const event of events) {
        await this.dbManager.saveGameMetric({
          type: 'missile_created',
          value: 1,
          playerId: event.data.playerId,
          timestamp: event.timestamp,
          additionalFields: { missile_type: event.data.missileType || 'default' }
        });
      }
      for (const event of events) {
        if (event.data.playerId) {
          await this.dbManager.postgres.incrementPlayerMissileFires(event.data.playerId);
          await this.dbManager.redis.incrementPlayerMissileFires(event.data.playerId);
        }
      }
      logger.debug(`${events.length}개의 미사일 생성 이벤트 처리 완료`);
    } catch (err) {
      logger.error('미사일 생성 이벤트 처리 중 오류:', err);
    }
  }

  /**
   * 광고판 피격 이벤트 처리
   */
  async handleBillboardHit(events) {
    if (!this.dbManager) return;
    
    try {
      logger.debug(`${events.length}개의 광고판 피격 이벤트 처리 완료`);
    } catch (err) {
      logger.error('광고판 피격 이벤트 처리 중 오류:', err);
    }
  }

  /**
   * 광고판 파괴 이벤트 처리
   */
  async handleBillboardDestroyed(events) {
    if (!this.dbManager) return;
    try {
      // 모든 이벤트를 game_events에 저장
      for (const event of events) {
        await this.dbManager.saveGameEvent(event);
      }
      await this.dbManager.postgres.insertBillboardDestructions(events.map(e => ({
        billboard_id: e.data.billboardId,
        destroyed_by: e.data.destroyedBy || 'unknown',
        destroyed_at: new Date(e.timestamp),
        position: e.data.position ? JSON.stringify(e.data.position) : null,
        reward: e.data.reward || 0
      })));
      // TimescaleDB에 광고판 파괴 지표 저장
      for (const event of events) {
        await this.dbManager.saveGameMetric({
          type: 'billboard_destroyed',
          value: event.data.reward || 0,
          playerId: event.data.destroyedBy || null,
          timestamp: event.timestamp,
          additionalFields: { billboard_id: event.data.billboardId }
        });
      }
      for (const event of events) {
        if (event.data.destroyedBy && event.data.reward) {
          await this.dbManager.postgres.incrementPlayerScore(event.data.destroyedBy, event.data.reward);
          await this.dbManager.redis.incrementPlayerScore(event.data.destroyedBy, event.data.reward);
        }
      }
      logger.debug(`${events.length}개의 광고판 파괴 이벤트 처리 완료`);
    } catch (err) {
      logger.error('광고판 파괴 이벤트 처리 중 오류:', err);
    }
  }

  /**
   * 아이템 상자 피격 이벤트 처리
   */
  async handleItemBoxHit(events) {
    if (!this.dbManager) return;
    try {
      // TimescaleDB에 아이템 상자 피격 지표 저장
      for (const event of events) {
        await this.dbManager.saveGameMetric({
          type: 'item_box_hit',
          value: event.data.damage || 0,
          playerId: event.data.hitBy || null,
          timestamp: event.timestamp,
          additionalFields: { item_box_id: event.data.itemBoxId }
        });
      }
      logger.debug(`${events.length}개의 아이템 상자 피격 이벤트 처리 완료`);
    } catch (err) {
      logger.error('아이템 상자 피격 이벤트 처리 중 오류:', err);
    }
  }

  /**
   * 아이템 상자 파괴 이벤트 처리
   */
  async handleItemBoxDestroyed(events) {
    if (!this.dbManager) return;
    try {
      // 모든 이벤트를 game_events에 저장
      for (const event of events) {
        await this.dbManager.saveGameEvent(event);
      }
      await this.dbManager.postgres.insertItemBoxDestructions(events.map(e => ({
        item_box_id: e.data.itemBoxId,
        destroyed_by: e.data.destroyedBy || 'unknown',
        destroyed_at: new Date(e.timestamp),
        position: e.data.position ? JSON.stringify(e.data.position) : null,
        rewards: e.data.rewards ? JSON.stringify(e.data.rewards) : null
      })));
      // TimescaleDB에 아이템 상자 파괴 지표 저장
      for (const event of events) {
        await this.dbManager.saveGameMetric({
          type: 'item_box_destroyed',
          value: event.data.rewards?.score || 0,
          playerId: event.data.destroyedBy || null,
          timestamp: event.timestamp,
          additionalFields: { item_box_id: event.data.itemBoxId, missile_reward: event.data.rewards?.missiles || 0 }
        });
      }
      for (const event of events) {
        if (event.data.destroyedBy && event.data.rewards) {
          const { score = 0, missiles = 0 } = event.data.rewards;
          if (score > 0) {
            await this.dbManager.postgres.incrementPlayerScore(event.data.destroyedBy, score);
            await this.dbManager.redis.incrementPlayerScore(event.data.destroyedBy, score);
          }
          if (missiles > 0) {
            await this.dbManager.postgres.incrementPlayerMissileCollections(event.data.destroyedBy, missiles);
            await this.dbManager.redis.incrementPlayerMissileCollections(event.data.destroyedBy, missiles);
          }
        }
      }
      logger.debug(`${events.length}개의 아이템 상자 파괴 이벤트 처리 완료`);
    } catch (err) {
      logger.error('아이템 상자 파괴 이벤트 처리 중 오류:', err);
    }
  }

  /**
   * 기본 이벤트 처리 (정의되지 않은 이벤트 타입)
   */
  async handleDefaultEvent(events) {
    logger.debugAlways(`[HANDLER] default 핸들러 진입, 이벤트 수: ${events.length}`);
    logger.debugAlways(`정의되지 않은 이벤트 타입 '${events[0]?.type || 'unknown'}' ${events.length}개 수신`);
    // 모든 이벤트를 TimescaleDB에 원시 데이터로 저장
    if (this.dbManager) {
      try {
        for (const event of events) {
          await this.dbManager.saveGameMetric({
            type: event.type || 'unknown',
            value: 1,
            playerId: event.data?.playerId || null,
            timestamp: event.timestamp,
            additionalFields: event.data || {}
          });
        }
      } catch (err) {
        logger.error('원시 이벤트 저장 중 오류:', err);
      }
    }
    logger.debugAlways(`[HANDLER] default 핸들러 종료`);
  }

  /**
   * 플레이어 점수 변경 이벤트 처리
   */
  async handlePlayerScoreChanged(events) {
    if (!this.dbManager) return;
    try {
      for (const event of events) {
        await this.dbManager.saveGameEvent(event);
        // game_metrics에도 저장
        await this.dbManager.saveGameMetric({
          type: 'player_score_changed',
          value: event.data.scoreDelta || 0,
          playerId: event.data.playerId || null,
          timestamp: event.timestamp,
          additionalFields: event.data || {}
        });
      }
      logger.debug(`${events.length}개의 playerScoreChanged 이벤트 처리 완료`);
    } catch (err) {
      logger.error('playerScoreChanged 이벤트 처리 중 오류:', err);
    }
  }

  /**
   * 폭발(Explosion) 이벤트 처리
   */
  async handleExplosion(events) {
    if (!this.dbManager) return;
    try {
      for (const event of events) {
        await this.dbManager.saveGameEvent(event);
        // game_metrics에도 저장
        await this.dbManager.saveGameMetric({
          type: 'explosion',
          value: event.data.damage || 1,
          playerId: event.data.playerId || null,
          timestamp: event.timestamp,
          additionalFields: event.data || {}
        });
      }
      logger.debug(`${events.length}개의 explosion 이벤트 처리 완료`);
    } catch (err) {
      logger.error('explosion 이벤트 처리 중 오류:', err);
    }
  }

  async handlePlayerSessionStarted(events) {
    if (!this.dbManager) return;
    try {
      for (const event of events) {
        logger.debug(`[playerSessionStarted] upsert player: ${event.data.playerId}`);
        await this.dbManager.postgres.upsertPlayer({
          player_id: event.data.playerId,
          player_name: `Player-${event.data.playerId}`,
          joined_at: new Date(event.data.joinedAt),
          vehicle_type: 'unknown'
        });
        await this.dbManager.saveGameEvent(event);
      }
      logger.debug(`[playerSessionStarted] upsert player_sessions: ${JSON.stringify(events.map(e => e.data.sessionId))}`);
      await this.dbManager.postgres.upsertPlayerSessions(events.map(e => ({
        session_id: e.data.sessionId,
        player_id: e.data.playerId,
        game_id: e.data.gameId,
        joined_at: new Date(e.data.joinedAt)
      })));
      logger.debug(`${events.length}개의 playerSessionStarted 이벤트 처리 완료`);
    } catch (err) {
      logger.error('playerSessionStarted 이벤트 처리 중 오류:', err);
    }
  }

  async handlePlayerSessionEnded(events) {
    if (!this.dbManager) return;
    try {
      for (const event of events) {
        logger.debug(`[playerSessionEnded] upsert player: ${event.data.playerId}`);
        await this.dbManager.postgres.upsertPlayer({
          player_id: event.data.playerId,
          player_name: `Player-${event.data.playerId}`,
          joined_at: new Date(),
          vehicle_type: 'unknown'
        });
        await this.dbManager.saveGameEvent(event);
      }
      logger.debug(`[playerSessionEnded] upsert player_sessions: ${JSON.stringify(events.map(e => e.data.sessionId))}`);
      await this.dbManager.postgres.upsertPlayerSessions(events.map(e => ({
        session_id: e.data.sessionId,
        player_id: e.data.playerId,
        game_id: e.data.gameId || null,
        joined_at: e.data.joinedAt ? new Date(e.data.joinedAt) : new Date(),
        left_at: new Date(e.data.leftAt)
      })));
      logger.debug(`${events.length}개의 playerSessionEnded 이벤트 처리 완료`);
    } catch (err) {
      logger.error('playerSessionEnded 이벤트 처리 중 오류:', err);
    }
  }

  async handleGameStateUpdate(events) {
    if (!this.dbManager) return;
    try {
      for (const event of events) {
        logger.debug(`[gameStateUpdate] upsert game: ${event.data.matchId || event.data.gameId}`);
        await this.dbManager.postgres.upsertGameSession({
          game_id: event.data.matchId || event.data.gameId || `game_${event.timestamp}`,
          started_at: new Date(event.data.timestamp || event.timestamp),
          player_count: event.data.playerCount || 0,
          game_mode: event.data.gameMode || 'default'
        });
        await this.dbManager.saveGameEvent(event);
      }
      logger.debug(`${events.length}개의 gameStateUpdate 이벤트 처리 완료`);
    } catch (err) {
      logger.error('gameStateUpdate 이벤트 처리 중 오류:', err);
    }
  }
}

module.exports = { EventProcessor }; 