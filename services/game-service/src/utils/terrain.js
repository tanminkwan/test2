/**
 * 지형 높이 계산 함수
 * @param {number} x 
 * @param {number} z 
 * @param {object} config 
 * @returns {number}
 */
export function getTerrainHeight(x, z, config) {
    const {
        baseHeight,
        noise1Scale,
        noise1Factor,
        noise2Scale,
        noise2Factor,
        noise3Scale,
        noise3Factor,
        noise4Scale,
        noise4Factor
    } = config;

    const height =
        baseHeight +
        Math.sin(x * noise1Scale) * noise1Factor +
        Math.cos(z * noise1Scale) * noise1Factor +
        Math.sin(x * noise2Scale) * noise2Factor +
        Math.cos(z * noise2Scale) * noise2Factor +
        Math.sin(x * noise3Scale) * noise3Factor +
        Math.cos(z * noise3Scale) * noise3Factor +
        Math.sin(x * noise4Scale) * noise4Factor +
        Math.cos(z * noise4Scale) * noise4Factor;

    return height;
} 