const express = require('express');
const cors = require('cors');
const { config } = require('./config');
const logger = require('./utils/logger');
const { DatabaseManager } = require('./services/DatabaseManager');
const { StatisticsService } = require('./services/StatisticsService');

// 애플리케이션 초기화
const app = express();
const PORT = config.server.port || 3004;

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 상태 확인 엔드포인트
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'statistics-service' });
});

// 데이터베이스 매니저 초기화
const dbManager = new DatabaseManager();

// 통계 서비스 초기화
const statisticsService = new StatisticsService(dbManager);

// 통계 요약 엔드포인트
app.get('/api/statistics/summary', async (req, res) => {
  try {
    const stats = await statisticsService.getStatisticsSummary();
    res.status(200).json(stats);
  } catch (error) {
    logger.error(`Failed to get statistics summary: ${error.message}`);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// 플레이어별 통계 엔드포인트
app.get('/api/statistics/player/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const stats = await statisticsService.getPlayerStatistics(playerId);
    res.status(200).json(stats);
  } catch (error) {
    logger.error(`Failed to get player statistics: ${error.message}`);
    res.status(500).json({ error: 'Failed to get player statistics' });
  }
});

// 무기 사용 통계 엔드포인트
app.get('/api/statistics/weapons', async (req, res) => {
  try {
    const stats = await statisticsService.getWeaponStatistics();
    res.status(200).json(stats);
  } catch (error) {
    logger.error(`Failed to get weapon statistics: ${error.message}`);
    res.status(500).json({ error: 'Failed to get weapon statistics' });
  }
});

// 시간별 활동 통계 엔드포인트
app.get('/api/statistics/activity', async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    const stats = await statisticsService.getActivityStatistics(period);
    res.status(200).json(stats);
  } catch (error) {
    logger.error(`Failed to get activity statistics: ${error.message}`);
    res.status(500).json({ error: 'Failed to get activity statistics' });
  }
});

// 서버 시작
const server = app.listen(PORT, () => {
  logger.info(`Statistics Service running on port ${PORT}`);
});

// 정상 종료 처리
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    dbManager.close();
  });
});

module.exports = app; 