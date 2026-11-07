import { z } from 'zod';
import { dataAccess } from '../services/dataAccess.js';

const submitQuizSchema = z.object({
  subjectSlugs: z.array(z.string()).min(1, 'Select at least 1 subject').max(3, 'Cannot select more than 3 subjects'),
  answers: z.record(z.string(), z.number().nullable().optional()).default({}),
  goal: z.enum(['exam_prep', 'project', 'weekly_homework']).default('exam_prep'),
  slots: z.array(z.object({
    day: z.number().min(0).max(6),
    slot: z.number().min(0).max(4)
  })).min(1, 'Select at least one availability slot'),
  tools: z.array(z.enum(['discord', 'zoom', 'campus'])).min(1, 'Select at least one tool'),
  frequency: z.enum(['1x', '2x', '3x']).default('2x'),
  manualAdjustments: z.object({
    strengths: z.array(z.string()).optional(),
    gaps: z.array(z.string()).optional()
  }).nullable().optional()
});

export const subjectController = {
  // GET /api/fields
  async getFields(req, res) {
    try {
      const fields = await dataAccess.getFields();
      return res.json({ fields });
    } catch (err) {
      console.error('[GET FIELDS ERROR]', err);
      return res.status(500).json({ error: 'Failed to retrieve academic fields.' });
    }
  },

  // GET /api/subjects
  async getSubjects(req, res) {
    try {
      const fieldId = req.query.field_id || req.query.fieldId || null;
      const subjects = await dataAccess.getSubjects(fieldId);
      return res.json({ subjects });
    } catch (err) {
      console.error('[GET SUBJECTS ERROR]', err);
      return res.status(500).json({ error: 'Failed to retrieve subjects catalog.' });
    }
  },

  // GET /api/subjects/:slug
  async getSubjectBySlug(req, res) {
    try {
      const { slug } = req.params;
      const subject = await dataAccess.getSubjectBySlug(slug);
      if (!subject) {
        return res.status(404).json({ error: `Subject not found: ${slug}` });
      }
      return res.json({ subject });
    } catch (err) {
      console.error('[GET SUBJECT SLUG ERROR]', err);
      return res.status(500).json({ error: 'Failed to retrieve subject details.' });
    }
  },

  // GET /api/subjects/quiz?subjects=dsa,python
  async getDiagnosticQuiz(req, res) {
    try {
      const rawSubjects = req.query.subjects || req.query.subject || 'dsa';
      const subjectSlugs = typeof rawSubjects === 'string'
        ? rawSubjects.split(',').map(s => s.trim()).filter(Boolean)
        : rawSubjects;

      const questions = await dataAccess.getDiagnosticQuiz(subjectSlugs);
      return res.json({
        subjects: subjectSlugs,
        totalQuestions: questions.length,
        questions
      });
    } catch (err) {
      console.error('[GET DIAGNOSTIC QUIZ ERROR]', err);
      return res.status(500).json({ error: 'Failed to generate diagnostic quiz.' });
    }
  },

  // POST /api/subjects/quiz/submit
  async submitDiagnosticQuiz(req, res) {
    try {
      const parsed = submitQuizSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const userId = req.user?.id || null;
      const result = await dataAccess.submitDiagnosticQuiz(userId, parsed.data);

      return res.json({
        message: 'Diagnostic quiz evaluated and study profile saved successfully.',
        ...result
      });
    } catch (err) {
      console.error('[SUBMIT DIAGNOSTIC QUIZ ERROR]', err);
      return res.status(500).json({ error: 'Failed to evaluate diagnostic quiz and save profile.' });
    }
  }
};
