import { VehicleDestroyedScenario } from './vehicle-destroyed.js';
import { PlayerScoreScenario } from './player-score.js';
import { GameStateScenario } from './game-state.js';
import { ExplosionScenario } from './explosion.js';
import { BillboardDestroyedScenario } from './billboard-destroyed.js';

/**
 * 사용 가능한 모든 시나리오를 로드합니다.
 * @returns {Object} 시나리오 이름을 키로 하고 시나리오 객체를 값으로 하는 객체
 */
export function loadScenarios() {
  return {
    'vehicle-destroyed': new VehicleDestroyedScenario(),
    'player-score': new PlayerScoreScenario(),
    'game-state': new GameStateScenario(),
    'explosion': new ExplosionScenario(),
    'billboard-destroyed': new BillboardDestroyedScenario()
  };
} 