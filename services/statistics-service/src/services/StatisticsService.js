const logger = require('../utils/logger');

/**
 * 게임 통계를 제공하는 서비스 클래스
 */
class StatisticsService {
  /**
   * 통계 서비스 생성
   * @param {Object} dbManager - 데이터베이스 매니저 인스턴스
   */
  constructor(dbManager) {
    this.dbManager = dbManager;
  }

  /**
   * 플레이어 통계 조회
   * @param {string} playerId - 플레이어 ID
   * @returns {Object} 플레이어 통계 정보
   */
  async getPlayerStatistics(playerId) {
    try {
      return await this.dbManager.getPlayerStatistics(playerId);
    } catch (error) {
      logger.error(`Error in getPlayerStatistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * 통계 요약 조회
   * @returns {Object} 게임 통계 요약 정보
   */
  async getStatisticsSummary() {
    try {
      return await this.dbManager.getStatisticsSummary();
    } catch (error) {
      logger.error(`Error in getStatisticsSummary: ${error.message}`);
      throw error;
    }
  }

  /**
   * 무기 사용 통계 조회
   * @returns {Object} 무기 사용 통계 정보
   */
  async getWeaponStatistics() {
    try {
      return await this.dbManager.getWeaponStatistics();
    } catch (error) {
      logger.error(`Error in getWeaponStatistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * 시간별 활동 통계 조회
   * @param {string} period - 조회 기간 (예: '24h', '7d', '30d')
   * @returns {Object} 시간별 활동 통계 정보
   */
  async getActivityStatistics(period) {
    try {
      return await this.dbManager.getActivityStatistics(period);
    } catch (error) {
      logger.error(`Error in getActivityStatistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * 통계 데이터 내보내기
   * @param {string} format - 내보내기 형식 ('json', 'csv')
   * @param {string} type - 통계 유형 ('summary', 'player', 'weapon', 'activity')
   * @param {Object} params - 추가 매개변수
   * @returns {Object} 내보내기 데이터
   */
  async exportStatistics(format, type, params = {}) {
    try {
      let data;
      
      // 통계 유형에 따라 데이터 조회
      switch (type) {
        case 'summary':
          data = await this.getStatisticsSummary();
          break;
        case 'player':
          if (!params.playerId) {
            throw new Error('Player ID is required for player statistics export');
          }
          data = await this.getPlayerStatistics(params.playerId);
          break;
        case 'weapon':
          data = await this.getWeaponStatistics();
          break;
        case 'activity':
          data = await this.getActivityStatistics(params.period || '24h');
          break;
        default:
          throw new Error(`Unknown statistics type: ${type}`);
      }
      
      // 내보내기 형식에 따라 변환
      switch (format) {
        case 'json':
          return {
            format: 'json',
            data: JSON.stringify(data, null, 2),
            contentType: 'application/json'
          };
        case 'csv':
          return {
            format: 'csv',
            data: this.convertToCSV(data, type),
            contentType: 'text/csv'
          };
        default:
          throw new Error(`Unknown export format: ${format}`);
      }
    } catch (error) {
      logger.error(`Error in exportStatistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * 객체를 CSV 형식으로 변환
   * @param {Object} data - 변환할 데이터
   * @param {string} type - 통계 유형
   * @returns {string} CSV 형식 문자열
   */
  convertToCSV(data, type) {
    try {
      let csv = '';
      
      switch (type) {
        case 'summary':
          // 이벤트 통계
          csv += 'Event Type,Count\n';
          data.eventStats.forEach(stat => {
            csv += `${stat.event_type},${stat.count}\n`;
          });
          
          csv += '\nTop Players\n';
          csv += 'Player ID,Username,Score\n';
          data.topPlayers.forEach(player => {
            csv += `${player.id},${player.username},${player.total_score}\n`;
          });
          break;
          
        case 'player':
          // 플레이어 정보
          csv += `Player ID,${data.player.id}\n`;
          csv += `Username,${data.player.username}\n`;
          csv += `Created At,${data.player.createdAt}\n\n`;
          
          // 이벤트 통계
          csv += 'Event Type,Count\n';
          data.events.forEach(event => {
            csv += `${event.event_type},${event.count}\n`;
          });
          break;
          
        case 'weapon':
          // 무기 사용 통계
          csv += 'Weapon Type,Usage Count,Total Damage\n';
          data.weaponUsage.forEach(stat => {
            csv += `${stat.weaponType},${stat.usage_count},${stat.total_damage}\n`;
          });
          
          csv += '\nWeapon Kills\n';
          csv += 'Weapon Type,Kill Count\n';
          data.weaponKills.forEach(stat => {
            csv += `${stat.weapon_type},${stat.kill_count}\n`;
          });
          break;
          
        case 'activity':
          // 시간별 활동
          csv += 'Time,Event Count\n';
          data.activityTimeline.forEach(point => {
            csv += `${point.time},${point.event_count}\n`;
          });
          break;
          
        default:
          throw new Error(`Unknown statistics type for CSV conversion: ${type}`);
      }
      
      return csv;
    } catch (error) {
      logger.error(`Error converting to CSV: ${error.message}`);
      throw error;
    }
  }
}

module.exports = { StatisticsService }; 