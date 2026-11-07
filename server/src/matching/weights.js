// Tunable weights configuration for the multi-dimensional matching engine
// Sum of weights = 100 points
export const MATCHING_WEIGHTS = {
  complementarity: 45,  // Highest weight: symmetric skill teach-swap coverage
  temporal: 25,         // Amount of shared availability + multi-slot bonus
  academicNeeds: 15,    // Shared assignment / exam / project goals
  commPreference: 10,   // Tool overlap + frequency target similarity
  reliabilityTieBreaker: 5 // Tie-breaker: keeps high-reliability students together
};

// Threshold below which a match is considered poor
export const BAD_MATCH_THRESHOLD = 40.0;
