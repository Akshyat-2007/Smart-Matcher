import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSimulationCohort } from './seedCohort.js';
import { runRandomStrategy, runNaiveGreedyStrategy, runSmartEngineStrategy } from './strategies.js';
import { simulateCohortRetention } from './dropoutModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runSimulation(seed = 1007) {
  console.log('======================================================================');
  console.log(' SMART STUDY GROUP MATCHER (v2: Teach-Swap + Accountability)');
  console.log(' Cohort Simulation & 3-Strategy Benchmark (N = 200 Synthetic Students)');
  console.log('======================================================================\n');

  const cohort = await getSimulationCohort(seed);
  const subjectsList = [...new Set(cohort.map(s => s.subjectSlug || s.primarySubject || 'dsa'))];
  console.log(`[SIM] Generated reproducible cohort of ${cohort.length} students across ${subjectsList.length} subjects.`);

  // 1. Run Strategy 1: Random Pairing
  console.log('[SIM] Executing Strategy 1: Random Pairing...');
  const randomResults = runRandomStrategy(cohort, seed);
  const randomNoAcc = simulateCohortRetention(randomResults.pairs, false, seed);
  const randomWithAcc = simulateCohortRetention(randomResults.pairs, true, seed);

  // 2. Run Strategy 2: Naive Greedy
  console.log('[SIM] Executing Strategy 2: Naive Greedy Pairing (Slot-only)...');
  const greedyResults = runNaiveGreedyStrategy(cohort);
  const greedyNoAcc = simulateCohortRetention(greedyResults.pairs, false, seed);
  const greedyWithAcc = simulateCohortRetention(greedyResults.pairs, true, seed);

  // 3. Run Strategy 3: Our Smart Engine
  console.log('[SIM] Executing Strategy 3: Smart Matchmaking Engine (Teach-Swap + Irving Stable)...');
  const engineResults = runSmartEngineStrategy(cohort);
  const engineNoAcc = simulateCohortRetention(engineResults.pairs, false, seed);
  const engineWithAcc = simulateCohortRetention(engineResults.pairs, true, seed);

  // Bad matches avoided calculation relative to random
  const randomBadCount = randomResults.badMatchesCount;
  const greedyAvoided = Math.round(((randomBadCount - greedyResults.badMatchesCount) / randomResults.totalPairs) * 1000) / 10;
  const engineAvoided = Math.round(((randomBadCount - engineResults.badMatchesCount) / randomResults.totalPairs) * 1000) / 10;

  // Compile full benchmark data
  const benchmark = {
    metadata: {
      cohortSize: cohort.length,
      timestamp: new Date().toISOString(),
      seed,
      subjects: subjectsList
    },
    strategies: [
      {
        id: 'random',
        name: 'Random Pairing',
        totalPairs: randomResults.totalPairs,
        averageScore: randomResults.averageScore,
        badMatchesCount: randomResults.badMatchesCount,
        badMatchRate: randomResults.badMatchRate,
        badMatchesAvoidedPct: 0.0,
        retentionWithoutAccountability: randomNoAcc,
        retentionWithAccountability: randomWithAcc
      },
      {
        id: 'greedy',
        name: 'Naive Greedy (Slot-only)',
        totalPairs: greedyResults.totalPairs,
        averageScore: greedyResults.averageScore,
        badMatchesCount: greedyResults.badMatchesCount,
        badMatchRate: greedyResults.badMatchRate,
        badMatchesAvoidedPct: greedyAvoided,
        retentionWithoutAccountability: greedyNoAcc,
        retentionWithAccountability: greedyWithAcc
      },
      {
        id: 'smart_engine',
        name: 'Smart Engine (Teach-Swap + Irving Stable)',
        totalPairs: engineResults.totalPairs,
        averageScore: engineResults.averageScore,
        badMatchesCount: engineResults.badMatchesCount,
        badMatchRate: engineResults.badMatchRate,
        badMatchesAvoidedPct: engineAvoided,
        retentionWithoutAccountability: engineNoAcc,
        retentionWithAccountability: engineWithAcc
      }
    ]
  };

  // Console Table Formatting
  console.log('\n-------------------------------------------------------------------------------------------------------------------');
  console.log('| Strategy                              | Avg Score | Bad Matches | Bad Avoided | 4-Wk Drop (No Acc) | 4-Wk (With Acc) |');
  console.log('-------------------------------------------------------------------------------------------------------------------');
  for (const s of benchmark.strategies) {
    const name = s.name.padEnd(37, ' ');
    const score = `${s.averageScore}/100`.padStart(9, ' ');
    const bad = `${s.badMatchRate}% (${s.badMatchesCount})`.padStart(11, ' ');
    const avoided = `${s.badMatchesAvoidedPct}%`.padStart(11, ' ');
    const noAcc = `${s.retentionWithoutAccountability.overallCompletionRate}%`.padStart(18, ' ');
    const withAcc = `${s.retentionWithAccountability.overallCompletionRate}%`.padStart(15, ' ');
    console.log(`| ${name} | ${score} | ${bad} | ${avoided} | ${noAcc} | ${withAcc} |`);
  }
  console.log('-------------------------------------------------------------------------------------------------------------------\n');

  console.log('Week-by-Week Completion Trajectory (Smart Engine vs Random):');
  console.log(`- Random (No Accountability) : W1=${randomNoAcc.weeklyRates[0]}% -> W2=${randomNoAcc.weeklyRates[1]}% -> W3=${randomNoAcc.weeklyRates[2]}% -> W4=${randomNoAcc.weeklyRates[3]}% (steep drop-off)`);
  console.log(`- Smart Engine (No Acc)      : W1=${engineNoAcc.weeklyRates[0]}% -> W2=${engineNoAcc.weeklyRates[1]}% -> W3=${engineNoAcc.weeklyRates[2]}% -> W4=${engineNoAcc.weeklyRates[3]}%`);
  console.log(`- Smart Engine + Accel. Acc. : W1=${engineWithAcc.weeklyRates[0]}% -> W2=${engineWithAcc.weeklyRates[1]}% -> W3=${engineWithAcc.weeklyRates[2]}% -> W4=${engineWithAcc.weeklyRates[3]}% (sustained momentum)\n`);

  // Write results.json
  const jsonPath = path.resolve(__dirname, 'results.json');
  fs.writeFileSync(jsonPath, JSON.stringify(benchmark, null, 2), 'utf8');
  console.log(`[SIM] Wrote benchmark outputs to: ${jsonPath}`);

  // Write results.csv
  const csvPath = path.resolve(__dirname, 'results.csv');
  const csvRows = [
    ['Strategy', 'TotalPairs', 'AvgScore', 'BadMatchCount', 'BadMatchRatePct', 'BadMatchesAvoidedPct', 'CompletionNoAccW1', 'CompletionNoAccW2', 'CompletionNoAccW3', 'CompletionNoAccW4', 'OverallNoAccPct', 'CompletionWithAccW1', 'CompletionWithAccW2', 'CompletionWithAccW3', 'CompletionWithAccW4', 'OverallWithAccPct'].join(',')
  ];

  for (const s of benchmark.strategies) {
    csvRows.push([
      `"${s.name}"`,
      s.totalPairs,
      s.averageScore,
      s.badMatchesCount,
      s.badMatchRate,
      s.badMatchesAvoidedPct,
      s.retentionWithoutAccountability.weeklyRates[0],
      s.retentionWithoutAccountability.weeklyRates[1],
      s.retentionWithoutAccountability.weeklyRates[2],
      s.retentionWithoutAccountability.weeklyRates[3],
      s.retentionWithoutAccountability.overallCompletionRate,
      s.retentionWithAccountability.weeklyRates[0],
      s.retentionWithAccountability.weeklyRates[1],
      s.retentionWithAccountability.weeklyRates[2],
      s.retentionWithAccountability.weeklyRates[3],
      s.retentionWithAccountability.overallCompletionRate
    ].join(','));
  }
  fs.writeFileSync(csvPath, csvRows.join('\n'), 'utf8');
  console.log(`[SIM] Wrote tabular data to: ${csvPath}`);

  // Copy to client/src/data for the frontend /demo page
  const clientDataDir = path.resolve(__dirname, '../client/src/data');
  if (!fs.existsSync(clientDataDir)) {
    fs.mkdirSync(clientDataDir, { recursive: true });
  }
  fs.writeFileSync(path.resolve(clientDataDir, 'simulationResults.json'), JSON.stringify(benchmark, null, 2), 'utf8');
  console.log(`[SIM] Synced results to frontend client data directory.`);

  return benchmark;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSimulation().then(() => {
    console.log('[SIM] Simulation run completed.');
    process.exit(0);
  }).catch((err) => {
    console.error('[SIM ERROR]', err);
    process.exit(1);
  });
}
