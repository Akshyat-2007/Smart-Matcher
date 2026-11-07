import { createRNG } from '../server/src/db/seedData.js';

/**
 * 4-Week Probabilistic Session Completion Model
 * 
 * Model Assumptions (Documented for README):
 * 1. Base Attendance: Proportional to match quality score S in [0, 100] and student reliability R.
 *    P_base = 0.20 + 0.75 * (S / 100). Baseline completion = P_base * R_avg.
 * 2. Without Accountability:
 *    - Natural asynchronous student attrition reduces retention by 10% each week.
 *    - Unaddressed missed sessions cause a 50% cascade dropout rate (fade-out effect).
 *    - Two missed sessions permanently dissolve the group.
 * 3. With Accountability:
 *    - Automated 24h nudges provide a +18% attendance boost.
 *    - Visible streaks provide a +5% weekly habit-formation boost.
 *    - Adaptive rescheduling prevents cascade dropout when a member is busy, recovering to 85% of baseline.
 *    - Reshuffle trigger flags and repairs broken groups after week 2.
 */

export function simulateCohortRetention(pairs, withAccountability = false, seed = 42) {
  const rng = createRNG(seed);
  const totalWeeks = 4;
  const weeklyAttendance = [0, 0, 0, 0]; // Count of sessions completed in weeks 1..4
  const weeklyRates = [0, 0, 0, 0];

  const pairStates = pairs.map(p => {
    const relA = p.members[0].reliability ?? 0.85;
    const relB = p.members[1].reliability ?? 0.85;
    const relAvg = (relA + relB) / 2;
    const pBase = Math.min(0.98, Math.max(0.15, 0.20 + 0.75 * (p.score / 100)));

    return {
      score: p.score,
      relAvg,
      pBase,
      consecutiveMisses: 0,
      streak: 0,
      dissolved: false
    };
  });

  for (let week = 0; week < totalWeeks; week++) {
    let completedThisWeek = 0;

    for (const state of pairStates) {
      if (state.dissolved) continue;

      let pAttend;
      if (!withAccountability) {
        // Without accountability: natural decay and cascade failure
        const naturalDecay = Math.pow(0.90, week);
        const cascadePenalty = state.consecutiveMisses > 0 ? 0.50 : 1.0;
        pAttend = state.pBase * state.relAvg * naturalDecay * cascadePenalty;
      } else {
        // With accountability: nudges (+18%), streak bonus (+5%/week), and adaptive rescue
        const nudgeBonus = 0.18;
        const streakBonus = Math.min(0.15, state.streak * 0.05);
        const adaptiveRescue = state.consecutiveMisses > 0 ? 0.85 : 1.0;
        pAttend = Math.min(0.98, (state.pBase * state.relAvg * adaptiveRescue + nudgeBonus + streakBonus));
      }

      const roll = rng();
      const attended = roll < pAttend;

      if (attended) {
        completedThisWeek++;
        state.streak++;
        state.consecutiveMisses = 0;
      } else {
        state.streak = 0;
        state.consecutiveMisses++;

        if (!withAccountability && state.consecutiveMisses >= 2) {
          state.dissolved = true; // Permanent fade-out
        } else if (withAccountability && state.consecutiveMisses >= 2 && week <= 2) {
          // Accountability reshuffle rescue: repaired partner resets state
          state.consecutiveMisses = 1;
        }
      }
    }

    weeklyAttendance[week] = completedThisWeek;
    weeklyRates[week] = Math.round((completedThisWeek / pairs.length) * 1000) / 10;
  }

  const totalPossibleSessions = pairs.length * totalWeeks;
  const totalCompletedSessions = weeklyAttendance.reduce((a, b) => a + b, 0);
  const overallRate = Math.round((totalCompletedSessions / totalPossibleSessions) * 1000) / 10;

  return {
    withAccountability,
    totalPairs: pairs.length,
    weeklyAttendance,
    weeklyRates,
    totalCompletedSessions,
    totalPossibleSessions,
    overallCompletionRate: overallRate
  };
}
