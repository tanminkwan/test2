import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 데이터베이스 설정 인터페이스
 */
const databaseConfigs = {
  postgres: {
    development: {
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || '375aa60b11d449cab107f6dd168a6bee',
      database: process.env.DB_NAME || 'user_service',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: console.log
    },
    production: {
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  }
};

/**
 * 데이터베이스 연결 팩토리
 */
export class DatabaseFactory {
  static createConnection() {
    const dbType = process.env.DB_TYPE || 'postgres';
    const env = process.env.NODE_ENV || 'development';
    
    const config = databaseConfigs[dbType]?.[env];
    if (!config) {
      throw new Error(`Unsupported database configuration: ${dbType}/${env}`);
    }

    console.log(`🔧 Using ${dbType} database in ${env} mode`);

    return new Sequelize(config.database, config.username, config.password, {
      host: config.host,
      port: config.port,
      dialect: config.dialect,
      logging: config.logging,
      pool: config.pool || {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
  }

  static getSupportedDatabases() {
    return Object.keys(databaseConfigs);
  }

  static validateConfig(dbType, env) {
    return databaseConfigs[dbType]?.[env] !== undefined;
  }
}

// 기본 연결 생성
export const sequelize = DatabaseFactory.createConnection();

/**
 * 데이터베이스 헬스체크
 */
export async function checkDatabaseHealth() {
  try {
    await sequelize.authenticate();
    const dbType = process.env.DB_TYPE || 'postgres';
    
    // PostgreSQL 버전 확인
    const [results] = await sequelize.query('SELECT version() as version');
    const version = results[0]?.version?.split(' ')[1] || 'unknown';
    
    return {
      status: 'healthy',
      type: dbType,
      version: version,
      host: sequelize.config.host,
      port: sequelize.config.port,
      database: sequelize.config.database
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

export default sequelize; 