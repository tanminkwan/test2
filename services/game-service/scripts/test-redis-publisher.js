import eventPublisherManager from '../src/utils/EventPublisherManager.js';
import { createClient } from 'redis';

/**
 * Redis 발행자 테스트 스크립트
 * Redis 발행자와 우선순위 기능을 테스트합니다.
 */
async function testRedisPublisher() {
    console.log('🧪 Redis 발행자 테스트 시작');
    
    // Redis 구독 클라이언트 생성
    const subscriber = createClient({
        socket: {
            host: 'localhost',
            port: 6379
        }
    });
    
    try {
        // Redis 연결
        await subscriber.connect();
        console.log('✅ Redis 구독 클라이언트 연결됨');
        
        // 이벤트 채널 구독
        await subscriber.subscribe('game-events', (message) => {
            try {
                const event = JSON.parse(message);
                console.log('📨 Redis에서 이벤트 수신:', event.type);
                console.log('   데이터:', JSON.stringify(event.data, null, 2));
            } catch (err) {
                console.error('❌ 메시지 파싱 오류:', err);
            }
        });
        console.log('✅ game-events 채널 구독 시작');
        
        // 이벤트 발행 테스트
        console.log('\n📝 이벤트 발행 테스트 시작 (우선순위 기능 테스트)');
        
        // 게임 시작 이벤트
        console.log('\n📝 게임 시작 이벤트 발행');
        await eventPublisherManager.publishEvent('gameStarted', {
            playerCount: 4,
            timestamp: Date.now(),
            gameMode: 'deathmatch'
        });
        
        // 총알 생성 이벤트
        console.log('\n📝 총알 생성 이벤트 발행');
        await eventPublisherManager.publishEvent('bulletCreated', {
            id: 'bullet_123',
            playerId: 'player_456',
            position: { x: 10, y: 5, z: 20 }
        });
        
        // 모든 발행자에게 이벤트 발행 테스트
        console.log('\n📝 모든 발행자에게 이벤트 발행 테스트');
        await eventPublisherManager.publishEventToAll('testAllPublishers', {
            message: '이 이벤트는 모든 발행자에게 전송됩니다',
            timestamp: Date.now()
        });
        
        // 5초 대기 후 종료 (메시지 수신 대기)
        console.log('\n⏳ 5초 대기 후 종료...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 구독 해제 및 연결 종료
        await subscriber.unsubscribe('game-events');
        await subscriber.quit();
        console.log('✅ Redis 구독 클라이언트 종료됨');
        
        // 발행자 종료
        await eventPublisherManager.close();
        console.log('✅ 이벤트 발행자 정상 종료');
        
    } catch (err) {
        console.error('❌ 테스트 중 오류 발생:', err);
        
        // 연결 종료 시도
        try {
            if (subscriber.isOpen) {
                await subscriber.quit();
            }
        } catch (closeErr) {
            console.error('❌ Redis 연결 종료 오류:', closeErr);
        }
        
        // 발행자 종료 시도
        try {
            await eventPublisherManager.close();
        } catch (closeErr) {
            console.error('❌ 발행자 종료 오류:', closeErr);
        }
    }
}

// 테스트 실행
testRedisPublisher().then(() => {
    console.log('🏁 테스트 스크립트 종료');
    process.exit(0);
}).catch(err => {
    console.error('❌ 테스트 스크립트 실행 실패:', err);
    process.exit(1);
});
