import { Router } from 'express';
import { courseController } from '../controllers/courseController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', courseController.getCourses);
router.post('/onboarding', requireAuth, courseController.submitOnboarding);

export default router;
