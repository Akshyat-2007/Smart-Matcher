import { MATCHING_WEIGHTS, BAD_MATCH_THRESHOLD } from './weights.js';
import { passesHardFilters, getSharedSlots, getSharedTools } from './filters.js';
import {
  scorePair,
  calculateComplementarityScore,
  calculateTemporalScore,
  calculateAcademicNeedsScore,
  calculateCommFitScore,
  calculateReliabilityScore
} from './scoring.js';
import {
  runIrvingMatching,
  greedyMatchingWithSwapImprovement,
  mergeLeftoversIntoGroups
} from './stableRoommates.js';
import { computeNewReliability, shouldTriggerReshuffle } from './feedback.js';

/**
 * Main Matchmaking Engine
 * Runs Irving's stable roommates with greedy 2-opt fallback,
 * followed by group 3-4 leftover merging.
 */
export function runMatchingEngine(candidates, options = {}) {
  const weights = options.weights || MATCHING_WEIGHTS;
  const allowGroupMerging = options.allowGroupMerging !== false;

  if (!candidates || candidates.length < 2) {
    return {
      groups: [],
      unmatched: candidates ? [...candidates] : [],
      stats: {
        totalCandidates: candidates ? candidates.length : 0,
        matchedCount: 0,
        unmatchedCount: candidates ? candidates.length : 0,
        averageScore: 0,
        badMatchesCount: 0
      }
    };
  }

  // 1. Run Irving's Stable Matching (with greedy + 2-opt fallback)
  const { pairs, unmatched: rawUnmatched } = runIrvingMatching(candidates, weights);

  // 2. Optionally merge leftovers into 3-4 member groups
  let finalGroups = pairs;
  let finalUnmatched = rawUnmatched;

  if (allowGroupMerging && rawUnmatched.length > 0 && pairs.length > 0) {
    const mergeResult = mergeLeftoversIntoGroups(pairs, rawUnmatched, weights);
    finalGroups = mergeResult.groups;
    finalUnmatched = mergeResult.leftoverUnmatched;
  }

  // 3. Compute stats and quality metrics
  let totalScoreSum = 0;
  let badMatches = 0;
  const enrichedGroups = [];

  for (const group of finalGroups) {
    const members = group.members;
    // Compute best shared slots & tools
    let commonSlots = members[0].slots || [];
    let commonTools = (members[0].tools || []).map(t => typeof t === 'string' ? t.toLowerCase() : t.tool.toLowerCase());

    for (let i = 1; i < members.length; i++) {
      const sSet = new Set((members[i].slots || []).map(s => `${s.day ?? s.day_of_week}_${s.slot ?? s.slot_index}`));
      commonSlots = commonSlots.filter(s => sSet.has(`${s.day ?? s.day_of_week}_${s.slot ?? s.slot_index}`));

      const tSet = new Set((members[i].tools || []).map(t => typeof t === 'string' ? t.toLowerCase() : t.tool.toLowerCase()));
      commonTools = commonTools.filter(t => tSet.has(t));
    }

    // Pair teach-swap topics (between member 0 and 1, or pair-wise)
    const teachSwap = scorePair(members[0], members[1], weights).suggestedTopics;

    totalScoreSum += group.score;
    if (group.score < BAD_MATCH_THRESHOLD) {
      badMatches++;
    }

    enrichedGroups.push({
      ...group,
      commonSlots,
      commonTools,
      suggestedTopics: teachSwap
    });
  }

  const matchedCount = candidates.length - finalUnmatched.length;
  const averageScore = finalGroups.length > 0
    ? Math.round((totalScoreSum / finalGroups.length) * 100) / 100
    : 0;

  return {
    groups: enrichedGroups,
    unmatched: finalUnmatched,
    stats: {
      totalCandidates: candidates.length,
      matchedCount,
      unmatchedCount: finalUnmatched.length,
      averageScore,
      badMatchesCount: badMatches
    }
  };
}

export {
  MATCHING_WEIGHTS,
  BAD_MATCH_THRESHOLD,
  passesHardFilters,
  getSharedSlots,
  getSharedTools,
  scorePair,
  calculateComplementarityScore,
  calculateTemporalScore,
  calculateAcademicNeedsScore,
  calculateCommFitScore,
  calculateReliabilityScore,
  runIrvingMatching,
  greedyMatchingWithSwapImprovement,
  mergeLeftoversIntoGroups,
  computeNewReliability,
  shouldTriggerReshuffle
};

export default runMatchingEngine;
