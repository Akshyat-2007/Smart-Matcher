import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  passesHardFilters,
  calculateComplementarityScore,
  calculateTemporalScore,
  calculateAcademicNeedsScore,
  calculateCommFitScore,
  calculateReliabilityScore,
  scorePair,
  runMatchingEngine,
  computeNewReliability,
  shouldTriggerReshuffle,
  MATCHING_WEIGHTS
} from '../server/src/matching/index.js';

describe('Matching Engine: Hard Filters', () => {
  const baseStudentA = {
    id: 1,
    courseCode: 'CS101',
    slots: [{ day: 0, slot: 2 }],
    tools: ['zoom'],
    strengths: ['DP'],
    gaps: ['Graphs']
  };

  const baseStudentB = {
    id: 2,
    courseCode: 'CS101',
    slots: [{ day: 0, slot: 2 }],
    tools: ['zoom'],
    strengths: ['Graphs'],
    gaps: ['DP']
  };

  it('passes when course, slots, and tools overlap', () => {
    assert.equal(passesHardFilters(baseStudentA, baseStudentB), true);
  });

  it('rejects pairs in different courses', () => {
    const diffCourse = { ...baseStudentB, courseCode: 'DATA200' };
    assert.equal(passesHardFilters(baseStudentA, diffCourse), false);
  });

  it('rejects pairs with zero shared availability slots', () => {
    const diffSlots = { ...baseStudentB, slots: [{ day: 3, slot: 4 }] };
    assert.equal(passesHardFilters(baseStudentA, diffSlots), false);
  });

  it('rejects pairs with zero shared communication tools', () => {
    const diffTools = { ...baseStudentB, tools: ['incompatible_custom'] };
    assert.equal(passesHardFilters(baseStudentA, diffTools), false);
  });

  it('rejects self-pairing', () => {
    assert.equal(passesHardFilters(baseStudentA, baseStudentA), false);
  });

  it('passes when matched on subjectSlug', () => {
    const student1 = { id: 10, subjectSlug: 'dsa', slots: [{ day: 1, slot: 2 }], tools: ['zoom'] };
    const student2 = { id: 11, subjectSlug: 'dsa', slots: [{ day: 1, slot: 2 }], tools: ['zoom'] };
    assert.equal(passesHardFilters(student1, student2), true);
  });

  it('rejects when subjectSlugs differ', () => {
    const student1 = { id: 10, subjectSlug: 'dsa', slots: [{ day: 1, slot: 2 }], tools: ['zoom'] };
    const student2 = { id: 11, subjectSlug: 'python', slots: [{ day: 1, slot: 2 }], tools: ['zoom'] };
    assert.equal(passesHardFilters(student1, student2), false);
  });

  it('passes when multi-subject arrays share at least one subject', () => {
    const student1 = { id: 20, subjects: ['dsa', 'dbms'], slots: [{ day: 2, slot: 3 }], tools: ['zoom'] };
    const student2 = { id: 21, subjects: ['web-dev', 'dbms'], slots: [{ day: 2, slot: 3 }], tools: ['zoom'] };
    assert.equal(passesHardFilters(student1, student2), true);
  });
});

describe('Matching Engine: Complementarity Scoring', () => {
  it('gives high score for mutual teach-swap pairs', () => {
    const studentA = {
      strengths: ['Dynamic Programming', 'Hash Tables'],
      gaps: ['Graphs & BFS', 'Binary Trees']
    };
    const studentB = {
      strengths: ['Graphs & BFS', 'Binary Trees'],
      gaps: ['Dynamic Programming', 'Hash Tables']
    };

    const compScore = calculateComplementarityScore(studentA, studentB);
    assert.ok(compScore >= 0.99, `Expected near 1.0, got ${compScore}`);
  });

  it('strictly scores 0 for one-sided pairs (harmonic mean property)', () => {
    // A can teach B everything, but B can teach A NOTHING
    const studentA = {
      strengths: ['Dynamic Programming', 'Hash Tables'],
      gaps: ['Graphs & BFS']
    };
    const studentB = {
      strengths: ['Sorting'], // Irrelevant to A's gap
      gaps: ['Dynamic Programming']
    };

    const compScore = calculateComplementarityScore(studentA, studentB);
    assert.equal(compScore, 0.0, 'One-sided teach-swap must receive 0 score');
  });

  it('handles partial mutual coverage symmetrically', () => {
    const studentA = {
      strengths: ['Topic1', 'Topic2'],
      gaps: ['Topic3', 'Topic4']
    };
    const studentB = {
      strengths: ['Topic3'],
      gaps: ['Topic1']
    };

    const scoreAB = calculateComplementarityScore(studentA, studentB);
    const scoreBA = calculateComplementarityScore(studentB, studentA);
    assert.equal(scoreAB, scoreBA, 'Complementarity score must be symmetric');
    assert.ok(scoreAB > 0.0 && scoreAB < 1.0, 'Partial coverage should be in (0, 1)');
  });
});

