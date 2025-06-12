import axios from 'axios';

/**
 * User Service 클라이언트
 * 기존 게임 서버에서 User Service와 통신하기 위한 클래스
 */
export class UserServiceClient {
  constructor(baseURL = 'http://localhost:3002', timeout = 5000) {
    this.client = axios.create({
      baseURL: baseURL,
      timeout: timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // 요청 인터셉터 (로깅용)
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[UserService] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[UserService] Request error:', error);
        return Promise.reject(error);
      }
    );

    // 응답 인터셉터 (에러 처리)
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('[UserService] Response error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * 게스트 사용자 생성 (기존 joinGame 로직 대체)
   */
  async createGuestUser(username, vehicleType = 'fighter') {
    try {
      const response = await this.client.post('/api/users/guest', {
        username,
        vehicleType
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create guest user:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'User service unavailable' 
      };
    }
  }

  /**
   * 사용자 프로필 조회
   */
  async getUserProfile(token) {
    try {
      const response = await this.client.get('/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to get user profile' 
      };
    }
  }

  /**
   * 게임 통계 업데이트
   */
  async updateGameStats(token, gameResult) {
    try {
      const response = await this.client.post('/api/users/game-stats', gameResult, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to update game stats:', error);
      // 통계 업데이트 실패는 게임 진행에 영향을 주지 않도록 조용히 처리
      return { success: false };
    }
  }

  /**
   * 차량 설정 업데이트
   */
  async updateVehicleSettings(token, vehicleType, customization = {}) {
    try {
      const response = await this.client.put('/api/users/vehicle-settings', {
        vehicleType,
        customization
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to update vehicle settings:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to update vehicle settings' 
      };
    }
  }

  /**
   * 토큰 검증
   */
  async verifyToken(token) {
    try {
      const response = await this.client.get('/api/users/verify-token', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to verify token:', error);
      return { 
        success: false, 
        valid: false,
        message: error.response?.data?.message || 'Invalid token' 
      };
    }
  }

  /**
   * User Service 헬스체크
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return {
        success: true,
        healthy: response.data.status === 'healthy',
        data: response.data
      };
    } catch (error) {
      console.error('User service health check failed:', error);
      return {
        success: false,
        healthy: false,
        message: error.message
      };
    }
  }

  /**
   * 사용자 목록 조회 (관리자용)
   */
  async getUsers(token, page = 1, limit = 10, filters = {}) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters
      });

      const response = await this.client.get(`/api/users/list?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get users:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to get users' 
      };
    }
  }

  /**
   * 연결 상태 확인
   */
  async isConnected() {
    const health = await this.healthCheck();
    return health.healthy;
  }
}

export default UserServiceClient; 