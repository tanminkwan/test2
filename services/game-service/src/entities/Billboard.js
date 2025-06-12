import GameEntity from './GameEntity.js';

/**
 * Billboard 클래스 - 지상에 설치되는 대형 광고판
 * SOLID 원칙 적용:
 * - Single Responsibility: 광고판의 위치와 상태만 관리
 * - Open/Closed: GameEntity를 확장하여 새로운 기능 추가
 * - Liskov Substitution: GameEntity의 모든 메서드를 올바르게 구현
 */
export default class Billboard extends GameEntity {
    constructor(id, position, rotation, config) {
        super(id, position);
        
        this.rotation = rotation || { x: 0, y: 0, z: 0 };
        this.width = config.width || 40;
        this.height = config.height || 20;
        this.thickness = config.thickness || 2;
        this.frontImage = config.frontImage || 'assets/billboards/front.jpg';
        this.backImage = config.backImage || 'assets/billboards/back.jpg';
        
        // 게임 설정 저장
        this.gameConfig = config.gameConfig || null;
        
        // 광고판은 정적 오브젝트이지만 파괴 가능
        this.isStatic = true;
        this.maxHealth = config.health || 100; // 광고판 체력
        this.health = this.maxHealth;
        
        // 총알 자국 관리 (config에서 값 가져오기)
        this.bulletHoles = []; // { position: {x, y, z}, side: 'front'|'back', timestamp: number }
        this.maxBulletHoles = this.gameConfig?.billboards?.maxBulletHoles || 50; // 최대 총알 자국 수
        
        // 파괴 상태
        this.isDestroyed = false;
        this.destroyedAt = null;
    }
    
    /**
     * 광고판 업데이트 (정적 오브젝트이므로 위치 변경 없음)
     */
    update(deltaTime) {
        // 광고판은 정적이므로 업데이트할 내용 없음
        // 필요시 애니메이션 효과 추가 가능 (회전하는 광고판 등)
    }
    
    /**
     * 광고판과 다른 엔티티의 충돌 검사 (개선된 버전)
     */
    checkCollision(entity) {
        if (!entity || this.isDestroyed) return false;
        
        const dx = entity.position.x - this.position.x;
        const dy = entity.position.y - this.position.y;
        const dz = entity.position.z - this.position.z;
        
        // 광고판의 경계 박스 계산
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        const halfThickness = this.thickness / 2;
        
        // 비행체의 크기 (config에서 가져오기)
        const collision = this.gameConfig?.billboards?.collision || {};
        const vehicleHalfWidth = collision.vehicleHalfWidth || 8;
        const vehicleHalfHeight = collision.vehicleHalfHeight || 3;
        const vehicleHalfLength = collision.vehicleHalfLength || 8;
        
        // 확장된 AABB 충돌 검사 (비행체 크기 포함)
        const collisionX = Math.abs(dx) < (halfWidth + vehicleHalfWidth);
        const collisionY = Math.abs(dy) < (halfHeight + vehicleHalfHeight);
        const collisionZ = Math.abs(dz) < (halfThickness + vehicleHalfLength);
        
        return collisionX && collisionY && collisionZ;
    }
    
    /**
     * 총알 자국 추가
     */
    addBulletHole(bulletPosition, damage) {
        if (this.isDestroyed) return null;
        
        // 광고판 로컬 좌표계로 변환
        const localPos = this.worldToLocal(bulletPosition);
        
        // 광고판 범위 내에 있는지 확인
        if (Math.abs(localPos.x) <= this.width / 2 && 
            Math.abs(localPos.y) <= this.height / 2) {
            
            // 앞면인지 뒷면인지 판단 (Z 방향으로 판단)
            const side = localPos.z > 0 ? 'front' : 'back';
            
            const bulletHole = {
                position: {
                    x: localPos.x,
                    y: localPos.y,
                    z: side === 'front' ? this.thickness / 2 + 0.01 : -(this.thickness / 2 + 0.01)
                },
                side: side,
                timestamp: Date.now(),
                size: 0.5 + Math.random() * 0.3 // 랜덤한 크기
            };
            
            this.bulletHoles.push(bulletHole);
            
            // 최대 개수 초과 시 오래된 것부터 제거
            if (this.bulletHoles.length > this.maxBulletHoles) {
                this.bulletHoles.shift();
            }
            
            return bulletHole;
        }
        
        return null;
    }
    
    /**
     * 월드 좌표를 광고판 로컬 좌표로 변환
     */
    worldToLocal(worldPos) {
        // 간단한 변환 (회전 고려하지 않음 - 필요시 확장)
        return {
            x: worldPos.x - this.position.x,
            y: worldPos.y - this.position.y,
            z: worldPos.z - this.position.z
        };
    }
    
    /**
     * 광고판 데미지 처리
     */
    takeDamage(damage) {
        if (this.isDestroyed) return false;
        
        this.health -= damage;
        
        if (this.health <= 0) {
            this.health = 0;
            this.isDestroyed = true;
            this.destroyedAt = Date.now();
            this.active = false;
            return true; // 파괴됨
        }
        
        return false; // 아직 파괴되지 않음
    }
    
    /**
     * 광고판 파괴 시 파편 생성 데이터
     */
    getDebrisData() {
        if (!this.isDestroyed) return null;
        
        const debris = [];
        const debrisCount = 8 + Math.floor(Math.random() * 12); // 8-20개의 파편
        
        for (let i = 0; i < debrisCount; i++) {
            debris.push({
                position: {
                    x: this.position.x + (Math.random() - 0.5) * this.width,
                    y: this.position.y + (Math.random() - 0.5) * this.height,
                    z: this.position.z + (Math.random() - 0.5) * this.thickness
                },
                velocity: {
                    x: (Math.random() - 0.5) * 20,
                    y: Math.random() * 15 + 5, // 위쪽으로 튀어나감
                    z: (Math.random() - 0.5) * 20
                },
                rotation: {
                    x: Math.random() * Math.PI * 2,
                    y: Math.random() * Math.PI * 2,
                    z: Math.random() * Math.PI * 2
                },
                size: 0.5 + Math.random() * 1.5,
                color: Math.random() > 0.5 ? 0x8B4513 : 0x444444, // 나무색 또는 회색
                lifeTime: 3000 + Math.random() * 2000 // 3-5초 동안 존재
            });
        }
        
        return debris;
    }
    
    /**
     * 직렬화
     */
    serialize() {
        return {
            ...super.serialize(),
            rotation: this.rotation,
            width: this.width,
            height: this.height,
            thickness: this.thickness,
            frontImage: this.frontImage,
            backImage: this.backImage,
            isStatic: this.isStatic,
            bulletHoles: this.bulletHoles,
            health: this.health,
            maxHealth: this.maxHealth,
            isDestroyed: this.isDestroyed,
            destroyedAt: this.destroyedAt
        };
    }
}