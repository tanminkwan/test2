const dotenv = require('dotenv');
const path = require('path');

// .env 파일 로드
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * 환경 변수에서 설정을 로드하고 기본값을 제공하는 설정 객체
 */
const config = {
  // 서비스 설정
  service: {
    port: parseInt(process.env.PORT || '3002', 10),
    env: process.env.NODE_ENV || 'development',
    name: process.env.SERVICE_NAME || 'event-processor-service'
  },
  
  // Redis 설정
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
    channels: {
      gameEvents: process.env.REDIS_CHANNEL || 'game-events'
    }
  },
  
  // PostgreSQL + TimescaleDB 설정
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'game_statistics',
    ssl: process.env.POSTGRES_SSL === 'true'
  },
  
  // 로깅 설정
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: process.env.LOG_PRETTY_PRINT !== 'false',
    fileDir: process.env.LOG_FILE_DIR || './logs'
  },
  
  // 이벤트 처리 설정
  eventProcessing: {
    batchSize: parseInt(process.env.BATCH_SIZE || '100', 10),
    batchIntervalMs: parseInt(process.env.BATCH_INTERVAL_MS || '1000', 10),
    maxRetryCount: parseInt(process.env.MAX_RETRY_COUNT || '3', 10)
  },
  
  // 배치 처리 설정
  batchProcessing: {
    batchSize: parseInt(process.env.BATCH_SIZE || '100', 10),
    flushIntervalMs: parseInt(process.env.FLUSH_INTERVAL_MS || '5000', 10)
  },
  
  // 파일 로그 복구 설정
  logRecovery: {
    enabled: process.env.LOG_RECOVERY_ENABLED === 'true',
    dir: process.env.LOG_RECOVERY_DIR || '../game-service/logs/events'
  },

  // 서버 설정
  server: {
    port: parseInt(process.env.PORT || '3003', 10)
  }
};

module.exports = { config }; 