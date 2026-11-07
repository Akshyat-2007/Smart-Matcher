/**
 * Feedback Loop & Reliability Adaptation Engine
 * 
 * Rules:
 * - Attended session: +0.05 boost (clamped to 1.0)
 * - Missed session (no-show): -0.20 penalty
 * - Peer rated session productive: +0.03 boost
 * - Peer rated session unproductive: -0.07 penalty
 * - Request reshuffle / 2 consecutive no-shows: flags group for auto-reshuffle
 */

export function computeNewReliability(currentScore, { attended, productive, noShowCount = 0 }) {
  let score = typeof currentScore === 'number' ? currentScore : 1.0;

  if (attended === false) {
    score -= 0.20; // Heavy penalty for flaking
  } else if (attended === true) {
    score += 0.05; // Attendance reward
  }

  if (productive === true) {
    score += 0.03; // Quality teach-swap bonus
  } else if (productive === false) {
    score -= 0.07; // Poor session penalty
  }

  // Bound between 0.10 and 1.00
  return Math.round(Math.min(1.0, Math.max(0.10, score)) * 100) / 100;
}

export function shouldTriggerReshuffle({ noShowCount = 0, consecutiveUnproductive = 0, reshuffleRequested = false }) {
  if (reshuffleRequested) return true;
  if (noShowCount >= 2) return true;
  if (consecutiveUnproductive >= 2) return true;
  return false;
}
