import { createRNG } from '../server/src/db/seedData.js';
import { scorePair, passesHardFilters, runMatchingEngine, BAD_MATCH_THRESHOLD } from '../server/src/matching/index.js';

export function isBadMatch(studentA, studentB, pairScore) {
  // Hard failure
  if (!passesHardFilters(studentA, studentB)) return true;
  // Zero score or below minimum viable study quality threshold
  if (pairScore.totalScore < BAD_MATCH_THRESHOLD) return true;
  // Zero skill teach-swap complementarity
  if (pairScore.breakdown.complementarity === 0) return true;
  return false;
}

// Strategy 1: Random Pairing (traditional ad-hoc student pairing)
export function runRandomStrategy(students, seed = 777) {
  const rng = createRNG(seed);
  const shuffled = [...students].sort(() => rng() - 0.5);

  const pairs = [];
  let totalScoreSum = 0;
  let badMatchesCount = 0;

  for (let i = 0; i < shuffled.length - 1; i += 2) {
    const a = shuffled[i];
    const b = shuffled[i + 1];
    const pairScore = scorePair(a, b);
    const score = pairScore.totalScore;
    const bad = isBadMatch(a, b, pairScore);

    if (bad) badMatchesCount++;
    totalScoreSum += score;

    pairs.push({
      members: [a, b],
      score,
      isBadMatch: bad
    });
  }

  const avgScore = pairs.length > 0 ? Math.round((totalScoreSum / pairs.length) * 100) / 100 : 0;
  return {
    strategyName: 'Random Pairing',
    pairs,
    totalPairs: pairs.length,
    averageScore: avgScore,
    badMatchesCount,
    badMatchRate: Math.round((badMatchesCount / pairs.length) * 1000) / 10
  };
}

// Strategy 2: Naive Greedy Pairing (first-available slot match without teach-swap optimization)
export function runNaiveGreedyStrategy(students) {
  const unmatched = [...students];
  const matched = new Set();
  const pairs = [];
  let totalScoreSum = 0;
  let badMatchesCount = 0;

  for (let i = 0; i < unmatched.length; i++) {
    const a = unmatched[i];
    if (matched.has(a.id)) continue;

    let bestB = null;
    let bestScoreObj = null;

    for (let j = i + 1; j < unmatched.length; j++) {
      const b = unmatched[j];
      if (matched.has(b.id)) continue;

      // Only check subject and temporal slot
      const subA = a.subjectSlug || a.courseCode || a.primarySubject;
      const subB = b.subjectSlug || b.courseCode || b.primarySubject;
      const sameSubject = (subA === subB);
      const aSlots = new Set((a.slots || []).map(s => `${s.day}_${s.slot}`));
      const hasSlot = (b.slots || []).some(s => aSlots.has(`${s.day}_${s.slot}`));

      if (sameSubject && hasSlot) {
        bestB = b;
        bestScoreObj = scorePair(a, b);
        break; // Greedily grab first available
      }
    }

    if (bestB) {
      matched.add(a.id);
      matched.add(bestB.id);
      const score = bestScoreObj.totalScore;
      const bad = isBadMatch(a, bestB, bestScoreObj);

      if (bad) badMatchesCount++;
      totalScoreSum += score;

      pairs.push({
        members: [a, bestB],
        score,
        isBadMatch: bad
      });
    }
  }

  const avgScore = pairs.length > 0 ? Math.round((totalScoreSum / pairs.length) * 100) / 100 : 0;
  return {
    strategyName: 'Naive Greedy (Slot-only)',
    pairs,
    totalPairs: pairs.length,
    averageScore: avgScore,
    badMatchesCount,
    badMatchRate: Math.round((badMatchesCount / pairs.length) * 1000) / 10
  };
}

// Strategy 3: Our Smart Matching Engine (Multi-dimensional + Irving's Stable Roommates + Group 3-4 merging)
export function runSmartEngineStrategy(students) {
  // Separate by subject for pure intra-subject stable matching
  const subjectMap = {};
  for (const s of students) {
    const sub = s.subjectSlug || s.courseCode || s.primarySubject || 'dsa';
    if (!subjectMap[sub]) subjectMap[sub] = [];
    subjectMap[sub].push(s);
  }

  const allGroups = [];
  for (const [, cohort] of Object.entries(subjectMap)) {
    if (cohort.length >= 2) {
      const res = runMatchingEngine(cohort, { allowGroupMerging: true });
      allGroups.push(...res.groups);
    }
  }

  let totalScoreSum = 0;
  let badMatchesCount = 0;

  const pairsEnriched = allGroups.map(g => {
    const pairScore = scorePair(g.members[0], g.members[1]);
    const bad = isBadMatch(g.members[0], g.members[1], pairScore);
    if (bad) badMatchesCount++;
    totalScoreSum += g.score;
    return {
      members: g.members,
      score: g.score,
      isBadMatch: bad
    };
  });

  const avgScore = pairsEnriched.length > 0 ? Math.round((totalScoreSum / pairsEnriched.length) * 100) / 100 : 0;
  return {
    strategyName: 'Smart Engine (Teach-Swap + Stable Roommates)',
    pairs: pairsEnriched,
    totalPairs: pairsEnriched.length,
    averageScore: avgScore,
    badMatchesCount,
    badMatchRate: Math.round((badMatchesCount / pairsEnriched.length) * 1000) / 10
  };
}
