import { EventEmitter } from 'events';

/**
 * Event Manager 클래스 (Observer Pattern + Single Responsibility)
 * 게임 내 모든 이벤트를 중앙에서 관리
 */
export class EventManager extends EventEmitter {
    constructor() {
        super();
        this.eventHistory = [];
        this.maxHistorySize = 1000;
        this.eventTypes = new Set();
        
        // 이벤트 리스너 등록
        this.setupEventLogging();
    }

    /**
     * 이벤트 로깅 설정
     */
    setupEventLogging() {
        this.on('newListener', (eventType) => {
            this.eventTypes.add(eventType);
        });

        this.on('removeListener', (eventType) => {
            if (this.listenerCount(eventType) === 0) {
                this.eventTypes.delete(eventType);
            }
        });
    }

    /**
     * 이벤트 발생 (히스토리 기록 포함)
     */
    emitWithHistory(eventType, data) {
        const eventData = {
            type: eventType,
            data: data,
            timestamp: Date.now(),
            id: this.generateEventId()
        };

        // 히스토리에 추가
        this.addToHistory(eventData);
        
        // 이벤트 발생
        this.emit(eventType, data);
        
        return eventData.id;
    }

    /**
     * 이벤트 히스토리에 추가
     */
    addToHistory(eventData) {
        this.eventHistory.push(eventData);
        
        // 히스토리 크기 제한
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
    }

    /**
     * 이벤트 ID 생성
     */
    generateEventId() {
        return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 이벤트 히스토리 조회
     */
    getEventHistory(eventType = null, limit = 100) {
        let history = this.eventHistory;
        
        if (eventType) {
            history = history.filter(event => event.type === eventType);
        }
        
        return history.slice(-limit);
    }

    /**
     * 등록된 이벤트 타입 목록
     */
    getRegisteredEventTypes() {
        return Array.from(this.eventTypes);
    }

    /**
     * 이벤트 통계
     */
    getEventStats() {
        const stats = {};
        
        this.eventHistory.forEach(event => {
            if (!stats[event.type]) {
                stats[event.type] = 0;
            }
            stats[event.type]++;
        });
        
        return stats;
    }

    /**
     * 특정 시간 범위의 이벤트 조회
     */
    getEventsByTimeRange(startTime, endTime) {
        return this.eventHistory.filter(event => 
            event.timestamp >= startTime && event.timestamp <= endTime
        );
    }

    /**
     * 이벤트 히스토리 정리
     */
    clearHistory() {
        this.eventHistory = [];
    }

    /**
     * 게임 이벤트 타입 상수
     */
    static get EVENTS() {
        return {
            // 플레이어 관련
            PLAYER_JOINED: 'playerJoined',
            PLAYER_LEFT: 'playerLeft',
            PLAYER_SCORE_CHANGED: 'playerScoreChanged',
            
            // 게임 상태 관련
            GAME_STARTED: 'gameStarted',
            GAME_ENDED: 'gameEnded',
            GAME_STATE_UPDATE: 'gameStateUpdate',
            
            // 전투 관련
            VEHICLE_DESTROYED: 'vehicleDestroyed',
            VEHICLE_RESPAWNED: 'vehicleRespawned',
            VEHICLE_HIT: 'vehicleHit',
            BILLBOARD_DESTROYED: 'billboardDestroyed',
            
            // 효과 관련
            EXPLOSION_CREATED: 'explosionCreated',
            MUZZLE_FLASH: 'muzzleFlash',
            PROJECTILES_REMOVED: 'projectilesRemoved',
            EFFECTS_REMOVED: 'effectsRemoved',
            
            // 시스템 관련
            SERVER_STARTED: 'serverStarted',
            SERVER_ERROR: 'serverError',
            PERFORMANCE_WARNING: 'performanceWarning'
        };
    }
} 