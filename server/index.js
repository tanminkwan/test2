import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import fs from 'fs';
import yaml from 'yaml';
import { EventEmitter } from 'events';
import os from 'os';
import { fileURLToPath } from 'url';

import GameManager from './services/GameManager.js';

// ES6 모듈에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 설정 파일 로드
const configPath = path.join(__dirname, 'config', 'game-config.yaml');
const configFile = fs.readFileSync(configPath, 'utf8');
const config = yaml.parse(configFile);

// 네트워크 인터페이스 정보 가져오기
function getNetworkInterfaces() {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    
    for (const name of Object.keys(interfaces)) {
        for (const netInterface of interfaces[name]) {
            if (netInterface.family === 'IPv4' && !netInterface.internal) {
                addresses.push({
                    name: name,
                    address: netInterface.address
                });
            }
        }
    }
    
    return addresses;
}

// Express 앱 생성
const app = express();
const server = createServer(app);

// Socket.IO 설정 (CORS 설정 포함)
const socketConfig = {
    cors: {
        origin: config.network?.cors?.enabled ? config.network.cors.origins : false,
        methods: ["GET", "POST"],
        credentials: true
    }
};

const io = new SocketIOServer(server, socketConfig);

// CORS 미들웨어 설정
if (config.network?.cors?.enabled) {
    app.use((req, res, next) => {
        const allowedOrigins = config.network.cors.origins;
        const origin = req.headers.origin;
        
        if (allowedOrigins === "*" || (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin))) {
            res.header('Access-Control-Allow-Origin', allowedOrigins === "*" ? "*" : origin);
        }
        
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        res.header('Access-Control-Allow-Credentials', 'true');
        
        if (req.method === 'OPTIONS') {
            res.sendStatus(200);
        } else {
            next();
        }
    });
}

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
        const vehicleType = data.vehicleType || 'fighter';
        const result = gameManager.addPlayer(socket.id, playerName, vehicleType);
        
        if (result.success) {
            socket.emit('joinSuccess', {
                player: result.player,
                vehicle: result.vehicle,
                weapons: result.weapons,
                gameState: gameManager.getGameState(),
                config: {
                    world: config.world,
                    vehicles: config.vehicles,
                    weapons: config.weapons,
                    camera: config.camera
                }
            });
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
        io.emit('gameStarted', data);
    });
    
    gameEventEmitter.on('gameEnded', () => {
        io.emit('gameEnded');
    });
    
    gameEventEmitter.on('bulletCreated', (data) => {
        io.emit('bulletCreated', data);
    });
    
    gameEventEmitter.on('bulletDestroyed', (data) => {
        io.emit('bulletDestroyed', data);
    });
    
    gameEventEmitter.on('muzzleFlash', (data) => {
        io.emit('muzzleFlash', data);
    });
    
    gameEventEmitter.on('projectilesRemoved', (projectileIds) => {
        io.emit('projectilesRemoved', projectileIds);
    });
    
    gameEventEmitter.on('effectsRemoved', (effectIds) => {
        io.emit('effectsRemoved', effectIds);
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
    const networkInterfaces = getNetworkInterfaces();
    
    res.json({
        status: 'running',
        gameState: gameState.gameState,
        players: gameState.players.length,
        maxPlayers: config.game.maxPlayers,
        uptime: process.uptime(),
        network: {
            externalAccess: config.network?.allowExternalAccess || false,
            interfaces: networkInterfaces,
            publicUrl: config.network?.publicUrl || null
        },
        weaponSystem: gameState.effects,
        config: config
    });
});

// 네트워크 정보 API 엔드포인트
app.get('/api/network', (req, res) => {
    const networkInterfaces = getNetworkInterfaces();
    const externalAccess = config.network?.allowExternalAccess || false;
    const port = config.server.port || 3001;
    
    const accessUrls = networkInterfaces.map(iface => `http://${iface.address}:${port}`);
    
    res.json({
        externalAccess: externalAccess,
        host: externalAccess ? '0.0.0.0' : 'localhost',
        port: port,
        interfaces: networkInterfaces,
        accessUrls: accessUrls,
        publicUrl: config.network?.publicUrl || null
    });
});

// 클라이언트 설정 API 엔드포인트
app.get('/api/config', (req, res) => {
    // 클라이언트에 필요한 설정만 전달
    const clientConfig = {
        world: config.world,
        vehicles: config.vehicles,
        weapons: config.weapons,
        camera: config.camera,
        client: config.client,
        effects: config.effects,
        physics: config.physics
    };
    
    res.json(clientConfig);
});

// 서버 시작
const PORT = config.server.port || 3001;
const HOST = config.network?.allowExternalAccess ? '0.0.0.0' : 'localhost';

server.listen(PORT, HOST, () => {
    const networkInterfaces = getNetworkInterfaces();
    
    console.log(`🚀 Game Server running on ${HOST}:${PORT}`);
    console.log(`📊 Server Status: http://localhost:${PORT}/api/status`);
    console.log(`🎮 Game Client: http://localhost:${PORT}`);
    
    if (config.network?.allowExternalAccess && networkInterfaces.length > 0) {
        console.log('🌐 External Access Enabled:');
        networkInterfaces.forEach(iface => {
            console.log(`   📡 ${iface.name}: http://${iface.address}:${PORT}`);
        });
        
        console.log('⚠️  Security Notice:');
        console.log('   - Server is accessible from external networks');
        console.log('   - Consider using firewall rules for production');
        console.log('   - Monitor server logs for security');
    }
    
    // SOLID 원칙 적용 상태 출력
    console.log('SOLID Principles Applied:');
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
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
}); 