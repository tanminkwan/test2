/**
 * 네트워크 관리자 클래스
 * Socket.IO 통신, 게임 이벤트 처리, 입력 전송을 담당
 */
export class NetworkManager {
    constructor(socket, config) {
        this.socket = socket;
        this.config = config;
        
        // 입력 전송 관리
        this.lastInputSend = 0;
        this.inputSendRate = this.config?.client?.inputSendRate || 60; // Hz
        
        // 콜백 함수들 (GameClient에서 설정)
        this.callbacks = {
            onGameStateUpdate: null,
            onBulletCreated: null,
            onMuzzleFlash: null,
            onBulletDestroyed: null,
            onExplosionCreated: null,
            onExplosionDestroyed: null,
            onBulletHoleCreated: null,
            onBillboardDestroyed: null,
            onVehicleDestroyed: null,
            onVehicleRespawned: null,
            onGameStarted: null,
            onGameEnded: null
        };
        
        this.setupSocketListeners();
    }
    
    /**
     * 소켓 이벤트 리스너 설정
     */
    setupSocketListeners() {
        this.socket.on('gameStateUpdate', (gameState) => {
            if (this.callbacks.onGameStateUpdate) {
                this.callbacks.onGameStateUpdate(gameState);
            }
        });
        
        this.socket.on('bulletCreated', (data) => {
            if (this.callbacks.onBulletCreated) {
                this.callbacks.onBulletCreated(data);
            }
        });
        
        this.socket.on('muzzleFlash', (data) => {
            if (this.callbacks.onMuzzleFlash) {
                this.callbacks.onMuzzleFlash(data);
            }
        });
        
        this.socket.on('bulletDestroyed', (data) => {
            if (this.callbacks.onBulletDestroyed) {
                this.callbacks.onBulletDestroyed(data);
            }
        });
        
        this.socket.on('explosionCreated', (data) => {
            if (this.callbacks.onExplosionCreated) {
                this.callbacks.onExplosionCreated(data);
            }
        });
        
        this.socket.on('explosionDestroyed', (data) => {
            if (this.callbacks.onExplosionDestroyed) {
                this.callbacks.onExplosionDestroyed(data);
            }
        });
        
        this.socket.on('bulletHoleCreated', (data) => {
            if (this.callbacks.onBulletHoleCreated) {
                this.callbacks.onBulletHoleCreated(data);
            }
        });
        
        this.socket.on('billboardDestroyed', (data) => {
            if (this.callbacks.onBillboardDestroyed) {
                this.callbacks.onBillboardDestroyed(data);
            }
        });
        
        this.socket.on('vehicleDestroyed', (data) => {
            if (this.callbacks.onVehicleDestroyed) {
                this.callbacks.onVehicleDestroyed(data);
            }
        });
        
        this.socket.on('vehicleRespawned', (data) => {
            if (this.callbacks.onVehicleRespawned) {
                this.callbacks.onVehicleRespawned(data);
            }
        });
        
        this.socket.on('gameStarted', (data) => {
            if (this.callbacks.onGameStarted) {
                this.callbacks.onGameStarted(data);
            }
        });
        
        this.socket.on('gameEnded', () => {
            if (this.callbacks.onGameEnded) {
                this.callbacks.onGameEnded();
            }
        });
    }
    
    /**
     * 입력을 서버로 전송
     */
    sendInputs(inputs) {
        const now = Date.now();
        if (now - this.lastInputSend < 1000 / this.inputSendRate) {
            return false; // 전송하지 않음
        }
        
        // 입력이 있을 때만 전송하거나 주기적으로 전송
        const hasInput = Object.values(inputs).some(val => val !== 0 && val !== false);
        
        if (hasInput || (now - this.lastInputSend) > 100) { // 최소 100ms마다 전송
            this.socket.emit('playerInput', inputs);
            this.lastInputSend = now;
            return true; // 전송됨
        }
        
        return false; // 전송하지 않음
    }
    
    /**
     * 콜백 함수 설정
     */
    setCallback(eventName, callback) {
        if (this.callbacks.hasOwnProperty(eventName)) {
            this.callbacks[eventName] = callback;
        } else {
            console.warn(`Unknown network callback: ${eventName}`);
        }
    }
    
    /**
     * 여러 콜백 함수를 한 번에 설정
     */
    setCallbacks(callbackMap) {
        Object.keys(callbackMap).forEach(eventName => {
            this.setCallback(eventName, callbackMap[eventName]);
        });
    }
    
    /**
     * 소켓 연결 상태 확인
     */
    isConnected() {
        return this.socket && this.socket.connected;
    }
    
    /**
     * 소켓 연결 해제
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
    
    /**
     * 정리 작업
     */
    cleanup() {
        // 모든 이벤트 리스너 제거
        if (this.socket) {
            this.socket.removeAllListeners();
        }
        
        // 콜백 초기화
        Object.keys(this.callbacks).forEach(key => {
            this.callbacks[key] = null;
        });
    }
} 