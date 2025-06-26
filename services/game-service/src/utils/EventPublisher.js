// 이벤트 발행 인터페이스(추상 클래스)
export class EventPublisher {
    /**
     * 이벤트 발행 (구현체에서 반드시 구현)
     * @param {string} eventType - 이벤트 타입
     * @param {Object} eventData - 이벤트 데이터
     * @returns {Promise<boolean>} 발행 성공 여부
     */
    async publishEvent(eventType, eventData) {
        throw new Error('publishEvent() must be implemented by subclass');
    }
    
    /**
     * 발행자의 우선순위를 반환합니다.
     * 낮은 값이 높은 우선순위를 의미합니다.
     * @returns {number} 우선순위 (기본값: 100)
     */
    getPriority() {
        return 100; // 기본 우선순위는 가장 낮음
    }
} 