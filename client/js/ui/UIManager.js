/**
 * UI 관리자 클래스
 * UI 업데이트, 플레이어 정보 관리, 알림 시스템을 담당
 */
import * as THREE from 'three';
import { UI_COLORS } from '../config/Constants.js';

export class UIManager {
    constructor(config) {
        this.config = config;
        
        // UI 요소들 캐싱
        this.elements = {
            playerInfo: null,
            healthFill: null,
            players: null,
            gameStatus: null,
            targetBox: null
        };
        
        // 플레이어 데이터
        this.myPlayer = null;
        this.latestGameState = null;
        
        this.initializeElements();
    }
    
    /**
     * UI 요소들 초기화 및 캐싱
     */
    initializeElements() {
        this.elements.playerInfo = document.getElementById('playerInfo');
        this.elements.healthFill = document.getElementById('healthFill');
        this.elements.players = document.getElementById('players');
        this.elements.gameStatus = document.getElementById('gameStatus');
        this.elements.targetBox = document.getElementById('targetBox');
        
        // 요소가 없으면 경고
        Object.keys(this.elements).forEach(key => {
            if (!this.elements[key]) {
                console.warn(`UI element not found: ${key}`);
            }
        });
    }
    
    /**
     * UI 초기 설정
     */
    setupUI(myPlayer, gameState) {
        this.myPlayer = myPlayer;
        this.latestGameState = gameState;
        
        this.updatePlayerInfo(null); // 초기에는 차량 데이터 없음
        this.updatePlayerList(new Map()); // 초기에는 빈 차량 맵
    }
    
    /**
     * 플레이어 정보 업데이트
     */
    updatePlayerInfo(myVehicle) {
        if (!this.elements.playerInfo || !this.myPlayer) return;
        
        // 데이터 출처를 myPlayer로 통일 (가장 신뢰성 높은 소스)
        const weapons = this.myPlayer.weapons || {};
        const missileWeapon = weapons.missile; // 'missile' 키로 직접 접근
        
        const missileAmmo = missileWeapon?.ammo ?? 0;
        const missileMaxAmmo = missileWeapon?.maxAmmo ?? 0;

        if (myVehicle && myVehicle.userData.vehicleData) {
            const vehicleData = myVehicle.userData.vehicleData;
            this.elements.playerInfo.innerHTML = `
                <p><strong>이름:</strong> ${this.myPlayer.name}</p>
                <p><strong>점수:</strong> ${this.myPlayer.score || 0}</p>
                <p><strong>킬:</strong> ${this.myPlayer.kills || 0}</p>
                <p><strong>데스:</strong> ${this.myPlayer.deaths || 0}</p>
                <p><strong>체력:</strong> ${vehicleData.health}/${vehicleData.maxHealth}</p>
                <p><strong>미사일:</strong> ${missileAmmo}/${missileMaxAmmo}</p>
            `;
            
            // 체력바 업데이트
            if (this.elements.healthFill) {
                const healthPercent = (vehicleData.health / vehicleData.maxHealth) * 100;
                this.elements.healthFill.style.width = `${healthPercent}%`;
            }
        } else {
            // 차량이 없을 때 기본 정보만 표시
            this.elements.playerInfo.innerHTML = `
                <p><strong>이름:</strong> ${this.myPlayer.name}</p>
                <p><strong>점수:</strong> ${this.myPlayer.score || 0}</p>
                <p><strong>킬:</strong> ${this.myPlayer.kills || 0}</p>
                <p><strong>데스:</strong> ${this.myPlayer.deaths || 0}</p>
                <p><strong>체력:</strong> 대기 중...</p>
                <p><strong>미사일:</strong> ${missileAmmo}/${missileMaxAmmo}</p>
            `;
            
            if (this.elements.healthFill) {
                this.elements.healthFill.style.width = '0%';
            }
        }
    }
    
    /**
     * 플레이어 목록 업데이트
     */
    updatePlayerList(vehicles) {
        if (!this.elements.players) return;
        
        this.elements.players.innerHTML = '';
        
        // 최신 플레이어 정보를 저장할 맵
        const playerMap = new Map();
        
        // 현재 게임 상태의 플레이어 정보로 맵 생성
        if (this.latestGameState && this.latestGameState.players) {
            this.latestGameState.players.forEach(player => {
                playerMap.set(player.id, player);
            });
        }
        
        for (const [vehicleId, vehicle] of vehicles) {
            const vehicleData = vehicle.userData.vehicleData;
            if (!vehicleData) continue;
            
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-item';
            
            // 플레이어 이름 찾기
            let playerName = 'Unknown';
            let playerScore = 0;
            
            // 내 플레이어인 경우
            if (this.myPlayer && vehicleData.playerId === this.myPlayer.id) {
                playerName = this.myPlayer.name;
                playerScore = this.myPlayer.score || 0;
            } else {
                // 다른 플레이어인 경우 - 최신 gameState에서 찾기
                const player = playerMap.get(vehicleData.playerId);
                if (player && player.name) {
                    playerName = player.name;
                    playerScore = player.score || 0;
                }
            }
            
            // Unknown 플레이어는 표시하지 않음
            if (playerName === 'Unknown') {
                continue;
            }
            
            playerDiv.innerHTML = `
                <div style="display: flex; align-items: center;">
                    <div class="player-color" style="background-color: ${vehicleData.color}"></div>
                    <span>${this.myPlayer && vehicleData.playerId === this.myPlayer.id ? '(나) ' : ''}${playerName}</span>
                </div>
                <div>
                    <span>❤️ ${vehicleData.health} 🏆 ${playerScore}</span>
                </div>
            `;
            
            this.elements.players.appendChild(playerDiv);
        }
    }
    
