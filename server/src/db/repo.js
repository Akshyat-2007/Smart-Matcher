import { getPool } from './pool.js';
import { loadSeedCatalog, generateSyntheticCohort } from './seedData.js';

class MemoryStore {
  constructor() {
    this.fields = [];
    this.subjects = [];
    this.topics = [];
    this.diagnosticQuestions = [];
    this.users = [];
    this.userSubjects = [];
    this.userTopics = [];
    this.availabilitySlots = [];
    this.toolPreferences = [];
    this.matches = [];
    this.groupMembers = [];
    this.sessions = [];
    this.attendance = [];
    this.milestones = [];
    this.milestoneCheckoffs = [];
    this.feedback = [];
    this.notifications = [];
    this.messages = [];
    this.partnerRequests = [];
    this.groupResources = [];
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    const { fields, subjects } = loadSeedCatalog();
    this.fields = fields.map((f, i) => ({ id: i + 1, name: f.name, slug: f.slug, icon: f.icon, description: f.description }));

    const fieldIdMap = {};
    this.fields.forEach(f => { fieldIdMap[f.name] = f.id; });

    let nextSubId = 1;
    let nextTopicId = 1;
    let nextQuestionId = 1;
    const subjectIdMap = {};
    const topicIdMap = {};

    for (const sub of subjects) {
      const sId = nextSubId++;
      subjectIdMap[sub.slug] = sId;
      const fId = fieldIdMap[sub.field] || 1;
      this.subjects.push({
        id: sId,
        field_id: fId,
        name: sub.name,
        slug: sub.slug,
        description: sub.description
      });

      for (const t of (sub.topics || [])) {
        const tId = nextTopicId++;
        topicIdMap[`${sub.slug}:${t.name}`] = tId;
        this.topics.push({
          id: tId,
          subject_id: sId,
          name: t.name,
          description: t.description
        });
      }

      for (const q of (sub.questions || [])) {
        const tId = topicIdMap[`${sub.slug}:${q.topic}`];
        if (tId) {
          this.diagnosticQuestions.push({
            id: nextQuestionId++,
            topic_id: tId,
            prompt: q.prompt,
            options: q.options,
            correct_index: q.correct_index,
            explanation: q.explanation,
            difficulty: q.difficulty || 'medium'
          });
        }
      }
    }

    const { students } = await generateSyntheticCohort(42);
    let nextUserId = 1;

    for (const s of students) {
      const uId = nextUserId++;
      this.users.push({
        id: uId,
        name: s.name,
        email: s.email,
        password_hash: s.passwordHash,
        reliability_score: s.reliability,
        status: 'unmatched',
        avatar_url: null,
        created_at: new Date()
      });

      for (const subSlug of s.subjects) {
        const subId = subjectIdMap[subSlug];
        if (subId) {
          this.userSubjects.push({
            id: this.userSubjects.length + 1,
            user_id: uId,
            subject_id: subId,
            needs_goal: s.goal
          });
        }
      }

      for (const st of s.strengths) {
        const tId = topicIdMap[`${s.primarySubject}:${st}`];
        if (tId) {
          this.userTopics.push({
            id: this.userTopics.length + 1,
            user_id: uId,
            topic_id: tId,
            type: 'strength',
            source: 'quiz'
          });
        }
      }

      for (const gap of s.gaps) {
        const tId = topicIdMap[`${s.primarySubject}:${gap}`];
        if (tId) {
          this.userTopics.push({
            id: this.userTopics.length + 1,
            user_id: uId,
            topic_id: tId,
            type: 'gap',
            source: 'quiz'
          });
        }
      }

      for (const sl of s.slots) {
        this.availabilitySlots.push({
          id: this.availabilitySlots.length + 1,
          user_id: uId,
          day_of_week: sl.day,
          slot_index: sl.slot
        });
      }

      // Exclusively Zoom Meets
      this.toolPreferences.push({
        id: this.toolPreferences.length + 1,
        user_id: uId,
        tool: 'zoom',
        frequency: s.frequency || '2x'
      });
    }

    // Alice & Bob initial active match on DSA (via Zoom meets)
    const alice = this.users.find(u => u.email === 'alice@demo.com');
    const bob = this.users.find(u => u.email === 'bob@demo.com');
    const dsa = this.subjects.find(s => s.slug === 'dsa');

    if (alice && bob && dsa) {
      const matchId = 1;
      this.matches.push({
        id: matchId,
        subject_id: dsa.id,
        title: 'Alice & Bob: DSA Teach-Swap',
        size_limit: 4,
        goal: 'exam_prep',
        status: 'active',
        streak_count: 3,
        compatibility_score: 94.5,
        tool_used: 'zoom',
        tool_link: 'https://zoom.us/j/9823471029?pwd=study-peer-dsa',
        last_active_at: new Date(),
        created_at: new Date()
      });

      this.groupMembers.push(
        { id: 1, match_id: matchId, user_id: alice.id, role: 'lead', joined_at: new Date() },
        { id: 2, match_id: matchId, user_id: bob.id, role: 'member', joined_at: new Date() }
      );

      alice.status = 'matched';
      bob.status = 'matched';

      const sessionDate = new Date(Date.now() + 24 * 3600 * 1000);
      this.sessions.push({
        id: 1,
        match_id: matchId,
        scheduled_at: sessionDate,
        status: 'scheduled',
        teach_swap_agenda: {
          part1: 'Alice teaches Bob: Dynamic Programming Memoization (5 mins)',
          part2: 'Bob teaches Alice: BFS Shortest Paths & Graph Traversal (5 mins)',
          part3: 'Joint practice: Solve LeetCode #200 (Number of Islands) (5 mins)'
        },
        icebreaker_text: 'Icebreaker Prompt: What was the most confusing bug you encountered this past week and how did you squash it?',
        zoom_url: 'https://zoom.us/j/9823471029?pwd=study-peer-dsa'
      });

      const dueDate = new Date(Date.now() + 3 * 24 * 3600 * 1000);
      this.milestones.push({
        id: 1,
        match_id: matchId,
        title: 'Complete Module 3 Lab: Graph Search & DP',
        description: 'Collaborative checkoff for problem sets 3.1 through 3.4',
        due_date: dueDate,
        status: 'pending',
        reschedule_count: 0
      });

      this.milestoneCheckoffs.push({
        id: 1,
        milestone_id: 1,
        user_id: alice.id,
        checked_at: new Date()
      });

      // Group Messages with Icebreakers
      this.messages.push(
        { id: 1, match_id: matchId, user_id: alice.id, content: 'Hey Bob! Excited for our teach-swap session tomorrow. I prepared some visual slides on DP memoization!', is_icebreaker: false, created_at: new Date(Date.now() - 3600000) },
        { id: 2, match_id: matchId, user_id: bob.id, content: 'Awesome Alice! I have 3 clean graph BFS diagrams ready for you. See you on Zoom at 6pm!', is_icebreaker: false, created_at: new Date(Date.now() - 1800000) },
        { id: 3, match_id: matchId, user_id: alice.id, content: 'Icebreaker answer: For me it was forgetting base cases in recursion leading to stack overflows!', is_icebreaker: true, created_at: new Date(Date.now() - 900000) }
      );

      this.notifications.push(
        { id: 1, user_id: alice.id, type: 'session_reminder', title: 'Upcoming Teach-Swap in 24h', message: 'Your session with Bob Miller for Data Structures & Algorithms is tomorrow at 6:00 PM via Zoom.', read_status: false, created_at: new Date() },
        { id: 2, user_id: alice.id, type: 'streak', title: '🔥 3-Session Streak!', message: 'Your study group has maintained a 3-week study streak! Keep up the momentum.', read_status: false, created_at: new Date() }
      );

      // Pre-seed Group Resources
      this.groupResources.push(
        {
          id: 1,
          match_id: matchId,
          user_id: alice.id,
          title: 'DP Memoization Visual Cheatsheet',
          url: 'https://docs.google.com/presentation/d/sample-dp-cheatsheet',
          note: 'Visual walkthrough of top-down vs bottom-up subproblems with state cache diagrams.',
          type: 'document',
          created_at: new Date(Date.now() - 86400000)
        },
        {
          id: 2,
          match_id: matchId,
          user_id: bob.id,
          title: 'LeetCode #200: Number of Islands (BFS/DFS)',
          url: 'https://leetcode.com/problems/number-of-islands/',
          note: 'Target practice problem for part 3 joint exercise. Grid traversal template included.',
          type: 'link',
          created_at: new Date(Date.now() - 43200000)
        }
      );

      // Pre-seed Sample Open Groups for discovery
      const python = this.subjects.find(s => s.slug === 'python');
      if (python) {
        this.matches.push({
          id: 2,
          subject_id: python.id,
          title: 'Python Backend & Async Sprint',
          size_limit: 4,
          goal: 'project',
          status: 'active',
          streak_count: 1,
          compatibility_score: 88.0,
          tool_used: 'zoom',
          tool_link: 'https://zoom.us/j/study-room-python-sprint',
          last_active_at: new Date(),
          created_at: new Date()
        });

        // Add 2 synthetic members
        const student4 = this.users[3];
        const student5 = this.users[4];
        if (student4) this.groupMembers.push({ id: 3, match_id: 2, user_id: student4.id, role: 'lead', joined_at: new Date() });
        if (student5) this.groupMembers.push({ id: 4, match_id: 2, user_id: student5.id, role: 'member', joined_at: new Date() });
      }

      // Pre-seed Sample Partner Requests for Alice
      const student6 = this.users[5];
      if (student6) {
        this.partnerRequests.push({
          id: 1,
          sender_id: student6.id,
          receiver_id: alice.id,
          subject_id: dsa.id,
          status: 'pending',
          note: `Hey Alice! I saw you are strong in DP. I have solid expertise in Graph Traversals and would love to teach-swap over Zoom!`,
          created_at: new Date(Date.now() - 7200000)
        });
      }
    }

    this.initialized = true;
  }
}

export const memoryStore = new MemoryStore();
await memoryStore.init();

export default memoryStore;
