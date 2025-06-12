import express from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

export const createUserRoutes = (userController, userService) => {
  const router = express.Router();

  // 공개 엔드포인트 (인증 불필요)
  router.post('/guest', userController.createGuest.bind(userController));
  router.post('/register', userController.register.bind(userController));
  router.post('/login', userController.login.bind(userController));

  // 인증이 필요한 엔드포인트
  router.get('/profile', 
    authenticateToken(userService), 
    userController.getProfile.bind(userController)
  );

  router.put('/vehicle-settings', 
    authenticateToken(userService), 
    userController.updateVehicleSettings.bind(userController)
  );

  router.post('/game-stats', 
    authenticateToken(userService), 
    userController.updateGameStats.bind(userController)
  );

  router.get('/verify-token', 
    authenticateToken(userService), 
    userController.verifyToken.bind(userController)
  );

  // 관리자용 엔드포인트 (향후 확장)
  router.get('/list', 
    authenticateToken(userService), 
    userController.getUsers.bind(userController)
  );

  return router;
};

export default createUserRoutes; 