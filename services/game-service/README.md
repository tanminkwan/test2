# 🎮 Game Service

**Version:** v4.0  
**Port:** 3001  
**Database:** In-Memory  
**Architecture:** Independent Microservice

## 📖 서비스 개요

Game Service는 실시간 멀티플레이어 게임 로직을 담당하는 독립적인 마이크로서비스입니다. WebSocket 기반 실시간 통신과 3D 물리 시뮬레이션을 통해 몰입감 있는 비행체 전투 게임을 제공합니다.

## 🎯 주요 기능

### 🚁 게임 로직
- **실시간 멀티플레이어**: Socket.IO 기반 실시간 동기화
- **3가지 비행체 타입**: Fighter, Heavy, Test 각각 다른 특성
- **물리 기반 비행**: 현실적인 비행 역학 시뮬레이션
- **무기 시스템**: 머신건 기반 전투 시스템
- **폭발 효과**: 피격 시 작은 폭발, 파괴 시 대형 폭발

### 🎲 게임 시스템
- **점수 시스템**: 킬/데스 통계 및 점수 집계
- **자동 리스폰**: 5초 후 자동 부활
- **충돌 감지**: 정밀한 3D 충돌 감지 시스템
- **게임 상태 동기화**: 60fps 실시간 상태 업데이트

### 🔐 보안 시스템
- **JWT 인증**: WebSocket 연결 시 토큰 검증
- **입력 검증**: 클라이언트 입력 데이터 검증
- **치트 방지**: 서버 사이드 게임 로직 검증

## 🏗️ 기술 스택

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.4",
    "jsonwebtoken": "^9.0.2",
    "yaml": "^2.3.4",
    "uuid": "^9.0.1",
    "axios": "^1.6.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

## 🚀 빠른 시작

### 1. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 입력하세요:

```env
# 서버 설정
NODE_ENV=development
PORT=3001

# JWT 설정 (User Service와 동일해야 함)
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
```

### 2. 의존성 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 모드 실행
npm run dev

# 프로덕션 모드 실행
npm start
```

### 3. 서비스 상태 확인

```bash
# 서버 상태 확인
curl http://localhost:3001/api/status
```

## 🎮 게임 엔티티

### 비행체 타입별 특성

#### ⚡ Fighter (전투기)
```javascript
{
  health: 40,
  maxSpeed: 120,
  fireRate: 100,  // ms
  engineCount: 1,
  engineColor: 0x0088ff,  // 파란색
  description: "균형잡힌 성능의 표준 전투기"
}
```

#### 🛡️ Heavy (중형기)
```javascript
{
  health: 60,
  maxSpeed: 80,
  fireRate: 150,  // ms
  engineCount: 2,
  engineColor: 0xff4400,  // 주황색
  description: "높은 내구성, 느린 기동성"
}
```

#### 🧪 Test (테스트기)
```javascript
{
  health: 20,
  maxSpeed: 100,
  fireRate: 80,   // ms
  engineCount: 1,
  engineColor: 0x00ff00,  // 녹색
  description: "빠른 테스트용, 높은 기동성"
}
```

### 게임 오브젝트

#### Vehicle (비행체)
```javascript
class Vehicle {
  constructor(id, playerId, position, config) {
    this.id = id;
    this.playerId = playerId;
    this.position = position;
    this.velocity = { x: 0, y: 0, z: 0 };
    this.rotation = { x: 0, y: 0, z: 0 };
    this.health = config.health;
    this.maxHealth = config.health;
    this.maxSpeed = config.maxSpeed;
    this.fireRate = config.fireRate;
    this.lastFireTime = 0;
    this.isDestroyed = false;
    this.respawnTime = null;
  }
}
```

#### Projectile (발사체)
```javascript
class Projectile {
  constructor(id, position, direction, playerId) {
    this.id = id;
    this.position = position;
    this.direction = direction;
    this.playerId = playerId;
    this.speed = 200;
    this.damage = 10;
    this.lifetime = 3000; // 3초
    this.createdAt = Date.now();
  }
}
```

## 🔄 WebSocket 이벤트

### 클라이언트 → 서버

#### `join-game`
게임 참여 요청
```javascript
socket.emit('join-game', {
  token: 'jwt_token',
  vehicleType: 'fighter',
  username: 'player123'
});
```

#### `player-input`
플레이어 입력 전송
```javascript
socket.emit('player-input', {
  keys: {
    w: true,
    a: false,
    s: false,
    d: true,
    shift: false,
    ctrl: false,
    space: false,
    x: false
  },
  mouseX: 0.5,
  mouseY: 0.3
});
```

#### `fire-weapon`
무기 발사
```javascript
socket.emit('fire-weapon', {
  position: { x: 0, y: 0, z: 0 },
  direction: { x: 0, y: 0, z: 1 }
});
```

### 서버 → 클라이언트

#### `game-state`
게임 상태 동기화 (60fps)
```javascript
socket.emit('game-state', {
  vehicles: [
    {
      id: 'vehicle_123',
      playerId: 'player_456',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      health: 40,
      maxHealth: 40,
      isDestroyed: false
    }
  ],
  projectiles: [
    {
      id: 'bullet_789',
      position: { x: 10, y: 5, z: 20 },
      direction: { x: 0, y: 0, z: 1 },
      playerId: 'player_456'
    }
  ]
});
```

#### `player-joined`
플레이어 참여 알림
```javascript
socket.broadcast.emit('player-joined', {
  playerId: 'player_456',
  username: 'newPlayer',
  vehicleType: 'fighter'
});
```

#### `player-left`
플레이어 퇴장 알림
```javascript
socket.broadcast.emit('player-left', {
  playerId: 'player_456',
  username: 'leftPlayer'
});
```

#### `vehicle-destroyed`
차량 파괴 알림
```javascript
socket.emit('vehicle-destroyed', {
  vehicleId: 'vehicle_123',
  playerId: 'player_456',
  killerPlayerId: 'player_789',
  position: { x: 0, y: 0, z: 0 }
});
```

#### `explosion-created`
폭발 효과 생성
```javascript
socket.emit('explosion-created', {
  position: { x: 0, y: 0, z: 0 },
  size: 'large', // 'small' | 'large'
  type: 'vehicle-destruction'
});
```

## 🎯 게임 로직

### 물리 시뮬레이션

#### 비행 역학
```javascript
// 추력 계산
const thrust = input.shift ? maxSpeed * 1.5 : maxSpeed;
const drag = 0.95; // 공기 저항

