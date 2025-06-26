import { FileLogger } from './FileLogger.js';
import { RedisPublisher } from './RedisPublisher.js';
import { loadEventPublisherConfig } from './loadEventPublisherConfig.js';

/**
 * 이벤트 발행자 관리 클래스
 * 설정에 따라 다양한 이벤트 발행자를 생성하고 관리합니다.
 */
export class EventPublisherManager {
    constructor() {
        this.publishers = [];
        this.initialized = false;
        this.initPromise = this.initialize();
    }

    /**
     * 설정 파일에서 발행자 설정을 로드하고 초기화합니다.
     */
    async initialize() {
        try {
            const publisherConfigs = await loadEventPublisherConfig();
            
            for (const config of publisherConfigs) {
                const publisher = this.createPublisher(config);
                if (publisher) {
                    this.publishers.push(publisher);
                }
            }
            
            // 우선순위에 따라 발행자 정렬
            this.sortPublishersByPriority();
            
            this.initialized = true;
            console.log(`[EventPublisherManager] Initialized ${this.publishers.length} publishers`);
            return true;
        } catch (err) {
            console.error('[EventPublisherManager] Initialization failed:', err);
            return false;
        }
    }
    
    /**
     * 우선순위에 따라 발행자를 정렬합니다.
     */
    sortPublishersByPriority() {
        this.publishers.sort((a, b) => a.getPriority() - b.getPriority());
        
        // 정렬된 발행자 목록 로깅
        if (this.publishers.length > 0) {
            console.log('[EventPublisherManager] Publishers sorted by priority:');
            this.publishers.forEach(p => {
                console.log(`  - ${p.constructor.name}: priority ${p.getPriority()}`);
            });
        }
    }

    /**
     * 설정에 따라 적절한 발행자 인스턴스를 생성합니다.
     * @param {Object} config 발행자 설정
     * @returns {EventPublisher} 생성된 발행자 인스턴스
     */
    createPublisher(config) {
        switch (config.type.toLowerCase()) {
            case 'file':
                return new FileLogger(config);
            case 'redis':
                return new RedisPublisher(config);
            default:
                console.warn(`[EventPublisherManager] Unknown publisher type: ${config.type}`);
                return null;
        }
    }

    /**
     * 모든 발행자에게 이벤트를 발행합니다.
     * 우선순위가 높은 발행자가 성공하면 낮은 우선순위의 발행자는 사용하지 않습니다.
     * @param {string} eventType 이벤트 타입
     * @param {Object} eventData 이벤트 데이터
     * @returns {Promise<boolean>} 발행 성공 여부
     */
    async publishEvent(eventType, eventData) {
        await this.initPromise;
        
        if (!this.initialized || this.publishers.length === 0) {
            return false;
        }
        
        // 우선순위 순서대로 이벤트 발행 시도
        for (const publisher of this.publishers) {
            try {
                const success = await publisher.publishEvent(eventType, eventData);
                if (success) {
                    // 성공하면 더 낮은 우선순위 발행자는 시도하지 않음
                    return true;
                }
            } catch (err) {
                console.error(`[EventPublisherManager] Error publishing to ${publisher.constructor.name}:`, err);
                // 실패하면 다음 우선순위 발행자 시도
                continue;
            }
        }
        
        // 모든 발행자가 실패한 경우
        console.warn(`[EventPublisherManager] All publishers failed to publish event: ${eventType}`);
        return false;
    }
    
    /**
     * 모든 발행자에게 이벤트를 발행합니다. (우선순위 무시)
     * @param {string} eventType 이벤트 타입
     * @param {Object} eventData 이벤트 데이터
     * @returns {Promise<boolean>} 하나라도 성공하면 true
     */
    async publishEventToAll(eventType, eventData) {
        await this.initPromise;
        
        if (!this.initialized || this.publishers.length === 0) {
            return false;
        }
        
        const results = await Promise.all(
            this.publishers.map(publisher => 
                publisher.publishEvent(eventType, eventData)
                .catch(err => {
                    console.error(`[EventPublisherManager] Error publishing to ${publisher.constructor.name}:`, err);
                    return false;
                })
            )
        );
        
        // 하나라도 성공했으면 true 반환
        return results.some(result => result === true);
    }

    /**
     * 모든 발행자를 정상적으로 종료합니다.
     */
    async close() {
        await this.initPromise;
        
        for (const publisher of this.publishers) {
            if (typeof publisher.close === 'function') {
                try {
                    await publisher.close();
                } catch (err) {
                    console.error(`[EventPublisherManager] Error closing ${publisher.constructor.name}:`, err);
                }
            }
        }
    }
}

// 싱글톤 인스턴스 생성 및 내보내기
const eventPublisherManager = new EventPublisherManager();
export default eventPublisherManager; 