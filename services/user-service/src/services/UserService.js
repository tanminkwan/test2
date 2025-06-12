import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

/**
 * 사용자 서비스 클래스
 * 데이터베이스 독립적인 비즈니스 로직 구현
 */
export class UserService {
  constructor(userRepository, config) {
    this.userRepository = userRepository;
    this.config = config;
  }

  /**
   * 게스트 사용자 생성 (기존 시스템과 호환)
   */
  async createGuestUser(username, vehicleType = 'fighter') {
    try {
      const user = await this.userRepository.create({
        username: username,
        isGuest: true,
        preferredVehicleType: vehicleType
      });

      const token = this.generateToken(user);
      
      return {
        success: true,
        user: this.sanitizeUser(user),
        token
      };
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        // 중복 사용자명인 경우 랜덤 접미사 추가
        const randomSuffix = Math.floor(Math.random() * 1000);
        return this.createGuestUser(`${username}_${randomSuffix}`, vehicleType);
      }
      throw error;
    }
  }

  /**
   * 일반 사용자 등록 (비밀번호 포함)
   */
  async registerUser(username, password, email = null, vehicleType = 'fighter') {
    try {
      console.log('📝 Registration attempt:', { username, hasPassword: !!password, email, vehicleType });
      
      // 사용자명 중복 확인
      const existingUser = await this.userRepository.findByUsername(username);
      if (existingUser) {
        console.log('❌ Username already exists');
        return {
          success: false,
          message: 'Username already exists'
        };
      }

      // 이메일 중복 확인 (이메일이 제공된 경우)
      if (email) {
        const existingEmail = await this.userRepository.findByEmail(email);
        if (existingEmail) {
          console.log('❌ Email already exists');
          return {
            success: false,
            message: 'Email already exists'
          };
        }
      }

      // 비밀번호 해시화
      const saltRounds = 10;
      console.log('🔐 Hashing password...');
      const passwordHash = await bcrypt.hash(password, saltRounds);
      console.log('✅ Password hashed successfully, length:', passwordHash.length);

      // 사용자 생성
      const userData = {
        username: username,
        passwordHash: passwordHash,
        email: email,
        isGuest: false,
        preferredVehicleType: vehicleType,
        isActive: true
      };
      console.log('👤 Creating user with data:', { 
        ...userData, 
        passwordHash: `[HASH:${passwordHash.length}chars]` 
      });

      const user = await this.userRepository.create(userData);
      console.log('✅ User created:', { 
        id: user.id, 
        username: user.username, 
        hasPasswordHash: !!user.passwordHash,
        passwordHashLength: user.passwordHash ? user.passwordHash.length : 0
      });

      const token = this.generateToken(user);
      
      return {
        success: true,
        user: this.sanitizeUser(user),
        token,
        message: 'User registered successfully'
      };
    } catch (error) {
      console.error('❌ Register user error:', error);
      return {
        success: false,
        message: 'Registration failed'
      };
    }
  }

  /**
   * 사용자 인증 (향후 확장용)
   */
  async authenticateUser(username, password) {
    console.log('🔍 Login attempt:', { username, hasPassword: !!password });
    
    const user = await this.userRepository.findByUsername(username);
    console.log('👤 Found user:', user ? { 
      id: user.id, 
      username: user.username, 
      isGuest: user.isGuest, 
      hasPasswordHash: !!user.passwordHash,
      isActive: user.isActive 
    } : 'null');

    if (!user || !user.isActive) {
      console.log('❌ User not found or inactive');
      return { success: false, message: 'User not found' };
    }

    // 게스트 사용자인 경우 비밀번호 없이 로그인 허용
    if (user.isGuest) {
      console.log('✅ Guest user login');
      // 로그인 시간 업데이트
      await this.userRepository.update(user.id, { lastLoginAt: new Date() });

      const token = this.generateToken(user);
      
      return {
        success: true,
        user: this.sanitizeUser(user),
        token
      };
    }

    // 일반 사용자인 경우 비밀번호 확인
    if (!user.passwordHash) {
      console.log('❌ User has no password hash');
      return { success: false, message: 'Invalid user data' };
    }

    console.log('🔐 Comparing passwords...');
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      console.log('❌ Invalid password');
      return { success: false, message: 'Invalid password' };
    }

    console.log('✅ Login successful');
    // 로그인 시간 업데이트
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    const token = this.generateToken(user);
    
    return {
      success: true,
      user: this.sanitizeUser(user),
      token
    };
  }

  /**
   * 사용자 정보 조회
   */
  async getUserById(userId) {
    const user = await this.userRepository.findById(userId);
    return user ? this.sanitizeUser(user) : null;
  }

  /**
   * 사용자 통계 업데이트
   */
  async updateUserStats(userId, gameResult) {
    const user = await this.userRepository.findById(userId);
    if (!user) return null;

    const currentStats = user.gameStats || {
      totalKills: 0,
      totalDeaths: 0,
      totalGames: 0,
      totalScore: 0,
      bestScore: 0,
      playTime: 0
    };

    const updatedStats = {
      totalKills: currentStats.totalKills + (gameResult.kills || 0),
      totalDeaths: currentStats.totalDeaths + (gameResult.deaths || 0),
      totalGames: currentStats.totalGames + 1,
      totalScore: currentStats.totalScore + (gameResult.score || 0),
      bestScore: Math.max(currentStats.bestScore, gameResult.score || 0),
      playTime: currentStats.playTime + (gameResult.playTime || 0)
    };

    const updatedUser = await this.userRepository.update(userId, { 
      gameStats: updatedStats,
      gamePoints: user.gamePoints + (gameResult.pointsEarned || 0)
    });

    return this.sanitizeUser(updatedUser);
  }

  /**
   * 차량 설정 업데이트
   */
  async updateVehiclePreference(userId, vehicleType, customization = {}) {
    const user = await this.userRepository.findById(userId);
    if (!user) return null;

    const currentCustomization = user.customization || {
      vehicleColor: null,
      unlockedItems: [],
      equippedItems: []
    };

    const updatedUser = await this.userRepository.update(userId, {
      preferredVehicleType: vehicleType,
      customization: {
        ...currentCustomization,
        ...customization
      }
    });

    return this.sanitizeUser(updatedUser);
  }

  /**
   * 사용자 목록 조회 (관리자용)
   */
  async getUsers(page = 1, limit = 10, filters = {}) {
    const where = {};

    if (filters.isGuest !== undefined) {
      where.isGuest = filters.isGuest;
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const result = await this.userRepository.findAll({
      page,
      limit,
      where
    });

    return {
      users: result.rows.map(user => this.sanitizeUser(user)),
      total: result.count,
      page,
      totalPages: Math.ceil(result.count / limit)
    };
  }

  /**
   * 사용자 통계 조회
   */
  async getUserStatistics() {
    return await this.userRepository.getStatistics();
  }

  /**
   * 사용자 비활성화
   */
  async deactivateUser(userId) {
    const user = await this.userRepository.softDelete(userId);
    return user ? this.sanitizeUser(user) : null;
  }

  /**
   * JWT 토큰 생성
   */
  generateToken(user) {
    console.log('🔑 User Service - Generating JWT token with secret:', this.config.jwtSecret);
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        isGuest: user.isGuest 
      },
      this.config.jwtSecret,
      { expiresIn: this.config.jwtExpiry }
    );
    console.log('🎫 Generated token preview:', token.substring(0, 50) + '...');
    return token;
  }

  /**
   * JWT 토큰 검증
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.config.jwtSecret);
    } catch (error) {
      return null;
    }
  }

  /**
   * 사용자 정보 정제 (민감한 정보 제거)
   */
  sanitizeUser(user) {
    const userData = user.toJSON ? user.toJSON() : user;
    delete userData.passwordHash;
    
    // JSON 필드가 문자열로 저장된 경우 파싱
    if (typeof userData.gameStats === 'string') {
      try {
        userData.gameStats = JSON.parse(userData.gameStats);
      } catch (e) {
        userData.gameStats = {
          totalKills: 0,
          totalDeaths: 0,
          totalGames: 0,
          totalScore: 0,
          bestScore: 0,
          playTime: 0
        };
      }
    }

    if (typeof userData.customization === 'string') {
      try {
        userData.customization = JSON.parse(userData.customization);
      } catch (e) {
        userData.customization = {
          vehicleColor: null,
          unlockedItems: [],
          equippedItems: []
        };
      }
    }

    return userData;
  }
}

export default UserService; 