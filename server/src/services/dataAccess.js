import { getPool } from '../db/pool.js';
import { memoryStore } from '../db/repo.js';
import { scorePair, getSharedSlots } from '../matching/index.js';

// Ensure memory store initialized as fallback
await memoryStore.init();

export const dataAccess = {
  // --- USER & AUTH ---
  async findUserByEmail(email) {
    try {
      const pool = getPool();
      const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      return rows[0] || null;
    } catch {
      return memoryStore.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
    }
  },

  async findUserById(id) {
    try {
      const pool = getPool();
      const [rows] = await pool.query('SELECT id, name, email, reliability_score, status, avatar_url, created_at FROM users WHERE id = ?', [id]);
      return rows[0] || null;
    } catch {
      const u = memoryStore.users.find(u => u.id === parseInt(id, 10));
      if (!u) return null;
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        reliability_score: u.reliability_score,
        status: u.status,
        avatar_url: u.avatar_url,
        created_at: u.created_at
      };
    }
  },

  async createUser({ name, email, passwordHash }) {
    try {
      const pool = getPool();
      const [res] = await pool.query(
        'INSERT INTO users (name, email, password_hash, reliability_score, status) VALUES (?, ?, ?, ?, ?)',
        [name, email, passwordHash, 1.0, 'unmatched']
      );
      return { id: res.insertId, name, email, reliability_score: 1.0, status: 'unmatched' };
    } catch {
      const newId = memoryStore.users.length + 1;
      const newUser = {
        id: newId,
        name,
        email,
        password_hash: passwordHash,
        reliability_score: 1.0,
        status: 'unmatched',
        avatar_url: null,
        created_at: new Date()
      };
      memoryStore.users.push(newUser);
      return { id: newId, name, email, reliability_score: 1.0, status: 'unmatched' };
    }
  },

  // --- FIELDS & SUBJECTS CATALOG ---
  async getFields() {
    try {
      const pool = getPool();
      const [rows] = await pool.query('SELECT * FROM fields ORDER BY id ASC');
      return rows;
    } catch {
      return memoryStore.fields;
    }
  },

  async getSubjects(fieldId = null) {
    try {
      const pool = getPool();
      let query = `
        SELECT s.*, f.name AS fieldName, f.slug AS fieldSlug, f.icon AS fieldIcon
        FROM subjects s
        JOIN fields f ON s.field_id = f.id
      `;
      const params = [];
      if (fieldId) {
        query += ' WHERE s.field_id = ?';
        params.push(fieldId);
      }
      query += ' ORDER BY s.name ASC';
      const [rows] = await pool.query(query, params);
      return rows;
    } catch {
      return memoryStore.subjects
        .filter(s => !fieldId || s.field_id === parseInt(fieldId, 10))
        .map(s => {
          const f = memoryStore.fields.find(fld => fld.id === s.field_id);
          return {
            ...s,
            fieldName: f?.name || 'Field',
            fieldSlug: f?.slug || '',
            fieldIcon: f?.icon || '📚'
          };
        });
    }
  },

  async getSubjectBySlug(slug) {
    try {
      const pool = getPool();
      const [subRows] = await pool.query(`
        SELECT s.*, f.name AS fieldName, f.slug AS fieldSlug
        FROM subjects s
        JOIN fields f ON s.field_id = f.id
        WHERE s.slug = ?
      `, [slug]);
      if (subRows.length === 0) return null;
      const sub = subRows[0];
      const [topics] = await pool.query('SELECT * FROM topics WHERE subject_id = ? ORDER BY id ASC', [sub.id]);
      return { ...sub, topics };
    } catch {
      const s = memoryStore.subjects.find(sub => sub.slug === slug);
      if (!s) return null;
      const f = memoryStore.fields.find(fld => fld.id === s.field_id);
      const topics = memoryStore.topics.filter(t => t.subject_id === s.id);
      return {
        ...s,
        fieldName: f?.name || 'Field',
        fieldSlug: f?.slug || '',
        topics
      };
    }
  },

  // Backward compatibility alias for /api/courses
  async getCourses() {
    return this.getSubjects();
  },

  async getTopicsByCourse(subjectId) {
    try {
      const pool = getPool();
      const [rows] = await pool.query('SELECT * FROM topics WHERE subject_id = ? ORDER BY id ASC', [subjectId]);
      return rows;
    } catch {
      return memoryStore.topics.filter(t => t.subject_id === parseInt(subjectId, 10));
    }
  },

  // --- DIAGNOSTIC QUIZ (ANSWERS HIDDEN DURING QUIZ!) ---
  async getDiagnosticQuiz(subjectSlugs = ['dsa']) {
    const slugs = Array.isArray(subjectSlugs) ? subjectSlugs : [subjectSlugs];

    // Helper to safely strip answers and explanations
    const sanitizeQuestion = (q, topicName, subjectName, subjectSlug) => {
      let parsedOptions = q.options;
      if (typeof parsedOptions === 'string') {
        try { parsedOptions = JSON.parse(parsedOptions); } catch { parsedOptions = []; }
      }
      return {
        id: q.id,
        topicId: q.topic_id,
        topicName,
        subjectName,
        subjectSlug,
        prompt: q.prompt,
        options: parsedOptions,
        difficulty: q.difficulty || 'medium'
        // NOTE: correct_index and explanation are strictly OMITTED during the quiz!
      };
    };

    try {
      const pool = getPool();
      const [rows] = await pool.query(`
        SELECT q.id, q.topic_id, q.prompt, q.options, q.difficulty, t.name AS topicName, s.name AS subjectName, s.slug AS subjectSlug
        FROM diagnostic_questions q
        JOIN topics t ON q.topic_id = t.id
        JOIN subjects s ON t.subject_id = s.id
        WHERE s.slug IN (?)
        ORDER BY s.id, q.id ASC
      `, [slugs]);

      return rows.map(r => sanitizeQuestion(r, r.topicName, r.subjectName, r.subjectSlug));
    } catch {
      // Memory Store Fallback
      const questions = [];
      for (const slug of slugs) {
        const sub = memoryStore.subjects.find(s => s.slug === slug);
        if (!sub) continue;
        const subTopics = memoryStore.topics.filter(t => t.subject_id === sub.id);
        const topicIds = new Set(subTopics.map(t => t.id));
        const subQuestions = memoryStore.diagnosticQuestions.filter(q => topicIds.has(q.topic_id));

        for (const q of subQuestions) {
          const t = subTopics.find(top => top.id === q.topic_id);
          questions.push(sanitizeQuestion(q, t?.name || 'Topic', sub.name, sub.slug));
        }
      }
      return questions;
    }
  },

  // --- SUBMIT DIAGNOSTIC QUIZ & SCORE SERVER-SIDE ---
  async submitDiagnosticQuiz(userId, { subjectSlugs, answers = {}, goal = 'exam_prep', slots = [], tools = ['discord'], frequency = '2x', manualAdjustments = null }) {
    const slugs = Array.isArray(subjectSlugs) ? subjectSlugs : [subjectSlugs || 'dsa'];

    // 1. Fetch full questions WITH correct_index and explanation to grade answers
    let allQuestions = [];
    try {
      const pool = getPool();
      const [rows] = await pool.query(`
        SELECT q.id, q.topic_id, q.prompt, q.options, q.correct_index, q.explanation, q.difficulty,
               t.name AS topicName, s.name AS subjectName, s.slug AS subjectSlug, s.id AS subjectId
        FROM diagnostic_questions q
        JOIN topics t ON q.topic_id = t.id
        JOIN subjects s ON t.subject_id = s.id
        WHERE s.slug IN (?)
      `, [slugs]);
      allQuestions = rows.map(r => ({
        ...r,
        options: typeof r.options === 'string' ? JSON.parse(r.options) : r.options
      }));
    } catch {
      for (const slug of slugs) {
        const sub = memoryStore.subjects.find(s => s.slug === slug);
        if (!sub) continue;
        const subTopics = memoryStore.topics.filter(t => t.subject_id === sub.id);
        const topicIds = new Set(subTopics.map(t => t.id));
        const subQuestions = memoryStore.diagnosticQuestions.filter(q => topicIds.has(q.topic_id));

        for (const q of subQuestions) {
          const t = subTopics.find(top => top.id === q.topic_id);
          allQuestions.push({
            ...q,
            topicName: t?.name || 'Topic',
            subjectName: sub.name,
            subjectSlug: sub.slug,
            subjectId: sub.id
          });
        }
      }
    }

    // 2. Grade each answered question
    let correctCount = 0;
    const answeredCount = Object.keys(answers).length;
    const evaluatedResults = [];
    const topicPerformance = {}; // topicName -> { correct, total, topicId }

    for (const q of allQuestions) {
      const selectedIndex = answers[q.id];
      const hasAnswer = selectedIndex !== undefined && selectedIndex !== null;
      const isCorrect = hasAnswer && parseInt(selectedIndex, 10) === q.correct_index;

      if (isCorrect) correctCount++;

      if (!topicPerformance[q.topicName]) {
        topicPerformance[q.topicName] = { correct: 0, total: 0, topicId: q.topic_id };
      }
      topicPerformance[q.topicName].total++;
      if (isCorrect) topicPerformance[q.topicName].correct++;

      evaluatedResults.push({
        id: q.id,
        topicId: q.topic_id,
        topicName: q.topicName,
        subjectSlug: q.subjectSlug,
        subjectName: q.subjectName,
        prompt: q.prompt,
        options: q.options,
        selectedIndex: hasAnswer ? parseInt(selectedIndex, 10) : null,
        correctIndex: q.correct_index,
        isCorrect,
        explanation: q.explanation,
        difficulty: q.difficulty
      });
    }

    const totalQuestions = evaluatedResults.length;
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 100;

    // 3. Infer Strengths & Gaps from Quiz
    const inferredStrengths = [];
    const inferredGaps = [];

    for (const [topicName, perf] of Object.entries(topicPerformance)) {
      if (perf.correct >= Math.ceil(perf.total / 2)) {
        inferredStrengths.push(topicName);
      } else {
        inferredGaps.push(topicName);
      }
    }

    // Ensure at least 1 strength and 1 gap
    if (inferredStrengths.length === 0 && evaluatedResults.length > 0) {
      inferredStrengths.push(evaluatedResults[0].topicName);
    }
    if (inferredGaps.length === 0 && evaluatedResults.length > 1) {
      inferredGaps.push(evaluatedResults[evaluatedResults.length - 1].topicName);
    }

    // If manual adjustments provided (user flipped chips), use those for persistence
    const finalStrengths = manualAdjustments?.strengths?.length > 0 ? manualAdjustments.strengths : inferredStrengths;
    const finalGaps = manualAdjustments?.gaps?.length > 0 ? manualAdjustments.gaps : inferredGaps;

    // 4. Persist to Database or Memory Store (if user is authenticated)
    if (userId) {
      try {
        const pool = getPool();

        // Clear previous user records
        await pool.query('DELETE FROM user_subjects WHERE user_id = ?', [userId]);
        await pool.query('DELETE FROM user_topics WHERE user_id = ?', [userId]);
        await pool.query('DELETE FROM availability_slots WHERE user_id = ?', [userId]);
        await pool.query('DELETE FROM tool_preferences WHERE user_id = ?', [userId]);

        // 1-3 user_subjects
        const [subjectRows] = await pool.query('SELECT id, slug FROM subjects WHERE slug IN (?)', [slugs]);
        for (const sub of subjectRows) {
          await pool.query(
            'INSERT INTO user_subjects (user_id, subject_id, needs_goal) VALUES (?, ?, ?)',
            [userId, sub.id, goal]
          );
        }

        // user_topics with source ('quiz' vs 'manual')
        const subIds = subjectRows.map(s => s.id);
        const [topicRows] = await pool.query('SELECT id, name FROM topics WHERE subject_id IN (?)', [subIds]);
        const topicMap = new Map(topicRows.map(t => [t.name, t.id]));

        for (const st of finalStrengths) {
          const tId = topicMap.get(st);
          if (tId) {
            const source = (manualAdjustments && !inferredStrengths.includes(st)) ? 'manual' : 'quiz';
            await pool.query('INSERT INTO user_topics (user_id, topic_id, type, source) VALUES (?, ?, ?, ?)', [userId, tId, 'strength', source]);
          }
        }

        for (const gap of finalGaps) {
          const tId = topicMap.get(gap);
          if (tId) {
            const source = (manualAdjustments && !inferredGaps.includes(gap)) ? 'manual' : 'quiz';
            await pool.query('INSERT INTO user_topics (user_id, topic_id, type, source) VALUES (?, ?, ?, ?)', [userId, tId, 'gap', source]);
          }
        }

        // availability_slots
        for (const s of slots) {
          await pool.query('INSERT INTO availability_slots (user_id, day_of_week, slot_index) VALUES (?, ?, ?)', [userId, s.day, s.slot]);
        }

        // tool_preferences
        for (const tool of tools) {
          await pool.query('INSERT INTO tool_preferences (user_id, tool, frequency) VALUES (?, ?, ?)', [userId, tool, frequency]);
        }

        // Set user status to 'unmatched' so they enter the matching pool
        await pool.query('UPDATE users SET status = ? WHERE id = ?', ['unmatched', userId]);
      } catch {
        // Memory Store Fallback
        memoryStore.userSubjects = memoryStore.userSubjects.filter(us => us.user_id !== userId);
        for (const slug of slugs) {
          const sub = memoryStore.subjects.find(s => s.slug === slug);
          if (sub) {
            memoryStore.userSubjects.push({
              id: memoryStore.userSubjects.length + 1,
              user_id: userId,
              subject_id: sub.id,
              needs_goal: goal
            });
          }
        }

        memoryStore.userTopics = memoryStore.userTopics.filter(ut => ut.user_id !== userId);
        for (const st of finalStrengths) {
          const t = memoryStore.topics.find(top => top.name === st);
          if (t) {
            const source = (manualAdjustments && !inferredStrengths.includes(st)) ? 'manual' : 'quiz';
            memoryStore.userTopics.push({
              id: memoryStore.userTopics.length + 1,
              user_id: userId,
              topic_id: t.id,
              type: 'strength',
              source
            });
          }
        }

        for (const gap of finalGaps) {
          const t = memoryStore.topics.find(top => top.name === gap);
          if (t) {
            const source = (manualAdjustments && !inferredGaps.includes(gap)) ? 'manual' : 'quiz';
            memoryStore.userTopics.push({
              id: memoryStore.userTopics.length + 1,
              user_id: userId,
              topic_id: t.id,
              type: 'gap',
              source
            });
          }
        }

        memoryStore.availabilitySlots = memoryStore.availabilitySlots.filter(s => s.user_id !== userId);
        for (const s of slots) {
          memoryStore.availabilitySlots.push({
            id: memoryStore.availabilitySlots.length + 1,
            user_id: userId,
            day_of_week: s.day,
            slot_index: s.slot
          });
        }

        memoryStore.toolPreferences = memoryStore.toolPreferences.filter(t => t.user_id !== userId);
        for (const tool of tools) {
          memoryStore.toolPreferences.push({
            id: memoryStore.toolPreferences.length + 1,
            user_id: userId,
            tool,
            frequency
          });
        }

        const u = memoryStore.users.find(u => u.id === userId);
        if (u) u.status = 'unmatched';
      }
    }

    return {
      score: {
        correctCount,
        totalCount: totalQuestions,
        answeredCount,
        percentage
      },
      results: evaluatedResults,
      inferredStrengths,
      inferredGaps,
      finalStrengths,
      finalGaps,
      subjects: slugs
    };
  },

  // Legacy fallback for old onboarding route
  async saveOnboardingProfile(userId, { courseCode, goal, strengths, gaps, slots, tools, frequency }) {
    return this.submitDiagnosticQuiz(userId, {
      subjectSlugs: [courseCode || 'dsa'],
      answers: {},
      goal,
      slots,
      tools,
      frequency,
      manualAdjustments: { strengths, gaps }
    });
  },

  // --- CANDIDATES FOR MATCHING (PER SUBJECT) ---
  async getUnmatchedCandidatesForSubject(subjectSlug = 'dsa') {
    try {
      const pool = getPool();
      const [users] = await pool.query(`
        SELECT u.id, u.name, u.email, u.reliability_score AS reliability, u.status, s.slug AS subjectSlug, s.name AS subjectName, us.needs_goal AS goal
        FROM users u
        JOIN user_subjects us ON u.id = us.user_id
        JOIN subjects s ON us.subject_id = s.id
        WHERE s.slug = ? AND u.status = 'unmatched'
      `, [subjectSlug]);

      const candidateIds = users.map(u => u.id);
      if (candidateIds.length === 0) return [];

      const [topics] = await pool.query(`
        SELECT ut.user_id, ut.type, t.name
        FROM user_topics ut
        JOIN topics t ON ut.topic_id = t.id
        WHERE ut.user_id IN (?)
      `, [candidateIds]);

      const [slots] = await pool.query('SELECT user_id, day_of_week AS day, slot_index AS slot FROM availability_slots WHERE user_id IN (?)', [candidateIds]);
      const [tools] = await pool.query('SELECT user_id, tool, frequency FROM tool_preferences WHERE user_id IN (?)', [candidateIds]);

      return users.map(u => {
        const uTopics = topics.filter(t => t.user_id === u.id);
        const uSlots = slots.filter(s => s.user_id === u.id);
        const uTools = tools.filter(t => t.user_id === u.id);

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          reliability: u.reliability,
          subjectSlug: u.subjectSlug,
          courseCode: u.subjectSlug,
          goal: u.goal,
          strengths: uTopics.filter(t => t.type === 'strength').map(t => t.name),
          gaps: uTopics.filter(t => t.type === 'gap').map(t => t.name),
          slots: uSlots.map(s => ({ day: s.day, slot: s.slot })),
          tools: uTools.map(t => t.tool),
          frequency: uTools[0]?.frequency || '2x'
        };
      });
    } catch {
      // Memory Store Fallback
      const sub = memoryStore.subjects.find(s => s.slug === subjectSlug) || memoryStore.subjects[0];
      if (!sub) return [];

      const enrolledUserIds = memoryStore.userSubjects
        .filter(us => us.subject_id === sub.id)
        .map(us => us.user_id);

      const unmatchedUsers = memoryStore.users.filter(u => enrolledUserIds.includes(u.id) && u.status === 'unmatched');

      return unmatchedUsers.map(u => {
        const us = memoryStore.userSubjects.find(item => item.user_id === u.id && item.subject_id === sub.id);
        const uTopics = memoryStore.userTopics.filter(ut => ut.user_id === u.id);
        const strengths = uTopics.filter(ut => ut.type === 'strength').map(ut => memoryStore.topics.find(t => t.id === ut.topic_id)?.name).filter(Boolean);
        const gaps = uTopics.filter(ut => ut.type === 'gap').map(ut => memoryStore.topics.find(t => t.id === ut.topic_id)?.name).filter(Boolean);
        const slots = memoryStore.availabilitySlots.filter(s => s.user_id === u.id).map(s => ({ day: s.day_of_week, slot: s.slot_index }));
        const toolRows = memoryStore.toolPreferences.filter(t => t.user_id === u.id);

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          reliability: u.reliability_score,
          subjectSlug: sub.slug,
          courseCode: sub.slug,
          goal: us?.needs_goal || 'exam_prep',
          strengths: strengths.length > 0 ? strengths : ['Core Concepts'],
          gaps: gaps.length > 0 ? gaps : ['Problem Solving'],
          slots: slots.length > 0 ? slots : [{ day: 0, slot: 3 }],
          tools: toolRows.length > 0 ? toolRows.map(t => t.tool) : ['zoom'],
          frequency: toolRows[0]?.frequency || '2x'
        };
      });
    }
  },

  // Alias for backward compatibility
  async getUnmatchedCandidatesForCourse(courseCode) {
    return this.getUnmatchedCandidatesForSubject(courseCode);
  },

  // --- SAVE CREATED MATCHES ---
  async saveMatches(groups, subjectSlug = 'dsa') {
    const createdMatches = [];
    try {
      const pool = getPool();
      const [subRows] = await pool.query('SELECT id, name FROM subjects WHERE slug = ?', [subjectSlug]);
      const subjectId = subRows[0]?.id || 1;
      const subjectName = subRows[0]?.name || 'Study Subject';

      for (const group of groups) {
        const toolUsed = 'zoom';
        const toolLink = `https://zoom.us/j/study-room-${group.members[0].id}?pwd=zoom-peer-${subjectSlug}`;

        const [mRes] = await pool.query(
          'INSERT INTO matches (subject_id, status, streak_count, compatibility_score, tool_used, tool_link) VALUES (?, ?, ?, ?, ?, ?)',
          [subjectId, 'active', 0, group.score, toolUsed, toolLink]
        );
        const matchId = mRes.insertId;

        for (const member of group.members) {
          await pool.query(
            'INSERT INTO group_members (match_id, user_id, role) VALUES (?, ?, ?)',
            [matchId, member.id, 'member']
          );
          await pool.query('UPDATE users SET status = ? WHERE id = ?', ['matched', member.id]);

          // Send welcome nudge
          await pool.query(
            'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
            [
              member.id,
              'nudge',
              '🎉 Match Confirmed!',
              `You have been paired with ${group.members.filter(m => m.id !== member.id).map(m => m.name).join(' & ')} for ${subjectName} (${group.score}% fit). Visit your Hub to review your teach-swap topics!`
            ]
          );
        }

        // Schedule initial teach-swap session
        const nextDate = new Date(Date.now() + 48 * 3600 * 1000);
        const m0 = group.members[0];
        const m1 = group.members[1] || group.members[0];
        const t0to1 = group.suggestedTopics?.aTeachesB?.[0] || 'Core Concepts & Principles';
        const t1to0 = group.suggestedTopics?.bTeachesA?.[0] || 'Hands-on Problem Solving Walkthrough';

        const agenda = {
          part1: `${m0.name} teaches ${m1.name}: ${t0to1} (5 mins)`,
          part2: `${m1.name} teaches ${m0.name}: ${t1to0} (5 mins)`,
          part3: `Joint practice: Solve representative practice problems together (5 mins)`
        };
        const icebreaker = 'Icebreaker Prompt: What is one concept in this subject that clicked only after struggling with it?';

        await pool.query(
          'INSERT INTO sessions (match_id, scheduled_at, status, teach_swap_agenda, icebreaker_text) VALUES (?, ?, ?, ?, ?)',
          [matchId, nextDate, 'scheduled', JSON.stringify(agenda), icebreaker]
        );

        // Schedule first milestone
        const dueDate = new Date(Date.now() + 5 * 24 * 3600 * 1000);
        await pool.query(
          'INSERT INTO milestones (match_id, title, description, due_date, status) VALUES (?, ?, ?, ?, ?)',
          [matchId, `Milestone 1: Complete ${subjectName} Problem Set`, 'Work collaboratively to solve exercises before due date', dueDate, 'pending']
        );

        createdMatches.push({ matchId, score: group.score, members: group.members.map(m => ({ id: m.id, name: m.name })) });
      }
    } catch {
      // Memory Store Fallback
      const sub = memoryStore.subjects.find(s => s.slug === subjectSlug) || memoryStore.subjects[0];
      for (const group of groups) {
        const matchId = memoryStore.matches.length + 1;
        const toolUsed = 'zoom';
        const toolLink = `https://zoom.us/j/study-room-${group.members[0].id}?pwd=zoom-peer-${subjectSlug}`;

        const matchRecord = {
          id: matchId,
          subject_id: sub.id,
          status: 'active',
          streak_count: 0,
          compatibility_score: group.score,
          tool_used: toolUsed,
          tool_link: toolLink,
          last_active_at: new Date(),
          created_at: new Date()
        };
        memoryStore.matches.push(matchRecord);

        for (const member of group.members) {
          memoryStore.groupMembers.push({
            id: memoryStore.groupMembers.length + 1,
            match_id: matchId,
            user_id: member.id,
            role: 'member',
            joined_at: new Date()
          });
          const u = memoryStore.users.find(u => u.id === member.id);
          if (u) u.status = 'matched';

          memoryStore.notifications.push({
            id: memoryStore.notifications.length + 1,
            user_id: member.id,
            type: 'nudge',
            title: '🎉 Match Confirmed!',
            message: `You have been paired with ${group.members.filter(m => m.id !== member.id).map(m => m.name).join(' & ')} for ${sub.name} (${group.score}% fit). Visit your Hub to review your teach-swap topics!`,
            read_status: false,
            created_at: new Date()
          });
        }

        const nextDate = new Date(Date.now() + 48 * 3600 * 1000);
        const m0 = group.members[0];
        const m1 = group.members[1] || group.members[0];
        const t0to1 = group.suggestedTopics?.aTeachesB?.[0] || 'Core Concepts';
        const t1to0 = group.suggestedTopics?.bTeachesA?.[0] || 'Problem Solving';

        memoryStore.sessions.push({
          id: memoryStore.sessions.length + 1,
          match_id: matchId,
          scheduled_at: nextDate,
          status: 'scheduled',
          teach_swap_agenda: {
            part1: `${m0.name} teaches ${m1.name}: ${t0to1} (5 mins)`,
            part2: `${m1.name} teaches ${m0.name}: ${t1to0} (5 mins)`,
            part3: `Joint practice: Solve representative practice problems together (5 mins)`
          },
          icebreaker_text: 'Icebreaker Prompt: What is one concept in this subject that clicked only after struggling with it?'
        });

        const dueDate = new Date(Date.now() + 5 * 24 * 3600 * 1000);
        memoryStore.milestones.push({
          id: memoryStore.milestones.length + 1,
          match_id: matchId,
          title: `Milestone 1: Complete ${sub.name} Exercises`,
          description: 'Work collaboratively to solve exercises before due date',
          due_date: dueDate,
          status: 'pending',
          reschedule_count: 0,
          created_at: new Date()
        });

        createdMatches.push({ matchId, score: group.score, members: group.members.map(m => ({ id: m.id, name: m.name })) });
      }
    }
    return createdMatches;
  },

  // --- GET ACTIVE USER MATCH ---
  async getUserActiveMatch(userId) {
    try {
      const pool = getPool();
      const [memberships] = await pool.query(`
        SELECT gm.match_id, m.subject_id, m.status, m.streak_count, m.compatibility_score, m.tool_used, m.tool_link,
               s.slug AS subjectSlug, s.name AS subjectName, f.name AS fieldName
        FROM group_members gm
        JOIN matches m ON gm.match_id = m.id
        JOIN subjects s ON m.subject_id = s.id
        JOIN fields f ON s.field_id = f.id
        WHERE gm.user_id = ? AND m.status = 'active'
        ORDER BY m.id DESC LIMIT 1
      `, [userId]);

      if (memberships.length === 0) return null;
      const match = memberships[0];

      // Partners
      const [partners] = await pool.query(`
        SELECT u.id, u.name, u.email, u.reliability_score
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        WHERE gm.match_id = ?
      `, [match.match_id]);

      // Latest session
      const [sessions] = await pool.query(`
        SELECT * FROM sessions WHERE match_id = ? ORDER BY scheduled_at ASC LIMIT 1
      `, [match.match_id]);

      return {
        matchId: match.match_id,
        subjectSlug: match.subjectSlug,
        subjectName: match.subjectName,
        courseCode: match.subjectSlug,
        courseTitle: match.subjectName,
        fieldName: match.fieldName,
        streakCount: match.streak_count,
        compatibilityScore: match.compatibility_score,
        toolUsed: match.tool_used,
        toolLink: match.tool_link,
        members: partners,
        nextSession: sessions[0] || null
      };
    } catch {
      // Memory Store Fallback
      const gm = memoryStore.groupMembers.find(gm => gm.user_id === userId);
      if (!gm) return null;

      const match = memoryStore.matches.find(m => m.id === gm.match_id && m.status === 'active');
      if (!match) return null;

      const subject = memoryStore.subjects.find(s => s.id === match.subject_id);
      const field = memoryStore.fields.find(f => f.id === subject?.field_id);
      const memberIds = memoryStore.groupMembers.filter(m => m.match_id === match.id).map(m => m.user_id);
      const members = memoryStore.users.filter(u => memberIds.includes(u.id)).map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        reliability_score: u.reliability_score
      }));

      const nextSession = memoryStore.sessions.find(s => s.match_id === match.id);

      return {
        matchId: match.id,
        subjectSlug: subject?.slug || 'dsa',
        subjectName: subject?.name || 'Data Structures & Algorithms',
        courseCode: subject?.slug || 'dsa',
        courseTitle: subject?.name || 'Data Structures & Algorithms',
        fieldName: field?.name || 'Engineering (CS/IT)',
        streakCount: match.streak_count,
        compatibilityScore: match.compatibility_score,
        toolUsed: match.tool_used,
        toolLink: match.tool_link,
        members,
        nextSession: nextSession || null
      };
    }
  },

  // --- GROUP HUB DATA ---
  async getGroupHub(matchId) {
    try {
      const pool = getPool();
      const [matches] = await pool.query(`
        SELECT m.*, s.slug AS subjectSlug, s.name AS subjectName, f.name AS fieldName
        FROM matches m
        JOIN subjects s ON m.subject_id = s.id
        JOIN fields f ON s.field_id = f.id
        WHERE m.id = ?
      `, [matchId]);

      if (matches.length === 0) return null;
      const match = matches[0];

      const [members] = await pool.query(`
        SELECT u.id, u.name, u.email, u.reliability_score, u.avatar_url, gm.role
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        WHERE gm.match_id = ?
      `, [matchId]);

      const [sessions] = await pool.query(`
        SELECT * FROM sessions WHERE match_id = ? ORDER BY scheduled_at DESC
      `, [matchId]);

      const [milestones] = await pool.query(`
        SELECT m.*, 
          (SELECT COUNT(*) FROM milestone_checkoffs mc WHERE mc.milestone_id = m.id) AS checkoff_count
        FROM milestones m
        WHERE m.match_id = ?
        ORDER BY m.due_date ASC
      `, [matchId]);

      const [checkoffs] = await pool.query(`
        SELECT mc.* FROM milestone_checkoffs mc
        JOIN milestones m ON mc.milestone_id = m.id
        WHERE m.match_id = ?
      `, [matchId]);

      const [messages] = await pool.query(`
        SELECT msg.id, msg.user_id, u.name AS userName, msg.content, msg.created_at
        FROM messages msg
        JOIN users u ON msg.user_id = u.id
        WHERE msg.match_id = ?
        ORDER BY msg.created_at ASC
        LIMIT 50
      `, [matchId]);

      return {
        match: {
          ...match,
          courseCode: match.subjectSlug,
          courseTitle: match.subjectName
        },
        members,
        sessions,
        milestones: milestones.map(m => ({
          ...m,
          checkoffs: checkoffs.filter(c => c.milestone_id === m.id)
        })),
        messages
      };
    } catch {
      // Memory Store Fallback
      const match = memoryStore.matches.find(m => m.id === parseInt(matchId, 10));
      if (!match) return null;

      const subject = memoryStore.subjects.find(s => s.id === match.subject_id);
      const field = memoryStore.fields.find(f => f.id === subject?.field_id);
      const memberRows = memoryStore.groupMembers.filter(gm => gm.match_id === match.id);
      const members = memberRows.map(gm => {
        const u = memoryStore.users.find(u => u.id === gm.user_id);
        return {
          id: u?.id,
          name: u?.name,
          email: u?.email,
          reliability_score: u?.reliability_score,
          avatar_url: u?.avatar_url,
          role: gm.role
        };
      });

      const sessions = memoryStore.sessions.filter(s => s.match_id === match.id);
      const milestones = memoryStore.milestones.filter(m => m.match_id === match.id).map(m => ({
        ...m,
        checkoffs: memoryStore.milestoneCheckoffs.filter(c => c.milestone_id === m.id)
      }));

      const messages = memoryStore.messages.filter(msg => msg.match_id === match.id).map(msg => {
        const u = memoryStore.users.find(u => u.id === msg.user_id);
        return {
          id: msg.id,
          user_id: msg.user_id,
          userName: u?.name || 'Member',
          content: msg.content,
          created_at: msg.created_at
        };
      });

      return {
        match: {
          ...match,
          subjectSlug: subject?.slug || 'dsa',
          subjectName: subject?.name || 'Data Structures',
          courseCode: subject?.slug || 'dsa',
          courseTitle: subject?.name || 'Data Structures',
          fieldName: field?.name || 'Engineering (CS/IT)'
        },
        members,
        sessions,
        milestones,
        messages
      };
    }
  },

  // --- MESSAGES ---
  async addMessage(matchId, userId, content) {
    try {
      const pool = getPool();
      const [res] = await pool.query('INSERT INTO messages (match_id, user_id, content) VALUES (?, ?, ?)', [matchId, userId, content]);
      const [userRows] = await pool.query('SELECT name FROM users WHERE id = ?', [userId]);
      return { id: res.insertId, match_id: matchId, user_id: userId, userName: userRows[0]?.name || 'Student', content, created_at: new Date() };
    } catch {
      const id = memoryStore.messages.length + 1;
      const u = memoryStore.users.find(u => u.id === userId);
      const msg = { id, match_id: parseInt(matchId, 10), user_id: userId, userName: u?.name || 'Student', content, created_at: new Date() };
      memoryStore.messages.push(msg);
      return msg;
    }
  },

  // --- SESSIONS & ATTENDANCE ---
  async checkinSession(sessionId, userId, attended = true) {
    try {
      const pool = getPool();
      await pool.query(
        'INSERT INTO attendance (session_id, user_id, attended) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE attended = ?',
        [sessionId, userId, attended, attended]
      );
      return true;
    } catch {
      const att = memoryStore.attendance.find(a => a.session_id === sessionId && a.user_id === userId);
      if (att) {
        att.attended = attended;
      } else {
        memoryStore.attendance.push({ id: memoryStore.attendance.length + 1, session_id: sessionId, user_id: userId, attended, logged_at: new Date() });
      }
      return true;
    }
  },

  // --- FEEDBACK & RELIABILITY ADJUSTMENT ---
  async submitFeedback({ sessionId, reviewerId, revieweeId, productive, comments, requestReshuffle }) {
    try {
      const pool = getPool();
      await pool.query(
        'INSERT INTO feedback (session_id, reviewer_id, reviewee_id, productive, comments, request_reshuffle) VALUES (?, ?, ?, ?, ?, ?)',
        [sessionId, reviewerId, revieweeId, productive, comments, requestReshuffle]
      );

      // Adjust reliability score of reviewee
      const [revRows] = await pool.query('SELECT reliability_score FROM users WHERE id = ?', [revieweeId]);
      const currentRel = revRows[0]?.reliability_score || 1.0;
      const delta = productive ? 0.03 : -0.07;
      const newRel = Math.round(Math.min(1.0, Math.max(0.10, currentRel + delta)) * 100) / 100;

      await pool.query('UPDATE users SET reliability_score = ? WHERE id = ?', [newRel, revieweeId]);

      // If reshuffle requested, mark match as reshuffled
      if (requestReshuffle) {
        const [sessRows] = await pool.query('SELECT match_id FROM sessions WHERE id = ?', [sessionId]);
        if (sessRows.length > 0) {
          const matchId = sessRows[0].match_id;
          await pool.query('UPDATE matches SET status = ? WHERE id = ?', ['reshuffled', matchId]);
          await pool.query(`
            UPDATE users SET status = 'unmatched' 
            WHERE id IN (SELECT user_id FROM group_members WHERE match_id = ?)
          `, [matchId]);
        }
      }

      return { newReliability: newRel, reshuffled: !!requestReshuffle };
    } catch {
      // Memory Store Fallback
      memoryStore.feedback.push({
        id: memoryStore.feedback.length + 1,
        session_id: sessionId,
        reviewer_id: reviewerId,
        reviewee_id: revieweeId,
        productive,
        comments,
        request_reshuffle: requestReshuffle,
        created_at: new Date()
      });

      const u = memoryStore.users.find(u => u.id === revieweeId);
      if (u) {
        const delta = productive ? 0.03 : -0.07;
        u.reliability_score = Math.round(Math.min(1.0, Math.max(0.10, u.reliability_score + delta)) * 100) / 100;
      }

      if (requestReshuffle) {
        const sess = memoryStore.sessions.find(s => s.id === sessionId);
        if (sess) {
          const match = memoryStore.matches.find(m => m.id === sess.match_id);
          if (match) match.status = 'reshuffled';
          const memberIds = memoryStore.groupMembers.filter(gm => gm.match_id === sess.match_id).map(gm => gm.user_id);
          memoryStore.users.filter(u => memberIds.includes(u.id)).forEach(u => u.status = 'unmatched');
        }
      }

      return { newReliability: u?.reliability_score || 1.0, reshuffled: !!requestReshuffle };
    }
  },

  // --- MILESTONES ---
  async checkoffMilestone(milestoneId, userId) {
    try {
      const pool = getPool();
      await pool.query(
        'INSERT INTO milestone_checkoffs (milestone_id, user_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE checked_at = CURRENT_TIMESTAMP',
        [milestoneId, userId]
      );

      // Check if all members in match have checked off
      const [mRows] = await pool.query('SELECT match_id FROM milestones WHERE id = ?', [milestoneId]);
      if (mRows.length > 0) {
        const matchId = mRows[0].match_id;
        const [totalMembers] = await pool.query('SELECT COUNT(*) AS count FROM group_members WHERE match_id = ?', [matchId]);
        const [totalChecks] = await pool.query('SELECT COUNT(*) AS count FROM milestone_checkoffs WHERE milestone_id = ?', [milestoneId]);

        if (totalChecks[0].count >= totalMembers[0].count) {
          await pool.query('UPDATE milestones SET status = ? WHERE id = ?', ['completed', milestoneId]);
          await pool.query('UPDATE matches SET streak_count = streak_count + 1 WHERE id = ?', [matchId]);
        }
      }

      return true;
    } catch {
      const existing = memoryStore.milestoneCheckoffs.find(c => c.milestone_id === milestoneId && c.user_id === userId);
      if (!existing) {
        memoryStore.milestoneCheckoffs.push({
          id: memoryStore.milestoneCheckoffs.length + 1,
          milestone_id: milestoneId,
          user_id: userId,
          checked_at: new Date()
        });
      }

      const m = memoryStore.milestones.find(m => m.id === milestoneId);
      if (m) {
        const totalMembers = memoryStore.groupMembers.filter(gm => gm.match_id === m.match_id).length;
        const checks = memoryStore.milestoneCheckoffs.filter(c => c.milestone_id === milestoneId).length;
        if (checks >= totalMembers) {
          m.status = 'completed';
          const match = memoryStore.matches.find(item => item.id === m.match_id);
          if (match) match.streak_count++;
        }
      }
      return true;
    }
  },

  async rescheduleMilestone(milestoneId, newDueDate) {
    try {
      const pool = getPool();
      await pool.query(
        'UPDATE milestones SET due_date = ?, status = ?, reschedule_count = reschedule_count + 1 WHERE id = ?',
        [newDueDate, 'rescheduled', milestoneId]
      );
      return true;
    } catch {
      const m = memoryStore.milestones.find(m => m.id === milestoneId);
      if (m) {
        m.due_date = newDueDate;
        m.status = 'rescheduled';
        m.reschedule_count = (m.reschedule_count || 0) + 1;
      }
      return true;
    }
  },

  // --- NOTIFICATIONS ---
  async getNotifications(userId) {
    try {
      const pool = getPool();
      const [rows] = await pool.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30', [userId]);
      return rows;
    } catch {
      return memoryStore.notifications.filter(n => n.user_id === userId).sort((a, b) => b.created_at - a.created_at);
    }
  },

  async markNotificationRead(id, userId) {
    try {
      const pool = getPool();
      await pool.query('UPDATE notifications SET read_status = TRUE WHERE id = ? AND user_id = ?', [id, userId]);
      return true;
    } catch {
      const n = memoryStore.notifications.find(n => n.id === parseInt(id, 10) && n.user_id === userId);
      if (n) n.read_status = true;
      return true;
    }
  },

  async getUserCandidateProfile(userId, subjectSlug = 'dsa') {
    try {
      const pool = getPool();
      const [uRows] = await pool.query('SELECT id, name, email, reliability_score FROM users WHERE id = ?', [userId]);
      if (uRows.length === 0) return null;
      const u = uRows[0];

      const [subRows] = await pool.query('SELECT id FROM subjects WHERE slug = ?', [subjectSlug]);
      const subId = subRows[0]?.id || 1;

      const [usRows] = await pool.query('SELECT needs_goal FROM user_subjects WHERE user_id = ? AND subject_id = ?', [userId, subId]);
      const goal = usRows[0]?.needs_goal || 'exam_prep';

      const [topics] = await pool.query(`
        SELECT ut.type, t.name
        FROM user_topics ut
        JOIN topics t ON ut.topic_id = t.id
        WHERE ut.user_id = ?
      `, [userId]);

      const [slots] = await pool.query('SELECT day_of_week AS day, slot_index AS slot FROM availability_slots WHERE user_id = ?', [userId]);
      const [tools] = await pool.query('SELECT tool, frequency FROM tool_preferences WHERE user_id = ?', [userId]);

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        reliability: u.reliability_score,
        subjectSlug,
        goal,
        strengths: topics.filter(t => t.type === 'strength').map(t => t.name),
        gaps: topics.filter(t => t.type === 'gap').map(t => t.name),
        slots: slots.map(s => ({ day: s.day, slot: s.slot })),
        tools: tools.length > 0 ? tools.map(t => t.tool) : ['zoom'],
        frequency: tools[0]?.frequency || '2x'
      };
    } catch {
      const u = memoryStore.users.find(usr => usr.id === parseInt(userId, 10));
      if (!u) return null;

      const sub = memoryStore.subjects.find(s => s.slug === subjectSlug) || memoryStore.subjects[0];
      const us = memoryStore.userSubjects.find(item => item.user_id === u.id && item.subject_id === sub.id);
      const uTopics = memoryStore.userTopics.filter(ut => ut.user_id === u.id);
      const strengths = uTopics.filter(ut => ut.type === 'strength').map(ut => memoryStore.topics.find(t => t.id === ut.topic_id)?.name).filter(Boolean);
      const gaps = uTopics.filter(ut => ut.type === 'gap').map(ut => memoryStore.topics.find(t => t.id === ut.topic_id)?.name).filter(Boolean);
      const slots = memoryStore.availabilitySlots.filter(s => s.user_id === u.id).map(s => ({ day: s.day_of_week, slot: s.slot_index }));
      const toolRows = memoryStore.toolPreferences.filter(t => t.user_id === u.id);

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        reliability: u.reliability_score || 1.0,
        subjectSlug: sub?.slug || 'dsa',
        goal: us?.needs_goal || 'exam_prep',
        strengths: strengths.length > 0 ? strengths : ['Core Concepts'],
        gaps: gaps.length > 0 ? gaps : ['Problem Solving'],
        slots: slots.length > 0 ? slots : [{ day: 0, slot: 3 }],
        tools: toolRows.length > 0 ? toolRows.map(t => t.tool) : ['zoom'],
        frequency: toolRows[0]?.frequency || '2x'
      };
    }
  },

  // --- DISCOVERY & PEER SUGGESTIONS ---
  async getDiscoveryCandidates(currentUserId, { subjectSlug = 'dsa', goal = null } = {}) {
    try {
      const currentCandidate = await this.getUserCandidateProfile(currentUserId, subjectSlug);
      const allCandidates = await this.getUnmatchedCandidatesForSubject(subjectSlug);
      const otherCandidates = allCandidates.filter(c => c.id !== currentUserId);

      // If fewer candidates in specific subject, backfill from other active students in memory/db
      let candidatePool = otherCandidates;
      if (candidatePool.length < 5) {
        const poolUsers = memoryStore.users.filter(u => u.id !== currentUserId).slice(0, 15);
        for (const pu of poolUsers) {
          if (!candidatePool.some(c => c.id === pu.id)) {
            const prof = await this.getUserCandidateProfile(pu.id, subjectSlug);
            if (prof) candidatePool.push(prof);
          }
        }
      }

      const results = candidatePool.map(candidate => {
        let score = 75;
        if (currentCandidate) {
          const evalResult = scorePair(currentCandidate, candidate);
          score = (evalResult && evalResult.totalScore > 0)
            ? evalResult.totalScore
            : Math.round((candidate.reliability || 0.9) * 82);
        } else {
          score = Math.round((candidate.reliability || 0.9) * 85);
        }
        const shared = currentCandidate ? getSharedSlots(currentCandidate.slots, candidate.slots) : candidate.slots.slice(0, 2);

        // Build explanatory reasons
        const reasons = [];
        if (currentCandidate) {
          const teachingGaps = candidate.strengths.filter(st => currentCandidate.gaps.includes(st));
          const learningFromMe = currentCandidate.strengths.filter(st => candidate.gaps.includes(st));

          if (teachingGaps.length > 0) {
            reasons.push(`Can teach you: ${teachingGaps.slice(0, 2).join(', ')}`);
          }
          if (learningFromMe.length > 0) {
            reasons.push(`Can learn from you: ${learningFromMe.slice(0, 2).join(', ')}`);
          }
        }

        if (shared.length > 0) {
          reasons.push(`${shared.length} shared Zoom slot(s) this week`);
        } else {
          reasons.push('Flexible weekend & evening Zoom slots');
        }

        if (goal && candidate.goal === goal) {
          reasons.push(`Both focused on ${goal.replace('_', ' ')}`);
        }

        reasons.push(`${Math.round((candidate.reliability || 0.95) * 100)}% attendance & reliability`);

        // Check if there is an existing partner request
        const existingReq = memoryStore.partnerRequests?.find(
          r => ((r.sender_id === currentUserId && r.receiver_id === candidate.id) ||
                (r.sender_id === candidate.id && r.receiver_id === currentUserId))
        );

        return {
          id: candidate.id,
          name: candidate.name,
          email: candidate.email,
          subjectSlug,
          matchScore: score,
          reasons,
          strengths: candidate.strengths,
          gaps: candidate.gaps,
          sharedSlotsCount: shared.length,
          reliability: candidate.reliability,
          goal: candidate.goal,
          requestStatus: existingReq ? existingReq.status : null,
          requestId: existingReq ? existingReq.id : null
        };
      });

      // Filter by goal if requested
      const filtered = goal ? results.filter(r => r.goal === goal) : results;
      return filtered.sort((a, b) => b.matchScore - a.matchScore);
    } catch (err) {
      console.error('[GET DISCOVERY CANDIDATES ERROR]', err);
      return [];
    }
  },

  // --- PARTNER REQUESTS ---
  async getPartnerRequests(userId) {
    try {
      const pool = getPool();
      const [rows] = await pool.query(`
        SELECT pr.*, u.name AS senderName, u.email AS senderEmail, s.name AS subjectName, s.slug AS subjectSlug
        FROM partner_requests pr
        JOIN users u ON pr.sender_id = u.id
        JOIN subjects s ON pr.subject_id = s.id
        WHERE pr.receiver_id = ?
        ORDER BY pr.created_at DESC
      `, [userId]);
      return rows;
    } catch {
      return (memoryStore.partnerRequests || [])
        .filter(r => r.receiver_id === userId)
        .map(r => {
          const sender = memoryStore.users.find(u => u.id === r.sender_id);
          const sub = memoryStore.subjects.find(s => s.id === r.subject_id);
          return {
            ...r,
            senderName: sender?.name || 'Peer Student',
            senderEmail: sender?.email || '',
            subjectName: sub?.name || 'Data Structures & Algorithms',
            subjectSlug: sub?.slug || 'dsa'
          };
        });
    }
  },

  async sendPartnerRequest(senderId, { receiverId, subjectSlug = 'dsa', note = '' }) {
    const rxId = parseInt(receiverId, 10);
    const sId = parseInt(senderId, 10);

    try {
      const pool = getPool();
      const [subRows] = await pool.query('SELECT id, name FROM subjects WHERE slug = ?', [subjectSlug]);
      const subjectId = subRows[0]?.id || 1;
      const subjectName = subRows[0]?.name || 'Study Subject';

      const [res] = await pool.query(
        'INSERT INTO partner_requests (sender_id, receiver_id, subject_id, status, note) VALUES (?, ?, ?, ?, ?)',
        [sId, rxId, subjectId, 'pending', note || 'Would love to teach-swap and prep together via Zoom!']
      );

      const sender = await this.findUserById(sId);
      await pool.query(
        'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
        [
          rxId,
          'partner_request',
          '🤝 New Teach-Swap Request!',
          `${sender?.name || 'A student'} requested to study ${subjectName} with you. Check Discovery to accept.`
        ]
      );

      return { id: res.insertId, sender_id: sId, receiver_id: rxId, status: 'pending', note };
    } catch {
      const sub = memoryStore.subjects.find(s => s.slug === subjectSlug) || memoryStore.subjects[0];
      const newReq = {
        id: (memoryStore.partnerRequests?.length || 0) + 1,
        sender_id: sId,
        receiver_id: rxId,
        subject_id: sub.id,
        status: 'pending',
        note: note || 'Would love to teach-swap and prep together via Zoom!',
        created_at: new Date()
      };
      if (!memoryStore.partnerRequests) memoryStore.partnerRequests = [];
      memoryStore.partnerRequests.push(newReq);

      const sender = memoryStore.users.find(u => u.id === sId);
      memoryStore.notifications.push({
        id: memoryStore.notifications.length + 1,
        user_id: rxId,
        type: 'partner_request',
        title: '🤝 New Teach-Swap Request!',
        message: `${sender?.name || 'A student'} requested to study ${sub.name} with you. Check Discovery to accept.`,
        read_status: false,
        created_at: new Date()
      });

      return newReq;
    }
  },

  async respondPartnerRequest(requestId, userId, { action }) {
    const rId = parseInt(requestId, 10);
    const uId = parseInt(userId, 10);

    try {
      const pool = getPool();
      const [rows] = await pool.query('SELECT * FROM partner_requests WHERE id = ?', [rId]);
      if (rows.length === 0) throw new Error('Request not found');
      const req = rows[0];

      await pool.query('UPDATE partner_requests SET status = ? WHERE id = ?', [action, rId]);

      if (action === 'accepted') {
        const senderId = req.sender_id;
        const subjectId = req.subject_id;
        const toolLink = `https://zoom.us/j/study-room-${senderId}-${uId}?pwd=teach-swap`;

        // Create match
        const [mRes] = await pool.query(
          'INSERT INTO matches (subject_id, status, streak_count, compatibility_score, tool_used, tool_link) VALUES (?, ?, ?, ?, ?, ?)',
          [subjectId, 'active', 0, 95.0, 'zoom', toolLink]
        );
        const matchId = mRes.insertId;

        // Add members
        await pool.query('INSERT INTO group_members (match_id, user_id, role) VALUES (?, ?, ?)', [matchId, senderId, 'member']);
        await pool.query('INSERT INTO group_members (match_id, user_id, role) VALUES (?, ?, ?)', [matchId, uId, 'member']);
        await pool.query('UPDATE users SET status = ? WHERE id IN (?, ?)', ['matched', senderId, uId]);

        // Schedule first session
        const nextDate = new Date(Date.now() + 24 * 3600 * 1000);
        const agenda = {
          part1: '5 mins: Review strengths & teach-swap overview',
          part2: '5 mins: Deep dive into practice exercises',
          part3: '5 mins: Joint problem solving & recap'
        };
        await pool.query(
          'INSERT INTO sessions (match_id, scheduled_at, status, teach_swap_agenda, icebreaker_text, zoom_url) VALUES (?, ?, ?, ?, ?, ?)',
          [matchId, nextDate, 'scheduled', JSON.stringify(agenda), 'Icebreaker Prompt: What is your favorite debugging tip?', toolLink]
        );

        // Schedule milestone
        const dueDate = new Date(Date.now() + 4 * 24 * 3600 * 1000);
        await pool.query(
          'INSERT INTO milestones (match_id, title, description, due_date, status) VALUES (?, ?, ?, ?, ?)',
          [matchId, 'Milestone 1: Complete Study Set Together', 'Work through core topic practice problems', dueDate, 'pending']
        );

        return { success: true, matchId, status: 'accepted' };
      }

      return { success: true, status: action };
    } catch {
      const req = (memoryStore.partnerRequests || []).find(r => r.id === rId);
      if (req) {
        req.status = action;
        if (action === 'accepted') {
          const matchId = memoryStore.matches.length + 1;
          const toolLink = `https://zoom.us/j/study-room-${req.sender_id}-${uId}?pwd=teach-swap`;

          memoryStore.matches.push({
            id: matchId,
            subject_id: req.subject_id,
            status: 'active',
            streak_count: 0,
            compatibility_score: 95.0,
            tool_used: 'zoom',
            tool_link: toolLink,
            last_active_at: new Date(),
            created_at: new Date()
          });

          memoryStore.groupMembers.push(
            { id: memoryStore.groupMembers.length + 1, match_id: matchId, user_id: req.sender_id, role: 'member', joined_at: new Date() },
            { id: memoryStore.groupMembers.length + 1, match_id: matchId, user_id: uId, role: 'member', joined_at: new Date() }
          );

          const sender = memoryStore.users.find(u => u.id === req.sender_id);
          const receiver = memoryStore.users.find(u => u.id === uId);
          if (sender) sender.status = 'matched';
          if (receiver) receiver.status = 'matched';

          const nextDate = new Date(Date.now() + 24 * 3600 * 1000);
          memoryStore.sessions.push({
            id: memoryStore.sessions.length + 1,
            match_id: matchId,
            scheduled_at: nextDate,
            status: 'scheduled',
            teach_swap_agenda: {
              part1: '5 mins: Review strengths & teach-swap overview',
              part2: '5 mins: Deep dive into practice exercises',
              part3: '5 mins: Joint problem solving & recap'
            },
            icebreaker_text: 'Icebreaker Prompt: What is your favorite debugging tip?',
            zoom_url: toolLink
          });

          memoryStore.milestones.push({
            id: memoryStore.milestones.length + 1,
            match_id: matchId,
            title: 'Milestone 1: Complete Study Set Together',
            description: 'Work through core topic practice problems',
            due_date: new Date(Date.now() + 4 * 24 * 3600 * 1000),
            status: 'pending',
            reschedule_count: 0
          });

          return { success: true, matchId, status: 'accepted' };
        }
      }
      return { success: true, status: action };
    }
  },

  // --- STUDY GROUPS (CREATE / BROWSE / JOIN) ---
  async createStudyGroup({ creatorId, name, subjectSlug = 'dsa', sizeLimit = 4, goal = 'exam_prep' }) {
    const cId = parseInt(creatorId, 10);
    const limit = parseInt(sizeLimit, 10) || 4;
    const toolLink = `https://zoom.us/j/group-${Date.now()}?pwd=study-room`;

    try {
      const pool = getPool();
      const [subRows] = await pool.query('SELECT id, name FROM subjects WHERE slug = ?', [subjectSlug]);
      const subjectId = subRows[0]?.id || 1;

      const [res] = await pool.query(
        'INSERT INTO matches (subject_id, title, size_limit, goal, status, streak_count, compatibility_score, tool_used, tool_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [subjectId, name, limit, goal, 'active', 0, 92.0, 'zoom', toolLink]
      );
      const matchId = res.insertId;

      await pool.query('INSERT INTO group_members (match_id, user_id, role) VALUES (?, ?, ?)', [matchId, cId, 'lead']);
      await pool.query('UPDATE users SET status = ? WHERE id = ?', ['matched', cId]);

      // Schedule first session
      const nextDate = new Date(Date.now() + 48 * 3600 * 1000);
      await pool.query(
        'INSERT INTO sessions (match_id, scheduled_at, status, teach_swap_agenda, icebreaker_text, zoom_url) VALUES (?, ?, ?, ?, ?, ?)',
        [
          matchId,
          nextDate,
          'scheduled',
          JSON.stringify({ part1: '5m Introductions', part2: '5m Concept sharing', part3: '5m Group sprint' }),
          'Icebreaker Prompt: What is the most exciting project you have built?',
          toolLink
        ]
      );

      // Milestone
      await pool.query(
        'INSERT INTO milestones (match_id, title, description, due_date, status) VALUES (?, ?, ?, ?, ?)',
        [matchId, `${name}: Kickoff Goal`, 'Complete first collaborative session together', new Date(Date.now() + 5 * 24 * 3600 * 1000), 'pending']
      );

      return { id: matchId, title: name, size_limit: limit, goal, tool_link: toolLink };
    } catch {
      const sub = memoryStore.subjects.find(s => s.slug === subjectSlug) || memoryStore.subjects[0];
      const matchId = memoryStore.matches.length + 1;
      const newGroup = {
        id: matchId,
        subject_id: sub.id,
        title: name,
        size_limit: limit,
        goal,
        status: 'active',
        streak_count: 0,
        compatibility_score: 92.0,
        tool_used: 'zoom',
        tool_link: toolLink,
        last_active_at: new Date(),
        created_at: new Date()
      };
      memoryStore.matches.push(newGroup);
      memoryStore.groupMembers.push({
        id: memoryStore.groupMembers.length + 1,
        match_id: matchId,
        user_id: cId,
        role: 'lead',
        joined_at: new Date()
      });
      const creator = memoryStore.users.find(u => u.id === cId);
      if (creator) creator.status = 'matched';

      memoryStore.sessions.push({
        id: memoryStore.sessions.length + 1,
        match_id: matchId,
        scheduled_at: new Date(Date.now() + 48 * 3600 * 1000),
        status: 'scheduled',
        teach_swap_agenda: { part1: '5m Introductions', part2: '5m Concept sharing', part3: '5m Group sprint' },
        icebreaker_text: 'Icebreaker Prompt: What is the most exciting project you have built?',
        zoom_url: toolLink
      });

      return newGroup;
    }
  },

  async getAvailableGroups(subjectSlug = null) {
    try {
      const pool = getPool();
      let query = `
        SELECT m.*, s.name AS subjectName, s.slug AS subjectSlug,
               COUNT(gm.user_id) AS currentMembers
        FROM matches m
        JOIN subjects s ON m.subject_id = s.id
        LEFT JOIN group_members gm ON m.id = gm.match_id
        WHERE m.status = 'active'
      `;
      const params = [];
      if (subjectSlug && subjectSlug !== 'all') {
        query += ' AND s.slug = ?';
        params.push(subjectSlug);
      }
      query += ' GROUP BY m.id HAVING currentMembers < m.size_limit ORDER BY m.created_at DESC';

      const [rows] = await pool.query(query, params);

      // Fetch member strengths for each group
      for (const group of rows) {
        const [members] = await pool.query(`
          SELECT u.id, u.name,
                 GROUP_CONCAT(DISTINCT t.name SEPARATOR ', ') AS strengths
          FROM group_members gm
          JOIN users u ON gm.user_id = u.id
          LEFT JOIN user_topics ut ON ut.user_id = u.id AND ut.type = 'strength'
          LEFT JOIN topics t ON ut.topic_id = t.id
          WHERE gm.match_id = ?
          GROUP BY u.id
        `, [group.id]);
        group.members = members;
      }

      return rows;
    } catch {
      return memoryStore.matches
        .filter(m => m.status === 'active')
        .map(m => {
          const sub = memoryStore.subjects.find(s => s.id === m.subject_id);
          const membersInGroup = memoryStore.groupMembers.filter(gm => gm.match_id === m.id);
          const detailedMembers = membersInGroup.map(gm => {
            const u = memoryStore.users.find(usr => usr.id === gm.user_id);
            const userStrengths = memoryStore.userTopics
              .filter(ut => ut.user_id === gm.user_id && ut.type === 'strength')
              .map(ut => memoryStore.topics.find(t => t.id === ut.topic_id)?.name)
              .filter(Boolean);
            return {
              id: gm.user_id,
              name: u?.name || 'Group Member',
              strengths: userStrengths.join(', ') || 'Core Principles'
            };
          });

          return {
            ...m,
            subjectName: sub?.name || 'Study Subject',
            subjectSlug: sub?.slug || 'dsa',
            currentMembers: membersInGroup.length,
            members: detailedMembers
          };
        })
        .filter(g => (!subjectSlug || subjectSlug === 'all' || g.subjectSlug === subjectSlug) && g.currentMembers < (g.size_limit || 4));
    }
  },

  async joinStudyGroup(matchId, userId) {
    const mId = parseInt(matchId, 10);
    const uId = parseInt(userId, 10);

    try {
      const pool = getPool();
      const [mRows] = await pool.query('SELECT * FROM matches WHERE id = ?', [mId]);
      if (mRows.length === 0) throw new Error('Group not found');

      const [gmRows] = await pool.query('SELECT * FROM group_members WHERE match_id = ?', [mId]);
      if (gmRows.some(gm => gm.user_id === uId)) {
        return { success: true, message: 'Already a member', matchId: mId };
      }
      if (gmRows.length >= mRows[0].size_limit) {
        throw new Error('This study group has reached its member limit.');
      }

      await pool.query('INSERT INTO group_members (match_id, user_id, role) VALUES (?, ?, ?)', [mId, uId, 'member']);
      await pool.query('UPDATE users SET status = ? WHERE id = ?', ['matched', uId]);

      // Notify other members
      const user = await this.findUserById(uId);
      for (const gm of gmRows) {
        await pool.query(
          'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
          [
            gm.user_id,
            'nudge',
            '👋 New Member Joined!',
            `${user?.name || 'A new student'} has joined your study group! Check your Hub to see their teach-swap strengths.`
          ]
        );
      }

      return { success: true, matchId: mId };
    } catch (err) {
      const match = memoryStore.matches.find(m => m.id === mId);
      if (!match) throw new Error('Group not found');

      const membersInGroup = memoryStore.groupMembers.filter(gm => gm.match_id === mId);
      if (membersInGroup.some(gm => gm.user_id === uId)) {
        return { success: true, message: 'Already a member', matchId: mId };
      }
      if (membersInGroup.length >= (match.size_limit || 4)) {
        throw new Error('This study group has reached its member limit.');
      }

      memoryStore.groupMembers.push({
        id: memoryStore.groupMembers.length + 1,
        match_id: mId,
        user_id: uId,
        role: 'member',
        joined_at: new Date()
      });
      const u = memoryStore.users.find(usr => usr.id === uId);
      if (u) u.status = 'matched';

      for (const gm of membersInGroup) {
        memoryStore.notifications.push({
          id: memoryStore.notifications.length + 1,
          user_id: gm.user_id,
          type: 'nudge',
          title: '👋 New Member Joined!',
          message: `${u?.name || 'A new student'} has joined your study group! Check your Hub to see their teach-swap strengths.`,
          read_status: false,
          created_at: new Date()
        });
      }

      return { success: true, matchId: mId };
    }
  },

  // --- GROUP RESOURCES & NOTES ---
  async getGroupResources(matchId) {
    const mId = parseInt(matchId, 10);
    try {
      const pool = getPool();
      const [rows] = await pool.query(`
        SELECT gr.*, u.name AS authorName
        FROM group_resources gr
        JOIN users u ON gr.user_id = u.id
        WHERE gr.match_id = ?
        ORDER BY gr.created_at DESC
      `, [mId]);
      return rows;
    } catch {
      return (memoryStore.groupResources || [])
        .filter(r => r.match_id === mId)
        .map(r => {
          const author = memoryStore.users.find(u => u.id === r.user_id);
          return {
            ...r,
            authorName: author?.name || 'Group Member'
          };
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  },

  async addGroupResource(matchId, userId, { title, url, note, type = 'link' }) {
    const mId = parseInt(matchId, 10);
    const uId = parseInt(userId, 10);

    try {
      const pool = getPool();
      const [res] = await pool.query(
        'INSERT INTO group_resources (match_id, user_id, title, url, note, type) VALUES (?, ?, ?, ?, ?, ?)',
        [mId, uId, title, url || '', note || '', type]
      );
      const user = await this.findUserById(uId);
      return {
        id: res.insertId,
        match_id: mId,
        user_id: uId,
        authorName: user?.name || 'You',
        title,
        url,
        note,
        type,
        created_at: new Date()
      };
    } catch {
      if (!memoryStore.groupResources) memoryStore.groupResources = [];
      const user = memoryStore.users.find(u => u.id === uId);
      const newRes = {
        id: memoryStore.groupResources.length + 1,
        match_id: mId,
        user_id: uId,
        authorName: user?.name || 'You',
        title,
        url: url || '',
        note: note || '',
        type: type || 'link',
        created_at: new Date()
      };
      memoryStore.groupResources.push(newRes);
      return newRes;
    }
  },

  // --- 1:1 DIRECT MESSAGES ---
  async getDirectMessages(userId, partnerId) {
    const uId = parseInt(userId, 10);
    const pId = parseInt(partnerId, 10);

    try {
      const pool = getPool();
      const [rows] = await pool.query(`
        SELECT m.*, u.name AS userName
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE (m.user_id = ? AND m.recipient_id = ?)
           OR (m.user_id = ? AND m.recipient_id = ?)
        ORDER BY m.created_at ASC
      `, [uId, pId, pId, uId]);
      return rows;
    } catch {
      return (memoryStore.messages || [])
        .filter(m => (m.user_id === uId && m.recipient_id === pId) || (m.user_id === pId && m.recipient_id === uId))
        .map(m => {
          const sender = memoryStore.users.find(u => u.id === m.user_id);
          return {
            ...m,
            userName: sender?.name || 'Peer'
          };
        })
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }
  },

  async sendDirectMessage(userId, recipientId, { content, isIcebreaker = false }) {
    const uId = parseInt(userId, 10);
    const rxId = parseInt(recipientId, 10);

    try {
      const pool = getPool();
      const [res] = await pool.query(
        'INSERT INTO messages (user_id, recipient_id, content, is_icebreaker) VALUES (?, ?, ?, ?)',
        [uId, rxId, content, isIcebreaker ? 1 : 0]
      );
      const sender = await this.findUserById(uId);
      return {
        id: res.insertId,
        user_id: uId,
        recipient_id: rxId,
        userName: sender?.name || 'You',
        content,
        is_icebreaker: isIcebreaker,
        created_at: new Date()
      };
    } catch {
      const sender = memoryStore.users.find(u => u.id === uId);
      const newMsg = {
        id: memoryStore.messages.length + 1,
        user_id: uId,
        recipient_id: rxId,
        userName: sender?.name || 'You',
        content,
        is_icebreaker: Boolean(isIcebreaker),
        created_at: new Date()
      };
      memoryStore.messages.push(newMsg);
      return newMsg;
    }
  },

  // --- BEST TIME SLOT SUGGESTION & SHARED CALENDAR ---
  async getBestTimeSlot(matchId) {
    const mId = parseInt(matchId, 10);
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const TIME_BLOCKS = [
      'Morning (08:00 - 11:00)',
      'Midday (11:00 - 14:00)',
      'Afternoon (14:00 - 17:00)',
      'Evening (17:00 - 20:00)',
      'Night (20:00 - 23:00)'
    ];

    try {
      const pool = getPool();
      const [members] = await pool.query('SELECT user_id FROM group_members WHERE match_id = ?', [mId]);
      if (members.length === 0) return null;

      const memberIds = members.map(m => m.user_id);
      const [slots] = await pool.query(
        `SELECT day_of_week, slot_index, COUNT(DISTINCT user_id) as overlapCount
         FROM availability_slots
         WHERE user_id IN (?)
         GROUP BY day_of_week, slot_index
         ORDER BY overlapCount DESC, day_of_week ASC
         LIMIT 3`,
        [memberIds]
      );

      if (slots.length > 0) {
        return slots.map(s => ({
          day: DAYS[s.day_of_week] || 'Wednesday',
          timeBlock: TIME_BLOCKS[s.slot_index] || 'Evening (17:00 - 20:00)',
          overlapCount: s.overlapCount,
          totalMembers: memberIds.length,
          recommended: true
        }))[0];
      }
    } catch {
      // Memory Store Fallback
      const memberIds = memoryStore.groupMembers.filter(gm => gm.match_id === mId).map(gm => gm.user_id);
      const slotCounts = {};

      for (const uid of memberIds) {
        const userSlots = memoryStore.availabilitySlots.filter(s => s.user_id === uid);
        for (const s of userSlots) {
          const key = `${s.day_of_week}_${s.slot_index}`;
          slotCounts[key] = (slotCounts[key] || 0) + 1;
        }
      }

      const sortedSlots = Object.entries(slotCounts).sort((a, b) => b[1] - a[1]);
      if (sortedSlots.length > 0) {
        const [bestKey, count] = sortedSlots[0];
        const [dayIdx, blockIdx] = bestKey.split('_').map(Number);
        return {
          day: DAYS[dayIdx] || 'Wednesday',
          timeBlock: TIME_BLOCKS[blockIdx] || 'Evening (17:00 - 20:00)',
          overlapCount: count,
          totalMembers: memberIds.length,
          recommended: true
        };
      }
    }

    // Default recommendation if no slots stored
    return {
      day: 'Wednesday',
      timeBlock: 'Evening (17:00 - 20:00)',
      overlapCount: 2,
      totalMembers: 2,
      recommended: true
    };
  },

  async scheduleGroupSession(matchId, { scheduledAt, topicA = '', topicB = '', icebreakerText = '' }) {
    const mId = parseInt(matchId, 10);
    const dt = new Date(scheduledAt || Date.now() + 48 * 3600 * 1000);
    const zoomUrl = `https://zoom.us/j/study-room-${mId}?pwd=teach-swap`;

    const agenda = {
      part1: `5m: ${topicA || 'Topic 1 Teach-Swap Walkthrough'}`,
      part2: `5m: ${topicB || 'Topic 2 Teach-Swap Walkthrough'}`,
      part3: '5m: Joint Hands-on Practice & Reciprocal Review'
    };
    const icebreaker = icebreakerText || 'Icebreaker Prompt: What is one coding concept that surprised you when you first learned it?';

    try {
      const pool = getPool();
      const [res] = await pool.query(
        'INSERT INTO sessions (match_id, scheduled_at, status, teach_swap_agenda, icebreaker_text, zoom_url) VALUES (?, ?, ?, ?, ?, ?)',
        [mId, dt, 'scheduled', JSON.stringify(agenda), icebreaker, zoomUrl]
      );

      // Notify members
      const [members] = await pool.query('SELECT user_id FROM group_members WHERE match_id = ?', [mId]);
      for (const m of members) {
        await pool.query(
          'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
          [
            m.user_id,
            'session_reminder',
            '📅 New Session Scheduled!',
            `A new teach-swap session has been added for ${dt.toLocaleString()} via Zoom.`
          ]
        );
      }

      return {
        id: res.insertId,
        match_id: mId,
        scheduled_at: dt,
        status: 'scheduled',
        teach_swap_agenda: agenda,
        icebreaker_text: icebreaker,
        zoom_url: zoomUrl
      };
    } catch {
      const newSession = {
        id: memoryStore.sessions.length + 1,
        match_id: mId,
        scheduled_at: dt,
        status: 'scheduled',
        teach_swap_agenda: agenda,
        icebreaker_text: icebreaker,
        zoom_url: zoomUrl
      };
      memoryStore.sessions.push(newSession);

      const members = memoryStore.groupMembers.filter(gm => gm.match_id === mId);
      for (const m of members) {
        memoryStore.notifications.push({
          id: memoryStore.notifications.length + 1,
          user_id: m.user_id,
          type: 'session_reminder',
          title: '📅 New Session Scheduled!',
          message: `A new teach-swap session has been added for ${dt.toLocaleString()} via Zoom.`,
          read_status: false,
          created_at: new Date()
        });
      }

      return newSession;
    }
  }
};
