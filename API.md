# ?�� API 문서

**Version:** v4.0  
**Last Updated:** 2025-06-12  
**Architecture:** Independent Microservices with JWT Authentication

## ?�� 목차

1. [API 개요](#api-개요)
2. [?�증 ?�스??(#?�증-?�스??
3. [User Service API](#user-service-api)
4. [Game Service API](#game-service-api)
5. [WebSocket ?�벤??(#websocket-?�벤??
6. [?�러 처리](#?�러-처리)
7. [Rate Limiting](#rate-limiting)
8. [API ?�스??(#api-?�스??

## ?�� API 개요

### 마이?�로?�비??구조

```mermaid
graph TB
    subgraph "Client"
        A[Web Browser]
    end
    
    subgraph "API Gateway (nginx:80)"
        B[nginx Proxy]
    end
    
    subgraph "User Service (3002)"
        C[Authentication API]
        D[User Management API]
    end
    
    subgraph "Game Service (3001)"
        E[Game Status API]
        F[WebSocket API]
    end
    
    A --> B
    B --> C
    B --> D
    B --> E
    B --> F
    
    style B fill:#ff9999
    style C fill:#99ccff
    style D fill:#99ccff
    style E fill:#99ff99
    style F fill:#99ff99
```

### API ?�우??규칙

| 경로 | ?�???�비??| ?�증 ?�요 | ?�명 |
|------|-------------|-----------|------|
| `/api/auth/*` | User Service | ??| ?�증 관??API |
| `/api/user/*` | User Service | ??| ?�용??관�?API |
| `/socket.io/*` | Game Service | ??| WebSocket ?�결 |
| `/api/status` | Game Service | ??| 게임 ?�버 ?�태 |

### 공통 ?�답 ?�식

#### ?�공 ?�답
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // ?�답 ?�이??
  },
  "timestamp": "2025-06-12T10:00:00Z"
}
```

#### ?�러 ?�답
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details"
  },
  "timestamp": "2025-06-12T10:00:00Z"
}
```

## ?�� ?�증 ?�스??

### JWT ?�큰 구조

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": "uuid",
    "username": "string",
    "isGuest": "boolean",
    "iat": "timestamp",
    "exp": "timestamp"
  }
}
```

### ?�증 ?�더 ?�식

```http
Authorization: Bearer <jwt_token>
```

### ?�큰 만료 ?�간

- **기본**: 24?�간
- **게스??*: 24?�간 (?�션 종료 ????��)
- **?�록 ?�용??*: 24?�간 (갱신 가??

## ?�� User Service API

**Base URL**: `http://localhost/api/`  
**Port**: 3002 (nginx�??�해 ?�우??

### ?�� ?�증 API (?�증 불필??

#### POST /api/auth/users/register
?�용???�원가??

**Request:**
```http
POST /api/auth/users/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "testuser",
      "email": "test@example.com",
      "isGuest": false,
      "preferredVehicleType": "fighter",
      "createdAt": "2025-06-12T10:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Validation Rules:**
- `username`: 3-50?? ?�문/?�자/?�더?�코?�만 ?�용
- `email`: ?�효???�메???�식
- `password`: 최소 6???�상

---

#### POST /api/auth/users/login
?�용??로그??

**Request:**
```http
POST /api/auth/users/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "testuser",
      "email": "test@example.com",
      "isGuest": false,
      "preferredVehicleType": "fighter",
      "gameStats": {
        "totalKills": 15,
        "totalDeaths": 8,
        "totalGames": 5,
        "totalScore": 2500,
        "bestScore": 800,
        "playTime": 7200
      },
      "lastLoginAt": "2025-06-12T10:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2025-06-12T10:00:00Z"
}
```

---

#### POST /api/auth/users/guest
게스??계정 ?�성

**Request:**
```http
POST /api/auth/users/guest
Content-Type: application/json

{}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Guest user created successfully",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "username": "Guest_12345",
      "isGuest": true,
      "preferredVehicleType": "fighter",
      "createdAt": "2025-06-12T10:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

#### GET /api/auth/users/verify-token
JWT ?�큰 검�?(nginx ?��? ?�용)

**Request:**
```http
GET /api/auth/users/verify-token
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "username": "testuser",
    "isGuest": false
  }
}
```

### ?�� ?�용??관�?API (?�증 ?�요)

#### GET /api/user/users/profile
?�용???�로??조회

**Request:**
```http
GET /api/user/users/profile
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "testuser",
    "email": "test@example.com",
    "isGuest": false,
    "preferredVehicleType": "fighter",
    "gameStats": {
      "totalKills": 15,
      "totalDeaths": 8,
      "totalGames": 5,
      "totalScore": 2500,
      "bestScore": 800,
      "playTime": 7200
    },
    "customization": {
      "vehicleColor": "#ff0000",
      "unlockedItems": ["skin1", "weapon1"],
      "equippedItems": ["skin1"]
    },
    "gamePoints": 150,
    "lastLoginAt": "2025-06-12T10:00:00Z",
    "createdAt": "2025-01-20T10:00:00Z",
    "updatedAt": "2025-06-12T10:00:00Z"
  }
}
```

---

#### PUT /api/user/users/vehicle-settings
차량 ?�정 ?�데?�트

**Request:**
```http
PUT /api/user/users/vehicle-settings
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "preferredVehicleType": "heavy",
  "customization": {
    "vehicleColor": "#00ff00",
    "equippedItems": ["skin2", "weapon2"]
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Vehicle settings updated successfully",
  "data": {
    "preferredVehicleType": "heavy",
    "customization": {
      "vehicleColor": "#00ff00",
      "unlockedItems": ["skin1", "weapon1", "skin2", "weapon2"],
      "equippedItems": ["skin2", "weapon2"]
    }
  }
}
```

**Valid Vehicle Types:**
- `fighter`: 균형?�힌 ?�투�?
- `heavy`: 중형 ?�투�?
- `test`: ?�스?�용 ?�투�?

---

#### POST /api/user/users/game-stats
게임 ?�계 ?�데?�트

**Request:**
```http
POST /api/user/users/game-stats
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "kills": 3,
  "deaths": 1,
  "score": 500,
  "playTime": 600
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Game statistics updated successfully",
  "data": {
    "gameStats": {
      "totalKills": 18,
      "totalDeaths": 9,
      "totalGames": 6,
      "totalScore": 3000,
      "bestScore": 800,
      "playTime": 7800
    },
    "gamePoints": 165
  }
}
```

---

#### GET /api/user/users/list
?�용??목록 조회 (관리자??

**Request:**
```http
GET /api/user/users/list?page=1&limit=10&search=test
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `page`: ?�이지 번호 (기본�? 1)
- `limit`: ?�이지????�� ??(기본�? 10, 최�?: 100)
- `search`: 검?�어 (?�용?�명 ?�는 ?�메??
- `isGuest`: 게스???�터 (true/false)
- `isActive`: ?�성 ?�태 ?�터 (true/false)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "username": "testuser",
        "email": "test@example.com",
        "isGuest": false,
        "isActive": true,
        "gameStats": {
          "totalKills": 15,
          "totalDeaths": 8,
          "totalGames": 5
        },
        "lastLoginAt": "2025-06-12T10:00:00Z",
        "createdAt": "2025-01-20T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 150,
      "totalPages": 15,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

#### GET /api/user/database/info
?�이?�베?�스 ?�보 조회

**Request:**
```http
GET /api/user/database/info
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "activeUsers": 120,
    "guestUsers": 30,
    "registeredUsers": 120,
    "databaseStatus": "connected",
    "lastBackup": "2025-06-12T06:00:00Z",
    "statistics": {
      "newUsersToday": 5,
      "activeUsersToday": 45,
      "totalGamesPlayed": 1250,
      "averageSessionTime": 1800
    }
  }
}
```

## ?�� Game Service API

**Base URL**: `http://localhost:3001/api/`  
**Direct Port**: 3001

### ?�� 게임 ?�태 API (?�증 불필??

#### GET /api/status
게임 ?�버 ?�태 조회

**Request:**
```http
GET /api/status
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "running",
    "uptime": 3600,
    "version": "4.0.0",
    "players": {
      "online": 15,
      "inGame": 12,
      "waiting": 3
    },
    "gameState": {
      "vehicles": 12,
      "projectiles": 45,
      "explosions": 3
    },
    "performance": {
      "fps": 60,
      "memoryUsage": "45.2 MB",
      "cpuUsage": "25%"
    },
    "lastRestart": "2025-06-12T08:00:00Z"
  }
}
```

## ?�� WebSocket ?�벤??

**Connection URL**: `ws://localhost/socket.io/`  
**Authentication**: JWT Token required

### ?�결 ?�정

```javascript
const socket = io('http://localhost', {
  auth: { token: 'your_jwt_token_here' }
});
```

### ?�라?�언?????�버 ?�벤??

#### `join-game`
게임 참여 ?�청

**Payload:**
```json
{
  "vehicleType": "fighter",
  "username": "player123"
}
```

**Response Events:**
- `game-joined`: 게임 참여 ?�공
- `error`: 참여 ?�패

---

#### `player-input`
?�레?�어 ?�력 ?�송 (60fps)

**Payload:**
```json
{
  "keys": {
    "w": true,
    "a": false,
    "s": false,
    "d": true,
    "shift": false,
    "ctrl": false,
    "space": false,
    "x": false
  },
  "mouseX": 0.5,
  "mouseY": 0.3,
  "timestamp": 1706176800000
}
```

---

#### `fire-weapon`
무기 발사

**Payload:**
```json
{
  "position": {
    "x": 10.5,
    "y": 5.2,
    "z": 20.8
  },
  "direction": {
    "x": 0.0,
    "y": 0.1,
    "z": 1.0
  },
  "timestamp": 1706176800000
}
```

---

#### `leave-game`
게임 ?�장

**Payload:**
```json
{}
```

### ?�버 ???�라?�언???�벤??

#### `game-state`
게임 ?�태 ?�기??(60fps)

**Payload:**
```json
{
  "vehicles": [
    {
      "id": "vehicle_123",
      "playerId": "player_456",
      "username": "testuser",
      "vehicleType": "fighter",
      "position": {
        "x": 10.5,
        "y": 5.2,
        "z": 20.8
      },
      "rotation": {
        "x": 0.1,
        "y": 0.5,
        "z": 0.0
      },
      "velocity": {
        "x": 2.5,
        "y": 0.0,
        "z": 5.0
      },
      "health": 35,
      "maxHealth": 40,
      "isDestroyed": false,
      "lastFireTime": 1706176800000
    }
  ],
  "projectiles": [
    {
      "id": "bullet_789",
      "position": {
        "x": 15.2,
        "y": 5.5,
        "z": 25.3
      },
      "direction": {
        "x": 0.0,
        "y": 0.1,
        "z": 1.0
      },
      "playerId": "player_456",
      "speed": 200,
      "damage": 10
    }
  ],
  "timestamp": 1706176800000
}
```

---

#### `player-joined`
?�레?�어 참여 ?�림

**Payload:**
```json
{
  "playerId": "player_789",
  "username": "newPlayer",
  "vehicleType": "heavy",
  "position": {
    "x": 0,
    "y": 0,
    "z": 0
  }
}
```

---

#### `player-left`
?�레?�어 ?�장 ?�림

**Payload:**
```json
{
  "playerId": "player_456",
  "username": "leftPlayer",
  "reason": "disconnect"
}
```

---

#### `vehicle-destroyed`
차량 ?�괴 ?�림

**Payload:**
```json
{
  "vehicleId": "vehicle_123",
  "playerId": "player_456",
  "killerPlayerId": "player_789",
  "position": {
    "x": 10.5,
    "y": 5.2,
    "z": 20.8
  },
  "respawnTime": 5000
}
```

---

#### `explosion-created`
??�� ?�과 ?�성

**Payload:**
```json
{
  "id": "explosion_456",
  "position": {
    "x": 10.5,
    "y": 5.2,
    "z": 20.8
  },
  "size": "large",
  "type": "vehicle-destruction",
  "duration": 2000
}
```

---

#### `game-joined`
게임 참여 ?�공

**Payload:**
```json
{
  "playerId": "player_456",
  "vehicleId": "vehicle_123",
  "gameState": {
    // ?�재 게임 ?�태
  }
}
```

---

#### `error`
?�러 발생

**Payload:**
```json
{
  "code": "INVALID_VEHICLE_TYPE",
  "message": "Invalid vehicle type specified",
  "details": "Available types: fighter, heavy, test"
}
```

## ???�러 처리

### HTTP ?�태 코드

| 코드 | ?��? | ?�명 |
|------|------|------|
| 200 | OK | ?�청 ?�공 |
| 201 | Created | 리소???�성 ?�공 |
| 400 | Bad Request | ?�못???�청 |
| 401 | Unauthorized | ?�증 ?�패 |
| 403 | Forbidden | 권한 ?�음 |
| 404 | Not Found | 리소???�음 |
| 409 | Conflict | 리소??충돌 |
| 429 | Too Many Requests | Rate limit 초과 |
| 500 | Internal Server Error | ?�버 ?�류 |

### ?�러 코드

#### User Service ?�러

| 코드 | ?�명 |
|------|------|
| `USER_NOT_FOUND` | ?�용?��? 찾을 ???�음 |
| `INVALID_CREDENTIALS` | ?�못???�증 ?�보 |
| `USERNAME_TAKEN` | ?�용?�명 ?��? ?�용 �?|
| `EMAIL_TAKEN` | ?�메???��? ?�용 �?|
| `INVALID_TOKEN` | ?�효?��? ?��? JWT ?�큰 |
| `TOKEN_EXPIRED` | 만료??JWT ?�큰 |
| `VALIDATION_ERROR` | ?�력 ?�이??검�??�패 |
| `DATABASE_ERROR` | ?�이?�베?�스 ?�류 |

#### Game Service ?�러

| 코드 | ?�명 |
|------|------|
| `AUTHENTICATION_ERROR` | WebSocket ?�증 ?�패 |
| `INVALID_VEHICLE_TYPE` | ?�효?��? ?��? 차량 ?�??|
| `GAME_FULL` | 게임 ?�버 만원 |
| `PLAYER_NOT_FOUND` | ?�레?�어�?찾을 ???�음 |
| `INVALID_INPUT` | ?�효?��? ?��? ?�력 |
| `FIRE_RATE_EXCEEDED` | 발사 ?�도 ?�한 초과 |
| `SERVER_ERROR` | 게임 ?�버 ?�류 |

### ?�러 ?�답 ?�시

#### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "username": "Username must be at least 3 characters long",
      "email": "Invalid email format"
    }
  },
  "timestamp": "2025-06-12T10:00:00Z"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid or expired JWT token",
    "details": "Token signature verification failed"
  },
  "timestamp": "2025-06-12T10:00:00Z"
}
```

#### 429 Too Many Requests
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "details": "Rate limit: 1000 requests per 15 minutes",
    "retryAfter": 300
  },
  "timestamp": "2025-06-12T10:00:00Z"
}
```

## ?�� Rate Limiting

### User Service Rate Limits

| ?�드?�인??| ?�한 | ?�도??|
|------------|------|--------|
| `/api/auth/*` | 100 requests | 15�?|
| `/api/user/*` | 1000 requests | 15�?|
| ?�체 | 1000 requests | 15�?|

### Game Service Rate Limits

| ?�벤??| ?�한 | ?�명 |
|--------|------|------|
| `player-input` | 60 events/sec | 게임 ?�력 |
| `fire-weapon` | 차량�??�한 | 무기 발사 ?�도 |
| WebSocket ?�결 | 10 connections/min | ?�결 ?�도 |

### Rate Limit ?�더

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1706177700
```

## ?�� API ?�스??

### cURL ?�시

#### ?�원가??
```bash
curl -X POST http://localhost/api/auth/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### 로그??
```bash
curl -X POST http://localhost/api/auth/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

#### ?�로??조회
```bash
curl -X GET http://localhost/api/user/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 게임 ?�버 ?�태
```bash
curl -X GET http://localhost:3001/api/status
```

### JavaScript ?�시

#### API ?�라?�언??
```javascript
class GameAPI {
  constructor(baseURL = 'http://localhost') {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('jwt_token');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` })
      },
      ...options
    };

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'API request failed');
    }

    return data;
  }

  // ?�증 API
  async register(username, email, password) {
    const data = await this.request('/api/auth/users/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
    
    this.token = data.data.token;
    localStorage.setItem('jwt_token', this.token);
    return data;
  }

  async login(username, password) {
    const data = await this.request('/api/auth/users/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    
    this.token = data.data.token;
    localStorage.setItem('jwt_token', this.token);
    return data;
  }

  async createGuest() {
    const data = await this.request('/api/auth/users/guest', {
      method: 'POST'
    });
    
    this.token = data.data.token;
    localStorage.setItem('jwt_token', this.token);
    return data;
  }

  // ?�용??API
  async getProfile() {
    return this.request('/api/user/users/profile');
  }

  async updateVehicleSettings(settings) {
    return this.request('/api/user/users/vehicle-settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }

  async updateGameStats(stats) {
    return this.request('/api/user/users/game-stats', {
      method: 'POST',
      body: JSON.stringify(stats)
    });
  }

  // 게임 API
  async getGameStatus() {
    return this.request(':3001/api/status');
  }
}
```

#### WebSocket ?�라?�언??
```javascript
class GameSocket {
  constructor(token) {
    this.socket = io('http://localhost', {
      auth: { token }
    });
    
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('Connected to game server');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    this.socket.on('game-state', (gameState) => {
      this.updateGameState(gameState);
    });

    this.socket.on('player-joined', (player) => {
      console.log('Player joined:', player.username);
    });

    this.socket.on('player-left', (player) => {
      console.log('Player left:', player.username);
    });

    this.socket.on('vehicle-destroyed', (event) => {
      this.handleVehicleDestroyed(event);
    });

    this.socket.on('explosion-created', (explosion) => {
      this.createExplosion(explosion);
    });
  }

  joinGame(vehicleType, username) {
    this.socket.emit('join-game', {
      vehicleType,
      username
    });
  }

  sendInput(keys, mouseX, mouseY) {
    this.socket.emit('player-input', {
      keys,
      mouseX,
      mouseY,
      timestamp: Date.now()
    });
  }

  fireWeapon(position, direction) {
    this.socket.emit('fire-weapon', {
      position,
      direction,
      timestamp: Date.now()
    });
  }

  leaveGame() {
    this.socket.emit('leave-game');
  }

  disconnect() {
    this.socket.disconnect();
  }
}
```

### ?�스???�나리오

#### 1. ?�용???�록 �?로그???�로??
```javascript
async function testUserFlow() {
  const api = new GameAPI();
  
  try {
    // 1. ?�원가??
    const registerResult = await api.register(
      'testuser',
      'test@example.com',
      'password123'
    );
    console.log('Registration successful:', registerResult);
    
---

**?�� 문서 버전 관�?*

- v3.0: 마이?�로?�비??API 문서??
- v2.x: 모�?리식 API 문서
- v1.x: 초기 API 문서

**?�� ?�데?�트 주기**: API 변�???즉시 ?�데?�트 
