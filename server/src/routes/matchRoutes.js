import { Router } from 'express';
import { matchController } from '../controllers/matchController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/run', requireAuth, matchController.runMatch);
router.get('/me', requireAuth, matchController.getMyMatch);

export default router;
