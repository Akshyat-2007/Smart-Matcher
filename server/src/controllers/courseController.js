import { z } from 'zod';
import { dataAccess } from '../services/dataAccess.js';

const onboardingSchema = z.object({
  courseCode: z.string().min(1, 'Course code is required'),
  goal: z.enum(['exam_prep', 'project', 'weekly_homework']).default('exam_prep'),
  strengths: z.array(z.string()).min(1, 'Select at least one strong topic'),
  gaps: z.array(z.string()).min(1, 'Select at least one gap topic'),
  slots: z.array(z.object({
    day: z.number().min(0).max(6),
    slot: z.number().min(0).max(5)
  })).min(1, 'Select at least one availability slot'),
  tools: z.array(z.enum(['discord', 'zoom', 'campus'])).min(1, 'Select at least one tool'),
  frequency: z.enum(['1x', '2x', '3x']).default('2x')
});

export const courseController = {
  async getCourses(req, res) {
    try {
      const courses = await dataAccess.getCourses();
      const enriched = await Promise.all(
        courses.map(async (c) => {
          const topics = await dataAccess.getTopicsByCourse(c.id);
          const quiz = dataAccess.getDiagnosticQuestions(c.code);
          return {
            ...c,
            topics,
            quiz
          };
        })
      );
      return res.json({ courses: enriched });
    } catch (err) {
      console.error('[COURSE LIST ERROR]', err);
      return res.status(500).json({ error: 'Failed to retrieve course catalog.' });
    }
  },

  async submitOnboarding(req, res) {
    try {
      const parsed = onboardingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const userId = req.user.id;
      await dataAccess.saveOnboardingProfile(userId, parsed.data);

      return res.json({
        message: 'Onboarding profile saved successfully. You are now in the matching pool!',
        data: parsed.data
      });
    } catch (err) {
      console.error('[ONBOARDING ERROR]', err);
      return res.status(500).json({ error: 'Failed to save student profile.' });
    }
  }
};
