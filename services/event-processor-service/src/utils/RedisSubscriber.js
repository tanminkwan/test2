const Redis = require('ioredis');
const logger = require('./logger');

/**
 * Redis 메시지 구독 및 처리를 담당하는 클래스
 */
class RedisSubscriber {
  /**
   * Redis 구독자 생성
   * @param {Object} config - Redis 설정
   */
  constructor(config) {
    this.config = config;
    this.client = null;
    this.subscriber = null;
    this.handlers = new Map();
    this.isConnected = false;
    
    this.initialize();
  }

  /**
   * Redis 클라이언트 초기화
   */
  initialize() {
    try {
      // Redis 클라이언트 생성
      this.client = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password || undefined,
        retryStrategy: (times) => {
          const delay = Math.min(times * 100, 3000);
          return delay;
        }
      });

      // 구독 전용 클라이언트 생성
      this.subscriber = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password || undefined,
        retryStrategy: (times) => {
          const delay = Math.min(times * 100, 3000);
          return delay;
        }
      });

      // 이벤트 리스너 설정
      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        logger.error(`Redis client error: ${err.message}`);
        this.isConnected = false;
      });

      this.subscriber.on('message', (channel, message) => {
        this.handleMessage(channel, message);
      });

    } catch (error) {
      logger.error(`Failed to initialize Redis: ${error.message}`);
      this.isConnected = false;
    }
  }

  /**
   * 특정 채널 구독
   * @param {string} channel - 구독할 채널 이름
   * @param {Function} handler - 메시지 처리 함수
   */
  subscribe(channel, handler) {
    try {
      if (!this.subscriber) {
        logger.error('Cannot subscribe: Redis subscriber not initialized');
        return false;
      }

      this.subscriber.subscribe(channel, (err) => {
        if (err) {
          logger.error(`Failed to subscribe to ${channel}: ${err.message}`);
          return;
        }
        logger.info(`Subscribed to channel: ${channel}`);
      });

      // 핸들러 등록
      this.handlers.set(channel, handler);
      return true;
    } catch (error) {
      logger.error(`Subscribe error: ${error.message}`);
      return false;
    }
  }

  /**
   * 메시지 처리
   * @param {string} channel - 메시지가 수신된 채널
   * @param {string} message - 수신된 메시지
   */
  handleMessage(channel, message) {
    try {
      logger.info(`[REDIS_MSG] 채널: ${channel}, 메시지: ${message}`);
      const handler = this.handlers.get(channel);
      if (handler) {
        // JSON 파싱 시도
        try {
          const parsedMessage = JSON.parse(message);
          logger.info(`[REDIS_MSG] 파싱된 메시지: ${JSON.stringify(parsedMessage)}`);
          handler(parsedMessage);
        } catch (parseError) {
          logger.warn(`Failed to parse message as JSON: ${parseError.message}`);
          // 파싱 실패 시 원본 메시지 전달
          handler(message);
        }
      } else {
        logger.warn(`[REDIS_MSG] 채널 ${channel}에 대한 핸들러가 없습니다.`);
      }
    } catch (error) {
      logger.error(`Error handling message: ${error.message}`);
    }
  }

  /**
   * Redis 연결 종료
   */
  close() {
    try {
      if (this.subscriber) {
        this.subscriber.quit();
        logger.info('Redis subscriber connection closed');
      }
      
      if (this.client) {
        this.client.quit();
        logger.info('Redis client connection closed');
      }
      
      this.isConnected = false;
    } catch (error) {
      logger.error(`Error closing Redis connections: ${error.message}`);
    }
  }
}

module.exports = { RedisSubscriber }; 