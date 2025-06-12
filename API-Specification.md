# SPA Game Application - API 명세서

## 🔐 JWT 토큰 기반 인증 시스템

### 아키텍처 개요
```
Client (SPA) → Nginx (포트 80) → User Service (포트 3002) / Game Service (포트 3001)
```

## 📋 API 엔드포인트

### 1. 인증 API (토큰 불필요)

#### 1.1 사용자 로그인
```http
POST /api/auth/login
```

**요청 헤더:**
```
Content-Type: application/json
```

**요청 본문:**
```json
{
  "username": "testuser1",
  "password": "password123"
}
```

**응답 (성공 - 200):**
```json
{
  "success": true,
  "message": "로그인 성공",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "testuser1",
    "email": "testuser1@example.com"
  }
}
```

**응답 (실패 - 401):**
```json
{
  "success": false,
  "message": "잘못된 사용자명 또는 비밀번호"
}
```

#### 1.2 사용자 회원가입
```http
POST /api/auth/register
```

**요청 본문:**
```json
{
  "username": "newuser",
  "password": "password123",
  "email": "newuser@example.com"
}
```

**응답 (성공 - 201):**
```json
{
  "success": true,
  "message": "회원가입 성공",
  "user": {
    "id": 2,
    "username": "newuser",
    "email": "newuser@example.com"
  }
}
```

### 2. 사용자 API (JWT 토큰 필요)

#### 2.1 사용자 프로필 조회
```http
GET /api/user/profile
```

**요청 헤더:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**응답 (성공 - 200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "testuser1",
    "email": "testuser1@example.com",
    "created_at": "2024-01-01T00:00:00Z",
    "last_login": "2024-01-15T10:30:00Z"
  }
}
```

#### 2.2 사용자 정보 수정
```http
PUT /api/user/profile
```

**요청 헤더:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**요청 본문:**
```json
{
  "email": "newemail@example.com"
}
```

### 3. 게임 API (JWT 토큰 필요)

#### 3.1 게임 데이터 조회
```http
GET /api/game/data
```

**요청 헤더:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**응답 (성공 - 200):**
```json
{
  "success": true,
  "gameData": {
    "level": 5,
    "score": 1250,
    "achievements": ["first_win", "level_5"],
    "inventory": [
      {"item": "sword", "quantity": 1},
      {"item": "potion", "quantity": 3}
    ]
  }
}
```

#### 3.2 게임 상태 저장
```http
POST /api/game/save
```

**요청 헤더:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**요청 본문:**
```json
{
  "level": 6,
  "score": 1350,
  "position": {"x": 100, "y": 200}
}
```

#### 3.3 게임 순위 조회
```http
GET /api/game/leaderboard
```

**응답 (성공 - 200):**
```json
{
  "success": true,
  "leaderboard": [
    {"rank": 1, "username": "player1", "score": 2500},
    {"rank": 2, "username": "player2", "score": 2200},
    {"rank": 3, "username": "testuser1", "score": 1250}
  ]
}
```

### 4. 내부 인증 API (Nginx 전용)

#### 4.1 토큰 검증
```http
GET /verify-token
```

**요청 헤더:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Original-URI: /api/game/data
```

**응답 (성공 - 200):**
```
HTTP/1.1 200 OK
X-User-ID: 1
X-Username: testuser1
```

**응답 (실패 - 401):**
```
HTTP/1.1 401 Unauthorized
```

## 🔒 인증 흐름

### 1. 로그인 프로세스
```mermaid
sequenceDiagram
    participant C as Client (SPA)
    participant N as Nginx
    participant U as User Service
    
    C->>N: POST /api/auth/login
    N->>U: POST /login
    U->>U: 사용자 인증
    U->>U: JWT 토큰 생성
    U->>N: 200 + JWT 토큰
    N->>C: 200 + JWT 토큰
    C->>C: 토큰을 localStorage에 저장
```

### 2. 인증된 API 호출
```mermaid
sequenceDiagram
    participant C as Client (SPA)
    participant N as Nginx
    participant U as User Service
    participant G as Game Service
    
    C->>N: GET /api/game/data + JWT
    N->>U: GET /verify-token + JWT
    U->>U: 토큰 검증
    U->>N: 200 + 사용자 정보
    N->>G: GET /data + 사용자 정보
    G->>N: 200 + 게임 데이터
    N->>C: 200 + 게임 데이터
```

## 🛡️ 보안 고려사항

### JWT 토큰
- **알고리즘**: HS256 (HMAC SHA-256)
- **만료시간**: 24시간 (권장)
- **저장위치**: localStorage (개발용), httpOnly Cookie (프로덕션 권장)

### CORS 설정
- **개발환경**: 모든 도메인 허용 (`*`)
- **프로덕션**: 특정 도메인만 허용

### 헤더 전달
Nginx에서 백엔드 서비스로 전달되는 헤더:
- `X-User-ID`: 인증된 사용자 ID
- `X-Username`: 인증된 사용자명
- `Authorization`: 원본 JWT 토큰
- `X-Real-IP`: 클라이언트 실제 IP
- `X-Forwarded-For`: 프록시 체인 정보

## 🚀 사용 방법

### 1. 클라이언트 측 토큰 관리
```javascript
// 토큰 저장
localStorage.setItem('authToken', token);

// API 호출 시 토큰 포함
fetch('/api/game/data', {
    headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('authToken')
    }
});

// 토큰 만료 시 처리
if (response.status === 401) {
    localStorage.removeItem('authToken');
    // 로그인 페이지로 리다이렉트
}
```

### 2. 서버 측 토큰 검증 (User Service)
```javascript
// JWT 토큰 검증 예제
const jwt = require('jsonwebtoken');

app.get('/verify-token', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.set('X-User-ID', decoded.userId);
        res.set('X-Username', decoded.username);
        res.status(200).send('OK');
    } catch (error) {
        res.status(401).send('Unauthorized');
    }
});
```

### 3. 게임 서비스에서 사용자 정보 활용
```javascript
// Game Service에서 Nginx가 전달한 사용자 정보 사용
app.get('/data', (req, res) => {
    const userId = req.headers['x-user-id'];
    const username = req.headers['x-username'];
    
    // 사용자별 게임 데이터 조회
    const gameData = getGameDataByUserId(userId);
    res.json({ success: true, gameData });
});
```

## 📁 파일 구조
```
C:\nginx\html\
├── index.html (SPA 메인 페이지)
├── spa-auth-example.html (인증 예제)
├── static/
│   ├── css/
│   ├── js/
│   └── images/
└── ...
``` 