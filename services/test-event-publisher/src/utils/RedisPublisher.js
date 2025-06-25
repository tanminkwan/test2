/**
 * Redis를 사용하여 이벤트를 발행하는 클래스
 */
export class RedisPublisher {
    /**
     * @param {Object} config
     * @param {string} config.host Redis 호스트
     * @param {number} config.port Redis 포트
     * @param {string} config.password Redis 비밀번호 (선택)
     * @param {string} config.channel 발행할 채널 이름
     */
    constructor(config = {}) {
        this.host = config.host || 'localhost';
        this.port = config.port || 6379;
        this.password = config.password || '';
        this.channel = config.channel || 'game-events';
        this.connected = false;
        this.client = null;
        this.initPromise = this.initialize();
    }

    /**
     * Redis 클라이언트를 초기화합니다.
     */
    async initialize() {
        try {
            // 동적으로 redis 모듈 불러오기
            try {
                const redis = await import('redis');
                this.client = redis.createClient({
                    socket: {
                        host: this.host,
                        port: this.port
                    },
                    password: this.password || undefined
                });

                // 연결 이벤트 핸들러
                this.client.on('connect', () => {
                    console.log(`[RedisPublisher] Connected to Redis at ${this.host}:${this.port}`);
                    this.connected = true;
                });

                this.client.on('error', (err) => {
                    console.error(`[RedisPublisher] Redis error: ${err.message}`);
                    this.connected = false;
                });

                this.client.on('end', () => {
                    console.warn('[RedisPublisher] Redis connection closed');
                    this.connected = false;
                });

                // 연결 시도
                await this.client.connect();
                return true;
            } catch (importErr) {
                console.error(`[RedisPublisher] Redis module not available: ${importErr.message}`);
                console.warn('[RedisPublisher] Install redis module with: npm install redis');
                return false;
            }
        } catch (err) {
            console.error(`[RedisPublisher] Initialization failed: ${err.message}`);
            return false;
        }
    }

    /**
     * 이벤트를 Redis 채널에 발행합니다.
     * @param {string} eventType 이벤트 타입
     * @param {Object} eventData 이벤트 데이터
     * @returns {Promise<boolean>} 발행 성공 여부
     */
    async publishEvent(eventType, eventData) {
        await this.initPromise;
        
        if (!this.connected || !this.client) {
            return false;
        }

        try {
            const event = {
                type: eventType,
                data: eventData,
                timestamp: Date.now(),
                service: 'test-event-publisher'
            };

            const message = JSON.stringify(event);
            await this.client.publish(this.channel, message);
            return true;
        } catch (err) {
            console.error(`[RedisPublisher] Failed to publish event: ${err.message}`);
            return false;
        }
    }

    /**
     * Redis 연결을 종료합니다.
     */
    async close() {
        if (this.client) {
            try {
                await this.client.quit();
                console.log('[RedisPublisher] Redis connection closed gracefully');
            } catch (err) {
                console.error(`[RedisPublisher] Error closing Redis connection: ${err.message}`);
            }
        }
    }
} 