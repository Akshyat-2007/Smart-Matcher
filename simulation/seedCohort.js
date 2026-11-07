import { generateSyntheticCohort } from '../server/src/db/seedData.js';

/**
 * Generate reproducible cohort of 200 students for simulation
 * Uses fixed seed for absolute determinism across test runs
 */
export async function getSimulationCohort(seed = 1007) {
  const { students } = await generateSyntheticCohort(seed);
  // Return the 200 synthetic students (excluding demo accounts for pure benchmark)
  return students.slice(3, 203).map((s, index) => ({
    ...s,
    id: index + 1,
    subjectSlug: s.primarySubject,
    courseCode: s.primarySubject // backward-compat with filters
  }));
}