    /**
     * 타겟팅 박스 UI 업데이트
     * @param {THREE.Object3D} targetVehicle - 타겟 차량 3D 객체
     * @param {THREE.Camera} camera - 씬 카메라
     * @param {HTMLElement} rendererDomElement - 렌더러의 DOM 요소
     * @param {THREE.Object3D} myVehicle - 현재 플레이어의 차량 3D 객체
     */
    updateTargetBox(targetVehicle, camera, rendererDomElement, myVehicle) {
        if (!this.elements.targetBox) return;

        // 타겟이 없거나, 타겟이 비활성 상태이거나, 씬에서 제거된 경우 숨김
        if (!targetVehicle || !targetVehicle.userData.vehicleData?.active || !targetVehicle.parent) {
            this.elements.targetBox.style.display = 'none';
            return;
        }

        const targetPosition = new THREE.Vector3();
        targetVehicle.getWorldPosition(targetPosition);

        // 카메라 뒤에 있는지 확인
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        const vectorToTarget = new THREE.Vector3().subVectors(targetPosition, camera.position);
        
        if (vectorToTarget.dot(cameraDirection) < 0) {
            this.elements.targetBox.style.display = 'none';
            return;
        }
        
        // 3D 좌표를 2D 화면 좌표로 변환
        const screenPosition = targetPosition.clone().project(camera);

        const width = rendererDomElement.clientWidth;
        const height = rendererDomElement.clientHeight;

        const x = (screenPosition.x * 0.5 + 0.5) * width;
        const y = (-screenPosition.y * 0.5 + 0.5) * height;

        // 화면 밖에 있는지 확인
        if (x < -100 || x > width + 100 || y < -100 || y > height + 100) {
            this.elements.targetBox.style.display = 'none';
            return;
        }

        // 박스 스타일 업데이트
        this.elements.targetBox.style.display = 'block';
        this.elements.targetBox.style.left = `${x}px`;
        this.elements.targetBox.style.top = `${y}px`;
        
        // 추가 정보 표시 (거리 등) - 내 비행기 위치 기준으로 계산
        if (myVehicle) {
            const distance = myVehicle.position.distanceTo(targetPosition).toFixed(0);
            this.elements.targetBox.textContent = `${distance}m`;
        } else {
            this.elements.targetBox.textContent = ``; // 내 비행기가 없으면 거리 표시 안함
        }
    }
    
    /**
     * 게임 상태 메시지 업데이트
     */
    updateGameStatus(status) {
        if (this.elements.gameStatus) {
            this.elements.gameStatus.textContent = status;
        }
    }
    
    /**
     * 플레이어 데이터 업데이트
     */
    updateMyPlayer(playerData) {
        this.myPlayer = playerData;
    }
    
    /**
     * 게임 상태 업데이트
     */
    updateGameState(gameState) {
        this.latestGameState = gameState;
        
        // 플레이어 정보 업데이트
        if (gameState.players && this.myPlayer) {
            const myPlayerData = gameState.players.find(p => p.id === this.myPlayer.id);
            if (myPlayerData) {
                this.myPlayer = myPlayerData;
            }
        }
    }
    
    /**
     * 알림 메시지 표시
     */
    showNotification(message, type = 'info', duration = 3000) {
        // 알림 요소 생성
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // 스타일 설정
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        // 타입에 따른 배경색 설정 (Constants 사용)
        switch (type) {
            case 'success':
                notification.style.backgroundColor = UI_COLORS.SUCCESS;
                break;
            case 'warning':
                notification.style.backgroundColor = UI_COLORS.WARNING;
                break;
            case 'error':
                notification.style.backgroundColor = UI_COLORS.ERROR;
                break;
            default:
                notification.style.backgroundColor = UI_COLORS.INFO;
        }
        
        // DOM에 추가
        document.body.appendChild(notification);
        
        // 페이드 인
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        // 자동 제거
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }
    
    /**
     * 게임 이벤트 알림
     */
    showGameEvent(eventType, data) {
        switch (eventType) {
            case 'gameStarted':
                this.updateGameStatus('게임 진행 중');
                this.showNotification('게임이 시작되었습니다!', 'success');
                break;
                
            case 'gameEnded':
                this.updateGameStatus('게임 종료');
                this.showNotification('게임이 종료되었습니다.', 'info');
                break;
                
            case 'vehicleDestroyed':
                if (data && data.destroyedBy) {
                    this.showNotification(`차량이 파괴되었습니다!`, 'warning');
                }
                break;
                
            case 'vehicleRespawned':
                this.showNotification('차량이 리스폰되었습니다.', 'success');
                break;
                
            case 'billboardDestroyed':
                if (data && data.destroyedBy) {
                    this.showNotification(`광고판이 파괴되었습니다!`, 'info');
                }
                break;
        }
    }
    
    /**
     * 정리 작업
     */
    cleanup() {
        // 알림 제거
        const notifications = document.querySelectorAll('.notification');
        notifications.forEach(notification => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
        
        // 데이터 초기화
        this.myPlayer = null;
        this.latestGameState = null;
    }
}
