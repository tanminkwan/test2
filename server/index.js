const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const yaml = require('yaml');
const { EventEmitter } = require('events');

const GameManager = require('./services/GameManager');

// 설정 파일 로드
const configPath = path.join(__dirname, 'config', 'game-config.yaml');
const configFile = fs.readFileSync(configPath, 'utf8');
const config = yaml.parse(configFile);

// Express 앱 생성
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 정적 파일 서빙 (클라이언트)
app.use(express.static(path.join(__dirname, '../client')));
app.use(express.json());

// 이벤트 에미터 생성
const gameEventEmitter = new EventEmitter();

// 게임 매니저 생성
const gameManager = new GameManager(config, gameEventEmitter);

// 게임 이벤트 리스너 설정
setupGameEventListeners();

// Socket.IO 연결 처리
io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    // 플레이어 조인
    socket.on('joinGame', (data) => {
        const playerName = data.name || `Player_${socket.id.substring(0, 6)}`;
        const result = gameManager.addPlayer(socket.id, playerName);
        
        if (result.success) {
            socket.emit('joinSuccess', {
                player: result.player,
                vehicle: result.vehicle,
                gameState: gameManager.getGameState(),
                config: {
                    world: config.world,
                    vehicles: config.vehicles,
                    weapons: config.weapons,
                    camera: config.camera
                }
            });
            
            console.log(`Player ${playerName} (${socket.id}) joined the game`);
        } else {
            socket.emit('joinFailed', { reason: result.reason });
        }
    });
    
    // 플레이어 입력 처리
    socket.on('playerInput', (inputs) => {
        gameManager.handlePlayerInput(socket.id, inputs);
    });
    
    // 연결 해제 처리
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        gameManager.removePlayer(socket.id);
    });
});

// 게임 이벤트 리스너 설정
function setupGameEventListeners() {
    gameEventEmitter.on('gameStarted', (data) => {
        console.log(`Game started with ${data.players.length} players`);
        io.emit('gameStarted', data);
        
        // 플레이어 정보 출력
        data.players.forEach(player => {
            console.log(`Player ${player.name} (${player.id}) joined the game`);
        });
    });
    
    gameEventEmitter.on('gameEnded', () => {
        console.log('Game ended');
        io.emit('gameEnded');
    });
    
    gameEventEmitter.on('playerJoined', (data) => {
        io.emit('playerJoined', data);
    });
    
    gameEventEmitter.on('playerLeft', (data) => {
        io.emit('playerLeft', data);
    });
    
    gameEventEmitter.on('bulletCreated', (data) => {
        io.emit('bulletCreated', data);
    });
    
    gameEventEmitter.on('bulletDestroyed', (data) => {
        io.emit('bulletDestroyed', data);
    });
    
    gameEventEmitter.on('explosionCreated', (data) => {
        io.emit('explosionCreated', data);
    });
    
    gameEventEmitter.on('explosionDestroyed', (data) => {
        io.emit('explosionDestroyed', data);
    });
    
    gameEventEmitter.on('vehicleDestroyed', (data) => {
        io.emit('vehicleDestroyed', data);
    });
    
    gameEventEmitter.on('vehicleRespawned', (data) => {
        io.emit('vehicleRespawned', data);
    });
    
    gameEventEmitter.on('gameStateUpdate', (gameState) => {
        io.emit('gameStateUpdate', gameState);
    });
}

// REST API 엔드포인트
app.get('/api/status', (req, res) => {
    const gameState = gameManager.getGameState();
    res.json({
        status: 'running',
        gameState: gameState.state,
        players: gameState.players.length,
        maxPlayers: config.game.maxPlayers,
        uptime: process.uptime(),
        config: config
    });
});

app.get('/api/config', (req, res) => {
    res.json(config);
});

// 메인 페이지
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// 서버 시작
const PORT = config.server.port || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Game Server running on port ${PORT}`);
    console.log(`📊 Server Status: http://localhost:${PORT}/api/status`);
    console.log(`🎮 Game Client: http://localhost:${PORT}`);
    console.log('\nSOLID Principles Applied:');
    console.log('✅ Single Responsibility: Each class has one reason to change');
    console.log('✅ Open/Closed: Entities extend GameEntity without modification');
    console.log('✅ Liskov Substitution: All entities can be used interchangeably');
    console.log('✅ Interface Segregation: Clients depend only on needed interfaces');
    console.log('✅ Dependency Inversion: High-level modules depend on abstractions');
});

// 우아한 종료 처리
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
}); 