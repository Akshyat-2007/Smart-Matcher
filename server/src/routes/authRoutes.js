import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/demo-login', authController.demoLogin);
router.get('/me', requireAuth, authController.me);

export default router;
