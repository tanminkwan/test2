import { DataTypes } from 'sequelize';

/**
 * 사용자 모델 정의
 * 데이터베이스 독립적으로 설계됨
 */
export const UserModel = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50],
        isAlphanumeric: true
      }
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: true // 게스트 사용자의 경우
    },
    isGuest: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    preferredVehicleType: {
      type: DataTypes.ENUM('fighter', 'heavy'),
      defaultValue: 'fighter'
    },
    // SQLite는 JSONB를 지원하지 않으므로 JSON 사용
    gameStats: {
      type: DataTypes.JSON,
      defaultValue: {
        totalKills: 0,
        totalDeaths: 0,
        totalGames: 0,
        totalScore: 0,
        bestScore: 0,
        playTime: 0
      },
      get() {
        const value = this.getDataValue('gameStats');
        return typeof value === 'string' ? JSON.parse(value) : value;
      },
      set(value) {
        this.setDataValue('gameStats', JSON.stringify(value));
      }
    },
    customization: {
      type: DataTypes.JSON,
      defaultValue: {
        vehicleColor: null,
        unlockedItems: [],
        equippedItems: []
      },
      get() {
        const value = this.getDataValue('customization');
        return typeof value === 'string' ? JSON.parse(value) : value;
      },
      set(value) {
        this.setDataValue('customization', JSON.stringify(value));
      }
    },
    gamePoints: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lastLoginAt: {
      type: DataTypes.DATE
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    indexes: [
      { fields: ['username'] },
      { fields: ['email'] },
      { fields: ['isActive'] }
    ],
    // SQLite 호환성을 위한 설정
    hooks: {
      beforeCreate: (user) => {
        // JSON 필드 초기화
        if (!user.gameStats) {
          user.gameStats = {
            totalKills: 0,
            totalDeaths: 0,
            totalGames: 0,
            totalScore: 0,
            bestScore: 0,
            playTime: 0
          };
        }
        if (!user.customization) {
          user.customization = {
            vehicleColor: null,
            unlockedItems: [],
            equippedItems: []
          };
        }
      }
    }
  });

  return User;
};

/**
 * 데이터베이스 독립적인 사용자 리포지토리 인터페이스
 */
export class UserRepository {
  constructor(userModel) {
    this.User = userModel;
  }

  /**
   * 사용자 생성
   */
  async create(userData) {
    return await this.User.create(userData);
  }

  /**
   * ID로 사용자 조회
   */
  async findById(id) {
    return await this.User.findByPk(id);
  }

  /**
   * 사용자명으로 사용자 조회
   */
  async findByUsername(username) {
    return await this.User.findOne({ where: { username } });
  }

  /**
   * 이메일로 사용자 조회
   */
  async findByEmail(email) {
    return await this.User.findOne({ where: { email } });
  }

  /**
   * 사용자 업데이트
   */
  async update(id, updateData) {
    const user = await this.findById(id);
    if (!user) return null;
    return await user.update(updateData);
  }

  /**
   * 사용자 삭제 (소프트 삭제)
   */
  async softDelete(id) {
    return await this.update(id, { isActive: false });
  }

  /**
   * 사용자 목록 조회 (페이징)
   */
  async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      where = {},
      order = [['createdAt', 'DESC']]
    } = options;

    const offset = (page - 1) * limit;

    return await this.User.findAndCountAll({
      where,
      limit,
      offset,
      order
    });
  }

  /**
   * 활성 사용자 수 조회
   */
  async countActiveUsers() {
    return await this.User.count({
      where: { isActive: true }
    });
  }

  /**
   * 게스트 사용자 수 조회
   */
  async countGuestUsers() {
    return await this.User.count({
      where: { isGuest: true, isActive: true }
    });
  }

  /**
   * 통계 조회
   */
  async getStatistics() {
    const totalUsers = await this.User.count();
    const activeUsers = await this.countActiveUsers();
    const guestUsers = await this.countGuestUsers();
    const registeredUsers = await this.User.count({
      where: { isGuest: false, isActive: true }
    });

    return {
      totalUsers,
      activeUsers,
      guestUsers,
      registeredUsers
    };
  }
}

export default UserModel; 