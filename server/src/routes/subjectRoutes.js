import { Router } from 'express';
import { subjectController } from '../controllers/subjectController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

// Fields & Catalog
router.get('/fields', subjectController.getFields);
router.get('/', subjectController.getSubjects);
router.get('/quiz', subjectController.getDiagnosticQuiz);
router.post('/quiz/submit', optionalAuth, subjectController.submitDiagnosticQuiz);
router.get('/:slug', subjectController.getSubjectBySlug);

export default router;
