import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// 내부 모듈 import
import sequelize, { checkDatabaseHealth, DatabaseFactory } from './config/database.js';
import { UserModel, UserRepository } from './models/User.js';
import { UserService } from './services/UserService.js';
import { UserController } from './controllers/UserController.js';
import { createUserRoutes } from './routes/userRoutes.js';

// 환경변수 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Trust proxy 설정 (nginx 뒤에서 실행되므로) - 보안을 위해 구체적으로 설정
app.set('trust proxy', 1); // nginx가 첫 번째 프록시이므로 1로 설정

// 설정
const config = {
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpiry: process.env.JWT_EXPIRY || '24h',
  nodeEnv: process.env.NODE_ENV || 'development'
};

// 미들웨어 설정
app.use(helmet()); // 보안 헤더
app.use(cors()); // CORS 허용
app.use(express.json({ limit: '10mb' })); // JSON 파싱
app.use(express.urlencoded({ extended: true })); // URL 인코딩

// Rate Limiting - trust proxy 설정과 호환되도록 수정
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 1000, // 최대 1000 요청으로 증가
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  },
  // 신뢰할 수 있는 프록시 설정 (nginx)
  trustProxy: 1,
  // 토큰 검증 엔드포인트는 rate limiting 제외
  skip: (req) => {
    return req.path === '/api/users/verify-token' || req.path === '/health';
  },
  // 표준 헤더 사용
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// 데이터베이스 및 모델 초기화
const User = UserModel(sequelize);
const userRepository = new UserRepository(User);

// 서비스 및 컨트롤러 초기화
const userService = new UserService(userRepository, config);
const userController = new UserController(userService);

// 라우트 설정
app.use('/api/users', createUserRoutes(userController, userService));

// 헬스체크 엔드포인트
app.get('/health', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  const userStats = await userService.getUserStatistics().catch(() => null);
  
  res.json({
    status: dbHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
    service: 'user-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbHealth,
    statistics: userStats,
    supportedDatabases: DatabaseFactory.getSupportedDatabases()
  });
});

// 데이터베이스 정보 엔드포인트
app.get('/api/database/info', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    const userStats = await userService.getUserStatistics();
    
    res.json({
      success: true,
      database: {
        type: process.env.DB_TYPE || 'sqlite',
        status: dbHealth.status,
        version: dbHealth.version,
        supportedTypes: DatabaseFactory.getSupportedDatabases()
      },
      statistics: userStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get database info',
      error: config.nodeEnv === 'development' ? error.message : undefined
    });
  }
});

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    message: 'User Service API',
    version: '1.0.0',
    database: {
      type: process.env.DB_TYPE || 'sqlite',
      supported: DatabaseFactory.getSupportedDatabases()
    },
    endpoints: {
      health: '/health',
      users: '/api/users',
      database: '/api/database/info',
      docs: '/api/docs' // 향후 Swagger 문서
    }
  });
});

// 404 핸들러
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// 에러 핸들러
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  res.status(500).json({
    success: false,
    message: config.nodeEnv === 'development' ? error.message : 'Internal server error',
    ...(config.nodeEnv === 'development' && { stack: error.stack })
  });
});

// 데이터베이스 연결 및 서버 시작
async function startServer() {
  try {
    // 데이터베이스 연결 테스트
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // 테이블 동기화 (개발 환경에서만)
    if (config.nodeEnv === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database tables synchronized.');
    }

    // 서버 시작 - 환경변수 HOST를 사용하도록 수정
    const host = process.env.HOST || '127.0.0.1';
    app.listen(PORT, host, () => {
      console.log(`🚀 User Service running on ${host}:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`👤 API endpoints: http://localhost:${PORT}/api/users`);
      console.log(`🗄️  Database info: http://localhost:${PORT}/api/database/info`);
      console.log(`🔧 Environment: ${config.nodeEnv}`);
      console.log(`💾 Database: ${process.env.DB_TYPE || 'sqlite'}`);
      console.log(`🔒 Security: Bound to ${host} (nginx reverse proxy required)`);
      
      if (config.nodeEnv === 'development') {
        console.log('\n📋 Available endpoints:');
        console.log('  POST /api/users/guest - Create guest user');
        console.log('  POST /api/users/register - Register new user');
        console.log('  POST /api/users/login - User login');
        console.log('  GET  /api/users/profile - Get user profile');
        console.log('  PUT  /api/users/vehicle-settings - Update vehicle settings');
        console.log('  POST /api/users/game-stats - Update game statistics');
        console.log('  GET  /api/users/verify-token - Verify JWT token');
        console.log('  GET  /api/users/list - List users (admin)');
        
        console.log('\n🔄 Database migration info:');
        console.log(`  Current: ${process.env.DB_TYPE || 'sqlite'}`);
        console.log(`  Supported: ${DatabaseFactory.getSupportedDatabases().join(', ')}`);
        console.log('  To change database: Set DB_TYPE environment variable');
      }
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('💡 Check your database configuration in .env file');
    process.exit(1);
  }
}

// 우아한 종료 처리
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down User Service...');
  try {
    await sequelize.close();
    console.log('✅ Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  try {
    await sequelize.close();
    console.log('✅ Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// 서버 시작
startServer(); 