import Joi from 'joi';

export class UserController {
  constructor(userService) {
    this.userService = userService;
  }

  /**
   * 게스트 사용자 생성 (기존 joinGame 로직 대체)
   */
  async createGuest(req, res) {
    try {
      const schema = Joi.object({
        username: Joi.string().alphanum().min(3).max(50).required(),
        vehicleType: Joi.string().valid('fighter', 'heavy').default('fighter')
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const result = await this.userService.createGuestUser(
        value.username, 
        value.vehicleType
      );

      res.status(201).json(result);
    } catch (error) {
      console.error('Create guest user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * 일반 사용자 등록
   */
  async register(req, res) {
    try {
      const schema = Joi.object({
        username: Joi.string().alphanum().min(3).max(50).required(),
        password: Joi.string().min(6).max(100).required(),
        email: Joi.string().email().optional(),
        vehicleType: Joi.string().valid('fighter', 'heavy').default('fighter')
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const result = await this.userService.registerUser(
        value.username,
        value.password,
        value.email,
        value.vehicleType
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      console.error('Register user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * 사용자 인증 (향후 확장용)
   */
  async login(req, res) {
    try {
      const schema = Joi.object({
        username: Joi.string().required(),
        password: Joi.string().required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const result = await this.userService.authenticateUser(
        value.username,
        value.password
      );

      if (!result.success) {
        return res.status(401).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * 사용자 정보 조회
   */
  async getProfile(req, res) {
    try {
      const user = await this.userService.getUserById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        user
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * 차량 설정 업데이트
   */
  async updateVehicleSettings(req, res) {
    try {
      const schema = Joi.object({
        vehicleType: Joi.string().valid('fighter', 'heavy').required(),
        customization: Joi.object().optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const user = await this.userService.updateVehiclePreference(
        req.user.userId,
        value.vehicleType,
        value.customization
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        user
      });
    } catch (error) {
      console.error('Update vehicle settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * 게임 결과 업데이트
   */
  async updateGameStats(req, res) {
    try {
      const schema = Joi.object({
        kills: Joi.number().integer().min(0).default(0),
        deaths: Joi.number().integer().min(0).default(0),
        score: Joi.number().integer().min(0).default(0),
        playTime: Joi.number().integer().min(0).default(0),
        pointsEarned: Joi.number().integer().min(0).default(0)
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const user = await this.userService.updateUserStats(
        req.user.userId,
        value
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        user
      });
    } catch (error) {
      console.error('Update game stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * 사용자 목록 조회 (관리자용)
   */
  async getUsers(req, res) {
    try {
      const schema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        isGuest: Joi.boolean().optional(),
        isActive: Joi.boolean().optional()
      });

      const { error, value } = schema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const filters = {};
      if (value.isGuest !== undefined) filters.isGuest = value.isGuest;
      if (value.isActive !== undefined) filters.isActive = value.isActive;

      const result = await this.userService.getUsers(
        value.page,
        value.limit,
        filters
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * 토큰 검증 (미들웨어용)
   */
  async verifyToken(req, res) {
    try {
      const user = await this.userService.getUserById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        user,
        valid: true
      });
    } catch (error) {
      console.error('Verify token error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

export default UserController; 