// 속도 업데이트
velocity.x += (input.a ? -thrust : 0) + (input.d ? thrust : 0);
velocity.y += (input.space ? thrust : 0) + (input.x ? -thrust : 0);
velocity.z += (input.w ? thrust : 0) + (input.s ? -thrust : 0);

// 저항 적용
velocity.x *= drag;
velocity.y *= drag;
velocity.z *= drag;

// 위치 업데이트
position.x += velocity.x * deltaTime;
position.y += velocity.y * deltaTime;
position.z += velocity.z * deltaTime;
```

#### 충돌 감지
```javascript
function checkCollision(projectile, vehicle) {
  const distance = Math.sqrt(
    Math.pow(projectile.position.x - vehicle.position.x, 2) +
    Math.pow(projectile.position.y - vehicle.position.y, 2) +
    Math.pow(projectile.position.z - vehicle.position.z, 2)
  );
  
  return distance < COLLISION_RADIUS; // 5 units
}
```

### 게임 루프

```javascript
class GameManager {
  constructor() {
    this.players = new Map();
    this.vehicles = new Map();
    this.projectiles = new Map();
    this.gameLoop = null;
    this.tickRate = 60; // 60 FPS
  }

  startGameLoop() {
    this.gameLoop = setInterval(() => {
      this.updatePhysics();
      this.checkCollisions();
      this.updateProjectiles();
      this.broadcastGameState();
    }, 1000 / this.tickRate);
  }

  updatePhysics() {
    for (const vehicle of this.vehicles.values()) {
      if (!vehicle.isDestroyed) {
        this.updateVehiclePhysics(vehicle);
      }
    }
  }

