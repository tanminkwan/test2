const express = require('express');
const cors = require('cors');
const { config } = require('./config');
const logger = require('./utils/logger');
const { RedisSubscriber } = require('./utils/RedisSubscriber');
const DatabaseManager = require('./services/DatabaseManager');
const { EventProcessor } = require('./services/EventProcessor');

// 애플리케이션 초기화
const app = express();
const PORT = config.server.port || 3003;

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 상태 확인 엔드포인트
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'event-processor' });
});

// 데이터베이스 매니저 초기화
const dbManager = new DatabaseManager();

// 이벤트 프로세서 초기화
const eventProcessor = new EventProcessor(dbManager);

// Redis 구독자 초기화 및 이벤트 프로세서 연결
const redisSubscriber = new RedisSubscriber(config.redis);
redisSubscriber.subscribe('game-events', (message) => {
  eventProcessor.processEvent(message);
});

logger.info(`[BOOT] DEBUG_MODE: ${process.env.DEBUG_MODE}`);
logger.info(`[BOOT] Redis 채널: game-events`);
// 수정: config.eventProcessing이 undefined일 경우를 대비해 안전하게 접근
const batchSize = config.eventProcessing?.batchSize || config.batchProcessing?.batchSize || parseInt(process.env.BATCH_SIZE || '100', 10);
const batchIntervalMs = config.eventProcessing?.batchIntervalMs || config.batchProcessing?.flushIntervalMs || parseInt(process.env.BATCH_INTERVAL_MS || '1000', 10);
logger.info(`[BOOT] BATCH_SIZE: ${batchSize}, BATCH_INTERVAL_MS: ${batchIntervalMs}`);

// 서버 시작
const server = app.listen(PORT, () => {
  logger.info(`Event Processor Service running on port ${PORT}`);
});

// 정상 종료 처리
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    redisSubscriber.close();
    dbManager.close();
  });
});

module.exports = app; 