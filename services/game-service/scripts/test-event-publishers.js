import eventPublisherManager from '../src/utils/EventPublisherManager.js';

/**
 * 이벤트 발행자 테스트 스크립트
 * 다양한 이벤트를 발행하고 결과를 확인합니다.
 */
async function testEventPublishers() {
    console.log('🧪 이벤트 발행자 테스트 시작');
    
    try {
        // 게임 시작 이벤트
        console.log('📝 게임 시작 이벤트 발행 테스트');
        await eventPublisherManager.publishEvent('gameStarted', {
            playerCount: 4,
            timestamp: Date.now(),
            gameMode: 'deathmatch'
        });
        
        // 총알 생성 이벤트
        console.log('📝 총알 생성 이벤트 발행 테스트');
        await eventPublisherManager.publishEvent('bulletCreated', {
            id: 'bullet_123',
            playerId: 'player_456',
            position: { x: 10, y: 5, z: 20 },
            direction: { x: 0, y: 0, z: 1 },
            damage: 10,
            speed: 200
        });
        
        // 차량 파괴 이벤트
        console.log('📝 차량 파괴 이벤트 발행 테스트');
        await eventPublisherManager.publishEvent('vehicleDestroyed', {
            vehicleId: 'vehicle_123',
            playerId: 'player_456',
            killedBy: 'player_789',
            position: { x: 0, y: 0, z: 0 },
            shouldHide: true
        });
        
        // 게임 종료 이벤트
        console.log('📝 게임 종료 이벤트 발행 테스트');
        await eventPublisherManager.publishEvent('gameEnded', {
            reason: 'time_limit',
            winningPlayerId: 'player_789',
            scores: {
                'player_789': 100,
                'player_456': 75
            }
        });
        
        console.log('✅ 모든 이벤트 발행 테스트 완료');
        
        // 발행자 정상 종료
        await eventPublisherManager.close();
        console.log('✅ 이벤트 발행자 정상 종료');
        
    } catch (err) {
        console.error('❌ 테스트 중 오류 발생:', err);
    }
}

// 테스트 실행
testEventPublishers().then(() => {
    console.log('🏁 테스트 스크립트 종료');
    process.exit(0);
}).catch(err => {
    console.error('❌ 테스트 스크립트 실행 실패:', err);
    process.exit(1);
}); 