  checkCollisions() {
    for (const projectile of this.projectiles.values()) {
      for (const vehicle of this.vehicles.values()) {
        if (this.checkProjectileVehicleCollision(projectile, vehicle)) {
          this.handleHit(projectile, vehicle);
        }
      }
    }
  }
}
```

## 🔐 보안 시스템

### JWT 토큰 검증

```javascript
// WebSocket 연결 시 토큰 검증
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});
```

### 입력 검증

```javascript
function validatePlayerInput(input) {
  // 키 입력 검증
  const validKeys = ['w', 'a', 's', 'd', 'shift', 'ctrl', 'space', 'x'];
  for (const key of Object.keys(input.keys)) {
    if (!validKeys.includes(key)) {
      return false;
    }
  }
  
  // 마우스 입력 범위 검증
  if (input.mouseX < -1 || input.mouseX > 1 || 
      input.mouseY < -1 || input.mouseY > 1) {
    return false;
  }
  
  return true;
}
```

### 치트 방지

```javascript
function validateFireRate(playerId, currentTime) {
  const player = this.players.get(playerId);
  const vehicle = this.vehicles.get(player.vehicleId);
  
  if (currentTime - vehicle.lastFireTime < vehicle.fireRate) {
    // 발사 속도 제한 위반
    return false;
  }
  
  return true;
}
```

## 📊 성능 최적화

### 게임 상태 최적화

```javascript
// 변경된 데이터만 전송
function getGameStateDelta(lastState, currentState) {
  const delta = {
    vehicles: [],
    projectiles: [],
    removedProjectiles: []
  };
  
  // 변경된 차량만 포함
  for (const vehicle of currentState.vehicles) {
    const lastVehicle = lastState.vehicles.find(v => v.id === vehicle.id);
    if (!lastVehicle || hasChanged(lastVehicle, vehicle)) {
      delta.vehicles.push(vehicle);
    }
  }
  
  return delta;
}
```

### 메모리 관리

```javascript
// 만료된 발사체 정리
function cleanupExpiredProjectiles() {
  const now = Date.now();
  for (const [id, projectile] of this.projectiles) {
    if (now - projectile.createdAt > projectile.lifetime) {
      this.projectiles.delete(id);
    }
  }
}

// 연결 해제된 플레이어 정리
function cleanupDisconnectedPlayers() {
  for (const [playerId, player] of this.players) {
    if (!player.socket.connected) {
      this.removePlayer(playerId);
    }
  }
}
```

## 🛠️ 개발 가이드

### 프로젝트 구조

```
src/
├── controllers/
│   └── gameController.js     # 게임 로직 컨트롤러
├── managers/
│   ├── GameManager.js        # 게임 상태 관리
│   ├── PlayerManager.js      # 플레이어 관리
│   └── PhysicsManager.js     # 물리 시뮬레이션
├── entities/
│   ├── Vehicle.js            # 비행체 엔티티
│   ├── Projectile.js         # 발사체 엔티티
│   └── Explosion.js          # 폭발 효과
├── factories/
│   └── VehicleFactory.js     # 비행체 팩토리
├── utils/
│   ├── physics.js            # 물리 계산 유틸리티
│   ├── collision.js          # 충돌 감지 유틸리티
│   └── logger.js             # 로깅 유틸리티
├── config/
│   └── gameConfig.yaml       # 게임 설정
├── middleware/
│   └── auth.js               # JWT 인증 미들웨어
└── index.js                  # 서버 진입점
```

### 새로운 비행체 타입 추가

```javascript
// 1. gameConfig.yaml에 새 타입 추가
vehicleTypes:
  bomber:
    health: 80
    maxSpeed: 60
    fireRate: 200
    engineCount: 2
    engineColor: 0xff00ff
    description: "Heavy bomber with high damage"

// 2. VehicleFactory에서 처리
class VehicleFactory {
  static createVehicle(type, id, playerId, position) {
    const config = gameConfig.vehicleTypes[type];
    if (!config) {
      throw new Error(`Unknown vehicle type: ${type}`);
    }
    return new Vehicle(id, playerId, position, config);
  }
}
```

### 새로운 무기 시스템 추가

```javascript
// 1. 무기 타입 정의
const weaponTypes = {
  machineGun: {
    damage: 10,
    fireRate: 100,
    projectileSpeed: 200,
    projectileLifetime: 3000
  },
  cannon: {
    damage: 30,
    fireRate: 500,
    projectileSpeed: 150,
    projectileLifetime: 5000
  }
};

// 2. 발사 로직 수정
function fireWeapon(playerId, weaponType, position, direction) {
  const weapon = weaponTypes[weaponType];
  const projectile = new Projectile(
    generateId(),
    position,
    direction,
    playerId,
    weapon
  );
  this.projectiles.set(projectile.id, projectile);
}
```

## 🧪 테스트

### 서버 상태 테스트

```bash
# 서버 상태 확인
curl http://localhost:3001/api/status

