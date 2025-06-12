# 🌐 API 문서

**Version:** v3.0  
**Last Updated:** 2025-01-25  
**Base URL:** http://localhost (nginx API Gateway)

## 📋 목차

1. [API 개요](#api-개요)
2. [인증 시스템](#인증-시스템)
3. [User Service API](#user-service-api)
4. [Game Service API](#game-service-api)
5. [WebSocket Events](#websocket-events)
6. [에러 코드](#에러-코드)
7. [Rate Limiting](#rate-limiting)
8. [예제 코드](#예제-코드)

## API 개요

### 🏗️ 아키텍처
- **API Gateway**: nginx (Port 80)
- **User Service**: Express.js (Port 3002)
- **Game Service**: Express.js + Socket.IO (Port 3001)
- **Database**: PostgreSQL

### 🔐 인증 방식
- **JWT (JSON Web Token)** 기반 인증
- **Bearer Token** 방식으로 Authorization 헤더에 포함
- **토큰 만료 시간**: 24시간

### 📊 응답 형식
모든 API 응답은 JSON 형식을 사용합니다.

**성공 응답:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Success message"
}
```

**에러 응답:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## 인증 시스템

### 🔑 JWT 토큰 구조

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "username": "player123",
    "isGuest": false,
    "iat": 1706140800,
    "exp": 1706227200
  }
}
```

### 🛡️ 인증 헤더
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## User Service API

### 🔓 인증 API (Public Endpoints)

#### POST /api/auth/users/register
사용자 회원가입

**Request Body:**
```json
{
  "username": "player123",
  "email": "player@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "player123",
      "email": "player@example.com",
      "isGuest": false,
      "preferredVehicleType": "fighter",
      "gameStats": {
        "totalKills": 0,
        "totalDeaths": 0,
        "totalGames": 0,
        "totalScore": 0,
        "bestScore": 0,
        "playTime": 0
      },
      "gamePoints": 0,
      "createdAt": "2025-01-25T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully"
}
```

**Error Responses:**
- `400`: 잘못된 입력 데이터
- `409`: 이미 존재하는 사용자명 또는 이메일

---

#### POST /api/auth/users/login
사용자 로그인

**Request Body:**
```json
{
  "username": "player123",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "player123",
      "email": "player@example.com",
      "isGuest": false,
      "preferredVehicleType": "fighter",
      "gameStats": {
        "totalKills": 15,
        "totalDeaths": 8,
        "totalGames": 23,
        "totalScore": 1250,
        "bestScore": 180,
        "playTime": 3600
      },
      "gamePoints": 1250,
      "lastLoginAt": "2025-01-25T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

**Error Responses:**
- `400`: 잘못된 입력 데이터
- `401`: 잘못된 사용자명 또는 비밀번호
- `404`: 사용자를 찾을 수 없음

---

#### POST /api/auth/users/guest
게스트 계정 생성

**Request Body:**
```json
{
  "username": "Guest_12345"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "username": "Guest_12345",
      "email": null,
      "isGuest": true,
      "preferredVehicleType": "fighter",
      "gameStats": {
        "totalKills": 0,
        "totalDeaths": 0,
        "totalGames": 0,
        "totalScore": 0,
        "bestScore": 0,
        "playTime": 0
      },
      "gamePoints": 0,
      "createdAt": "2025-01-25T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Guest account created successfully"
}
```

**Error Responses:**
- `400`: 잘못된 입력 데이터
- `409`: 이미 존재하는 사용자명

---

#### GET /api/auth/users/verify-token
JWT 토큰 검증 (nginx 내부 사용)

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "username": "player123",
    "isGuest": false
  },
  "message": "Token is valid"
}
```

**Error Responses:**
- `401`: 토큰이 없거나 잘못됨
- `403`: 토큰이 만료됨

### 🔒 사용자 API (Protected Endpoints)

#### GET /api/user/users/profile
사용자 프로필 조회

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "player123",
      "email": "player@example.com",
      "isGuest": false,
      "preferredVehicleType": "heavy",
      "gameStats": {
        "totalKills": 25,
        "totalDeaths": 12,
        "totalGames": 37,
        "totalScore": 2100,
        "bestScore": 280,
        "playTime": 7200
      },
      "customization": {
        "vehicleColor": "#ff0000",
        "unlockedItems": ["redPaint", "blueEngine"],
        "equippedItems": ["redPaint"]
      },
      "gamePoints": 2100,
      "lastLoginAt": "2025-01-25T10:00:00.000Z",
      "createdAt": "2025-01-20T08:30:00.000Z"
    }
  },
  "message": "Profile retrieved successfully"
}
```

---

#### PUT /api/user/users/vehicle-settings
차량 설정 업데이트

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "preferredVehicleType": "heavy",
  "customization": {
    "vehicleColor": "#00ff00",
    "equippedItems": ["greenPaint", "turboEngine"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "preferredVehicleType": "heavy",
      "customization": {
        "vehicleColor": "#00ff00",
        "unlockedItems": ["redPaint", "blueEngine", "greenPaint", "turboEngine"],
        "equippedItems": ["greenPaint", "turboEngine"]
      }
    }
  },
  "message": "Vehicle settings updated successfully"
}
```

**Error Responses:**
- `400`: 잘못된 차량 타입 또는 설정
- `401`: 인증 토큰 없음
- `403`: 권한 없음

---

#### POST /api/user/users/game-stats
게임 통계 업데이트

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request Body:**
```json
{
  "kills": 3,
  "deaths": 1,
  "score": 150,
  "playTime": 300,
  "vehicleType": "fighter"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "gameStats": {
      "totalKills": 28,
      "totalDeaths": 13,
      "totalGames": 38,
      "totalScore": 2250,
      "bestScore": 280,
      "playTime": 7500
    },
    "gamePoints": 2250
  },
  "message": "Game statistics updated successfully"
}
```

---

#### GET /api/user/users/list
사용자 목록 조회 (관리자용)

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameters:**
- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 항목 수 (기본값: 10)
- `search`: 검색어 (사용자명 검색)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "username": "player123",
        "isGuest": false,
        "gameStats": {
          "totalKills": 28,
          "totalDeaths": 13,
          "totalGames": 38,
          "totalScore": 2250
        },
        "gamePoints": 2250,
        "lastLoginAt": "2025-01-25T10:00:00.000Z",
        "createdAt": "2025-01-20T08:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalUsers": 47,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "message": "User list retrieved successfully"
}
```

---

#### GET /api/user/database/info
데이터베이스 정보 조회

**Headers:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "data": {
    "database": {
      "type": "postgres",
      "host": "localhost",
      "port": 5432,
      "database": "user_service",
      "tablesCount": 3,
      "totalUsers": 47,
      "activeUsers": 42,
      "guestUsers": 15
    },
    "statistics": {
      "totalGames": 1250,
      "totalKills": 8750,
      "totalDeaths": 6200,
      "averageScore": 145.5
    }
  },
  "message": "Database information retrieved successfully"
}
```

## Game Service API

### 🎮 게임 상태 API

#### GET /api/status
게임 서버 상태 조회

**Response:**
```json
{
  "success": true,
  "data": {
    "server": {
      "status": "running",
      "uptime": 3600,
      "version": "3.0.0",
      "environment": "development"
    },
    "game": {
      "activePlayers": 8,
      "activeVehicles": 8,
      "activeBullets": 15,
      "activeExplosions": 3,
      "gameLoopRunning": true,
      "averageFPS": 60
    },
    "performance": {
      "memoryUsage": {
        "rss": 125829120,
        "heapTotal": 89653248,
        "heapUsed": 65432108,
        "external": 1234567
      },
      "cpuUsage": {
        "user": 123456,
        "system": 78901
      }
    }
  },
  "message": "Server status retrieved successfully"
}
```

## WebSocket Events

### 🔌 연결 관리

#### Connection
클라이언트가 게임 서버에 연결

**Client → Server:**
```javascript
// JWT 토큰을 헤더에 포함하여 연결
const socket = io('http://localhost', {
  extraHeaders: {
    Authorization: `Bearer ${jwtToken}`
  }
});
```

**Server → Client:**
```javascript
// 연결 성공
socket.emit('connected', {
  playerId: 'player-uuid',
  message: 'Connected to game server'
});

// 연결 실패
socket.emit('error', {
  message: 'Authentication failed',
  code: 'AUTH_FAILED'
});
```

---

#### Disconnect
클라이언트 연결 해제

**Server → All Clients:**
```javascript
socket.broadcast.emit('playerLeft', {
  playerId: 'player-uuid',
  username: 'player123'
});
```

### 🎮 게임 이벤트

#### joinGame
게임 참가 요청

**Client → Server:**
```javascript
socket.emit('joinGame', {
  username: 'player123',
  vehicleType: 'fighter' // 'fighter', 'heavy', 'test'
});
```

**Server → Client:**
```javascript
// 참가 성공
socket.emit('gameJoined', {
  playerId: 'player-uuid',
  vehicleId: 'vehicle-uuid',
  position: { x: 0, y: 50, z: 0 },
  vehicleType: 'fighter'
});

// 다른 플레이어들에게 알림
socket.broadcast.emit('playerJoined', {
  playerId: 'player-uuid',
  username: 'player123',
  vehicleType: 'fighter',
  position: { x: 0, y: 50, z: 0 }
});
```

---

#### playerInput
플레이어 입력 전송

**Client → Server:**
```javascript
socket.emit('playerInput', {
  keys: {
    w: true,
    s: false,
    a: false,
    d: true,
    q: false,
    e: false,
    shift: true,
    ctrl: false,
    space: false,
    x: false,
    p: false
  },
  mouse: {
    leftClick: false,
    rightClick: false,
    x: 0.5,
    y: 0.3
  }
});
```

---

#### gameStateUpdate
게임 상태 업데이트

**Server → All Clients:**
```javascript
socket.emit('gameStateUpdate', {
  vehicles: {
    'vehicle-uuid-1': {
      id: 'vehicle-uuid-1',
      playerId: 'player-uuid-1',
      position: { x: 10.5, y: 52.3, z: -15.7 },
      rotation: { x: 0.1, y: 1.57, z: 0.05 },
      velocity: { x: 2.3, y: 0.1, z: -1.8 },
      health: 35,
      maxHealth: 40,
      vehicleType: 'fighter',
      visible: true,
      boosterActive: true
    }
  },
  bullets: {
    'bullet-uuid-1': {
      id: 'bullet-uuid-1',
      position: { x: 15.2, y: 53.1, z: -20.4 },
      velocity: { x: 50.0, y: 2.0, z: -30.0 },
      ownerId: 'player-uuid-1'
    }
  },
  explosions: {
    'explosion-uuid-1': {
      id: 'explosion-uuid-1',
      position: { x: 20.1, y: 51.8, z: -25.3 },
      radius: 15,
      intensity: 0.8,
      duration: 2000,
      startTime: 1706140800000
    }
  },
  effects: {
    muzzleFlashes: {
      'player-uuid-1': {
        position: { x: 10.5, y: 52.3, z: -15.7 },
        rotation: { x: 0.1, y: 1.57, z: 0.05 },
        timestamp: 1706140800000
      }
    }
  }
});
```

---

#### bulletCreated
총알 생성 이벤트

**Server → All Clients:**
```javascript
socket.emit('bulletCreated', {
  bullet: {
    id: 'bullet-uuid-1',
    position: { x: 10.5, y: 52.3, z: -15.7 },
    velocity: { x: 50.0, y: 2.0, z: -30.0 },
    ownerId: 'player-uuid-1',
    damage: 10
  }
});
```

---

#### bulletDestroyed
총알 파괴 이벤트

**Server → All Clients:**
```javascript
socket.emit('bulletDestroyed', {
  bulletId: 'bullet-uuid-1',
  reason: 'collision', // 'collision', 'timeout', 'outOfBounds'
  position: { x: 25.3, y: 51.2, z: -30.8 }
});
```

---

#### explosionCreated
폭발 생성 이벤트

**Server → All Clients:**
```javascript
socket.emit('explosionCreated', {
  explosion: {
    id: 'explosion-uuid-1',
    position: { x: 20.1, y: 51.8, z: -25.3 },
    radius: 15,
    intensity: 0.8,
    duration: 2000,
    type: 'vehicleDestroyed' // 'hit', 'vehicleDestroyed'
  }
});
```

---

#### vehicleHit
차량 피격 이벤트

**Server → All Clients:**
```javascript
socket.emit('vehicleHit', {
  vehicleId: 'vehicle-uuid-1',
  attackerId: 'player-uuid-2',
  damage: 10,
  newHealth: 25,
  hitPosition: { x: 10.5, y: 52.3, z: -15.7 }
});
```

---

#### vehicleDestroyed
차량 파괴 이벤트

**Server → All Clients:**
```javascript
socket.emit('vehicleDestroyed', {
  vehicleId: 'vehicle-uuid-1',
  playerId: 'player-uuid-1',
  killerId: 'player-uuid-2',
  position: { x: 10.5, y: 52.3, z: -15.7 },
  score: {
    killer: {
      playerId: 'player-uuid-2',
      newScore: 150,
      kills: 3
    },
    victim: {
      playerId: 'player-uuid-1',
      newScore: 80,
      deaths: 2
    }
  }
});
```

---

#### vehicleRespawned
차량 리스폰 이벤트

**Server → All Clients:**
```javascript
socket.emit('vehicleRespawned', {
  vehicleId: 'vehicle-uuid-1',
  playerId: 'player-uuid-1',
  position: { x: 0, y: 50, z: 0 },
  health: 40,
  vehicleType: 'fighter'
});
```

---

#### scoreUpdate
점수 업데이트 이벤트

**Server → All Clients:**
```javascript
socket.emit('scoreUpdate', {
  leaderboard: [
    {
      playerId: 'player-uuid-1',
      username: 'player123',
      score: 180,
      kills: 4,
      deaths: 1
    },
    {
      playerId: 'player-uuid-2',
      username: 'player456',
      score: 150,
      kills: 3,
      deaths: 2
    }
  ]
});
```

## 에러 코드

### 🚨 HTTP 상태 코드

| 코드 | 의미 | 설명 |
|------|------|------|
| 200 | OK | 요청 성공 |
| 201 | Created | 리소스 생성 성공 |
| 400 | Bad Request | 잘못된 요청 |
| 401 | Unauthorized | 인증 실패 |
| 403 | Forbidden | 권한 없음 |
| 404 | Not Found | 리소스를 찾을 수 없음 |
| 409 | Conflict | 리소스 충돌 |
| 429 | Too Many Requests | 요청 제한 초과 |
| 500 | Internal Server Error | 서버 내부 오류 |

### 🔍 커스텀 에러 코드

| 코드 | 설명 |
|------|------|
| `AUTH_FAILED` | 인증 실패 |
| `TOKEN_EXPIRED` | 토큰 만료 |
| `TOKEN_INVALID` | 잘못된 토큰 |
| `USER_NOT_FOUND` | 사용자를 찾을 수 없음 |
| `USER_EXISTS` | 이미 존재하는 사용자 |
| `INVALID_CREDENTIALS` | 잘못된 인증 정보 |
| `INVALID_VEHICLE_TYPE` | 잘못된 차량 타입 |
| `GAME_FULL` | 게임 세션이 가득 찼음 |
| `RATE_LIMIT_EXCEEDED` | 요청 제한 초과 |
| `DATABASE_ERROR` | 데이터베이스 오류 |

## Rate Limiting

### 📊 제한 정책

| 엔드포인트 | 제한 | 설명 |
|------------|------|------|
| `/api/auth/*` | 5 req/sec | 인증 관련 API |
| `/api/user/*` | 10 req/sec | 사용자 API |
| `/socket.io/*` | 무제한 | WebSocket 연결 |
| 전체 | 1000 req/15min | 전체 API 호출 |

### 🚫 Rate Limit 초과 시 응답

```json
{
  "success": false,
  "error": "Too many requests",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

## 예제 코드

### 🔐 인증 예제

```javascript
// 로그인
async function login(username, password) {
  try {
    const response = await fetch('/api/auth/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // JWT 토큰 저장
      localStorage.setItem('authToken', data.data.token);
      localStorage.setItem('userData', JSON.stringify(data.data.user));
      return data.data;
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

// 인증된 API 호출
async function getProfile() {
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await fetch('/api/user/users/profile', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      return data.data.user;
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Failed to get profile:', error);
    throw error;
  }
}
```

### 🎮 게임 연결 예제

```javascript
// Socket.IO 연결
function connectToGame() {
  const token = localStorage.getItem('authToken');
  
  const socket = io('http://localhost', {
    extraHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
  
  // 연결 성공
  socket.on('connected', (data) => {
    console.log('Connected to game server:', data);
  });
  
  // 게임 참가
  socket.on('connect', () => {
    const userData = JSON.parse(localStorage.getItem('userData'));
    socket.emit('joinGame', {
      username: userData.username,
      vehicleType: userData.preferredVehicleType || 'fighter'
    });
  });
  
  // 게임 상태 업데이트
  socket.on('gameStateUpdate', (gameState) => {
    updateGameDisplay(gameState);
  });
  
  // 에러 처리
  socket.on('error', (error) => {
    console.error('Socket error:', error);
    if (error.code === 'AUTH_FAILED') {
      // 토큰 만료 시 로그인 페이지로 리다이렉트
      window.location.href = '/login';
    }
  });
  
  return socket;
}

// 플레이어 입력 전송
function sendPlayerInput(socket, inputState) {
  socket.emit('playerInput', {
    keys: inputState.keys,
    mouse: inputState.mouse
  });
}
```

### 📊 통계 업데이트 예제

```javascript
// 게임 종료 시 통계 업데이트
async function updateGameStats(gameResult) {
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await fetch('/api/user/users/game-stats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        kills: gameResult.kills,
        deaths: gameResult.deaths,
        score: gameResult.score,
        playTime: gameResult.playTime,
        vehicleType: gameResult.vehicleType
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Stats updated:', data.data.gameStats);
      return data.data;
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Failed to update stats:', error);
    throw error;
  }
}
```

---

**📋 문서 버전 관리**

- v3.0: 마이크로서비스 API 문서화
- v2.x: 모놀리식 API 문서
- v1.x: 초기 API 문서

**🔄 업데이트 주기**: API 변경 시 즉시 업데이트 