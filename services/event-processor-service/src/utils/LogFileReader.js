import fs from 'fs/promises';
import path from 'path';
import logger from './logger.js';
import config from '../config/config.js';
import readline from 'readline';

/**
 * 로그 파일 읽기 유틸리티
 * Redis 장애 시 생성된 파일 로그를 읽어서 처리합니다.
 */
class LogFileReader {
  constructor(eventProcessor) {
    this.config = config.logRecovery;
    this.eventProcessor = eventProcessor;
    this.processedFiles = new Set();
    this.lastProcessedPositions = new Map();
  }

  /**
   * 로그 디렉토리에서 미처리된 로그 파일 검색 및 처리
   */
  async processLogFiles() {
    if (!this.config.enabled) {
      logger.info('로그 파일 복구 기능이 비활성화되어 있습니다.');
      return;
    }

    try {
      const logDir = this.config.dir;
      const files = await fs.readdir(logDir);
      
      // JSONL 파일만 필터링
      const logFiles = files.filter(file => file.endsWith('.jsonl'));
      
      if (logFiles.length === 0) {
        logger.info('처리할 로그 파일이 없습니다.');
        return;
      }
      
      logger.info(`${logFiles.length}개의 로그 파일을 처리합니다.`);
      
      // 각 파일 처리
      for (const file of logFiles) {
        if (this.processedFiles.has(file)) {
          logger.debug(`파일 '${file}'은 이미 처리되었습니다.`);
          continue;
        }
        
        const filePath = path.join(logDir, file);
        await this.processLogFile(filePath, file);
        
        // 처리된 파일 목록에 추가
        this.processedFiles.add(file);
      }
      
      logger.info('모든 로그 파일 처리 완료');
    } catch (err) {
      logger.error('로그 파일 처리 중 오류 발생:', err);
    }
  }

  /**
   * 개별 로그 파일 처리
   */
  async processLogFile(filePath, fileName) {
    try {
      logger.info(`파일 '${fileName}' 처리 시작`);
      
      // 파일 상태 확인
      const stats = await fs.stat(filePath);
      
      // 이전에 처리한 위치 가져오기
      let startPosition = this.lastProcessedPositions.get(filePath) || 0;
      
      // 파일이 이전보다 작아졌다면 (로그 로테이션 등으로) 처음부터 다시 읽기
      if (stats.size < startPosition) {
        logger.info(`파일 '${fileName}'이 이전보다 작아졌거나 회전되었습니다. 처음부터 다시 읽기`);
        startPosition = 0;
      }
      
      // 파일 크기가 이전과 같다면 처리할 내용 없음
      if (stats.size === startPosition) {
        logger.info(`파일 '${fileName}'에서 처리할 내용이 없습니다.`);
        return 0;
      }
      
      // 파일 스트림 생성
      const fileStream = await fs.createReadStream(filePath, { 
        start: startPosition,
        encoding: 'utf8'
      });
      
      // 라인 단위로 읽기 위한 인터페이스 생성
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });
      
      let processedCount = 0;
      
      // 각 라인 처리
      for await (const line of rl) {
        if (line.trim()) {
          try {
            const event = JSON.parse(line);
            await this.eventProcessor.processEvent(event, true); // 두 번째 인자는 로그 파일에서 읽은 이벤트임을 표시
            processedCount++;
          } catch (parseErr) {
            logger.error(`이벤트 파싱 오류 (파일: ${fileName}):`, parseErr);
          }
        }
      }
      
      // 처리된 위치 업데이트
      this.lastProcessedPositions.set(filePath, stats.size);
      
      logger.info(`파일 '${fileName}'에서 ${processedCount}/${stats.size}개의 이벤트를 처리했습니다.`);
      
      // 처리 완료된 파일 백업 또는 이동 (선택 사항)
      // await this.archiveProcessedFile(filePath, fileName);
      
      return processedCount;
    } catch (err) {
      logger.error(`파일 '${fileName}' 처리 중 오류 발생:`, err);
      return 0;
    }
  }

  /**
   * 처리 완료된 파일을 백업 디렉토리로 이동 (선택 사항)
   */
  async archiveProcessedFile(filePath, fileName) {
    try {
      const archiveDir = path.join(this.config.dir, 'processed');
      
      // 백업 디렉토리가 없으면 생성
      await fs.mkdir(archiveDir, { recursive: true });
      
      // 타임스탬프를 파일명에 추가하여 이동
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const newFileName = `${path.parse(fileName).name}_processed_${timestamp}${path.parse(fileName).ext}`;
      const newFilePath = path.join(archiveDir, newFileName);
      
      await fs.rename(filePath, newFilePath);
      logger.info(`파일 '${fileName}'을 '${newFilePath}'로 이동했습니다.`);
    } catch (err) {
      logger.error(`파일 '${fileName}' 아카이브 중 오류 발생:`, err);
    }
  }

  /**
   * 주기적으로 로그 파일 확인 및 처리
   */
  startWatching(intervalMs = 60000) {
    if (!this.config.enabled) return;
    
    logger.info(`${intervalMs}ms 간격으로 로그 파일 감시 시작`);
    
    // 초기 실행
    this.processLogFiles();
    
    // 주기적 실행
    this.watchInterval = setInterval(() => {
      this.processLogFiles();
    }, intervalMs);
  }

  /**
   * 감시 중지
   */
  stopWatching() {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      logger.info('로그 파일 감시 중지');
    }
  }
}

export default LogFileReader; 