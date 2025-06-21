import { v4 as uuidv4 } from 'uuid';
import * as THREE from 'three';

/**
 * Billboard 클래스 - 지상에 설치되는 대형 광고판
 * SOLID 원칙 적용:
 * - Single Responsibility: 광고판의 위치와 상태만 관리
 * - Open/Closed: GameEntity를 확장하여 새로운 기능 추가
 * - Liskov Substitution: GameEntity의 모든 메서드를 올바르게 구현
 */
export class Billboard {
    constructor(config, mesh, frontImage, backImage) {
        this.id = uuidv4();
        this.config = config.billboards;
        this.type = 'Billboard';
        this.mesh = mesh;
        this.width = this.config.width;
        this.height = this.config.height;
        this.thickness = this.config.thickness;
        this.health = this.config.health;
        this.maxBulletHoles = this.config.maxBulletHoles;
        this.frontImage = frontImage;
        this.backImage = backImage;
        
        this.position = { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z };
        this.rotation = { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z };
        
        this.active = true;
        this.bulletHoles = [];
        this.isDestroyed = false; // 파괴 상태 추가
    }

    takeDamage(damage) {
        if (this.isDestroyed) return false;
        this.health -= damage;
        if (this.health <= 0) {
            this.health = 0;
            this.isDestroyed = true;
            this.active = false;
        }
        return this.isDestroyed;
    }

    addBulletHole(position) {
        if (this.bulletHoles.length < this.maxBulletHoles) {
            this.bulletHoles.push({ position });
        }
    }

    checkCollision(vehicle) {
        if (!vehicle.mesh || this.isDestroyed || !this.active || !vehicle.active) return false;
        const vehicleBox = new THREE.Box3().setFromObject(vehicle.mesh);
        const billboardBox = new THREE.Box3().setFromObject(this.mesh);
        return vehicleBox.intersectsBox(billboardBox);
    }
    
    getDebrisData() {
        const debrisConfig = this.config.debris || {};
        const count = Math.floor(Math.random() * (debrisConfig.maxCount - debrisConfig.minCount + 1)) + debrisConfig.minCount;
        const debris = [];
        for (let i = 0; i < count; i++) {
            debris.push({
                position: { ...this.position },
                velocity: { 
                    x: (Math.random() - 0.5) * 20, 
                    y: Math.random() * 20, 
                    z: (Math.random() - 0.5) * 20 
                },
                size: Math.random() * 2 + 1,
                lifetime: (Math.random() * (debrisConfig.lifeTimeMax - debrisConfig.lifeTimeMin)) + debrisConfig.lifeTimeMin,
            });
        }
        this.debris = debris;
        return debris;
    }

    serialize() {
        return {
            id: this.id,
            type: this.type,
            position: this.position,
            rotation: this.rotation,
            width: this.width,
            height: this.height,
            thickness: this.thickness,
            frontImage: this.frontImage,
            backImage: this.backImage,
            health: this.health,
            isDestroyed: this.isDestroyed,
            bulletHoles: this.bulletHoles,
            active: this.active
        };
    }
}