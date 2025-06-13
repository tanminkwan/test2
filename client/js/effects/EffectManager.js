import * as THREE from 'three';
import { EFFECT_DEFAULTS, BOOSTER_COLORS, MATERIAL_OPACITY, VEHICLE_DEFAULTS } from '../config/Constants.js';

/**
 * 효과 관리자 클래스
 * 폭발, 총구 스파크, 파편 등 시각 효과를 관리
 */
export class EffectManager {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        
        // 효과 컬렉션
        this.explosions = new Map();
        this.muzzleFlashes = new Map();
        this.debris = new Map();
        
        // 콜백 함수들
        this.onExplosionDestroyed = null;
        this.onDebrisDestroyed = null;
    }
    
    /**
     * 폭발 생성
     */
    createExplosion(explosionData) {
        // config에서 폭발 설정 가져오기 (폴백은 Constants에서)
        const explosionConfig = this.config?.effects?.explosion || {};
        
        const explosionGroup = new THREE.Group();
        
        // 메인 폭발 (더 크게)
        const explosionRadius = (explosionConfig.radius || EFFECT_DEFAULTS.EXPLOSION.radius) * (explosionData.radius || 1);
        const explosionGeometry = new THREE.SphereGeometry(explosionRadius, 32, 32); // 더 세밀하게
        const explosionMaterial = new THREE.MeshBasicMaterial({
            color: explosionConfig.color || EFFECT_DEFAULTS.EXPLOSION.color,
            transparent: true,
            opacity: explosionConfig.opacity || EFFECT_DEFAULTS.EXPLOSION.opacity
        });
        const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
        explosionGroup.add(explosion);
        
        // 외부 글로우 효과 추가
        const glowGeometry = new THREE.SphereGeometry(explosionRadius * 1.5, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: explosionConfig.glowColor || EFFECT_DEFAULTS.EXPLOSION.glowColor,
            transparent: true,
            opacity: MATERIAL_OPACITY.EXPLOSION_GLOW
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        explosionGroup.add(glow);
        
        // 파티클 효과 (더 많이, 더 넓게)
        const particleCount = (explosionConfig.particleCount || EFFECT_DEFAULTS.EXPLOSION.particleCount) * 2; // 2배 증가
        const particleColors = explosionConfig.particleColors || EFFECT_DEFAULTS.EXPLOSION.particleColors;
        const spreadRange = explosionRadius * 3;
        
        for (let i = 0; i < particleCount; i++) {
            const particleRadius = (explosionConfig.particleRadius || EFFECT_DEFAULTS.EXPLOSION.particleRadius) * (1 + Math.random());
            const particleGeometry = new THREE.SphereGeometry(particleRadius, 6, 6);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: particleColors[Math.floor(Math.random() * particleColors.length)]
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // 파티클 위치를 폭발 중심 주변에 랜덤 배치
            particle.position.set(
                (Math.random() - 0.5) * spreadRange,
                (Math.random() - 0.5) * spreadRange,
                (Math.random() - 0.5) * spreadRange
            );
            
            explosionGroup.add(particle);
        }
        
        // 폭발 위치 설정
        explosionGroup.position.set(
            explosionData.position.x || 0,
            explosionData.position.y || 0,
            explosionData.position.z || 0
        );
        
        // userData에 폭발 데이터와 지속 시간 저장
        explosionGroup.userData = {
            explosionData: explosionData,
            duration: explosionData.duration || explosionConfig.duration || 2000,
            createdAt: Date.now()
        };
        
        // 폭발 저장 및 씬에 추가
        this.explosions.set(explosionData.id, explosionGroup);
        this.scene.add(explosionGroup);
        
        // 폭발 애니메이션 시작
        this.animateExplosion(explosionGroup);
        
        return explosionGroup;
    }
    
    /**
     * 폭발 애니메이션
     */
    animateExplosion(explosionGroup) {
        const startTime = explosionGroup.userData.createdAt || Date.now();
        const duration = explosionGroup.userData.duration || 2000;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1.0) {
                // 애니메이션 완료 - 폭발 제거
                this.scene.remove(explosionGroup);
                
                // explosionData가 있는 경우에만 Map에서 삭제
                if (explosionGroup.userData.explosionData) {
                    this.explosions.delete(explosionGroup.userData.explosionData.id);
                    
                    // 콜백 호출
                    if (this.onExplosionDestroyed) {
                        this.onExplosionDestroyed(explosionGroup.userData.explosionData.id);
                    }
                }
                return;
            }
            
            // 메인 폭발 스케일 애니메이션 (확장 후 축소)
            const scaleProgress = progress < 0.3 ? progress / 0.3 : 1 - ((progress - 0.3) / 0.7);
            const scale = 0.5 + scaleProgress * 1.5; // 0.5에서 2.0까지 확장 후 축소
            
            explosionGroup.children.forEach((child, index) => {
                if (index === 0) {
                    // 메인 폭발
                    child.scale.setScalar(scale);
                    child.material.opacity = (1 - progress) * 1.0;
                } else if (index === 1) {
                    // 글로우 효과
                    child.scale.setScalar(scale * 1.2);
                    child.material.opacity = (1 - progress) * 0.3;
                } else {
                    // 파티클들
                    if (child.userData.velocity) {
                        // 파티클 이동
                        child.position.add(child.userData.velocity.clone().multiplyScalar(0.016)); // 60fps 기준
                        
                        // 중력 효과
                        child.userData.velocity.y -= 0.5;
                        
                        // 공기 저항
                        child.userData.velocity.multiplyScalar(0.98);
                        
                        // 파티클 페이드 아웃
                        child.material.opacity = (1 - progress) * 0.9;
                        
                        // 파티클 크기 변화
                        const particleScale = 1 - progress * 0.5;
                        child.scale.setScalar(particleScale);
                    }
                }
            });
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    /**
     * 총구 스파크 효과 생성
     */
    createMuzzleFlash(vehicleId, vehicles) {
        const vehicle = vehicles.get(vehicleId);
        if (!vehicle) return;

        // 총구 위치 계산 (비행체 머리 부분)
        const vehicleRotation = vehicle.rotation;
        const muzzleOffset = {
            x: Math.sin(vehicleRotation.y) * Math.cos(vehicleRotation.x) * 8,
            y: -Math.sin(vehicleRotation.x) * 8,
            z: Math.cos(vehicleRotation.y) * Math.cos(vehicleRotation.x) * 8
        };

        const muzzlePosition = {
            x: vehicle.position.x + muzzleOffset.x,
            y: vehicle.position.y + muzzleOffset.y,
            z: vehicle.position.z + muzzleOffset.z
        };

        // 스파크 파티클 그룹 생성
        const sparkGroup = new THREE.Group();

        // 메인 플래시 (밝은 노란색 구)
        const flashGeometry = new THREE.SphereGeometry(1.5, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        });
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        sparkGroup.add(flash);

        // 스파크 파티클들 (작은 노란색/주황색 점들)
        const particleCount = this.config?.effects?.muzzleFlash?.particleCount || 15;
        for (let i = 0; i < particleCount; i++) {
            const sparkGeometry = new THREE.SphereGeometry(0.1, 4, 4);
            const sparkMaterial = new THREE.MeshBasicMaterial({
                color: Math.random() > 0.5 ? 0xffff00 : 0xff8800,
                transparent: true,
                opacity: 0.9
            });
            const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
            
            // 랜덤한 방향으로 스파크 배치
            const angle = Math.random() * Math.PI * 2;
            const distance = 1 + Math.random() * (this.config?.effects?.muzzleFlash?.spreadDistance || 3);
            const height = (Math.random() - 0.5) * 2;
            
            spark.position.set(
                Math.cos(angle) * distance,
                height,
                Math.sin(angle) * distance
            );
            
            sparkGroup.add(spark);
        }

        // 위치 설정
        sparkGroup.position.set(muzzlePosition.x, muzzlePosition.y, muzzlePosition.z);
        
        // 비행체 방향에 맞춰 회전
        sparkGroup.rotation.copy(vehicleRotation);

        this.scene.add(sparkGroup);

        // 스파크 애니메이션 및 제거
        this.animateMuzzleFlash(sparkGroup);
        
        return sparkGroup;
    }
    
    /**
     * 총구 스파크 애니메이션
     */
    animateMuzzleFlash(sparkGroup) {
        const startTime = Date.now();
        const duration = this.config?.effects?.muzzleFlash?.duration || 150; // 0.15초

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;

            if (progress >= 1) {
                // 애니메이션 완료, 제거
                this.scene.remove(sparkGroup);
                return;
            }

            // 페이드 아웃
            const opacity = 1 - progress;
            sparkGroup.children.forEach(child => {
                if (child.material) {
                    child.material.opacity = opacity;
                }
            });

            // 스파크 확산 효과
            sparkGroup.children.forEach((child, index) => {
                if (index > 0) { // 메인 플래시 제외
                    const scale = 1 + progress * 2;
                    child.scale.setScalar(scale);
                    
                    // 스파크가 바깥쪽으로 이동
                    const originalPos = child.position.clone().normalize();
                    child.position.copy(originalPos.multiplyScalar(1 + progress * 3));
                }
            });

            requestAnimationFrame(animate);
        };

        animate();
    }
    
    /**
     * 파편 효과 생성
     */
    createDebrisEffect(debrisData, getTerrainHeight) {
        debrisData.forEach(debris => {
            // 파편 지오메트리 (랜덤한 모양)
            const debrisGeometry = new THREE.BoxGeometry(
                debris.size,
                debris.size * (0.5 + Math.random() * 0.5),
                debris.size * (0.3 + Math.random() * 0.4)
            );
            
            const debrisMaterial = new THREE.MeshLambertMaterial({
                color: debris.color
            });
            
            const debrisMesh = new THREE.Mesh(debrisGeometry, debrisMaterial);
            
            // 초기 위치 설정
            debrisMesh.position.set(
                debris.position.x,
                debris.position.y,
                debris.position.z
            );
            
            // 초기 회전 설정
            debrisMesh.rotation.set(
                debris.rotation.x,
                debris.rotation.y,
                debris.rotation.z
            );
            
            debrisMesh.castShadow = true;
            
            // 파편 데이터 저장
            debrisMesh.userData = {
                velocity: { ...debris.velocity },
                angularVelocity: {
                    x: (Math.random() - 0.5) * 0.2,
                    y: (Math.random() - 0.5) * 0.2,
                    z: (Math.random() - 0.5) * 0.2
                },
                gravity: -30,
                lifeTime: debris.lifeTime,
                createdAt: Date.now(),
                id: `debris_${Date.now()}_${Math.random()}`
            };
            
            this.debris.set(debrisMesh.userData.id, debrisMesh);
            this.scene.add(debrisMesh);
            
            // 파편 애니메이션 및 제거
            this.animateDebris(debrisMesh, getTerrainHeight);
        });
    }
    
    /**
     * 파편 애니메이션
     */
    animateDebris(debrisMesh, getTerrainHeight) {
        const animate = () => {
            const now = Date.now();
            const elapsed = now - debrisMesh.userData.createdAt;
            
            // 수명이 다했으면 제거
            if (elapsed >= debrisMesh.userData.lifeTime) {
                this.scene.remove(debrisMesh);
                this.debris.delete(debrisMesh.userData.id);
                
                // 콜백 호출
                if (this.onDebrisDestroyed) {
                    this.onDebrisDestroyed(debrisMesh.userData.id);
                }
                return;
            }
            
            const deltaTime = 0.016; // 약 60fps
            
            // 중력 적용
            debrisMesh.userData.velocity.y += debrisMesh.userData.gravity * deltaTime;
            
            // 위치 업데이트
            debrisMesh.position.x += debrisMesh.userData.velocity.x * deltaTime;
            debrisMesh.position.y += debrisMesh.userData.velocity.y * deltaTime;
            debrisMesh.position.z += debrisMesh.userData.velocity.z * deltaTime;
            
            // 회전 업데이트
            debrisMesh.rotation.x += debrisMesh.userData.angularVelocity.x;
            debrisMesh.rotation.y += debrisMesh.userData.angularVelocity.y;
            debrisMesh.rotation.z += debrisMesh.userData.angularVelocity.z;
            
            // 지면 충돌 검사 (간단한 바운스)
            if (getTerrainHeight) {
                const groundHeight = getTerrainHeight(debrisMesh.position.x, debrisMesh.position.z);
                if (debrisMesh.position.y <= groundHeight) {
                    debrisMesh.position.y = groundHeight;
                    debrisMesh.userData.velocity.y *= -0.3; // 바운스 감쇠
                    debrisMesh.userData.velocity.x *= 0.8; // 마찰
                    debrisMesh.userData.velocity.z *= 0.8;
                }
            }
            
            // 투명도 페이드 아웃 (수명의 마지막 30%에서)
            const fadeStart = debrisMesh.userData.lifeTime * 0.7;
            if (elapsed > fadeStart) {
                const fadeProgress = (elapsed - fadeStart) / (debrisMesh.userData.lifeTime - fadeStart);
                debrisMesh.material.opacity = 1 - fadeProgress;
                debrisMesh.material.transparent = true;
            }
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    /**
     * 부스터 효과 업데이트 (통합된 로직)
     */
    updateVehicleBooster(vehicle, isBoosterActive, vehicleType) {
        if (!vehicle || !vehicle.userData.vehicleData) return;
        
        // 비행체 타입별 기본 설정 가져오기
        const defaults = this.getVehicleDefaults(vehicleType);
        
        // 차량 타입에 따라 적절한 엔진 효과 적용
        if (vehicleType === 'heavy') {
            // 중형기 듀얼 엔진 효과
            if (vehicle.userData.engines && vehicle.userData.glows) {
                const engineColor = this.config?.vehicles?.heavy?.engineColor || defaults.engineColor;
                const glowColor = this.config?.vehicles?.heavy?.glowColor || defaults.glowColor;
                
                vehicle.userData.engines.forEach((engine, index) => {
                    const glow = vehicle.userData.glows[index];
                    
                    if (isBoosterActive) {
                        // 부스터 활성화 시 강화 효과
                        engine.material.color.setHex(BOOSTER_COLORS.ACTIVE_ENGINE);
                        engine.material.opacity = BOOSTER_COLORS.ACTIVE_OPACITY;
                        glow.material.color.setHex(BOOSTER_COLORS.ACTIVE_GLOW);
                        glow.material.opacity = BOOSTER_COLORS.ACTIVE_GLOW_OPACITY;
                        
                        // 글로우 크기 증가
                        glow.scale.setScalar(BOOSTER_COLORS.ACTIVE_SCALE);
                    } else {
                        // 부스터 비활성화 시 엔진 완전히 끄기
                        engine.material.color.setHex(parseInt(engineColor.replace('#', '0x')));
                        engine.material.opacity = BOOSTER_COLORS.INACTIVE_OPACITY;
                        glow.material.color.setHex(parseInt(glowColor.replace('#', '0x')));
                        glow.material.opacity = BOOSTER_COLORS.INACTIVE_OPACITY;
                        
                        // 글로우 크기 원래대로
                        glow.scale.setScalar(BOOSTER_COLORS.INACTIVE_SCALE);
                    }
                });
            }
        } else {
            // 전투기 및 기타 엔진 효과
            if (vehicle.userData.engine && vehicle.userData.glow) {
                const engineColor = this.config?.vehicles?.[vehicleType]?.engineColor || defaults.engineColor;
                const glowColor = this.config?.vehicles?.[vehicleType]?.glowColor || defaults.glowColor;
                
                if (isBoosterActive) {
                    // 부스터 활성화 시 강화 효과
                    vehicle.userData.engine.material.color.setHex(BOOSTER_COLORS.ACTIVE_ENGINE);
                    vehicle.userData.engine.material.opacity = BOOSTER_COLORS.ACTIVE_OPACITY;
                    vehicle.userData.glow.material.color.setHex(BOOSTER_COLORS.ACTIVE_GLOW);
                    vehicle.userData.glow.material.opacity = BOOSTER_COLORS.ACTIVE_GLOW_OPACITY;
                    
                    // 글로우 크기 증가
                    vehicle.userData.glow.scale.setScalar(BOOSTER_COLORS.ACTIVE_SCALE);
                } else {
                    // 부스터 비활성화 시 엔진 완전히 끄기
                    vehicle.userData.engine.material.color.setHex(parseInt(engineColor.replace('#', '0x')));
                    vehicle.userData.glow.material.color.setHex(parseInt(glowColor.replace('#', '0x')));
                    // 엔진 완전히 끄기
                    vehicle.userData.engine.material.opacity = BOOSTER_COLORS.INACTIVE_OPACITY;
                    vehicle.userData.glow.material.opacity = BOOSTER_COLORS.INACTIVE_OPACITY;
                    
                    // 글로우 크기 원래대로
                    vehicle.userData.glow.scale.setScalar(BOOSTER_COLORS.INACTIVE_SCALE);
                }
            }
        }
    }
    
    /**
     * 비행체 타입별 기본 설정 가져오기
     */
    getVehicleDefaults(vehicleType) {
        const typeKey = vehicleType.toUpperCase();
        return VEHICLE_DEFAULTS[typeKey] || VEHICLE_DEFAULTS.FIGHTER;
    }
    
    /**
     * 폭발 제거
     */
    removeExplosion(explosionId) {
        const explosion = this.explosions.get(explosionId);
        if (explosion) {
            this.scene.remove(explosion);
            this.explosions.delete(explosionId);
        }
    }
    
    /**
     * 모든 효과 제거
     */
    cleanup() {
        // 폭발 효과 제거
        for (const [id, explosion] of this.explosions) {
            this.scene.remove(explosion);
        }
        this.explosions.clear();
        
        // 파편 효과 제거
        for (const [id, debris] of this.debris) {
            this.scene.remove(debris);
        }
        this.debris.clear();
        
        // 총구 스파크는 자동으로 제거되므로 별도 처리 불필요
    }
    
    /**
     * 콜백 함수 설정
     */
    setCallbacks(callbacks) {
        if (callbacks.onExplosionDestroyed) {
            this.onExplosionDestroyed = callbacks.onExplosionDestroyed;
        }
        if (callbacks.onDebrisDestroyed) {
            this.onDebrisDestroyed = callbacks.onDebrisDestroyed;
        }
    }
} 