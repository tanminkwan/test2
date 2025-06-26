import fs from 'fs/promises';
import path from 'path';
import { EventPublisher } from './EventPublisher.js';

export class FileLogger extends EventPublisher {
    /**
     * @param {Object} config
     * @param {string} config.logDir
     * @param {string} config.filePrefix
     * @param {string} config.fileExt
     * @param {number} config.maxFileSize
     * @param {number} config.flushIntervalMs
     * @param {string} config.rotationPolicy
     * @param {number} config.maxRetry
     * @param {string} config.encoding
     * @param {number} config.priority 발행자 우선순위 (낮을수록 높은 우선순위)
     */
    constructor(config = {}) {
        super();
        this.logDir = config.logDir || './logs/events';
        this.filePrefix = config.filePrefix || 'game_events_';
        this.fileExt = config.fileExt || '.jsonl';
        this.maxFileSize = config.maxFileSize || 10 * 1024 * 1024; // 10MB
        this.flushIntervalMs = config.flushIntervalMs || 100;
        this.rotationPolicy = config.rotationPolicy || 'size';
        this.maxRetry = config.maxRetry || 3;
        this.encoding = config.encoding || 'utf8';
        this.priority = config.priority || 20; // Redis보다 낮은 우선순위 (기본값)

        this.queue = [];
        this.isFlushing = false;
        this.currentFilePath = '';
        this.currentFileSize = 0;
        this.flushTimer = null;
        this.fileIndex = 0;
        this.lastRotation = Date.now();
        this.initPromise = this.initialize();
    }

    async initialize() {
        try {
            // 로그 디렉토리 생성 (중첩 경로 지원)
            await fs.mkdir(this.logDir, { recursive: true });
            console.log(`[FileLogger] Log directory created/verified: ${this.logDir}`);
            
            await this.rotateFile();
            this.startFlushTimer();
            return true;
        } catch (err) {
            console.error(`[FileLogger] Initialization failed: ${err.message}`);
            throw err;
        }
    }

    getNewFilePath() {
        const now = new Date();
        const ts = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
        this.fileIndex += 1;
        return path.join(
            this.logDir,
            `${this.filePrefix}${ts}_${this.fileIndex}${this.fileExt}`
        );
    }

    async rotateFile() {
        this.currentFilePath = this.getNewFilePath();
        try {
            await fs.writeFile(this.currentFilePath, '', { encoding: this.encoding });
            this.currentFileSize = 0;
            this.lastRotation = Date.now();
            console.log(`[FileLogger] Created new log file: ${this.currentFilePath}`);
            return true;
        } catch (err) {
            console.error(`[FileLogger] Failed to create log file: ${err.message}`);
            throw err;
        }
    }

    startFlushTimer() {
        if (this.flushTimer) clearInterval(this.flushTimer);
        this.flushTimer = setInterval(() => this.flush(), this.flushIntervalMs);
    }

    async publishEvent(eventType, eventData) {
        await this.initPromise;
        const event = {
            type: eventType,
            data: eventData,
            timestamp: Date.now(),
            service: 'game-service'
        };
        this.queue.push(event);
        // 즉시 반환 (비동기)
        return true;
    }

    async flush() {
        if (this.isFlushing || this.queue.length === 0) return;
        this.isFlushing = true;
        let retry = 0;
        while (this.queue.length > 0 && retry <= this.maxRetry) {
            try {
                // 파일 크기 체크 및 로테이션
                if (this.rotationPolicy === 'size' && this.currentFileSize > this.maxFileSize) {
                    await this.rotateFile();
                }
                // 큐에서 모두 꺼내기
                const events = this.queue.splice(0);
                const lines = events.map(e => JSON.stringify(e)).join('\n') + '\n';
                await fs.appendFile(this.currentFilePath, lines, { encoding: this.encoding });
                this.currentFileSize += Buffer.byteLength(lines, this.encoding);
                break;
            } catch (err) {
                retry++;
                console.error(`[FileLogger] Flush attempt ${retry} failed: ${err.message}`);
                if (retry > this.maxRetry) {
                    console.error('[FileLogger] Flush failed after max retries:', err);
                } else {
                    await new Promise(res => setTimeout(res, 100 * retry));
                }
            }
        }
        this.isFlushing = false;
    }

    async close() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
        await this.flush();
        console.log(`[FileLogger] Closed successfully, flushed remaining ${this.queue.length} events`);
    }

    /**
     * 발행자의 우선순위를 반환합니다.
     * @returns {number} 우선순위 (낮을수록 높은 우선순위)
     */
    getPriority() {
        return this.priority;
    }
} 