import { MATCHING_WEIGHTS } from './weights.js';
import { passesHardFilters, getSharedSlots, getSharedTools } from './filters.js';

/**
 * Pure Scoring Module
 * Evaluates pair compatibility on a scale of 0 to 100.
 */

// 1. Skill Complementarity Score (Harmonic Mean of directional coverages)
export function calculateComplementarityScore(studentA, studentB) {
  const strengthsA = new Set(studentA.strengths || []);
  const gapsA = new Set(studentA.gaps || []);
  const strengthsB = new Set(studentB.strengths || []);
  const gapsB = new Set(studentB.gaps || []);

  if (gapsA.size === 0 && gapsB.size === 0) return 0.5;

  // How well A covers B's gaps:
  let aCoversBCount = 0;
  for (const gap of gapsB) {
    if (strengthsA.has(gap)) aCoversBCount++;
  }
  const covAtoB = gapsB.size > 0 ? aCoversBCount / gapsB.size : 0.0;

  // How well B covers A's gaps:
  let bCoversACount = 0;
  for (const gap of gapsA) {
    if (strengthsB.has(gap)) bCoversACount++;
  }
  const covBtoA = gapsA.size > 0 ? bCoversACount / gapsA.size : 0.0;

  // If one side has 0 coverage, harmonic mean is strictly 0 (rejects one-sided pairs)
  if (covAtoB === 0 || covBtoA === 0) {
    return 0.0;
  }

  // Harmonic mean
  const harmonicMean = (2 * covAtoB * covBtoA) / (covAtoB + covBtoA);
  return Math.min(1.0, Math.max(0.0, harmonicMean));
}

// 2. Temporal Overlap Score
export function calculateTemporalScore(studentA, studentB) {
  const shared = getSharedSlots(studentA, studentB);
  if (shared.length === 0) return 0.0;

  const minSlots = Math.min(
    (studentA.slots || []).length || 1,
    (studentB.slots || []).length || 1
  );

  // Base overlap ratio
  const ratio = Math.min(1.0, shared.length / minSlots);

  // Bonus for having multiple shared slots (easier to reschedule)
  const slotBonus = Math.min(0.3, (shared.length - 1) * 0.1);

  return Math.min(1.0, ratio * 0.7 + slotBonus + 0.1);
}

// 3. Academic Needs Score
export function calculateAcademicNeedsScore(studentA, studentB) {
  const goalA = studentA.goal || studentA.needs_goal;
  const goalB = studentB.goal || studentB.needs_goal;
  if (!goalA || !goalB) return 0.5;
  return goalA === goalB ? 1.0 : 0.35;
}

// 4. Communication Preference Fit Score
export function calculateCommFitScore(studentA, studentB) {
  const sharedTools = getSharedTools(studentA, studentB);
  if (sharedTools.length === 0) return 0.0;

  const toolsA = studentA.tools || [];
  const toolsB = studentB.tools || [];
  const toolRatio = sharedTools.length / Math.max(1, Math.max(toolsA.length, toolsB.length));

  // Frequency matching (e.g. 1x, 2x, 3x)
  const parseFreq = (f) => parseInt(String(f).replace(/\D/g, '') || '2', 10);
  const freqDiff = Math.abs(parseFreq(studentA.frequency) - parseFreq(studentB.frequency));
  const freqScore = Math.max(0.0, 1.0 - freqDiff * 0.4);

  return Math.min(1.0, toolRatio * 0.5 + freqScore * 0.5);
}

// 5. Reliability Score Tie-Breaker
export function calculateReliabilityScore(studentA, studentB) {
  const relA = typeof studentA.reliability === 'number' ? studentA.reliability : (studentA.reliability_score ?? 1.0);
  const relB = typeof studentB.reliability === 'number' ? studentB.reliability : (studentB.reliability_score ?? 1.0);
  // Geometric mean keeps two reliable students together and pairs flaky with flaky
  return Math.min(1.0, Math.sqrt(Math.max(0.0, relA * relB)));
}

// Full Pair Scorer
export function scorePair(studentA, studentB, weights = MATCHING_WEIGHTS) {
  if (!passesHardFilters(studentA, studentB)) {
    return {
      eligible: false,
      totalScore: 0.0,
      breakdown: {
        complementarity: 0,
        temporal: 0,
        academicNeeds: 0,
        commPreference: 0,
        reliability: 0
      },
      suggestedTopics: {
        aTeachesB: [],
        bTeachesA: []
      }
    };
  }

  const sComp = calculateComplementarityScore(studentA, studentB);
  const sTemp = calculateTemporalScore(studentA, studentB);
  const sAcad = calculateAcademicNeedsScore(studentA, studentB);
  const sComm = calculateCommFitScore(studentA, studentB);
  const sRel = calculateReliabilityScore(studentA, studentB);

  const totalScore = Math.round(
    (sComp * weights.complementarity +
     sTemp * weights.temporal +
     sAcad * weights.academicNeeds +
     sComm * weights.commPreference +
     sRel * weights.reliabilityTieBreaker) * 100
  ) / 100;

  // Extract teach-swap topics
  const strengthsA = new Set(studentA.strengths || []);
  const gapsB = new Set(studentB.gaps || []);
  const strengthsB = new Set(studentB.strengths || []);
  const gapsA = new Set(studentA.gaps || []);

  const aTeachesB = [...gapsB].filter(t => strengthsA.has(t));
  const bTeachesA = [...gapsA].filter(t => strengthsB.has(t));

  return {
    eligible: true,
    totalScore,
    breakdown: {
      complementarity: Math.round(sComp * weights.complementarity * 100) / 100,
      temporal: Math.round(sTemp * weights.temporal * 100) / 100,
      academicNeeds: Math.round(sAcad * weights.academicNeeds * 100) / 100,
      commPreference: Math.round(sComm * weights.commPreference * 100) / 100,
      reliability: Math.round(sRel * weights.reliabilityTieBreaker * 100) / 100
    },
    suggestedTopics: {
      aTeachesB,
      bTeachesA
    }
  };
}
