const path = require('path');
const fs = require('fs');
const yaml = require('yaml');
require('dotenv').config();

// 기본 설정
const defaultConfig = {
  server: {
    port: parseInt(process.env.PORT || '3004', 10),
    env: process.env.NODE_ENV || 'development',
  },
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'vehicle_game',
    ssl: process.env.POSTGRES_SSL === 'true',
  },
  influxdb: {
    url: process.env.INFLUXDB_URL || 'http://localhost:8086',
    token: process.env.INFLUXDB_TOKEN || '',
    org: process.env.INFLUXDB_ORG || 'vehicle_game',
    bucket: process.env.INFLUXDB_BUCKET || 'game_metrics',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: process.env.LOG_PRETTY === 'true',
  },
  cache: {
    enabled: process.env.CACHE_ENABLED === 'true',
    ttl: parseInt(process.env.CACHE_TTL || '300', 10), // 5분
  }
};

// YAML 설정 파일 로드 (있는 경우)
let fileConfig = {};
const configPath = path.join(process.cwd(), 'config.yaml');

try {
  if (fs.existsSync(configPath)) {
    const fileContents = fs.readFileSync(configPath, 'utf8');
    fileConfig = yaml.parse(fileContents);
  }
} catch (error) {
  console.warn(`설정 파일 로드 중 오류: ${error.message}`);
}

// 환경 변수와 설정 파일을 병합
const config = {
  ...defaultConfig,
  ...fileConfig,
};

// 설정 내보내기
module.exports = { config }; 