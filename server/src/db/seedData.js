import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedDataDir = path.resolve(__dirname, '../../seed/data');

// Load fields and subjects dynamically from JSON files
export function loadSeedCatalog() {
  const fieldsPath = path.join(seedDataDir, 'fields.json');
  const fields = JSON.parse(fs.readFileSync(fieldsPath, 'utf8'));

  const subjectsDir = path.join(seedDataDir, 'subjects');
  const subjectFiles = fs.readdirSync(subjectsDir).filter(f => f.endsWith('.json'));

  const subjects = [];
  for (const file of subjectFiles) {
    const filePath = path.join(subjectsDir, file);
    const sub = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    subjects.push(sub);
  }

  return { fields, subjects };
}

// Seeded pseudo-random number generator (Mulberry32)
export function createRNG(seed = 123456789) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function generateSyntheticCohort(seed = 42) {
  const rng = createRNG(seed);
  const passwordHash = await bcrypt.hash('password123', 8);
  const { fields, subjects } = loadSeedCatalog();

  const dsaSubject = subjects.find(s => s.slug === 'dsa') || subjects[0];
  const physSubject = subjects.find(s => s.slug === 'physiology') || subjects[1];

  // 3 Named Demo Accounts for evaluation & judging
  const demoUsers = [
    {
      name: 'Alice Chen',
      email: 'alice@demo.com',
      passwordHash,
      reliability: 1.0,
      field: 'Engineering (CS/IT)',
      subjects: ['dsa', 'dbms'],
      primarySubject: 'dsa',
      goal: 'exam_prep',
      strengths: ['Arrays & Strings', 'Dynamic Programming'],
      gaps: ['Graphs & Shortest Paths', 'Trees & BST'],
      slots: [
        { day: 0, slot: 3 }, // Mon Evening
        { day: 2, slot: 3 }, // Wed Evening
        { day: 4, slot: 3 }  // Fri Evening
      ],
      tools: ['zoom'],
      frequency: '2x'
    },
    {
      name: 'Bob Miller',
      email: 'bob@demo.com',
      passwordHash,
      reliability: 0.95,
      field: 'Engineering (CS/IT)',
      subjects: ['dsa', 'os'],
      primarySubject: 'dsa',
      goal: 'exam_prep',
      strengths: ['Graphs & Shortest Paths', 'Trees & BST'],
      gaps: ['Arrays & Strings', 'Dynamic Programming'],
      slots: [
        { day: 0, slot: 3 }, // Mon Evening
        { day: 2, slot: 3 }, // Wed Evening
        { day: 5, slot: 2 }  // Sat Afternoon
      ],
      tools: ['zoom'],
      frequency: '2x'
    },
    {
      name: 'Charlie Davis',
      email: 'charlie@demo.com',
      passwordHash,
      reliability: 0.90,
      field: 'Medical',
      subjects: ['physiology', 'biochemistry'],
      primarySubject: 'physiology',
      goal: 'project',
      strengths: ['Neurophysiology & Action Potentials'],
      gaps: ['Renal Physiology'],
      slots: [
        { day: 1, slot: 2 }, // Tue Afternoon
        { day: 3, slot: 2 }  // Thu Afternoon
      ],
      tools: ['zoom'],
      frequency: '2x'
    }
  ];

  const firstNames = ['David', 'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Lucas', 'Mia', 'Aiden', 'Isabella', 'Mason', 'Harper', 'James', 'Evelyn', 'Benjamin', 'Amelia', 'Alexander', 'Charlotte', 'Raj', 'Priya', 'Mei', 'Jin', 'Siddharth', 'Ananya', 'Carlos', 'Elena', 'Yuki', 'Kenji', 'Fatima', 'Tariq', 'Zoe', 'Leo', 'Maya', 'Eli'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Patel', 'Sharma', 'Gupta', 'Tanaka', 'Kim', 'Chen', 'Wang'];

  const toolsList = ['zoom'];
  const goalsList = ['exam_prep', 'project', 'weekly_homework'];
  const frequencies = ['1x', '2x', '3x'];

  const students = [...demoUsers];

  // Map subjects by field for quick sampling
  const fieldSubjectMap = {};
  for (const f of fields) {
    fieldSubjectMap[f.name] = subjects.filter(s => s.field === f.name);
  }

  for (let i = 1; i <= 200; i++) {
    const fn = firstNames[Math.floor(rng() * firstNames.length)];
    const ln = lastNames[Math.floor(rng() * lastNames.length)];
    const name = `${fn} ${ln}`;
    const email = `student${i}@uni.edu`;

    // 60% CS/IT, 20% Core, 20% Medical to create thick cohorts
    const roll = rng();
    const fieldName = roll < 0.60
      ? 'Engineering (CS/IT)'
      : roll < 0.80
      ? 'Engineering (Core)'
      : 'Medical';

    const availableSubs = fieldSubjectMap[fieldName] || subjects;
    // Pick 1 to 3 subjects in this field
    const numSubs = 1 + Math.floor(rng() * 3);
    const shuffledSubs = [...availableSubs].sort(() => rng() - 0.5);
    const studentSubs = shuffledSubs.slice(0, numSubs).map(s => s.slug);
    const primarySubject = studentSubs[0];

    const currentSubObj = subjects.find(s => s.slug === primarySubject) || subjects[0];
    const topicNames = (currentSubObj.topics || []).map(t => t.name);

    // Pick 1-2 strengths, 1-2 gaps
    const shuffledTopics = [...topicNames].sort(() => rng() - 0.5);
    const numStrengths = 1 + Math.floor(rng() * 2);
    const numGaps = 1 + Math.floor(rng() * 2);
    const strengths = shuffledTopics.slice(0, numStrengths);
    const gaps = shuffledTopics.slice(numStrengths, numStrengths + numGaps);

    // Availability slots
    const slots = [];
    const numSlots = 3 + Math.floor(rng() * 4);
    const slotSet = new Set();
    while (slotSet.size < numSlots) {
      const day = Math.floor(rng() * 7);
      const slot = Math.floor(rng() * 5);
      const key = `${day}_${slot}`;
      if (!slotSet.has(key)) {
        slotSet.add(key);
        slots.push({ day, slot });
      }
    }

    // Tools
    const numTools = 1 + (rng() > 0.6 ? 1 : 0);
    const shuffledTools = [...toolsList].sort(() => rng() - 0.5);
    const studentTools = shuffledTools.slice(0, numTools);

    const reliability = Math.round((0.65 + rng() * 0.35) * 100) / 100;
    const goal = goalsList[Math.floor(rng() * goalsList.length)];
    const frequency = frequencies[Math.floor(rng() * frequencies.length)];

    students.push({
      name,
      email,
      passwordHash,
      reliability,
      field: fieldName,
      subjects: studentSubs,
      primarySubject,
      goal,
      strengths,
      gaps,
      slots,
      tools: studentTools,
      frequency
    });
  }

  return { students, fields, subjects };
}
