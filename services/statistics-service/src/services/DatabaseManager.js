const { Pool } = require('pg');
const Influx = require('influx');
const logger = require('../utils/logger');
const { config } = require('../config');

/**
 * 데이터베이스 연결 및 쿼리를 관리하는 클래스
 */
class DatabaseManager {
  constructor() {
    this.pgPool = null;
    this.influx = null;
    this.isConnected = false;
    this.cache = new Map();
    this.cacheEnabled = config.cache.enabled;
    this.cacheTTL = config.cache.ttl * 1000; // 밀리초로 변환
    
    this.initialize();
  }

  /**
   * 데이터베이스 연결 초기화
   */
  async initialize() {
    try {
      // PostgreSQL 연결 풀 생성
      this.pgPool = new Pool({
        host: config.postgres.host,
        port: config.postgres.port,
        user: config.postgres.user,
        password: config.postgres.password,
        database: config.postgres.database,
        ssl: config.postgres.ssl ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // 연결 테스트
      await this.pgPool.query('SELECT NOW()');
      logger.info('PostgreSQL database connected successfully');

      // InfluxDB 클라이언트 생성
      this.influx = new Influx.InfluxDB({
        host: new URL(config.influxdb.url).hostname,
        port: new URL(config.influxdb.url).port,
        database: config.influxdb.bucket,
        username: config.influxdb.org,
        password: config.influxdb.token,
      });

      // InfluxDB 연결 테스트
      try {
        const names = await this.influx.getDatabaseNames();
        if (!names.includes(config.influxdb.bucket)) {
          logger.warn(`InfluxDB database '${config.influxdb.bucket}' not found`);
        }
        logger.info('InfluxDB connected successfully');
      } catch (error) {
        logger.warn(`InfluxDB connection warning: ${error.message}`);
      }

      this.isConnected = true;
      return true;
    } catch (error) {
      logger.error(`Database initialization error: ${error.message}`);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * 캐시에서 데이터 가져오기
   * @param {string} key - 캐시 키
   * @returns {any|null} 캐시된 데이터 또는 null
   */
  getFromCache(key) {
    if (!this.cacheEnabled) return null;
    
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const { timestamp, data } = cached;
    const now = Date.now();
    
    // 캐시 만료 확인
    if (now - timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }
    
    return data;
  }

  /**
   * 데이터를 캐시에 저장
   * @param {string} key - 캐시 키
   * @param {any} data - 저장할 데이터
   */
  setCache(key, data) {
    if (!this.cacheEnabled) return;
    
    this.cache.set(key, {
      timestamp: Date.now(),
      data
    });
  }

  /**
   * 플레이어 통계 조회
   * @param {string} playerId - 플레이어 ID
   * @returns {Object} 플레이어 통계 정보
   */
  async getPlayerStatistics(playerId) {
    const cacheKey = `player_stats_${playerId}`;
    const cachedData = this.getFromCache(cacheKey);
    if (cachedData) {
      logger.debug(`Cache hit for player statistics: ${playerId}`);
      return cachedData;
    }
    
    try {
      // PostgreSQL에서 플레이어 기본 정보 조회
      const playerQuery = 'SELECT * FROM players WHERE id = $1';
      const playerResult = await this.pgPool.query(playerQuery, [playerId]);
      
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
      const eventsResult = await this.pgPool.query(eventsQuery, [playerId]);
      
      // InfluxDB에서 플레이어 성능 메트릭 조회
      const metrics = await this.influx.query(`
        SELECT 
          MEAN("value") as avg_value,
          MAX("value") as max_value,
          COUNT("value") as count
        FROM 
          "score", "damage", "kills"
        WHERE 
          "playerId" = '${playerId}'
        GROUP BY 
          "measurement"
        ORDER BY 
          time DESC
        LIMIT 100
      `);
      
      const result = {
        player: {
          id: player.id,
          username: player.username,
          createdAt: player.created_at
        },
        events: eventsResult.rows,
        metrics: metrics
      };
      
      // 결과를 캐시에 저장
      this.setCache(cacheKey, result);
      
      return result;
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
    const cacheKey = 'statistics_summary';
    const cachedData = this.getFromCache(cacheKey);
    if (cachedData) {
      logger.debug('Cache hit for statistics summary');
      return cachedData;
    }
    
    try {
      // 활성 플레이어 수
      const activePlayersQuery = `
        SELECT COUNT(DISTINCT player_id) as active_players
        FROM game_events
        WHERE timestamp > NOW() - INTERVAL '1 hour'
      `;
      const activePlayersResult = await this.pgPool.query(activePlayersQuery);
      
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
      const eventStatsResult = await this.pgPool.query(eventStatsQuery);
      
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
      const topPlayersResult = await this.pgPool.query(topPlayersQuery);
      
      // InfluxDB에서 시간별 활동 메트릭
      const hourlyActivity = await this.influx.query(`
        SELECT 
          COUNT("value") as event_count
        FROM 
          "score", "damage", "kills"
        WHERE 
          time > now() - 24h
        GROUP BY 
          time(1h)
        ORDER BY 
          time DESC
      `);
      
      const result = {
        activePlayers: activePlayersResult.rows[0].active_players,
        eventStats: eventStatsResult.rows,
        topPlayers: topPlayersResult.rows,
        hourlyActivity: hourlyActivity
      };
      
      // 결과를 캐시에 저장
      this.setCache(cacheKey, result);
      
      return result;
    } catch (error) {
      logger.error(`Error getting statistics summary: ${error.message}`);
      throw error;
    }
  }

  /**
   * 무기 사용 통계 조회
   * @returns {Object} 무기 사용 통계 정보
   */
  async getWeaponStatistics() {
    const cacheKey = 'weapon_statistics';
    const cachedData = this.getFromCache(cacheKey);
    if (cachedData) {
      logger.debug('Cache hit for weapon statistics');
      return cachedData;
    }
    
    try {
      // InfluxDB에서 무기 사용 통계 조회
      const weaponStats = await this.influx.query(`
        SELECT 
          COUNT("value") as usage_count,
          SUM("value") as total_damage
        FROM 
          "weaponFired"
        WHERE 
          time > now() - 7d
        GROUP BY 
          "weaponType"
        ORDER BY 
          usage_count DESC
      `);
      
      // PostgreSQL에서 무기별 킬 통계 조회
      const weaponKillsQuery = `
        SELECT 
          data->>'weaponType' as weapon_type, 
          COUNT(*) as kill_count 
        FROM 
          game_events 
        WHERE 
          event_type = 'kill' 
          AND timestamp > NOW() - INTERVAL '7 days'
        GROUP BY 
          data->>'weaponType'
        ORDER BY 
          kill_count DESC
      `;
      const weaponKillsResult = await this.pgPool.query(weaponKillsQuery);
      
      const result = {
        weaponUsage: weaponStats,
        weaponKills: weaponKillsResult.rows
      };
      
      // 결과를 캐시에 저장
      this.setCache(cacheKey, result);
      
      return result;
    } catch (error) {
      logger.error(`Error getting weapon statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * 시간별 활동 통계 조회
   * @param {string} period - 조회 기간 (예: '24h', '7d', '30d')
   * @returns {Object} 시간별 활동 통계 정보
   */
  async getActivityStatistics(period) {
    const cacheKey = `activity_stats_${period}`;
    const cachedData = this.getFromCache(cacheKey);
    if (cachedData) {
      logger.debug(`Cache hit for activity statistics: ${period}`);
      return cachedData;
    }
    
    try {
      // 기간에 따른 그룹화 간격 결정
      let groupByInterval;
      switch (period) {
        case '24h':
          groupByInterval = '1h';
          break;
        case '7d':
          groupByInterval = '6h';
          break;
        case '30d':
          groupByInterval = '1d';
          break;
        default:
          groupByInterval = '1h';
      }
      
      // InfluxDB에서 시간별 활동 메트릭
      const activityStats = await this.influx.query(`
        SELECT 
          COUNT("value") as event_count
        FROM 
          "score", "damage", "kills", "weaponFired", "collision"
        WHERE 
          time > now() - ${period}
        GROUP BY 
          time(${groupByInterval})
        ORDER BY 
          time ASC
      `);
      
      // PostgreSQL에서 이벤트 유형별 통계
      const eventTypesQuery = `
        SELECT 
          event_type, 
          COUNT(*) as count,
          date_trunc('hour', timestamp) as hour
        FROM 
          game_events 
        WHERE 
          timestamp > NOW() - INTERVAL '${period.replace('h', ' hours').replace('d', ' days')}'
        GROUP BY 
          event_type, hour
        ORDER BY 
          hour ASC, count DESC
      `;
      const eventTypesResult = await this.pgPool.query(eventTypesQuery);
      
      const result = {
        activityTimeline: activityStats,
        eventTypeBreakdown: eventTypesResult.rows
      };
      
      // 결과를 캐시에 저장
      this.setCache(cacheKey, result);
      
      return result;
    } catch (error) {
      logger.error(`Error getting activity statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * 데이터베이스 연결 종료
   */
  async close() {
    try {
      // PostgreSQL 연결 종료
      if (this.pgPool) {
        await this.pgPool.end();
        logger.info('PostgreSQL connection pool closed');
      }
      
      this.isConnected = false;
      logger.info('Database connections closed');
    } catch (error) {
      logger.error(`Error closing database connections: ${error.message}`);
    }
  }
}

module.exports = { DatabaseManager }; 