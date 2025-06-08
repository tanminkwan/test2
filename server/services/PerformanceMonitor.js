/**
 * Performance Monitor 클래스 (Single Responsibility Principle)
 * 서버 성능 모니터링 및 최적화 제안
 */
export class PerformanceMonitor {
    constructor(eventManager, config) {
        this.eventManager = eventManager;
        this.config = config;
        
        // 성능 메트릭
        this.metrics = {
            frameTime: [],
            memoryUsage: [],
            playerCount: [],
            entityCount: [],
            networkLatency: []
        };
        
        // 성능 임계값
        this.thresholds = {
            maxFrameTime: config.performance?.maxFrameTime || 33, // 30fps
            maxMemoryUsage: config.performance?.maxMemoryUsage || 512, // 512MB
            maxEntityCount: config.performance?.maxEntityCount || 1000
        };
        
        // 모니터링 설정
        this.monitoringInterval = config.performance?.monitoringInterval || 5000; // 5초
        this.maxMetricHistory = config.performance?.maxMetricHistory || 100;
        
        this.startMonitoring();
    }

    /**
     * 모니터링 시작
     */
    startMonitoring() {
        setInterval(() => {
            this.collectMetrics();
            this.analyzePerformance();
        }, this.monitoringInterval);
    }

    /**
     * 메트릭 수집
     */
    collectMetrics() {
        const now = Date.now();
        
        // 메모리 사용량
        const memUsage = process.memoryUsage();
        this.addMetric('memoryUsage', {
            timestamp: now,
            rss: memUsage.rss / 1024 / 1024, // MB
            heapUsed: memUsage.heapUsed / 1024 / 1024,
            heapTotal: memUsage.heapTotal / 1024 / 1024,
            external: memUsage.external / 1024 / 1024
        });
    }

    /**
     * 프레임 시간 기록
     */
    recordFrameTime(frameTime) {
        this.addMetric('frameTime', {
            timestamp: Date.now(),
            value: frameTime
        });
    }

    /**
     * 플레이어 수 기록
     */
    recordPlayerCount(count) {
        this.addMetric('playerCount', {
            timestamp: Date.now(),
            value: count
        });
    }

    /**
     * 엔티티 수 기록
     */
    recordEntityCount(vehicles, projectiles, effects, billboards) {
        const total = vehicles + projectiles + effects + billboards;
        this.addMetric('entityCount', {
            timestamp: Date.now(),
            vehicles,
            projectiles,
            effects,
            billboards,
            total
        });
    }

    /**
     * 메트릭 추가
     */
    addMetric(type, data) {
        if (!this.metrics[type]) {
            this.metrics[type] = [];
        }
        
        this.metrics[type].push(data);
        
        // 히스토리 크기 제한
        if (this.metrics[type].length > this.maxMetricHistory) {
            this.metrics[type].shift();
        }
    }

    /**
     * 성능 분석
     */
    analyzePerformance() {
        const issues = [];
        
        // 프레임 시간 분석
        const avgFrameTime = this.getAverageFrameTime();
        if (avgFrameTime > this.thresholds.maxFrameTime) {
            issues.push({
                type: 'HIGH_FRAME_TIME',
                severity: 'warning',
                message: `Average frame time: ${avgFrameTime.toFixed(2)}ms (threshold: ${this.thresholds.maxFrameTime}ms)`,
                suggestions: [
                    'Reduce entity count',
                    'Optimize collision detection',
                    'Enable low performance mode'
                ]
            });
        }
        
        // 메모리 사용량 분석
        const currentMemory = this.getCurrentMemoryUsage();
        if (currentMemory > this.thresholds.maxMemoryUsage) {
            issues.push({
                type: 'HIGH_MEMORY_USAGE',
                severity: 'warning',
                message: `Memory usage: ${currentMemory.toFixed(2)}MB (threshold: ${this.thresholds.maxMemoryUsage}MB)`,
                suggestions: [
                    'Clear old effects',
                    'Reduce bullet trail length',
                    'Limit explosion particle count'
                ]
            });
        }
        
        // 엔티티 수 분석
        const entityCount = this.getCurrentEntityCount();
        if (entityCount > this.thresholds.maxEntityCount) {
            issues.push({
                type: 'HIGH_ENTITY_COUNT',
                severity: 'warning',
                message: `Entity count: ${entityCount} (threshold: ${this.thresholds.maxEntityCount})`,
                suggestions: [
                    'Reduce projectile lifetime',
                    'Limit simultaneous explosions',
                    'Optimize billboard count'
                ]
            });
        }
        
        // 성능 이슈가 있으면 이벤트 발생
        if (issues.length > 0) {
            this.eventManager.emitWithHistory('performanceWarning', {
                issues,
                timestamp: Date.now(),
                metrics: this.getPerformanceSummary()
            });
        }
    }

    /**
     * 평균 프레임 시간 계산
     */
    getAverageFrameTime() {
        const frameTimeMetrics = this.metrics.frameTime.slice(-10); // 최근 10개
        if (frameTimeMetrics.length === 0) return 0;
        
        const sum = frameTimeMetrics.reduce((acc, metric) => acc + metric.value, 0);
        return sum / frameTimeMetrics.length;
    }

    /**
     * 현재 메모리 사용량
     */
    getCurrentMemoryUsage() {
        const memoryMetrics = this.metrics.memoryUsage;
        if (memoryMetrics.length === 0) return 0;
        
        const latest = memoryMetrics[memoryMetrics.length - 1];
        return latest.heapUsed;
    }

    /**
     * 현재 엔티티 수
     */
    getCurrentEntityCount() {
        const entityMetrics = this.metrics.entityCount;
        if (entityMetrics.length === 0) return 0;
        
        const latest = entityMetrics[entityMetrics.length - 1];
        return latest.total;
    }

    /**
     * 성능 요약 정보
     */
    getPerformanceSummary() {
        return {
            averageFrameTime: this.getAverageFrameTime(),
            currentMemoryUsage: this.getCurrentMemoryUsage(),
            currentEntityCount: this.getCurrentEntityCount(),
            playerCount: this.metrics.playerCount.length > 0 ? 
                this.metrics.playerCount[this.metrics.playerCount.length - 1].value : 0
        };
    }

    /**
     * 상세 성능 리포트
     */
    getDetailedReport() {
        return {
            summary: this.getPerformanceSummary(),
            metrics: this.metrics,
            thresholds: this.thresholds,
            uptime: process.uptime(),
            nodeVersion: process.version,
            platform: process.platform
        };
    }

    /**
     * 성능 최적화 제안
     */
    getOptimizationSuggestions() {
        const suggestions = [];
        const summary = this.getPerformanceSummary();
        
        if (summary.averageFrameTime > 20) {
            suggestions.push({
                category: 'Performance',
                suggestion: 'Consider reducing server tick rate',
                impact: 'Medium',
                implementation: 'Modify config.server.tickRate'
            });
        }
        
        if (summary.currentEntityCount > 500) {
            suggestions.push({
                category: 'Memory',
                suggestion: 'Reduce entity lifetimes',
                impact: 'High',
                implementation: 'Adjust bullet range and explosion duration'
            });
        }
        
        if (summary.currentMemoryUsage > 256) {
            suggestions.push({
                category: 'Memory',
                suggestion: 'Enable garbage collection optimization',
                impact: 'Medium',
                implementation: 'Add --optimize-for-size flag'
            });
        }
        
        return suggestions;
    }
} 