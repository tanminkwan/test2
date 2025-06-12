const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const PORT = 3002;

// JWT 시크릿 키 (실제 환경에서는 환경변수 사용)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// PostgreSQL 연결 설정
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'user_service',
  password: 'postgres123', // 실제 비밀번호로 변경
  port: 5432,
});

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 로깅 미들웨어
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 데이터베이스 연결 테스트
pool.connect((err, client, release) => {
  if (err) {
    console.error('PostgreSQL 연결 실패:', err);
  } else {
    console.log('PostgreSQL 연결 성공');
    release();
  }
});

// JWT 토큰 검증 미들웨어
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: '토큰이 필요합니다' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: '유효하지 않은 토큰입니다' });
    }
    req.user = user;
    next();
  });
};

// API 엔드포인트

// 1. 회원가입
app.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // 입력 검증
    if (!username || !password || !email) {
      return res.status(400).json({
        success: false,
        message: '사용자명, 비밀번호, 이메일이 필요합니다'
      });
    }

    // 사용자 중복 확인
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: '이미 존재하는 사용자명 또는 이메일입니다'
      });
    }

    // 비밀번호 해시화
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 사용자 생성
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, email, hashedPassword]
    );

    const newUser = result.rows[0];

    res.status(201).json({
      success: true,
      message: '회원가입 성공',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        created_at: newUser.created_at
      }
    });

  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다'
    });
  }
});

// 2. 로그인
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 입력 검증
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '사용자명과 비밀번호가 필요합니다'
      });
    }

    // 사용자 조회
    const result = await pool.query(
      'SELECT id, username, email, password_hash FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: '잘못된 사용자명 또는 비밀번호'
      });
    }

    const user = result.rows[0];

    // 비밀번호 검증
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: '잘못된 사용자명 또는 비밀번호'
      });
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 마지막 로그인 시간 업데이트
    await pool.query(
      'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    res.json({
      success: true,
      message: '로그인 성공',
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다'
    });
  }
});

// 3. 토큰 검증 (Nginx 내부 인증용)
app.get('/verify-token', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).send('Unauthorized');
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).send('Unauthorized');
    }

    // Nginx가 사용할 사용자 정보 헤더 설정
    res.set('X-User-ID', user.userId);
    res.set('X-Username', user.username);
    res.status(200).send('OK');
  });
});

// 4. 사용자 프로필 조회
app.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, created_at, updated_at FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });

  } catch (error) {
    console.error('프로필 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다'
    });
  }
});

// 5. 사용자 프로필 수정
app.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: '수정할 정보가 필요합니다'
      });
    }

    // 이메일 중복 확인 (자신 제외)
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, req.user.userId]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: '이미 사용 중인 이메일입니다'
      });
    }

    // 프로필 업데이트
    const result = await pool.query(
      'UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username, email, updated_at',
      [email, req.user.userId]
    );

    const updatedUser = result.rows[0];

    res.json({
      success: true,
      message: '프로필이 업데이트되었습니다',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        updated_at: updatedUser.updated_at
      }
    });

  } catch (error) {
    console.error('프로필 수정 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다'
    });
  }
});

// 헬스체크
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'user-service',
    timestamp: new Date().toISOString()
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 User Service가 포트 ${PORT}에서 실행 중입니다`);
  console.log(`📋 API 엔드포인트:`);
  console.log(`   POST /register - 회원가입`);
  console.log(`   POST /login - 로그인`);
  console.log(`   GET /verify-token - 토큰 검증 (Nginx 전용)`);
  console.log(`   GET /profile - 프로필 조회`);
  console.log(`   PUT /profile - 프로필 수정`);
  console.log(`   GET /health - 헬스체크`);
});

// 에러 핸들링
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
}); 