/**
 * 클라이언트 상수 정의
 * 하드코딩된 값들을 중앙 집중화하여 관리
 */

// 비행체 기본 설정값들 (서버 설정이 없을 때의 폴백)
export const VEHICLE_DEFAULTS = {
    FIGHTER: {
        scale: 1.0,
        engineColor: "#00AAFF",
        glowColor: "#0088FF",
        model: {
            head: { radius: 1.5, length: 8 },
            cockpit: { radius: 1.2, position: { x: 0, y: 0.5, z: 1 } },
            body: { width: 2, height: 1, length: 6 },
            wings: { width: 12, height: 0.5, length: 3 },
            engine: { radius: 1.5, length: 0.5, position: { x: 0, y: 0, z: -4 } },
            glow: { radius: 2.5, length: 0.2, position: { x: 0, y: 0, z: -4.5 } }
        }
    },
    HEAVY: {
        scale: 1.4,
        engineColor: "#FF4400",
        glowColor: "#FF6600",
        model: {
            head: { radius: 2, length: 10 },
            cockpit: { radius: 1.6, position: { x: 0, y: 0.8, z: 1.5 } },
            body: { width: 3, height: 1.5, length: 8 },
            wings: { width: 16, height: 0.8, length: 4 },
            engines: { 
                radius: 1.2, 
                length: 0.6, 
                positions: [{ x: -3, y: 0, z: -5 }, { x: 3, y: 0, z: -5 }] 
            },
            glows: { 
                radius: 2, 
                length: 0.3, 
                positions: [{ x: -3, y: 0, z: -5.5 }, { x: 3, y: 0, z: -5.5 }] 
            }
        }
    },
    TEST: {
        scale: 0.8,
        engineColor: "#00FF88",
        glowColor: "#00FFAA",
        model: {
            head: { radius: 1.2, length: 6 },
            cockpit: { radius: 0.8, position: { x: 0, y: 0.3, z: 0.5 } },
            body: { width: 1.5, height: 0.8, length: 4 },
            wings: { width: 8, height: 0.3, length: 2 },
            engine: { radius: 1, length: 0.4, position: { x: 0, y: 0, z: -2.5 } },
            glow: { radius: 1.5, length: 0.2, position: { x: 0, y: 0, z: -3 } }
        }
    }
};

// 부스터 효과 색상
export const BOOSTER_COLORS = {
    ACTIVE_ENGINE: 0xFFFF00,    // 노란색
    ACTIVE_GLOW: 0xFFAA00,      // 주황-노랑
    ACTIVE_OPACITY: 1.0,
    ACTIVE_GLOW_OPACITY: 0.8,
    ACTIVE_SCALE: 1.5,
    INACTIVE_OPACITY: 0.0,
    INACTIVE_SCALE: 1.0
};

// UI 색상
export const UI_COLORS = {
    SUCCESS: '#4CAF50',
    WARNING: '#FF9800', 
    ERROR: '#F44336',
    INFO: '#2196F3'
};

// 효과 기본값
export const EFFECT_DEFAULTS = {
    EXPLOSION: {
        color: "#FF4400",
        glowColor: "#FFAA00",
        particleColors: ["#FF4400", "#FFAA00", "#FF0000", "#FFFF00"],
        radius: 1,
        opacity: 1.0,
        particleCount: 20,
        particleRadius: 0.2
    },
    BULLET: {
        color: "#FFFF00",
        trailColor: "#FF8800"
    }
};

// 재질 투명도
export const MATERIAL_OPACITY = {
    COCKPIT: 0.3,
    FIGHTER_GLOW: 0.4,
    HEAVY_GLOW: 0.5,
    TEST_GLOW: 0.6,
    EXPLOSION_GLOW: 0.3
};

// 기본 Canvas 설정
export const CANVAS_DEFAULTS = {
    TEXT_WIDTH: 512,
    TEXT_HEIGHT: 256,
    LINE_HEIGHT: 60
};

// 조종석 기본 색상
export const COCKPIT_COLOR = 0x87CEEB;

// 회전 설정
export const ROTATION_SETTINGS = {
    ORDER: 'YXZ'  // 요(Y) -> 피치(X) -> 롤(Z) 순서
}; 