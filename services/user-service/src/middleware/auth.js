import jwt from 'jsonwebtoken';

export const authenticateToken = (userService) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Access token required'
        });
      }

      const decoded = userService.verifyToken(token);
      if (!decoded) {
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }

      // 사용자 정보를 req.user에 저장
      req.user = decoded;
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

export const optionalAuth = (userService) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (token) {
        const decoded = userService.verifyToken(token);
        if (decoded) {
          req.user = decoded;
        }
      }

      next();
    } catch (error) {
      // 선택적 인증이므로 에러가 발생해도 계속 진행
      next();
    }
  };
};

export default { authenticateToken, optionalAuth }; 