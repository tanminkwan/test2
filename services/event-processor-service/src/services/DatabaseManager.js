const { Pool } = require('pg');
const Redis = require('ioredis');
const logger = require('../utils/logger');
const { config } = require('../config/config');

/**
 * 데이터베이스 관리자 클래스
 * PostgreSQL, Redis 연결을 관리하고 데이터 액세스 메서드를 제공합니다.
 */
class DatabaseManager {
  constructor() {
    this.postgres = null;
    this.redis = null;
    this.isConnected = false;
    this.initialize();
  }

  /**
   * 모든 데이터베이스 연결 초기화
   */
  async initialize() {
    try {
      await this.initPostgres();
      await this.initRedis();
      this.isConnected = true;
      logger.info('모든 데이터베이스 연결 초기화 완료');
      return true;
    } catch (err) {
      logger.error('데이터베이스 초기화 중 오류 발생:', err);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * PostgreSQL 연결 초기화
   */
  async initPostgres() {
    try {
      this.postgres = new PostgresManager(config.postgres);
      await this.postgres.connect();
      logger.info('PostgreSQL 연결 성공');
    } catch (err) {
      logger.error('PostgreSQL 연결 실패:', err);
      throw err;
    }
  }

  /**
   * Redis 연결 초기화
   */
  async initRedis() {
    try {
      this.redis = new RedisManager(config.redis);
      await this.redis.connect();
      logger.info('Redis 연결 성공');
    } catch (err) {
      logger.error('Redis 연결 실패:', err);
      throw err;
    }
  }

  /**
   * 모든 데이터베이스 연결 종료
   */
  async close() {
    try {
      if (this.postgres) await this.postgres.close();
      if (this.redis) await this.redis.close();
      this.isConnected = false;
      logger.info('모든 데이터베이스 연결 종료');
      return true;
    } catch (err) {
      logger.error('데이터베이스 연결 종료 중 오류 발생:', err);
      return false;
    }
  }

  /**
   * 게임 이벤트 저장 (즉시 DB에 insert)
   * @param {Object} event - 저장할 게임 이벤트
   */
  async saveGameEvent(event) {
    if (!this.isConnected) {
      logger.warn('Cannot save event: Database not connected');
      return false;
    }
    const playerId = event.playerId || (event.data && event.data.playerId) || null;
    const vehicleId = event.vehicleId || (event.data && event.data.vehicleId) || null;
    const timestamp = event.timestamp ? new Date(event.timestamp) : new Date();
    try {
      const query = `
        INSERT INTO game_events 
        (event_type, player_id, vehicle_id, timestamp, data) 
        VALUES ($1, $2, $3, $4, $5)
      `;
      await this.postgres.query(query, [
        event.type,
        playerId,
        vehicleId,
        timestamp,
        JSON.stringify(event.data || {})
      ]);
      logger.info(`[SAVE] 이벤트 저장 성공: ${event.type}`);
      return true;
    } catch (error) {
      logger.error(`[SAVE] 이벤트 저장 실패(1차): ${error.message}`, { event });
      // 1회 재시도
      try {
        const query = `
          INSERT INTO game_events 
          (event_type, player_id, vehicle_id, timestamp, data) 
          VALUES ($1, $2, $3, $4, $5)
        `;
        await this.postgres.query(query, [
          event.type,
          playerId,
          vehicleId,
          timestamp,
          JSON.stringify(event.data || {})
        ]);
        logger.info(`[SAVE] 이벤트 저장 성공(재시도): ${event.type}`);
        return true;
      } catch (retryErr) {
        logger.error(`[SAVE] 이벤트 저장 실패(재시도): ${retryErr.message}`, { event });
        return false;
      }
    }
  }

  /**
   * 게임 메트릭 저장 (즉시 DB에 insert)
   * @param {Object} metric - 저장할 게임 메트릭
   */
  async saveGameMetric(metric) {
    if (!this.isConnected) {
      logger.warn('Cannot save metric: Database not connected');
      return false;
    }
    const playerId = metric.playerId || null;
    const value = metric.value !== undefined && metric.value !== null ? metric.value : 0;
    const timestamp = metric.timestamp ? new Date(metric.timestamp) : new Date();
    try {
      const query = `
        INSERT INTO game_metrics (time, player_id, metric_type, value, data)
        VALUES ($1, $2, $3, $4, $5)
      `;
      await this.postgres.query(query, [
        timestamp,
        playerId,
        metric.type,
        value,
        metric.additionalFields ? JSON.stringify(metric.additionalFields) : null
      ]);
      logger.info(`[SAVE] 메트릭 저장 성공: ${metric.type}`);
      return true;
    } catch (error) {
      logger.error(`[SAVE] 메트릭 저장 실패(1차): ${error.message}`, { metric });
      // 1회 재시도
      try {
        const query = `
          INSERT INTO game_metrics (time, player_id, metric_type, value, data)
          VALUES ($1, $2, $3, $4, $5)
        `;
        await this.postgres.query(query, [
          timestamp,
          playerId,
          metric.type,
          value,
          metric.additionalFields ? JSON.stringify(metric.additionalFields) : null
        ]);
        logger.info(`[SAVE] 메트릭 저장 성공(재시도): ${metric.type}`);
        return true;
      } catch (retryErr) {
        logger.error(`[SAVE] 메트릭 저장 실패(재시도): ${retryErr.message}`, { metric });
        return false;
      }
    }
  }

  /**
   * 플레이어 통계 조회
   * @param {string} playerId - 플레이어 ID
   * @returns {Object} 플레이어 통계 정보
   */
  async getPlayerStatistics(playerId) {
    try {
      // PostgreSQL에서 플레이어 기본 정보 조회
      const playerQuery = 'SELECT * FROM players WHERE id = $1';
      const playerResult = await this.postgres.query(playerQuery, [playerId]);
      
      if (playerResult.rows.length === 0) {
        return { error: 'Player not found' };
      }
      
      const player = playerResult.rows[0];
      
      // PostgreSQL에서 플레이어 게임 이벤트 통계 조회
      const eventsQuery = `
        SELECT 
          event_type, 
          COUNT(*) as count 
        FROM 
          game_events 
        WHERE 
          player_id = $1 
        GROUP BY 
          event_type
      `;
      const eventsResult = await this.postgres.query(eventsQuery, [playerId]);
      
      return {
        player: {
          id: player.id,
          username: player.username,
          createdAt: player.created_at
        },
        events: eventsResult.rows
      };
    } catch (error) {
      logger.error(`Error getting player statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * 통계 요약 조회
   * @returns {Object} 게임 통계 요약 정보
   */
  async getStatisticsSummary() {
    try {
      // 활성 플레이어 수
      const activePlayersQuery = `
        SELECT COUNT(DISTINCT player_id) as active_players
        FROM game_events
        WHERE timestamp > NOW() - INTERVAL '1 hour'
      `;
      const activePlayersResult = await this.postgres.query(activePlayersQuery);
      
      // 이벤트 유형별 통계
      const eventStatsQuery = `
        SELECT 
          event_type, 
          COUNT(*) as count 
        FROM 
          game_events 
        WHERE 
          timestamp > NOW() - INTERVAL '24 hours'
        GROUP BY 
          event_type
      `;
      const eventStatsResult = await this.postgres.query(eventStatsQuery);
      
      // 상위 플레이어 (점수 기준)
      const topPlayersQuery = `
        SELECT 
          p.id, 
          p.username, 
          COALESCE(SUM(CAST(ge.data->>'score' AS INTEGER)), 0) as total_score
        FROM 
          players p
        LEFT JOIN 
          game_events ge ON p.id = ge.player_id AND ge.event_type = 'scoreUpdate'
        WHERE 
          ge.timestamp > NOW() - INTERVAL '24 hours'
        GROUP BY 
          p.id, p.username
        ORDER BY 
          total_score DESC
        LIMIT 10
      `;
      const topPlayersResult = await this.postgres.query(topPlayersQuery);
      
      return {
        activePlayers: activePlayersResult.rows[0].active_players,
        eventStats: eventStatsResult.rows,
        topPlayers: topPlayersResult.rows
      };
    } catch (error) {
      logger.error(`Error getting statistics summary: ${error.message}`);
      throw error;
    }
  }

  /**
   * 플레이어 ID 유효성 검증 함수
   * @param {string} playerId 검증할 플레이어 ID 문자열
   * @returns {boolean} 유효한 ID인지 여부
   */
  isValidPlayerId(playerId) {
    return playerId !== null && playerId !== undefined && playerId !== '';
  }

  /**
   * 플레이어 생성
   */
  async insertPlayers(players) {
    try {
      for (const player of players) {
        try {
          // player_id가 유효한지 확인
          if (!player.player_id) {
            logger.warn('유효하지 않은 플레이어 ID, 건너뜀');
            continue;
          }
          
          // UUID 형식 검증 (DB에서 UUID 타입이 사용되는 경우)
          if (this.isValidPlayerId(player.player_id)) {
            const query = `
              INSERT INTO players (player_id, player_name, joined_at, vehicle_type)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (player_id) 
              DO UPDATE SET 
                player_name = EXCLUDED.player_name,
                joined_at = EXCLUDED.joined_at,
                vehicle_type = EXCLUDED.vehicle_type
            `;
            
            // 플레이어 레코드 생성 또는 업데이트
            await this.postgres.query(query, [
              player.player_id,
              player.player_name,
              player.joined_at,
              player.vehicle_type
            ]);
            
            // 플레이어 통계 레코드 생성 (없는 경우)
            const statsQuery = `
              INSERT INTO player_statistics (player_id, kills, deaths, hits, shots, missile_fires, score, missiles_collected, updated_at)
              VALUES ($1, 0, 0, 0, 0, 0, 0, 0, NOW())
              ON CONFLICT (player_id) DO NOTHING
            `;
            await this.postgres.query(statsQuery, [player.player_id]);
          } else {
            logger.warn(`유효하지 않은 UUID 형식의 플레이어 ID: ${player.player_id}`);
          }
        } catch (err) {
          logger.error(`플레이어 생성 중 오류 (player_id: ${player.player_id}):`, err);
          // 개별 플레이어 오류는 전체 처리에 영향을 주지 않음
        }
      }
      return true;
    } catch (err) {
      logger.error(`플레이어 생성 중 일반 오류:`, err);
      throw err;
    }
  }

  /**
   * 플레이어 세션 업데이트
   */
  async updatePlayerSessions(sessions) {
    const query = `
      UPDATE player_sessions
      SET left_at = $2
      WHERE player_id = $1 AND left_at IS NULL
    `;

    for (const session of sessions) {
      await this.postgres.query(query, [session.player_id, session.left_at]);
    }
    return true;
  }

  /**
   * 게임 세션 삽입
   */
  async insertGameSessions(sessions) {
    const query = `
      INSERT INTO game_sessions (game_id, started_at, player_count, game_mode)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (game_id) 
      DO UPDATE SET 
        started_at = EXCLUDED.started_at,
        player_count = EXCLUDED.player_count,
        game_mode = EXCLUDED.game_mode
    `;

    for (const session of sessions) {
      await this.postgres.query(query, [
        session.game_id,
        session.started_at,
        session.player_count,
        session.game_mode
      ]);
    }
    return true;
  }

  /**
   * 게임 세션 업데이트
   */
  async updateGameSessions(sessions) {
    const query = `
      UPDATE game_sessions
      SET ended_at = $2, winner_id = $3
      WHERE game_id = $1
    `;

    for (const session of sessions) {
      await this.postgres.query(query, [
        session.game_id,
        session.ended_at,
        session.winner_id
      ]);
    }
    return true;
  }

  /**
   * 차량 정보 삽입
   */
  async insertVehicles(vehicles) {
    const query = `
      INSERT INTO vehicles (vehicle_id, player_id, vehicle_type, spawned_at, position)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (vehicle_id) 
      DO UPDATE SET 
        player_id = EXCLUDED.player_id,
        vehicle_type = EXCLUDED.vehicle_type,
        spawned_at = EXCLUDED.spawned_at,
        position = EXCLUDED.position
    `;

    for (const vehicle of vehicles) {
      await this.postgres.query(query, [
        vehicle.vehicle_id,
        vehicle.player_id,
        vehicle.vehicle_type,
        vehicle.spawned_at,
        vehicle.position
      ]);
    }
    return true;
  }

  /**
   * 차량 정보 업데이트 (없으면 insert)
   */
  async updateVehicles(vehicles) {
    try {
      for (const vehicle of vehicles) {
        try {
          if (!vehicle.vehicle_id) {
            logger.warn('유효하지 않은 차량 ID, 건너뜀');
            continue;
          }

          const playerId = this.isValidPlayerId(vehicle.player_id) ? vehicle.player_id : 'unknown';

          // update 시도
          const updateQuery = `
            UPDATE vehicles
            SET destroyed_at = $2,
                destroyed_by = $3,
                position = $4,
                player_id = $5,
                vehicle_type = $6,
                spawned_at = $7
            WHERE vehicle_id = $1
          `;
          const updateResult = await this.postgres.query(updateQuery, [
            vehicle.vehicle_id,
            vehicle.destroyed_at || null,
            vehicle.destroyed_by || null,
            vehicle.position || null,
            playerId,
            vehicle.vehicle_type || 'unknown',
            vehicle.spawned_at || new Date()
          ]);

          // update가 0 row면 insert 시도
          if (updateResult.rowCount === 0) {
            const insertQuery = `
              INSERT INTO vehicles (
                vehicle_id, destroyed_at, destroyed_by, position, player_id, vehicle_type, spawned_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `;
            await this.postgres.query(insertQuery, [
              vehicle.vehicle_id,
              vehicle.destroyed_at || null,
              vehicle.destroyed_by || null,
              vehicle.position || null,
              playerId,
              vehicle.vehicle_type || 'unknown',
              vehicle.spawned_at || new Date()
            ]);
            logger.debug(`차량 insert 성공: ${vehicle.vehicle_id}`);
          } else {
            logger.debug(`차량 update 성공: ${vehicle.vehicle_id}`);
          }
        } catch (err) {
          logger.error(`차량 upsert 중 오류 (차량 ID: ${vehicle.vehicle_id || 'unknown'}): ${err.message}`);
        }
      }
      return true;
    } catch (err) {
      logger.error('차량 업데이트 처리 중 일반 오류:', err);
      return false;
    }
  }

  /**
   * 광고판 파괴 정보 삽입
   */
  async insertBillboardDestructions(destructions) {
    for (const destruction of destructions) {
      try {
        if (!destruction.billboard_id) {
          logger.warn('유효하지 않은 광고판 ID, 건너뜀');
          continue;
        }

        // destroyed_by가 유효하지 않으면 'unknown' 사용
        const destroyedBy = this.isValidPlayerId(destruction.destroyed_by) ? destruction.destroyed_by : 'unknown';
        
        // 플레이어가 존재하지 않으면 먼저 생성 (unknown이 아닌 경우만)
        if (destroyedBy !== 'unknown') {
          try {
            const playerQuery = `
              INSERT INTO players (player_id, player_name, joined_at, vehicle_type)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (player_id) DO NOTHING
            `;
            
            await this.postgres.query(playerQuery, [
              destroyedBy,
              `Player-${destroyedBy}`,
              new Date(),
              'unknown'
            ]);
          } catch (playerErr) {
            logger.error(`광고판 파괴자 생성 중 오류: ${playerErr.message}`);
          }
        }

        const query = `
          INSERT INTO billboard_destructions (billboard_id, destroyed_by, destroyed_at, position, reward)
          VALUES ($1, $2, $3, $4, $5)
        `;

        await this.postgres.query(query, [
          destruction.billboard_id,
          destroyedBy,
          destruction.destroyed_at || new Date(),
          destruction.position || null,
          destruction.reward || 0
        ]);
        
        logger.debug(`광고판 파괴 정보 저장 성공: ${destruction.billboard_id}`);
      } catch (err) {
        logger.error(`광고판 파괴 정보 삽입 중 오류: ${err.message}`);
      }
    }
    return true;
  }

  /**
   * 아이템 상자 파괴 정보 삽입
   */
  async insertItemBoxDestructions(destructions) {
    for (const destruction of destructions) {
      try {
        if (!destruction.item_box_id) {
          logger.warn('유효하지 않은 아이템 상자 ID, 건너뜀');
          continue;
        }

        // destroyed_by가 유효하지 않으면 'unknown' 사용
        const destroyedBy = this.isValidPlayerId(destruction.destroyed_by) ? destruction.destroyed_by : 'unknown';
        
        // 플레이어가 존재하지 않으면 먼저 생성 (unknown이 아닌 경우만)
        if (destroyedBy !== 'unknown') {
          try {
            const playerQuery = `
              INSERT INTO players (player_id, player_name, joined_at, vehicle_type)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (player_id) DO NOTHING
            `;
            
            await this.postgres.query(playerQuery, [
              destroyedBy,
              `Player-${destroyedBy}`,
              new Date(),
              'unknown'
            ]);
          } catch (playerErr) {
            logger.error(`아이템 상자 파괴자 생성 중 오류: ${playerErr.message}`);
          }
        }

        const query = `
          INSERT INTO item_box_destructions (item_box_id, destroyed_by, destroyed_at, position, rewards)
          VALUES ($1, $2, $3, $4, $5)
        `;

        await this.postgres.query(query, [
          destruction.item_box_id,
          destroyedBy,
          destruction.destroyed_at || new Date(),
          destruction.position || null,
          destruction.rewards || null
        ]);
        
        logger.debug(`아이템 상자 파괴 정보 저장 성공: ${destruction.item_box_id}`);
      } catch (err) {
        logger.error(`아이템 상자 파괴 정보 삽입 중 오류: ${err.message}`);
      }
    }
    return true;
  }

  /**
   * 플레이어 통계 데이터 확인 및 생성 (공통 유틸리티 함수)
   * @param {string} playerId 플레이어 ID
   * @returns {boolean} 성공 여부
   */
  async ensurePlayerStatistics(playerId) {
    try {
      if (!this.isValidPlayerId(playerId)) {
        logger.warn('유효하지 않은 플레이어 ID');
        return false;
      }
      
      // 먼저 플레이어가 존재하는지 확인하고 없으면 생성
      const playerQuery = `
        INSERT INTO players (player_id, player_name, joined_at, vehicle_type)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (player_id) DO NOTHING
      `;
      
      await this.postgres.query(playerQuery, [
        playerId, 
        `Player-${playerId}`, 
        new Date(), 
        'unknown'
      ]);
      
      // 플레이어 통계 레코드 생성 (없는 경우)
      const statsQuery = `
        INSERT INTO player_statistics (player_id, kills, deaths, hits, shots, missile_fires, score, missiles_collected, updated_at)
        VALUES ($1, 0, 0, 0, 0, 0, 0, 0, NOW())
        ON CONFLICT (player_id) DO NOTHING
      `;
      
      await this.postgres.query(statsQuery, [playerId]);
      return true;
    } catch (err) {
      logger.error(`플레이어 통계 확인 중 오류 (playerId: ${playerId}):`, err);
      return false;
    }
  }

  /**
   * 플레이어 킬 수 증가
   */
  async incrementPlayerKills(playerId) {
    try {
      const statsEnsured = await this.ensurePlayerStatistics(playerId);
      if (!statsEnsured) {
        logger.warn(`플레이어 통계를 확인할 수 없음, 킬 수 증가 건너뜀: ${playerId}`);
        return false;
      }
      // update 시도
      const updateQuery = `
        UPDATE player_statistics
        SET kills = kills + 1,
            updated_at = NOW()
        WHERE player_id = $1
      `;
      const updateResult = await this.postgres.query(updateQuery, [playerId]);
      if (updateResult.rowCount === 0) {
        // insert 시도 (기본값 + 1)
        const insertQuery = `
          INSERT INTO player_statistics (player_id, kills, deaths, hits, shots, missile_fires, score, missiles_collected, updated_at)
          VALUES ($1, 1, 0, 0, 0, 0, 0, 0, NOW())
        `;
        await this.postgres.query(insertQuery, [playerId]);
        logger.debug(`player_statistics insert 성공: ${playerId}`);
      } else {
        logger.debug(`player_statistics update 성공: ${playerId}`);
      }
      return true;
    } catch (err) {
      logger.error(`플레이어 킬 수 upsert 중 오류 (playerId: ${playerId}):`, err);
      return false;
    }
  }

  /**
   * 플레이어 사망 수 증가
   */
  async incrementPlayerDeaths(playerId) {
    try {
      // 플레이어 통계 레코드 확인/생성
      const statsEnsured = await this.ensurePlayerStatistics(playerId);
      if (!statsEnsured) {
        logger.warn(`플레이어 통계를 확인할 수 없음, 사망 수 증가 건너뜀: ${playerId}`);
        return false;
      }
      
      // 사망 수 증가
      const query = `
        UPDATE player_statistics
        SET deaths = deaths + 1,
            updated_at = NOW()
        WHERE player_id = $1
      `;
      
      await this.postgres.query(query, [playerId]);
      return true;
    } catch (err) {
      logger.error(`플레이어 사망 수 증가 중 오류 (playerId: ${playerId}):`, err);
      return false;
    }
  }

  /**
   * 플레이어 명중 수 증가
   */
  async incrementPlayerHits(playerId) {
    try {
      // 플레이어 통계 레코드 확인/생성
      const statsEnsured = await this.ensurePlayerStatistics(playerId);
      if (!statsEnsured) {
        logger.warn(`플레이어 통계를 확인할 수 없음, 명중 수 증가 건너뜀: ${playerId}`);
        return false;
      }
      
      // 명중 수 증가
      const query = `
        UPDATE player_statistics
        SET hits = hits + 1,
            updated_at = NOW()
        WHERE player_id = $1
      `;
      
      await this.postgres.query(query, [playerId]);
      return true;
    } catch (err) {
      logger.error(`플레이어 명중 수 증가 중 오류 (playerId: ${playerId}):`, err);
      return false;
    }
  }

  /**
   * 플레이어 발사 수 증가
   */
  async incrementPlayerShots(playerId) {
    try {
      // 플레이어 통계 레코드 확인/생성
      const statsEnsured = await this.ensurePlayerStatistics(playerId);
      if (!statsEnsured) {
        logger.warn(`플레이어 통계를 확인할 수 없음, 발사 수 증가 건너뜀: ${playerId}`);
        return false;
      }
      
      // 발사 수 증가
      const query = `
        UPDATE player_statistics
        SET shots = shots + 1,
            updated_at = NOW()
        WHERE player_id = $1
      `;
      
      await this.postgres.query(query, [playerId]);
      return true;
    } catch (err) {
      logger.error(`플레이어 발사 수 증가 중 오류 (playerId: ${playerId}):`, err);
      return false;
    }
  }

  /**
   * 플레이어 미사일 발사 수 증가
   */
  async incrementPlayerMissileFires(playerId) {
    try {
      // 플레이어 통계 레코드 확인/생성
      const statsEnsured = await this.ensurePlayerStatistics(playerId);
      if (!statsEnsured) {
        logger.warn(`플레이어 통계를 확인할 수 없음, 미사일 발사 수 증가 건너뜀: ${playerId}`);
        return false;
      }
      
      // 미사일 발사 수 증가
      const query = `
        UPDATE player_statistics
        SET missile_fires = missile_fires + 1,
            updated_at = NOW()
        WHERE player_id = $1
      `;
      
      await this.postgres.query(query, [playerId]);
      return true;
    } catch (err) {
      logger.error(`플레이어 미사일 발사 수 증가 중 오류 (playerId: ${playerId}):`, err);
      return false;
    }
  }

  /**
   * 플레이어 점수 증가
   */
  async incrementPlayerScore(playerId, score) {
    try {
      // 플레이어 통계 레코드 확인/생성
      const statsEnsured = await this.ensurePlayerStatistics(playerId);
      if (!statsEnsured) {
        logger.warn(`플레이어 통계를 확인할 수 없음, 점수 증가 건너뜀: ${playerId}`);
        return false;
      }
      
      // 점수 증가
      const query = `
        UPDATE player_statistics
        SET score = score + $2,
            updated_at = NOW()
        WHERE player_id = $1
      `;
      
      await this.postgres.query(query, [playerId, score]);
      return true;
    } catch (err) {
      logger.error(`플레이어 점수 증가 중 오류 (playerId: ${playerId}):`, err);
      return false;
    }
  }

  /**
   * 플레이어 미사일 획득 수 증가
   */
  async incrementPlayerMissileCollections(playerId, count) {
    try {
      // 플레이어 통계 레코드 확인/생성
      const statsEnsured = await this.ensurePlayerStatistics(playerId);
      if (!statsEnsured) {
        logger.warn(`플레이어 통계를 확인할 수 없음, 미사일 획득 수 증가 건너뜀: ${playerId}`);
        return false;
      }
      
      // 미사일 획득 수 증가
      const query = `
        UPDATE player_statistics
        SET missiles_collected = missiles_collected + $2,
            updated_at = NOW()
        WHERE player_id = $1
      `;
      
      await this.postgres.query(query, [playerId, count]);
      return true;
    } catch (err) {
      logger.error(`플레이어 미사일 획득 수 증가 중 오류 (playerId: ${playerId}, count: ${count}):`, err);
      return false;
    }
  }

  /**
   * 플레이어 upsert
   */
  async upsertPlayer(player) {
    try {
      logger.debug(`[PostgresManager.upsertPlayer] 쿼리 실행 전: ${JSON.stringify(player)}`);
      const query = `
        INSERT INTO players (player_id, player_name, joined_at, vehicle_type)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (player_id)
        DO UPDATE SET
          player_name = EXCLUDED.player_name,
          joined_at = EXCLUDED.joined_at,
          vehicle_type = EXCLUDED.vehicle_type
      `;
      await this.postgres.query(query, [
        player.player_id,
        player.player_name,
        player.joined_at,
        player.vehicle_type
      ]);
      logger.debug(`[PostgresManager.upsertPlayer] 쿼리 실행 후: ${player.player_id}`);
      return true;
    } catch (err) {
      logger.error(`[PostgresManager.upsertPlayer] 쿼리 실행 중 오류: ${err.message}`);
      throw err;
    }
  }

  /**
   * 플레이어 세션 upsert
   */
  async upsertPlayerSessions(sessions) {
    for (const session of sessions) {
      try {
        if (!session.session_id || !session.player_id) {
          logger.warn('[PostgresManager.upsertPlayerSessions] 유효하지 않은 세션 정보, 건너뜀');
          continue;
        }
        
        logger.debug(`[PostgresManager.upsertPlayerSessions] 쿼리 실행 전: ${JSON.stringify(session)}`);
        const query = `
          INSERT INTO player_sessions (session_id, player_id, game_id, joined_at, left_at)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (session_id)
          DO UPDATE SET
            player_id = EXCLUDED.player_id,
            game_id = EXCLUDED.game_id,
            joined_at = COALESCE(player_sessions.joined_at, EXCLUDED.joined_at),
            left_at = COALESCE(EXCLUDED.left_at, player_sessions.left_at)
        `;
        await this.postgres.query(query, [
          session.session_id,
          session.player_id,
          session.game_id || null,
          session.joined_at || new Date(),
          session.left_at || null
        ]);
        logger.debug(`[PostgresManager.upsertPlayerSessions] 쿼리 실행 후: ${session.session_id}`);
      } catch (err) {
        logger.error(`[PostgresManager.upsertPlayerSessions] 쿼리 실행 중 오류: ${err.message}`);
      }
    }
    return true;
  }

  /**
   * 게임 세션 upsert
   */
  async upsertGameSession(session) {
    try {
      logger.debug(`[PostgresManager.upsertGameSession] 쿼리 실행 전: ${JSON.stringify(session)}`);
      const query = `
        INSERT INTO game_sessions (game_id, started_at, player_count, game_mode)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (game_id)
        DO UPDATE SET
          started_at = EXCLUDED.started_at,
          player_count = EXCLUDED.player_count,
          game_mode = EXCLUDED.game_mode
      `;
      await this.postgres.query(query, [
        session.game_id,
        session.started_at,
        session.player_count,
        session.game_mode
      ]);
      logger.debug(`[PostgresManager.upsertGameSession] 쿼리 실행 후: ${session.game_id}`);
      return true;
    } catch (err) {
      logger.error(`[PostgresManager.upsertGameSession] 쿼리 실행 중 오류: ${err.message}`);
      throw err;
    }
  }
}

/**
 * PostgreSQL 관리자 클래스
 */
class PostgresManager {
  constructor(config) {
    this.config = config;
    this.pool = null;
  }

  /**
   * PostgreSQL 연결 생성
   */
  async connect() {
    this.pool = new Pool({
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
      max: 20, // 최대 연결 수
      idleTimeoutMillis: 30000, // 유휴 연결 타임아웃
      connectionTimeoutMillis: 2000,
    });

    // 연결 테스트
    const client = await this.pool.connect();
    client.release();
    return true;
  }

  /**
   * PostgreSQL 연결 종료
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
    }
    return true;
  }

  /**
   * 쿼리 실행 헬퍼 메서드
   */
  async query(text, params) {
    try {
      const start = Date.now();
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug(`PostgreSQL 쿼리 실행: ${text}, 소요시간: ${duration}ms, 결과 행 수: ${res.rowCount}`);
      return res;
    } catch (err) {
      logger.error(`PostgreSQL 쿼리 오류: ${text}`, err);
      throw err;
    }
  }

  /**
   * 플레이어 ID 유효성 검증 함수
   * @param {string} playerId 검증할 플레이어 ID 문자열
   * @returns {boolean} 유효한 ID인지 여부
   */
  isValidPlayerId(playerId) {
    return playerId !== null && playerId !== undefined && playerId !== '';
  }

  /**
   * 플레이어 정보 삽입
   */
  async insertPlayers(players) {
    const query = `
      INSERT INTO players (player_id, player_name, joined_at, vehicle_type)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (player_id) 
      DO UPDATE SET 
        player_name = EXCLUDED.player_name,
        joined_at = EXCLUDED.joined_at,
        vehicle_type = EXCLUDED.vehicle_type
    `;

    for (const player of players) {
      await this.query(query, [
        player.player_id,
        player.player_name,
        player.joined_at,
        player.vehicle_type
      ]);
    }
    return true;
  }

  /**
   * 플레이어 세션 업데이트
   */
  async updatePlayerSessions(sessions) {
    const query = `
      UPDATE player_sessions
      SET left_at = $2
      WHERE player_id = $1 AND left_at IS NULL
    `;

    for (const session of sessions) {
      await this.query(query, [session.player_id, session.left_at]);
    }
    return true;
  }

  /**
   * 게임 세션 삽입
   */
  async insertGameSessions(sessions) {
    const query = `
      INSERT INTO game_sessions (game_id, started_at, player_count, game_mode)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (game_id) 
      DO UPDATE SET 
        started_at = EXCLUDED.started_at,
        player_count = EXCLUDED.player_count,
        game_mode = EXCLUDED.game_mode
    `;

    for (const session of sessions) {
      await this.query(query, [
        session.game_id,
        session.started_at,
        session.player_count,
        session.game_mode
      ]);
    }
    return true;
  }

  /**
   * 게임 세션 업데이트
   */
  async updateGameSessions(sessions) {
    const query = `
      UPDATE game_sessions
      SET ended_at = $2, winner_id = $3
      WHERE game_id = $1
    `;

    for (const session of sessions) {
      await this.query(query, [
        session.game_id,
        session.ended_at,
        session.winner_id
      ]);
    }
    return true;
  }

  /**
   * 차량 정보 삽입
   */
  async insertVehicles(vehicles) {
    const query = `
      INSERT INTO vehicles (vehicle_id, player_id, vehicle_type, spawned_at, position)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (vehicle_id) 
      DO UPDATE SET 
        player_id = EXCLUDED.player_id,
        vehicle_type = EXCLUDED.vehicle_type,
        spawned_at = EXCLUDED.spawned_at,
        position = EXCLUDED.position
    `;

    for (const vehicle of vehicles) {
      await this.query(query, [
        vehicle.vehicle_id,
        vehicle.player_id,
        vehicle.vehicle_type,
        vehicle.spawned_at,
        vehicle.position
      ]);
    }
    return true;
  }

  /**
   * 차량 정보 업데이트 (없으면 insert)
   */
  async updateVehicles(vehicles) {
    try {
      for (const vehicle of vehicles) {
        try {
          if (!vehicle.vehicle_id) {
            logger.warn('유효하지 않은 차량 ID, 건너뜀');
            continue;
          }

          const playerId = this.isValidPlayerId(vehicle.player_id) ? vehicle.player_id : 'unknown';

          // update 시도
          const updateQuery = `
            UPDATE vehicles
            SET destroyed_at = $2,
                destroyed_by = $3,
                position = $4,
                player_id = $5,
                vehicle_type = $6,
                spawned_at = $7
            WHERE vehicle_id = $1
          `;
          const updateResult = await this.query(updateQuery, [
            vehicle.vehicle_id,
            vehicle.destroyed_at || null,
            vehicle.destroyed_by || null,
            vehicle.position || null,
            playerId,
            vehicle.vehicle_type || 'unknown',
            vehicle.spawned_at || new Date()
          ]);

          // update가 0 row면 insert 시도
          if (updateResult.rowCount === 0) {
            const insertQuery = `
              INSERT INTO vehicles (
                vehicle_id, destroyed_at, destroyed_by, position, player_id, vehicle_type, spawned_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `;
            await this.query(insertQuery, [
              vehicle.vehicle_id,
              vehicle.destroyed_at || null,
              vehicle.destroyed_by || null,
              vehicle.position || null,
              playerId,
              vehicle.vehicle_type || 'unknown',
              vehicle.spawned_at || new Date()
            ]);
            logger.debug(`차량 insert 성공: ${vehicle.vehicle_id}`);
          } else {
            logger.debug(`차량 update 성공: ${vehicle.vehicle_id}`);
          }
        } catch (err) {
          logger.error(`차량 upsert 중 오류 (차량 ID: ${vehicle.vehicle_id || 'unknown'}): ${err.message}`);
        }
      }
      return true;
    } catch (err) {
      logger.error('차량 업데이트 처리 중 일반 오류:', err);
      return false;
    }
  }

  /**
   * 광고판 파괴 정보 삽입
   */
  async insertBillboardDestructions(destructions) {
    for (const destruction of destructions) {
      try {
        if (!destruction.billboard_id) {
          logger.warn('유효하지 않은 광고판 ID, 건너뜀');
          continue;
        }

        // destroyed_by가 유효하지 않으면 'unknown' 사용
        const destroyedBy = this.isValidPlayerId(destruction.destroyed_by) ? destruction.destroyed_by : 'unknown';
        
        // 플레이어가 존재하지 않으면 먼저 생성 (unknown이 아닌 경우만)
        if (destroyedBy !== 'unknown') {
          try {
            const playerQuery = `
              INSERT INTO players (player_id, player_name, joined_at, vehicle_type)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (player_id) DO NOTHING
            `;
            
            await this.query(playerQuery, [
              destroyedBy,
              `Player-${destroyedBy}`,
              new Date(),
              'unknown'
            ]);
          } catch (playerErr) {
            logger.error(`광고판 파괴자 생성 중 오류: ${playerErr.message}`);
          }
        }

        const query = `
          INSERT INTO billboard_destructions (billboard_id, destroyed_by, destroyed_at, position, reward)
          VALUES ($1, $2, $3, $4, $5)
        `;

        await this.query(query, [
          destruction.billboard_id,
          destroyedBy,
          destruction.destroyed_at || new Date(),
          destruction.position || null,
          destruction.reward || 0
        ]);
        
        logger.debug(`광고판 파괴 정보 저장 성공: ${destruction.billboard_id}`);
      } catch (err) {
        logger.error(`광고판 파괴 정보 삽입 중 오류: ${err.message}`);
      }
    }
    return true;
  }

  /**
   * 아이템 상자 파괴 정보 삽입
   */
  async insertItemBoxDestructions(destructions) {
    for (const destruction of destructions) {
      try {
        if (!destruction.item_box_id) {
          logger.warn('유효하지 않은 아이템 상자 ID, 건너뜀');
          continue;
        }

        // destroyed_by가 유효하지 않으면 'unknown' 사용
        const destroyedBy = this.isValidPlayerId(destruction.destroyed_by) ? destruction.destroyed_by : 'unknown';
        
        // 플레이어가 존재하지 않으면 먼저 생성 (unknown이 아닌 경우만)
        if (destroyedBy !== 'unknown') {
          try {
            const playerQuery = `
              INSERT INTO players (player_id, player_name, joined_at, vehicle_type)
              VALUES ($1, $2, $3, $4)
              ON CONFLICT (player_id) DO NOTHING
            `;
            
            await this.query(playerQuery, [
              destroyedBy,
              `Player-${destroyedBy}`,
              new Date(),
              'unknown'
            ]);
          } catch (playerErr) {
            logger.error(`아이템 상자 파괴자 생성 중 오류: ${playerErr.message}`);
          }
        }

        const query = `
          INSERT INTO item_box_destructions (item_box_id, destroyed_by, destroyed_at, position, rewards)
          VALUES ($1, $2, $3, $4, $5)
        `;

        await this.query(query, [
          destruction.item_box_id,
          destroyedBy,
          destruction.destroyed_at || new Date(),
          destruction.position || null,
          destruction.rewards || null
        ]);
        
        logger.debug(`아이템 상자 파괴 정보 저장 성공: ${destruction.item_box_id}`);
      } catch (err) {
        logger.error(`아이템 상자 파괴 정보 삽입 중 오류: ${err.message}`);
      }
    }
    return true;
  }

  /**
   * 플레이어 통계 데이터 확인 및 생성 (공통 유틸리티 함수)
   * @param {string} playerId 플레이어 ID
   * @returns {boolean} 성공 여부
   */
  async ensurePlayerStatistics(playerId) {
    try {
      if (!this.isValidPlayerId(playerId)) {
        logger.warn('유효하지 않은 플레이어 ID');
        return false;
      }
      
      // 먼저 플레이어가 존재하는지 확인하고 없으면 생성
      const playerQuery = `
        INSERT INTO players (player_id, player_name, joined_at, vehicle_type)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (player_id) DO NOTHING
      `;
      
      await this.query(playerQuery, [
        playerId, 
        `Player-${playerId}`, 
        new Date(), 
        'unknown'
      ]);
      
      // 플레이어 통계 레코드 생성 (없는 경우)
      const statsQuery = `
        INSERT INTO player_statistics (player_id, kills, deaths, hits, shots, missile_fires, score, missiles_collected, updated_at)
        VALUES ($1, 0, 0, 0, 0, 0, 0, 0, NOW())
        ON CONFLICT (player_id) DO NOTHING
      `;
      
      await this.query(statsQuery, [playerId]);
      return true;
    } catch (err) {
      logger.error(`플레이어 통계 확인 중 오류 (playerId: ${playerId}):`, err);
      return false;
    }
  }

  /**
   * 플레이어 킬 수 증가
   */
  async incrementPlayerKills(playerId) {
    try {
      const statsEnsured = await this.ensurePlayerStatistics(playerId);
      if (!statsEnsured) {
        logger.warn(`플레이어 통계를 확인할 수 없음, 킬 수 증가 건너뜀: ${playerId}`);
        return false;
      }
      // update 시도
      const updateQuery = `
        UPDATE player_statistics
        SET kills = kills + 1,
            updated_at = NOW()
        WHERE player_id = $1
      `;
      const updateResult = await this.query(updateQuery, [playerId]);
      if (updateResult.rowCount === 0) {
        // insert 시도 (기본값 + 1)
        const insertQuery = `
          INSERT INTO player_statistics (player_id, kills, deaths, hits, shots, missile_fires, score, missiles_collected, updated_at)
          VALUES ($1, 1, 0, 0, 0, 0, 0, 0, NOW())
        `;
        await this.query(insertQuery, [playerId]);
        logger.debug(`player_statistics insert 성공: ${playerId}`);
      } else {
        logger.debug(`player_statistics update 성공: ${playerId}`);
      }
      return true;
    } catch (err) {
      logger.error(`플레이어 킬 수 upsert 중 오류 (playerId: ${playerId}):`, err);
      return false;
    }
  }

  /**
   * 플레이어 사망 수 증가
   */
  async incrementPlayerDeaths(playerId) {
    try {
      // 플레이어 통계 레코드 확인/생성
      const statsEnsured = await this.ensurePlayerStatistics(playerId);
      if (!statsEnsured) {
        logger.warn(`플레이어 통계를 확인할 수 없음, 사망 수 증가 건너뜀: ${playerId}`);
        return false;
      }
      
      // 사망 수 증가
      const query = `
        UPDATE player_statistics
        SET deaths = deaths + 1,
            updated_at = NOW()
        WHERE player_id = $1
      `;
      
      await this.query(query, [playerId]);
      return true;
    } catch (err) {
      logger.error(`플레이어 사망 수 증가 중 오류 (playerId: ${playerId}):`, err);
      return false;
    }
  }

  /**
   * 플레이어 명중 수 증가
   */
  async incrementPlayerHits(playerId) {
    try {
      // 플레이어 통계 레코드 확인/생성
      const statsEnsured = await this.ensurePlayerStatistics(playerId);
      if (!statsEnsured) {
        logger.warn(`플레이어 통계를 확인할 수 없음, 명중 수 증가 건너뜀: ${playerId}`);
        return false;
      }
      
      // 명중 수 증가
      const query = `
        UPDATE player_statistics
        SET hits = hits + 1,
            updated_at = NOW()
        WHERE player_id = $1
      `;
      
      await this.query(query, [playerId]);
      return true;
    } catch (err) {
      logger.error(`플레이어 명중 수 증가 중 오류 (playerId: ${playerId}):`, err);
      return false;
    }
  }

  /**
   * 플레이어 발사 수 증가
   */
  async incrementPlayerShots(playerId) {
    try {
      // 플레이어 통계 레코드 확인/생성
      const statsEnsured = await this.ensurePlayerStatistics(playerId);
      if (!statsEnsured) {
        logger.warn(`플레이어 통계를 확인할 수 없음, 발사 수 증가 건너뜀: ${playerId}`);
        return false;
      }
      
      // 발사 수 증가
      const query = `
        UPDATE player_statistics
        SET shots = shots + 1,
            updated_at = NOW()
        WHERE player_id = $1
      `;
      
      await this.query(query, [playerId]);
      return true;
    } catch (err) {
      logger.error(`플레이어 발사 수 증가 중 오류 (playerId: ${playerId}):`, err);
      return false;
    }
  }

  /**
   * 플레이어 미사일 발사 수 증가
   */
  async incrementPlayerMissileFires(playerId) {
    try {
      // 플레이어 통계 레코드 확인/생성
      const statsEnsured = await this.ensurePlayerStatistics(playerId);
      if (!statsEnsured) {
        logger.warn(`플레이어 통계를 확인할 수 없음, 미사일 발사 수 증가 건너뜀: ${playerId}`);
        return false;
      }
      
      // 미사일 발사 수 증가
      const query = `
        UPDATE player_statistics
        SET missile_fires = missile_fires + 1,
            updated_at = NOW()
        WHERE player_id = $1
      `;
      
      await this.query(query, [playerId]);
      return true;
    } catch (err) {
      logger.error(`플레이어 미사일 발사 수 증가 중 오류 (playerId: ${playerId}):`, err);
      return false;
    }
  }

  /**
   * 플레이어 점수 증가
   */
  async incrementPlayerScore(playerId, score) {
    try {
      // 플레이어 통계 레코드 확인/생성
      const statsEnsured = await this.ensurePlayerStatistics(playerId);
      if (!statsEnsured) {
        logger.warn(`플레이어 통계를 확인할 수 없음, 점수 증가 건너뜀: ${playerId}`);
        return false;
      }
      
      // 점수 증가
      const query = `
        UPDATE player_statistics
        SET score = score + $2,
            updated_at = NOW()
        WHERE player_id = $1
      `;
      
      await this.query(query, [playerId, score]);
      return true;
    } catch (err) {
      logger.error(`플레이어 점수 증가 중 오류 (playerId: ${playerId}):`, err);
      return false;
    }
  }

  /**
   * 플레이어 미사일 획득 수 증가
   */
  async incrementPlayerMissileCollections(playerId, count) {
    try {
      // 플레이어 통계 레코드 확인/생성
      const statsEnsured = await this.ensurePlayerStatistics(playerId);
      if (!statsEnsured) {
        logger.warn(`플레이어 통계를 확인할 수 없음, 미사일 획득 수 증가 건너뜀: ${playerId}`);
        return false;
      }
      
      // 미사일 획득 수 증가
      const query = `
        UPDATE player_statistics
        SET missiles_collected = missiles_collected + $2,
            updated_at = NOW()
        WHERE player_id = $1
      `;
      
      await this.query(query, [playerId, count]);
      return true;
    } catch (err) {
      logger.error(`플레이어 미사일 획득 수 증가 중 오류 (playerId: ${playerId}, count: ${count}):`, err);
      return false;
    }
  }
}

/**
 * Redis 관리자 클래스
 */
class RedisManager {
  constructor(config) {
    this.config = config;
    this.client = null;
  }

  /**
   * Redis 연결 생성
   */
  async connect() {
    this.client = new Redis({
      host: this.config.host,
      port: this.config.port,
      password: this.config.password || undefined,
      db: this.config.db
    });
    
    // 연결 테스트
    await this.client.ping();
    return true;
  }

  /**
   * Redis 연결 종료
   */
  async close() {
    if (this.client) {
      await this.client.quit();
    }
    return true;
  }

  /**
   * 플레이어 수 증가
   */
  async incrementPlayerCount(count = 1) {
    await this.client.incrby('stats:active_players', count);
    return true;
  }

  /**
   * 플레이어 수 감소
   */
  async decrementPlayerCount(count = 1) {
    await this.client.decrby('stats:active_players', count);
    return true;
  }

  /**
   * 플레이어 킬 수 증가
   */
  async incrementPlayerKills(playerId) {
    await this.client.hincrby(`player:${playerId}:stats`, 'kills', 1);
    return true;
  }

  /**
   * 플레이어 사망 수 증가
   */
  async incrementPlayerDeaths(playerId) {
    await this.client.hincrby(`player:${playerId}:stats`, 'deaths', 1);
    return true;
  }

  /**
   * 플레이어 명중 수 증가
   */
  async incrementPlayerHits(playerId) {
    await this.client.hincrby(`player:${playerId}:stats`, 'hits', 1);
    return true;
  }

  /**
   * 플레이어 발사 수 증가
   */
  async incrementPlayerShots(playerId) {
    await this.client.hincrby(`player:${playerId}:stats`, 'shots', 1);
    return true;
  }

  /**
   * 플레이어 미사일 발사 수 증가
   */
  async incrementPlayerMissileFires(playerId) {
    await this.client.hincrby(`player:${playerId}:stats`, 'missile_fires', 1);
    return true;
  }

  /**
   * 플레이어 점수 증가
   */
  async incrementPlayerScore(playerId, score) {
    await this.client.hincrby(`player:${playerId}:stats`, 'score', score);
    return true;
  }

  /**
   * 플레이어 미사일 획득 수 증가
   */
  async incrementPlayerMissileCollections(playerId, count) {
    await this.client.hincrby(`player:${playerId}:stats`, 'missiles_collected', count);
    return true;
  }
}

module.exports = DatabaseManager;