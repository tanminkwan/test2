import fs from 'fs/promises';
import path from 'path';
import yaml from 'yaml';
import { fileURLToPath } from 'url';

/**
 * event-publisher-config.yaml 파일을 읽어 publishers 리스트를 반환
 * @returns {Promise<Array>} publishers 리스트
 */
export async function loadEventPublisherConfig() {
    try {
        // ES6 모듈에서 __dirname 대체
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        
        // 상대 경로로 설정 파일 경로 구성
        const configPath = path.resolve(__dirname, '../config/event-publisher-config.yaml');
        
        console.log(`[loadEventPublisherConfig] Loading config from: ${configPath}`);
        
        // 파일 읽기
        const file = await fs.readFile(configPath, 'utf8');
        const config = yaml.parse(file);
        
        // 설정 유효성 검사
        if (!config.publishers || !Array.isArray(config.publishers)) {
            throw new Error('Invalid config: publishers array missing');
        }
        
        console.log(`[loadEventPublisherConfig] Loaded ${config.publishers.length} publisher configs`);
        return config.publishers;
    } catch (err) {
        console.error('[loadEventPublisherConfig] Failed to load config:', err.message);
        throw err;
    }
} 