describe('Matching Engine: Temporal, Tools & Reliability Scoring', () => {
  it('awards higher temporal score for multiple shared slots', () => {
    const studentA = { slots: [{ day: 0, slot: 1 }, { day: 1, slot: 2 }, { day: 2, slot: 3 }] };
    const studentB1 = { slots: [{ day: 0, slot: 1 }] };
    const studentB2 = { slots: [{ day: 0, slot: 1 }, { day: 1, slot: 2 }, { day: 2, slot: 3 }] };

    const score1 = calculateTemporalScore(studentA, studentB1);
    const score2 = calculateTemporalScore(studentA, studentB2);
    assert.ok(score2 > score1, `Expected multi-slot score ${score2} to exceed single-slot ${score1}`);
  });

  it('penalizes frequency target mismatch', () => {
    const studentA = { tools: ['discord'], frequency: '1x' };
    const studentB1 = { tools: ['discord'], frequency: '1x' };
    const studentB2 = { tools: ['discord'], frequency: '3x' };

    const fit1 = calculateCommFitScore(studentA, studentB1);
    const fit2 = calculateCommFitScore(studentA, studentB2);
    assert.ok(fit1 > fit2, `Expected matched frequency ${fit1} to beat mismatched ${fit2}`);
  });

  it('computes reliability geometric tie-breaker', () => {
    const highPair = calculateReliabilityScore({ reliability: 1.0 }, { reliability: 0.95 });
    const lowPair = calculateReliabilityScore({ reliability: 0.6 }, { reliability: 0.6 });
    assert.ok(highPair > lowPair, 'High reliability pair should score higher');
  });
});

describe('Matching Engine: Full Cohort Stable Matching', () => {
  it('pairs 4 students into 2 high-quality compatible pairs', () => {
    const cohort = [
      {
        id: 1,
        courseCode: 'CS101',
        strengths: ['DP', 'Hash'],
        gaps: ['Graphs', 'Trees'],
        slots: [{ day: 0, slot: 2 }],
        tools: ['discord'],
        frequency: '2x',
        reliability: 1.0
      },
      {
        id: 2,
        courseCode: 'CS101',
        strengths: ['Graphs', 'Trees'],
        gaps: ['DP', 'Hash'],
        slots: [{ day: 0, slot: 2 }],
        tools: ['discord'],
        frequency: '2x',
        reliability: 0.95
      },
      {
        id: 3,
        courseCode: 'CS101',
        strengths: ['Sorting'],
        gaps: ['Recursion'],
        slots: [{ day: 2, slot: 3 }],
        tools: ['zoom'],
        frequency: '1x',
        reliability: 0.85
      },
      {
        id: 4,
        courseCode: 'CS101',
        strengths: ['Recursion'],
        gaps: ['Sorting'],
        slots: [{ day: 2, slot: 3 }],
        tools: ['zoom'],
        frequency: '1x',
        reliability: 0.90
      }
    ];

    const result = runMatchingEngine(cohort);
    assert.equal(result.groups.length, 2, 'Should create 2 pairs');
    assert.equal(result.stats.unmatchedCount, 0, 'All students matched');
    assert.ok(result.stats.averageScore >= 80, `Expected high average score, got ${result.stats.averageScore}`);
  });

  it('merges an odd 5th student into a group of 3', () => {
    const cohort = [
      { id: 1, courseCode: 'CS101', strengths: ['A'], gaps: ['B'], slots: [{ day: 1, slot: 1 }], tools: ['discord'], frequency: '2x' },
      { id: 2, courseCode: 'CS101', strengths: ['B'], gaps: ['A'], slots: [{ day: 1, slot: 1 }], tools: ['discord'], frequency: '2x' },
      { id: 3, courseCode: 'CS101', strengths: ['C'], gaps: ['D'], slots: [{ day: 2, slot: 2 }], tools: ['zoom'], frequency: '2x' },
      { id: 4, courseCode: 'CS101', strengths: ['D'], gaps: ['C'], slots: [{ day: 2, slot: 2 }], tools: ['zoom'], frequency: '2x' },
      // 5th student shares slot and tool with group 1
      { id: 5, courseCode: 'CS101', strengths: ['A', 'B'], gaps: ['E'], slots: [{ day: 1, slot: 1 }], tools: ['discord'], frequency: '2x' }
    ];

    const result = runMatchingEngine(cohort, { allowGroupMerging: true });
    assert.equal(result.groups.length, 2);
    const groupSizes = result.groups.map(g => g.members.length).sort();
    assert.deepEqual(groupSizes, [2, 3], 'Leftover 5th student should merge into a group of 3');
  });
});

describe('Matching Engine: Feedback Loop & Reshuffle Triggers', () => {
  it('rewards session attendance and penalizes no-shows', () => {
    const boosted = computeNewReliability(0.80, { attended: true, productive: true });
    assert.equal(boosted, 0.88);

    const penalized = computeNewReliability(0.80, { attended: false });
    assert.equal(penalized, 0.60);
  });

  it('triggers reshuffle on explicit request or consecutive no-shows', () => {
    assert.equal(shouldTriggerReshuffle({ reshuffleRequested: true }), true);
    assert.equal(shouldTriggerReshuffle({ noShowCount: 2 }), true);
    assert.equal(shouldTriggerReshuffle({ consecutiveUnproductive: 2 }), true);
    assert.equal(shouldTriggerReshuffle({ noShowCount: 1, consecutiveUnproductive: 1, reshuffleRequested: false }), false);
  });
});