# 예상 응답
{
  "status": "running",
  "uptime": 3600,
  "players": 5,
  "vehicles": 5,
  "projectiles": 12,
  "memory": {
    "used": "45.2 MB",
    "total": "512 MB"
  }
}
```

### WebSocket 연결 테스트

```javascript
// 클라이언트 테스트 코드
const io = require('socket.io-client');

const socket = io('http://localhost:3001', {
  auth: {
    token: 'your_jwt_token_here'
  }
});

socket.on('connect', () => {
  console.log('Connected to game server');
  
  // 게임 참여
  socket.emit('join-game', {
    vehicleType: 'fighter',
    username: 'testPlayer'
  });
});

socket.on('game-state', (gameState) => {
  console.log('Game state received:', gameState);
});
```

## 🔧 문제 해결

### 일반적인 문제들

#### 1. JWT 토큰 검증 실패
**증상**: `Authentication error` WebSocket 연결 실패

**해결방법**:
```javascript
// User Service와 동일한 JWT_SECRET 확인
console.log('JWT_SECRET:', process.env.JWT_SECRET);

// 토큰 형식 확인
const token = socket.handshake.auth.token;
console.log('Received token:', token);
```

#### 2. 게임 루프 성능 문제
**증상**: 높은 CPU 사용률, 지연 발생

**해결방법**:
```javascript
// 게임 루프 최적화
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;

let lastTime = Date.now();
function gameLoop() {
  const currentTime = Date.now();
  const deltaTime = currentTime - lastTime;
  
  if (deltaTime >= FRAME_TIME) {
    updateGame(deltaTime);
    lastTime = currentTime;
  }
  
  setImmediate(gameLoop);
}
```

#### 3. 메모리 누수
**증상**: 메모리 사용량 지속적 증가

**해결방법**:
```javascript
// 정기적인 정리 작업
setInterval(() => {
  cleanupExpiredProjectiles();
  cleanupDisconnectedPlayers();
  
  // 메모리 사용량 로깅
  const memUsage = process.memoryUsage();
  console.log('Memory usage:', {
    rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB'
  });
}, 30000); // 30초마다
```

#### 4. WebSocket 연결 끊김
**증상**: 클라이언트 연결이 자주 끊어짐

**해결방법**:
```javascript
// 연결 상태 모니터링
socket.on('disconnect', (reason) => {
  console.log('Player disconnected:', reason);
  cleanupPlayer(socket.userId);
});

// 핑/퐁 설정
io.engine.pingTimeout = 60000;
io.engine.pingInterval = 25000;
```

## 📊 모니터링

### 성능 메트릭

```javascript
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      fps: 0,
      playerCount: 0,
      vehicleCount: 0,
      projectileCount: 0,
      memoryUsage: 0,
      cpuUsage: 0
    };
  }

  updateMetrics() {
    this.metrics.playerCount = gameManager.players.size;
    this.metrics.vehicleCount = gameManager.vehicles.size;
    this.metrics.projectileCount = gameManager.projectiles.size;
    
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage = memUsage.heapUsed / 1024 / 1024; // MB
  }

  logMetrics() {
    console.log('Performance Metrics:', this.metrics);
  }
}
```

### 로그 레벨

- **ERROR**: 시스템 오류, 치명적 문제
- **WARN**: 성능 경고, 비정상적 동작
- **INFO**: 플레이어 연결/해제, 게임 이벤트
- **DEBUG**: 상세 게임 로직 정보 (개발 환경만)

## 🚀 배포

### Docker 배포

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

EXPOSE 3001

CMD ["npm", "start"]
```

### 환경 변수 (프로덕션)

```env
NODE_ENV=production
PORT=3001
JWT_SECRET="very-long-and-secure-production-jwt-secret-key"

# 성능 튜닝
GAME_TICK_RATE=60
MAX_PLAYERS=100
MAX_PROJECTILES=1000
```

### 클러스터링

```javascript
// cluster.js
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // CPU 코어 수만큼 워커 생성
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork(); // 워커 재시작
  });
} else {
  // 워커 프로세스에서 게임 서버 실행
  require('./src/index.js');
  console.log(`Worker ${process.pid} started`);
}
```

## 📝 라이센스

MIT License

---

**🎮 Game Service는 실시간 멀티플레이어 게임의 핵심 로직을 담당하는 고성능 서비스입니다.**

**⚠️ 프로덕션 환경에서는 반드시 JWT_SECRET을 변경하고 성능 모니터링을 설정하세요!** 