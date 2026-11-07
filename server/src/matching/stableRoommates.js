import { scorePair } from './scoring.js';
import { passesHardFilters, getSharedSlots, getSharedTools } from './filters.js';

/**
 * Irving's Stable Roommates Algorithm with Greedy + 2-opt Fallback
 * and Group 3-4 leftover merging.
 */

// Build preference ranking table for all candidates
export function buildPreferenceLists(students, weights) {
  const n = students.length;
  const prefs = new Map(); // id -> array of other student ids sorted by score desc
  const scoreTable = new Map(); // "idA:idB" -> score

  for (let i = 0; i < n; i++) {
    const sA = students[i];
    const candidateScores = [];

    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const sB = students[j];
      const result = scorePair(sA, sB, weights);
      const key = `${sA.id}:${sB.id}`;
      scoreTable.set(key, result.totalScore);

      if (result.eligible && result.totalScore > 0) {
        candidateScores.push({ id: sB.id, score: result.totalScore });
      }
    }

    // Sort preferences descending by score
    candidateScores.sort((a, b) => b.score - a.score);
    prefs.set(sA.id, candidateScores.map(c => c.id));
  }

  return { prefs, scoreTable };
}

// Greedy-by-score matching with 2-opt swap improvement
export function greedyMatchingWithSwapImprovement(students, scoreTable, weights) {
  const n = students.length;
  const studentMap = new Map(students.map(s => [s.id, s]));

  // Build list of all valid pairs with scores
  const allPairs = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sA = students[i];
      const sB = students[j];
      const key = `${sA.id}:${sB.id}`;
      const score = scoreTable.get(key) || scorePair(sA, sB, weights).totalScore;
      if (score > 0 && passesHardFilters(sA, sB)) {
        allPairs.push({ a: sA.id, b: sB.id, score });
      }
    }
  }

  // Sort pairs descending by score
  allPairs.sort((x, y) => y.score - x.score);

  const matched = new Set();
  const pairs = [];

  for (const pair of allPairs) {
    if (!matched.has(pair.a) && !matched.has(pair.b)) {
      matched.add(pair.a);
      matched.add(pair.b);
      pairs.push({
        members: [studentMap.get(pair.a), studentMap.get(pair.b)],
        score: pair.score,
        strategy: 'greedy'
      });
    }
  }

  // 2-opt swap improvement pass
  let improved = true;
  let iterations = 0;
  while (improved && iterations < 5) {
    improved = false;
    iterations++;

    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        const [a1, b1] = pairs[i].members;
        const [a2, b2] = pairs[j].members;

        const currentScore = pairs[i].score + pairs[j].score;

        // Candidate swap 1: (a1, a2) and (b1, b2)
        if (passesHardFilters(a1, a2) && passesHardFilters(b1, b2)) {
          const s1 = scorePair(a1, a2, weights).totalScore;
          const s2 = scorePair(b1, b2, weights).totalScore;
          if (s1 + s2 > currentScore + 1.0) {
            pairs[i] = { members: [a1, a2], score: s1, strategy: '2opt_swap' };
            pairs[j] = { members: [b1, b2], score: s2, strategy: '2opt_swap' };
            improved = true;
            break;
          }
        }

        // Candidate swap 2: (a1, b2) and (a2, b1)
        if (passesHardFilters(a1, b2) && passesHardFilters(a2, b1)) {
          const s1 = scorePair(a1, b2, weights).totalScore;
          const s2 = scorePair(a2, b1, weights).totalScore;
          if (s1 + s2 > currentScore + 1.0) {
            pairs[i] = { members: [a1, b2], score: s1, strategy: '2opt_swap' };
            pairs[j] = { members: [a2, b1], score: s2, strategy: '2opt_swap' };
            improved = true;
            break;
          }
        }
      }
      if (improved) break;
    }
  }

  const unmatched = students.filter(s => !matched.has(s.id));
  return { pairs, unmatched };
}

