import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadSeedCatalog, generateSyntheticCohort } from './seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smart_study_matcher'
};

export async function seedDatabase() {
  console.log(`[DB SEED] Starting dynamic seed into '${dbConfig.database}' on ${dbConfig.host}:${dbConfig.port}...`);
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('[DB SEED] Connected to MySQL.');

    // Disable foreign keys during clean truncate
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    const tables = [
      'messages', 'notifications', 'feedback', 'milestone_checkoffs', 'milestones',
      'attendance', 'sessions', 'group_members', 'matches', 'tool_preferences',
      'availability_slots', 'diagnostic_questions', 'user_topics', 'user_subjects',
      'topics', 'subjects', 'fields', 'users'
    ];
    for (const table of tables) {
      await connection.query(`TRUNCATE TABLE \`${table}\``);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('[DB SEED] Cleared existing tables.');

    // 1. Insert Fields
    const { fields, subjects } = loadSeedCatalog();
    const fieldIdMap = {};
    for (const f of fields) {
      const [res] = await connection.query(
        'INSERT INTO fields (name, icon, description) VALUES (?, ?, ?)',
        [f.name, f.icon, f.description]
      );
      fieldIdMap[f.name] = res.insertId;
    }
    console.log(`[DB SEED] Inserted ${fields.length} fields.`);

    // 2. Insert Subjects & Topics & Diagnostic Questions
    const subjectIdMap = {}; // slug -> id
    const topicIdMap = {};   // "slug:topicName" -> id
    let totalQuestions = 0;

    for (const sub of subjects) {
      const fieldId = fieldIdMap[sub.field] || Object.values(fieldIdMap)[0];
      const [subRes] = await connection.query(
        'INSERT INTO subjects (field_id, name, slug, description) VALUES (?, ?, ?, ?)',
        [fieldId, sub.name, sub.slug, sub.description]
      );
      const subjectId = subRes.insertId;
      subjectIdMap[sub.slug] = subjectId;

      // Insert topics
      for (const t of (sub.topics || [])) {
        const [topRes] = await connection.query(
          'INSERT INTO topics (subject_id, name, description) VALUES (?, ?, ?)',
          [subjectId, t.name, t.description]
        );
        topicIdMap[`${sub.slug}:${t.name}`] = topRes.insertId;
      }

      // Insert diagnostic questions
      for (const q of (sub.questions || [])) {
        const topicId = topicIdMap[`${sub.slug}:${q.topic}`];
        if (topicId) {
          await connection.query(
            'INSERT INTO diagnostic_questions (topic_id, prompt, options, correct_index, explanation, difficulty) VALUES (?, ?, ?, ?, ?, ?)',
            [topicId, q.prompt, JSON.stringify(q.options), q.correct_index, q.explanation, q.difficulty || 'medium']
          );
          totalQuestions++;
        }
      }
    }
    console.log(`[DB SEED] Inserted ${subjects.length} subjects and ${totalQuestions} diagnostic questions.`);

    // 3. Generate Cohort (200 + 3 demo)
    console.log('[DB SEED] Generating 203 synthetic students...');
    const { students } = await generateSyntheticCohort(42);

    for (const s of students) {
      const [userRes] = await connection.query(
        'INSERT INTO users (name, email, password_hash, reliability_score, status) VALUES (?, ?, ?, ?, ?)',
        [s.name, s.email, s.passwordHash, s.reliability, 'unmatched']
      );
      const userId = userRes.insertId;

      // user_subjects (1 to 3 subjects per student)
      for (const subSlug of s.subjects) {
        const subId = subjectIdMap[subSlug];
        if (subId) {
          await connection.query(
            'INSERT INTO user_subjects (user_id, subject_id, needs_goal) VALUES (?, ?, ?)',
            [userId, subId, s.goal]
          );
        }
      }

      // strengths (source: 'quiz')
      for (const st of s.strengths) {
        const tId = topicIdMap[`${s.primarySubject}:${st}`];
        if (tId) {
          await connection.query(
            'INSERT INTO user_topics (user_id, topic_id, type, source) VALUES (?, ?, ?, ?)',
            [userId, tId, 'strength', 'quiz']
          );
        }
      }

      // gaps (source: 'quiz')
      for (const gap of s.gaps) {
        const tId = topicIdMap[`${s.primarySubject}:${gap}`];
        if (tId) {
          await connection.query(
            'INSERT INTO user_topics (user_id, topic_id, type, source) VALUES (?, ?, ?, ?)',
            [userId, tId, 'gap', 'quiz']
          );
        }
      }

      // availability_slots
      for (const slot of s.slots) {
        await connection.query(
          'INSERT INTO availability_slots (user_id, day_of_week, slot_index) VALUES (?, ?, ?)',
          [userId, slot.day, slot.slot]
        );
      }

      // tool_preferences
      for (const tool of s.tools) {
        await connection.query(
          'INSERT INTO tool_preferences (user_id, tool, frequency) VALUES (?, ?, ?)',
          [userId, tool, s.frequency]
        );
      }
    }
    console.log(`[DB SEED] Inserted ${students.length} students with multi-subject enrollments.`);

    // 4. Create an initial active match demo between Alice and Bob on 'dsa'
    const [aliceRows] = await connection.query('SELECT id FROM users WHERE email = ?', ['alice@demo.com']);
    const [bobRows] = await connection.query('SELECT id FROM users WHERE email = ?', ['bob@demo.com']);
    if (aliceRows.length && bobRows.length) {
      const aliceId = aliceRows[0].id;
      const bobId = bobRows[0].id;
      const dsaId = subjectIdMap['dsa'];

      const [matchRes] = await connection.query(
        'INSERT INTO matches (subject_id, status, streak_count, compatibility_score, tool_used, tool_link) VALUES (?, ?, ?, ?, ?, ?)',
        [dsaId, 'active', 3, 94.5, 'discord', 'https://discord.gg/study-peer-dsa']
      );
      const matchId = matchRes.insertId;

      await connection.query(
        'INSERT INTO group_members (match_id, user_id, role) VALUES (?, ?, ?), (?, ?, ?)',
        [matchId, aliceId, 'member', matchId, bobId, 'member']
      );

      await connection.query('UPDATE users SET status = ? WHERE id IN (?, ?)', ['matched', aliceId, bobId]);

      // Upcoming session
      const sessionDate = new Date(Date.now() + 24 * 3600 * 1000);
      const agenda = JSON.stringify({
        part1: 'Alice teaches Bob: Dynamic Programming Memoization (5 mins)',
        part2: 'Bob teaches Alice: BFS Shortest Paths & Graph Traversal (5 mins)',
        part3: 'Joint practice: Solve LeetCode #200 (Number of Islands) (5 mins)'
      });
      const icebreaker = 'Icebreaker Prompt: What was the most confusing bug you encountered this past week and how did you squash it?';

      await connection.query(
        'INSERT INTO sessions (match_id, scheduled_at, status, teach_swap_agenda, icebreaker_text) VALUES (?, ?, ?, ?, ?)',
        [matchId, sessionDate, 'scheduled', agenda, icebreaker]
      );

      // Milestone
      const dueDate = new Date(Date.now() + 3 * 24 * 3600 * 1000);
      const [mRes] = await connection.query(
        'INSERT INTO milestones (match_id, title, description, due_date, status) VALUES (?, ?, ?, ?, ?)',
        [matchId, 'Complete Module 3 Lab: Graph Search & DP', 'Collaborative checkoff for problem sets 3.1 through 3.4', dueDate, 'pending']
      );
      const milestoneId = mRes.insertId;

      await connection.query(
        'INSERT INTO milestone_checkoffs (milestone_id, user_id) VALUES (?, ?)',
        [milestoneId, aliceId]
      );

      // Messages
      await connection.query(
        'INSERT INTO messages (match_id, user_id, content) VALUES (?, ?, ?), (?, ?, ?)',
        [
          matchId, aliceId, 'Hey Bob! Excited for our teach-swap session tomorrow. I prepared some visual slides on DP memoization!',
          matchId, bobId, 'Awesome Alice! I have 3 clean graph BFS diagrams ready for you. See you on Discord at 6pm!'
        ]
      );

      // Notifications
      await connection.query(
        'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?), (?, ?, ?, ?)',
        [
          aliceId, 'session_reminder', 'Upcoming Teach-Swap in 24h', 'Your session with Bob Miller for Data Structures & Algorithms is tomorrow at 6:00 PM. Review the 15-minute teach-swap agenda.',
          aliceId, 'streak', '🔥 3-Session Streak!', 'Your study group has maintained a 3-week study streak! Keep up the momentum.'
        ]
      );

      console.log('[DB SEED] Demo active match, session, milestones, messages, and nudges configured on DSA.');
    }

    await connection.end();
    console.log('[DB SEED] Database seeding completed successfully.');
    return true;
  } catch (err) {
    console.error('[DB SEED ERROR] Failed to seed MySQL database:', err.message);
    if (connection) await connection.end().catch(() => {});
    return false;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDatabase().then((success) => {
    process.exit(success ? 0 : 1);
  });
}
