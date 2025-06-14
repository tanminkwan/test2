# ? API ๋ฌธ์

**Version:** v4.0  
**Last Updated:** 2025-06-12  
**Architecture:** Independent Microservices with JWT Authentication

## ? ๋ชฉ์ฐจ

1. [API ๊ฐ์](#api-๊ฐ์)
2. [?ธ์ฆ ?์ค??(#?ธ์ฆ-?์ค??
3. [User Service API](#user-service-api)
4. [Game Service API](#game-service-api)
5. [WebSocket ?ด๋ฒค??(#websocket-?ด๋ฒค??
6. [?๋ฌ ์ฒ๋ฆฌ](#?๋ฌ-์ฒ๋ฆฌ)
7. [Rate Limiting](#rate-limiting)
8. [API ?์ค??(#api-?์ค??

## ?ฏ API ๊ฐ์

### ๋ง์ด?ฌ๋ก?๋น??๊ตฌ์กฐ

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

### API ?ผ์ฐ??๊ท์น

| ๊ฒฝ๋ก | ????๋น??| ?ธ์ฆ ?์ | ?ค๋ช |
|------|-------------|-----------|------|
| `/api/auth/*` | User Service | ??| ?ธ์ฆ ๊ด??API |
| `/api/user/*` | User Service | ??| ?ฌ์ฉ??๊ด๋ฆ?API |
| `/socket.io/*` | Game Service | ??| WebSocket ?ฐ๊ฒฐ |
| `/api/status` | Game Service | ??| ๊ฒ์ ?๋ฒ ?ํ |

### ๊ณตํต ?๋ต ?์

#### ?ฑ๊ณต ?๋ต
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // ?๋ต ?ฐ์ด??
  },
  "timestamp": "2025-06-12T10:00:00Z"
}
```

#### ?๋ฌ ?๋ต
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

## ? ?ธ์ฆ ?์ค??

### JWT ? ํฐ ๊ตฌ์กฐ

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

### ?ธ์ฆ ?ค๋ ?์

```http
Authorization: Bearer <jwt_token>
```

### ? ํฐ ๋ง๋ฃ ?๊ฐ

- **๊ธฐ๋ณธ**: 24?๊ฐ
- **๊ฒ์ค??*: 24?๊ฐ (?ธ์ ์ข๋ฃ ???? )
- **?ฑ๋ก ?ฌ์ฉ??*: 24?๊ฐ (๊ฐฑ์  ๊ฐ??

## ?ค User Service API

**Base URL**: `http://localhost/api/`  
**Port**: 3002 (nginx๋ฅ??ตํด ?ผ์ฐ??

### ? ?ธ์ฆ API (?ธ์ฆ ๋ถํ??

#### POST /api/auth/users/register
?ฌ์ฉ???์๊ฐ??

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
- `username`: 3-50?? ?๋ฌธ/?ซ์/?ธ๋?ค์ฝ?ด๋ง ?์ฉ
- `email`: ? ํจ???ด๋ฉ???์
- `password`: ์ต์ 6???ด์

---

#### POST /api/auth/users/login
?ฌ์ฉ??๋ก๊ทธ??

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
๊ฒ์ค??๊ณ์  ?์ฑ

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
JWT ? ํฐ ๊ฒ์ฆ?(nginx ?ด๋? ?ฌ์ฉ)

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

### ? ?ฌ์ฉ??๊ด๋ฆ?API (?ธ์ฆ ?์)

#### GET /api/user/users/profile
?ฌ์ฉ???๋ก??์กฐํ

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
์ฐจ๋ ?ค์  ?๋ฐ?ดํธ

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
- `fighter`: ๊ท ํ?กํ ?ํฌ๊ธ?
- `heavy`: ์คํ ?ํฌ๊ธ?
- `test`: ?์ค?ธ์ฉ ?ํฌ๊ธ?

---

#### POST /api/user/users/game-stats
๊ฒ์ ?ต๊ณ ?๋ฐ?ดํธ

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
?ฌ์ฉ??๋ชฉ๋ก ์กฐํ (๊ด๋ฆฌ์??

**Request:**
```http
GET /api/user/users/list?page=1&limit=10&search=test
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `page`: ?์ด์ง ๋ฒํธ (๊ธฐ๋ณธ๊ฐ? 1)
- `limit`: ?์ด์ง????ชฉ ??(๊ธฐ๋ณธ๊ฐ? 10, ์ต๋?: 100)
- `search`: ๊ฒ?์ด (?ฌ์ฉ?๋ช ?๋ ?ด๋ฉ??
- `isGuest`: ๊ฒ์ค???ํฐ (true/false)
- `isActive`: ?์ฑ ?ํ ?ํฐ (true/false)

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
?ฐ์ด?ฐ๋ฒ ?ด์ค ?๋ณด ์กฐํ

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

## ?ฎ Game Service API

**Base URL**: `http://localhost:3001/api/`  
**Direct Port**: 3001

### ? ๊ฒ์ ?ํ API (?ธ์ฆ ๋ถํ??

#### GET /api/status
๊ฒ์ ?๋ฒ ?ํ ์กฐํ

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

## ? WebSocket ?ด๋ฒค??

**Connection URL**: `ws://localhost/socket.io/`  
**Authentication**: JWT Token required

### ?ฐ๊ฒฐ ?ค์ 

```javascript
const socket = io('http://localhost', {
  auth: { token: 'your_jwt_token_here' }
});
```

### ?ด๋ผ?ด์ธ?????๋ฒ ?ด๋ฒค??

#### `join-game`
๊ฒ์ ์ฐธ์ฌ ?์ฒญ

**Payload:**
```json
{
  "vehicleType": "fighter",
  "username": "player123"
}
```

**Response Events:**
- `game-joined`: ๊ฒ์ ์ฐธ์ฌ ?ฑ๊ณต
- `error`: ์ฐธ์ฌ ?คํจ

---

#### `player-input`
?๋ ?ด์ด ?๋ ฅ ?์ก (60fps)

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
๋ฌด๊ธฐ ๋ฐ์ฌ

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
๊ฒ์ ?ด์ฅ

**Payload:**
```json
{}
```

### ?๋ฒ ???ด๋ผ?ด์ธ???ด๋ฒค??

#### `game-state`
๊ฒ์ ?ํ ?๊ธฐ??(60fps)

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
?๋ ?ด์ด ์ฐธ์ฌ ?๋ฆผ

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
?๋ ?ด์ด ?ด์ฅ ?๋ฆผ

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
์ฐจ๋ ?๊ดด ?๋ฆผ

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
??ฐ ?จ๊ณผ ?์ฑ

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
๊ฒ์ ์ฐธ์ฌ ?ฑ๊ณต

**Payload:**
```json
{
  "playerId": "player_456",
  "vehicleId": "vehicle_123",
  "gameState": {
    // ?์ฌ ๊ฒ์ ?ํ
  }
}
```

---

#### `error`
?๋ฌ ๋ฐ์

**Payload:**
```json
{
  "code": "INVALID_VEHICLE_TYPE",
  "message": "Invalid vehicle type specified",
  "details": "Available types: fighter, heavy, test"
}
```

## ???๋ฌ ์ฒ๋ฆฌ

### HTTP ?ํ ์ฝ๋

| ์ฝ๋ | ?๋? | ?ค๋ช |
|------|------|------|
| 200 | OK | ?์ฒญ ?ฑ๊ณต |
| 201 | Created | ๋ฆฌ์???์ฑ ?ฑ๊ณต |
| 400 | Bad Request | ?๋ชป???์ฒญ |
| 401 | Unauthorized | ?ธ์ฆ ?คํจ |
| 403 | Forbidden | ๊ถํ ?์ |
| 404 | Not Found | ๋ฆฌ์???์ |
| 409 | Conflict | ๋ฆฌ์??์ถฉ๋ |
| 429 | Too Many Requests | Rate limit ์ด๊ณผ |
| 500 | Internal Server Error | ?๋ฒ ?ค๋ฅ |

### ?๋ฌ ์ฝ๋

#### User Service ?๋ฌ

| ์ฝ๋ | ?ค๋ช |
|------|------|
| `USER_NOT_FOUND` | ?ฌ์ฉ?๋? ์ฐพ์ ???์ |
| `INVALID_CREDENTIALS` | ?๋ชป???ธ์ฆ ?๋ณด |
| `USERNAME_TAKEN` | ?ฌ์ฉ?๋ช ?ด๋? ?ฌ์ฉ ์ค?|
| `EMAIL_TAKEN` | ?ด๋ฉ???ด๋? ?ฌ์ฉ ์ค?|
| `INVALID_TOKEN` | ? ํจ?์? ?์? JWT ? ํฐ |
| `TOKEN_EXPIRED` | ๋ง๋ฃ??JWT ? ํฐ |
| `VALIDATION_ERROR` | ?๋ ฅ ?ฐ์ด??๊ฒ์ฆ??คํจ |
| `DATABASE_ERROR` | ?ฐ์ด?ฐ๋ฒ ?ด์ค ?ค๋ฅ |

#### Game Service ?๋ฌ

| ์ฝ๋ | ?ค๋ช |
|------|------|
| `AUTHENTICATION_ERROR` | WebSocket ?ธ์ฆ ?คํจ |
| `INVALID_VEHICLE_TYPE` | ? ํจ?์? ?์? ์ฐจ๋ ???|
| `GAME_FULL` | ๊ฒ์ ?๋ฒ ๋ง์ |
| `PLAYER_NOT_FOUND` | ?๋ ?ด์ด๋ฅ?์ฐพ์ ???์ |
| `INVALID_INPUT` | ? ํจ?์? ?์? ?๋ ฅ |
| `FIRE_RATE_EXCEEDED` | ๋ฐ์ฌ ?๋ ?ํ ์ด๊ณผ |
| `SERVER_ERROR` | ๊ฒ์ ?๋ฒ ?ค๋ฅ |

### ?๋ฌ ?๋ต ?์

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

## ?ฆ Rate Limiting

### User Service Rate Limits

| ?๋?ฌ์ธ??| ?ํ | ?๋??|
|------------|------|--------|
| `/api/auth/*` | 100 requests | 15๋ถ?|
| `/api/user/*` | 1000 requests | 15๋ถ?|
| ?์ฒด | 1000 requests | 15๋ถ?|

### Game Service Rate Limits

| ?ด๋ฒค??| ?ํ | ?ค๋ช |
|--------|------|------|
| `player-input` | 60 events/sec | ๊ฒ์ ?๋ ฅ |
| `fire-weapon` | ์ฐจ๋๋ณ??ํ | ๋ฌด๊ธฐ ๋ฐ์ฌ ?๋ |
| WebSocket ?ฐ๊ฒฐ | 10 connections/min | ?ฐ๊ฒฐ ?๋ |

### Rate Limit ?ค๋

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1706177700
```

## ?งช API ?์ค??

### cURL ?์

#### ?์๊ฐ??
```bash
curl -X POST http://localhost/api/auth/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### ๋ก๊ทธ??
```bash
curl -X POST http://localhost/api/auth/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

#### ?๋ก??์กฐํ
```bash
curl -X GET http://localhost/api/user/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### ๊ฒ์ ?๋ฒ ?ํ
```bash
curl -X GET http://localhost:3001/api/status
```

### JavaScript ?์

#### API ?ด๋ผ?ด์ธ??
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

  // ?ธ์ฆ API
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

  // ?ฌ์ฉ??API
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

  // ๊ฒ์ API
  async getGameStatus() {
    return this.request(':3001/api/status');
  }
}
```

#### WebSocket ?ด๋ผ?ด์ธ??
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

### ?์ค???๋๋ฆฌ์ค

#### 1. ?ฌ์ฉ???ฑ๋ก ๋ฐ?๋ก๊ทธ???๋ก??
```javascript
async function testUserFlow() {
  const api = new GameAPI();
  
  try {
    // 1. ?์๊ฐ??
    const registerResult = await api.register(
      'testuser',
      'test@example.com',
      'password123'
    );
    console.log('Registration successful:', registerResult);
    
---

**? ๋ฌธ์ ๋ฒ์  ๊ด๋ฆ?*

- v3.0: ๋ง์ด?ฌ๋ก?๋น??API ๋ฌธ์??
- v2.x: ๋ชจ๋?๋ฆฌ์ API ๋ฌธ์
- v1.x: ์ด๊ธฐ API ๋ฌธ์

**? ?๋ฐ?ดํธ ์ฃผ๊ธฐ**: API ๋ณ๊ฒ???์ฆ์ ?๋ฐ?ดํธ 