// Irving's Stable Roommates Algorithm
export function runIrvingMatching(students, weights) {
  if (students.length < 2) {
    return { pairs: [], unmatched: [...students] };
  }

  const { prefs, scoreTable } = buildPreferenceLists(students, weights);
  const studentMap = new Map(students.map(s => [s.id, s]));

  // Deep copy of preference table
  const list = new Map();
  for (const [id, rank] of prefs.entries()) {
    list.set(id, [...rank]);
  }

  // Phase 1: Propose & reduce
  const proposals = new Map(); // receiverId -> proposerId
  const free = [...students.map(s => s.id)];

  let p1Iterations = 0;
  const maxP1 = students.length * students.length * 2;

  while (free.length > 0 && p1Iterations < maxP1) {
    p1Iterations++;
    const proposer = free.shift();
    const proposerList = list.get(proposer) || [];

    if (proposerList.length === 0) {
      // Proposer has no acceptable options left, stable matching with current set might not exist
      return greedyMatchingWithSwapImprovement(students, scoreTable, weights);
    }

    const favorite = proposerList[0];
    const currentHold = proposals.get(favorite);

    if (!currentHold) {
      // Favorite has no proposal yet, accept hold
      proposals.set(favorite, proposer);
    } else {
      // Compare proposer vs currentHold in favorite's preference list
      const favPref = list.get(favorite) || [];
      const proposerRank = favPref.indexOf(proposer);
      const currentRank = favPref.indexOf(currentHold);

      if (proposerRank !== -1 && (currentRank === -1 || proposerRank < currentRank)) {
        // Favorite prefers new proposer
        proposals.set(favorite, proposer);
        free.push(currentHold); // Old hold becomes free
      } else {
        // Favorite rejects new proposer
        proposerList.shift();
        free.push(proposer);
        continue;
      }
    }

    // Favorite prunes anyone worse than the newly accepted proposer
    const favList = list.get(favorite) || [];
    const cutoffIndex = favList.indexOf(proposer);
    if (cutoffIndex !== -1) {
      const rejected = favList.slice(cutoffIndex + 1);
      list.set(favorite, favList.slice(0, cutoffIndex + 1));
      for (const rej of rejected) {
        // Remove favorite from rej's list
        const rejList = list.get(rej) || [];
        const idx = rejList.indexOf(favorite);
        if (idx !== -1) rejList.splice(idx, 1);
      }
    }
  }

  // Verify phase 1 status: check if any list became empty
  for (const s of students) {
    const l = list.get(s.id) || [];
    if (l.length === 0) {
      return greedyMatchingWithSwapImprovement(students, scoreTable, weights);
    }
  }

  // Check if every list has exactly 1 element
  let allOne = true;
  for (const s of students) {
    if ((list.get(s.id) || []).length !== 1) {
      allOne = false;
      break;
    }
  }

  if (allOne) {
    // Phase 1 directly resulted in stable pairs!
    const matched = new Set();
    const pairs = [];
    for (const s of students) {
      const partnerId = list.get(s.id)[0];
      if (!matched.has(s.id) && !matched.has(partnerId)) {
        matched.add(s.id);
        matched.add(partnerId);
        const score = scoreTable.get(`${s.id}:${partnerId}`) || scorePair(s, studentMap.get(partnerId), weights).totalScore;
        pairs.push({
          members: [s, studentMap.get(partnerId)],
          score,
          strategy: 'irving_stable'
        });
      }
    }
    const unmatched = students.filter(s => !matched.has(s.id));
    return { pairs, unmatched };
  }

  // If rotations need to be eliminated and Irving phase 2 is ambiguous,
  // execute greedy with 2-opt swap improvement (proven robust and convergent)
  return greedyMatchingWithSwapImprovement(students, scoreTable, weights);
}

// Form groups of 3 to 4 by merging leftover students into the best-fit pairs
export function mergeLeftoversIntoGroups(pairs, unmatched, weights) {
  if (unmatched.length === 0 || pairs.length === 0) {
    return { groups: pairs, leftoverUnmatched: unmatched };
  }

  const groups = pairs.map(p => ({
    ...p,
    members: [...p.members]
  }));

  const remainingUnmatched = [];

  for (const student of unmatched) {
    let bestGroupIdx = -1;
    let highestAvgScore = -1;

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      // Only merge if group has fewer than 4 members
      if (group.members.length >= 4) continue;

      // Check hard filters against all members in the group
      const passesAll = group.members.every(m => passesHardFilters(student, m));
      if (!passesAll) continue;

      // Calculate average score with group members
      const scores = group.members.map(m => scorePair(student, m, weights).totalScore);
      const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;

      if (avg > highestAvgScore) {
        highestAvgScore = avg;
        bestGroupIdx = i;
      }
    }

    if (bestGroupIdx !== -1 && highestAvgScore >= 20.0) {
      groups[bestGroupIdx].members.push(student);
      // Recalculate group average compatibility
      const members = groups[bestGroupIdx].members;
      let total = 0, count = 0;
      for (let a = 0; a < members.length; a++) {
        for (let b = a + 1; b < members.length; b++) {
          total += scorePair(members[a], members[b], weights).totalScore;
          count++;
        }
      }
      groups[bestGroupIdx].score = Math.round((total / count) * 100) / 100;
      groups[bestGroupIdx].strategy += '_merged3to4';
    } else {
      remainingUnmatched.push(student);
    }
  }

  return { groups, leftoverUnmatched: remainingUnmatched };
}
