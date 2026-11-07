import { runMatchingEngine, scorePair } from '../matching/index.js';
import { dataAccess } from '../services/dataAccess.js';

export const matchController = {
  // POST /api/match/run
  async runMatch(req, res) {
    try {
      const subjectSlug = req.body.subjectSlug || req.body.courseCode || 'dsa';
      console.log(`[MATCH RUN] Initiating matching engine for subject: ${subjectSlug}`);

      // 1. Fetch unmatched candidates with full profile (strengths, gaps, slots, tools)
      const candidates = await dataAccess.getUnmatchedCandidatesForSubject(subjectSlug);

      if (candidates.length < 2) {
        return res.json({
          message: `Not enough unmatched students in ${subjectSlug} to form new pairs (current pool: ${candidates.length}).`,
          stats: { totalCandidates: candidates.length, matchedCount: 0, unmatchedCount: candidates.length, averageScore: 0 },
          groups: [],
          unmatchedCount: candidates.length
        });
      }

      // 2. Run Pure Matching Engine (Hard filters -> Multi-dimensional weighted scoring -> Irving Stable / Greedy 2-opt -> Leftover 3-4 merging)
      const engineResult = runMatchingEngine(candidates, { allowGroupMerging: true });

      // 3. Persist new matches, sessions, notifications to database
      const createdMatches = await dataAccess.saveMatches(engineResult.groups, subjectSlug);

      return res.json({
        message: `Successfully formed ${engineResult.groups.length} study groups for ${subjectSlug}.`,
        stats: engineResult.stats,
        groups: engineResult.groups.map((g, idx) => ({
          groupId: createdMatches[idx]?.matchId || idx + 1,
          score: g.score,
          strategy: g.strategy,
          members: g.members.map(m => ({ id: m.id, name: m.name, email: m.email })),
          commonSlots: g.commonSlots,
          commonTools: g.commonTools,
          suggestedTopics: g.suggestedTopics
        })),
        unmatchedCount: engineResult.unmatched.length
      });
    } catch (err) {
      console.error('[MATCH RUN ERROR]', err);
      return res.status(500).json({ error: 'Failed to execute matching engine.' });
    }
  },

  // GET /api/match/me
  async getMyMatch(req, res) {
    try {
      const userId = req.user.id;
      const activeMatch = await dataAccess.getUserActiveMatch(userId);

      if (!activeMatch) {
        return res.json({
          hasMatch: false,
          message: 'You are not currently in an active study group. Complete onboarding to join the pool!'
        });
      }

      // Compute pairwise compatibility breakdown with first partner
      const partner = activeMatch.members.find(m => m.id !== userId);
      let compatibilityBreakdown = null;
      let suggestedTeachSwap = null;

      if (partner) {
        const myCandidates = await dataAccess.getUnmatchedCandidatesForSubject(activeMatch.subjectSlug);
        const myProfile = myCandidates.find(c => c.id === userId) || { id: userId, strengths: ['Arrays'], gaps: ['Graphs'], slots: [{ day: 0, slot: 3 }], tools: ['discord'], goal: 'exam_prep' };
        const partnerProfile = myCandidates.find(c => c.id === partner.id) || { id: partner.id, strengths: ['Graphs'], gaps: ['Arrays'], slots: [{ day: 0, slot: 3 }], tools: ['discord'], goal: 'exam_prep' };

        const scoreObj = scorePair(myProfile, partnerProfile);
        compatibilityBreakdown = scoreObj.breakdown;
        suggestedTeachSwap = scoreObj.suggestedTopics;
      }

      return res.json({
        hasMatch: true,
        match: activeMatch,
        compatibilityBreakdown,
        suggestedTeachSwap
      });
    } catch (err) {
      console.error('[GET MY MATCH ERROR]', err);
      return res.status(500).json({ error: 'Failed to retrieve match information.' });
    }
  }
};
