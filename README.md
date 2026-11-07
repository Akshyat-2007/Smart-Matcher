# Smart Study Group Matcher (v2: Teach-Swap + Accountability)

> *"Matching students is easy. Keeping them showing up is the hard part."*

An intelligent peer-learning matchmaking and retention platform built for large, remote, and asynchronous university courses. Unlike traditional study group tools that arbitrarily group students or leave them to fade out after one session, this engine pairs students based on **symmetric skill complementarity (teach-swap)** and sustains group longevity using an **autonomous scheduled accountability engine**.

Students select an **Academic Field** (Engineering CS/IT, Engineering Core, Medical), choose **1 to 3 Subjects**, take a **Diagnostic Quiz** (with answers strictly hidden during the quiz and revealed on the results screen with full explanations), and are algorithmically matched **per subject**.

---

## 🏛️ System Architecture

```
                          +-------------------------------------------------------+
                          |                   React + Vite Client                 |
                          | (Tailwind CSS, Recharts, 5-Step Diagnostic, 15m Timer)|
                          +---------------------------+---------------------------+
                                                      |  REST API / JWT
                                                      v
+---------------------------------------------------------------------------------------------------------+
|                                           Express.js Server                                             |
|                                                                                                         |
|  +--------------------+     +--------------------------------+     +---------------------------------+  |
|  |    Auth Service    |     |     Pure Matching Engine       |     |  node-cron Accountability Worker|  |
|  | (Bcrypt, JWT, Demo)|     | - Hard Filters (Subject, Slot) |     | - 24h Session Reminder Nudges   |  |
|  +--------------------+     | - Symmetric Complementarity    |     | - Inactive Student Nudges       |  |
|                             | - Irving's Stable Roommates    |     | - Adaptive Milestone Reschedule |  |
|  +--------------------+     | - Greedy 2-Opt Swap Fallback   |     | - Auto-Reshuffle Monitor        |  |
|  |  Catalog Service   |     | - 3-to-4 Member Group Merging  |     +---------------------------------+  |
|  | (Fields, Subjects) |     +--------------------------------+                                          |
|  +--------------------+                                                                                 |
+---------------------------------------------+-----------------------------------------------------------+
                                              | Connection Pool (mysql2/promise)
                                              v
+---------------------------------------------------------------------------------------------------------+
|                                              MySQL Database                                             |
| (fields, subjects, topics, user_subjects, user_topics, diagnostic_questions, availability_slots,        |
|  tool_preferences, matches, sessions, attendance, milestones, milestone_checkoffs, feedback,          |
|  notifications, messages)                                                                               |
+---------------------------------------------------------------------------------------------------------+
```

---

## ⚡ Quick Start & Setup

### Prerequisites
- **Node.js**: v18+ (tested on Node.js v20 & v26)
- **MySQL Server**: 8.0+ (Automatic in-memory SQLite/Memory fallback store initialized if MySQL is offline)

### 1. Clone & Install Dependencies
```bash
# In project root
npm install

# Install server & client dependencies
cd server && npm install
cd ../client && npm install
cd ..
```

### 2. Configure Environment Variables
Copy the environment example file in `/server`:
```bash
cp server/.env.example server/.env
```
Ensure your MySQL credentials match:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=smart_study_matcher
PORT=5000
JWT_SECRET=super_secret_study_matcher_key_2026_ibm
```

### 3. Initialize & Seed Database
```bash
# Creates database and executes schema.sql (tables, foreign keys, indexes)
npm run db:init

# Seeds 3 fields, 20 subjects, 80 topics, 80 questions from JSON, 200 synthetic students, and 3 demo accounts
npm run db:seed
```

### 4. Run the 3-Strategy Benchmark Simulation
```bash
npm run simulate
```

### 5. Run Unit Tests
```bash
npm test
```

### 6. Start the Development Server
```bash
# Concurrently launches Express REST API (:5000) and React Vite (:3000)
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📚 Academic Fields & Subjects Catalog

All seed content is stored in clean JSON files under `/server/seed/data/` (one file per subject for questions), allowing new subjects or topics to be added with zero code modifications:

### 1. Engineering (CS/IT) 💻
- Data Structures & Algorithms (DSA)
- Python Programming
- C Programming
- Java Programming
- Database Management Systems (DBMS)
- Operating Systems (OS)
- Computer Networks
- Web Development

### 2. Engineering (Core) ⚙️
- Engineering Mathematics
- Engineering Physics
- Engineering Chemistry
- Basic Electrical Engineering
- Engineering Mechanics
- Thermodynamics

### 3. Medical 🩺
- Biology
- Human Anatomy
- Physiology
- Biochemistry
- Pathology
- Pharmacology

---

## 🧠 Feature Breakdown

### 1. Multi-Dimensional Matching Engine (`/server/src/matching`)
Pure, unit-tested module with **zero DB calls** in scoring functions:
1. **Hard Filters (instant rejection on failure):**
   - Same subject match (`subjectSlug` or common item in `user_subjects`).
   - At least 1 shared availability slot.
   - Exclusively Zoom video meets for peer study groups.
2. **Tunable Weighted Scoring (0 to 100 points, config in `weights.js`):**
   - **Skill Complementarity (45 pts - highest weight):** Harmonic mean of directional coverages:
     $$Cov(A \rightarrow B) = \frac{|S_A \cap G_B|}{\max(1, |G_B|)}, \quad Cov(B \rightarrow A) = \frac{|S_B \cap G_A|}{\max(1, |G_A|)}$$
     $$H(A, B) = \frac{2 \cdot Cov(A \rightarrow B) \cdot Cov(B \rightarrow A)}{Cov(A \rightarrow B) + Cov(B \rightarrow A)}$$
     *If either directional coverage is 0, harmonic mean is strictly 0. One-sided pairs where one person does all the teaching are rejected.*
   - **Temporal Overlap (25 pts):** Shared availability slots with bonus for multi-slot redundancy.
   - **Academic Needs (15 pts):** Shared assignment, project, or exam goals.
   - **Communication Fit (10 pts):** Tool overlap and frequency target match (1x/2x/3x).
   - **Reliability Tie-Breaker (5 pts):** Geometric mean of student reliability scores.
3. **Irving's Stable Roommates Algorithm with Greedy Fallback:**
   - Constructs preference rankings and prunes unstable pairs in polynomial time.
   - If cyclical rotations don't converge, falls back to greedy-by-score with 2-opt swap improvements.
   - Leftover singletons are merged into the best-fit existing pair to form groups of 3 to 4.

### 2. Onboarding Flow (`/client/src/pages/OnboardingPage.jsx`)
- **Step 1: Choose Field:** Engineering (CS/IT), Engineering (Core), or Medical.
- **Step 2: Select 1 to 3 Subjects:** Interactive selection with strict 1-3 limit and primary goal.
- **Step 3: Diagnostic Quiz:** Conceptual multiple-choice questions mapped to subject topics. **Answers and explanations are strictly hidden during the quiz** to maintain test integrity.
- **Step 4: Results Screen:** Reveals mastery percentage score, question-by-question review (what you chose vs correct answer and detailed explanation), and inferred teach-swap topics with 1-tap chip toggle between "Teach" (Strength) and "Learn" (Gap).
- **Step 5: Availability & Cadence:** 7x5 interactive calendar grid, weekly cadence, and **exclusively Zoom video meets** for live peer collaboration.

### 3. Peer Discovery & Group Creation (`/client/src/pages/DiscoveryPage.jsx`)
- **Suggested Partners:** Dynamic list of peer candidates scored by teach-swap complementarity ($A \rightarrow B$ and $B \rightarrow A$) with symmetric reasons (*"Can teach you: DP"*, *"3 shared Zoom slots"*).
- **Multi-Dimensional Filters:** Filter by Subject, Academic Goal (Exam Prep, Project Sprint, Homework), and hard filter for shared Zoom slots.
- **Interactive Actions:** Send Study Request (with custom note), Skip candidate, or Accept/Decline incoming requests from your inbox.
- **Study Group Creation & Joining:** Create open study groups for any subject with custom size limits (2 to 4 members) and goals. Browse open groups and inspect current member teach strengths.

### 4. 15-Minute Structured Teach-Swap Session (`/client/src/components/TeachSwapTimer.jsx`)
- **Part 1 (5 min):** Member A teaches Member B their gap topic.
- **Part 2 (5 min):** Member B teaches Member A their gap topic.
- **Part 3 (5 min):** Collaborative joint exercise solving.
- **Text-First Icebreaker Toggle:** Introvert mode provides written prompts to remove audio/video anxiety.

### 5. Autonomous Accountability & Retention Engine (`/server/src/scheduler`)
- **Smart Nudges:** `node-cron` worker monitors database and triggers 24h pre-session alerts and quiet-student check-in prompts into an in-app inbox.
- **Streak Tracking:** Visual study streak gamification with fire badges.
- **Adaptive Plan Rescheduling:** If a member falls behind, milestones automatically reschedule (+3 days) and propose lighter 15-minute catch-up sessions rather than cascade failure.
- **Auto-Reshuffle Trigger:** Repeated no-shows (-0.20 reliability penalty) or unproductive ratings flag the group and return students to the matching pool for repair.

### 6. Coordination Hub (`/client/src/pages/HubPage.jsx`)
- **Zoom Meets Integration:** Direct one-click launch link to the group's dedicated Zoom video meet room.
- **Resource Sharing Tab:** Share and browse helpful links, problem sets, visual cheatsheets, and lecture notes inside the group.
- **Shared Calendar & Scheduling Tab:** AI-computed best common time slot based on member availability intersection with 1-tap Zoom booking.
- **Dual Chat:** Toggle between group room chat and 1:1 direct partner chat, equipped with a text-first icebreaker prompt banner for introverted/shy students.
- **Accountability Milestones & Adaptive Catch-Up:** Interactive checklist with per-member checkoffs and +3 days adaptive buffer.
- **Post-Session Feedback:** Thumbs up (+0.03 reliability) / Thumbs down (-0.07) and instant *"Request Reshuffle"* button.

---

## 📊 Empirical Simulation Results (`/simulation`)

Ran on an identical cohort of **200 synthetic students across 20 subjects** (Mulberry32 seeded PRNG, seed = 1007):

| Strategy | Avg Match Score | Bad Match Rate | Bad Avoided | 4-Wk Retention (No Acc) | 4-Wk Retention (With Acc) |
|---|---|---|---|---|---|
| **Random Pairing** | **2.62 / 100** | 99.0% (99) | 0.0% | **7.0%** *(collapses to 0% by W4)* | **37.8%** |
| **Naive Greedy (Slot-only)** | **19.40 / 100** | 93.3% (84) | 15.0% | **12.5%** | **49.4%** |
| **Smart Engine (Teach-Swap + Stable)** | **42.93 / 100** | **53.4% (39)** | **60.0%** | **19.9%** | **63.0%** *(sustained through W4)* |

### Probabilistic Dropout Model Assumptions
1. **Baseline Completion:** $P_{\text{base}} = 0.20 + 0.75 \times (Score / 100) \times R_{\text{avg}}$.
2. **Without Accountability:** Natural 10% asynchronous weekly attrition; missed sessions cause a 50% cascade dropout rate ("fade-out"); 2 missed sessions dissolve the group.
3. **With Accountability:** 24h nudges provide a +18% show-up boost; visible streaks provide +5%/week habit reinforcement; adaptive rescheduling prevents cascade collapse when busy.

---

## ⏱️ 60-Second Demo Walkthrough for Judges

1. **0:00 - 0:15:** Open the app at [http://localhost:3000](http://localhost:3000). Click **"Start 90s Matchmaking"**.
2. **0:15 - 0:30:**
   - Select **Engineering (CS/IT)**.
   - Choose **Data Structures & Algorithms** (DSA).
   - Take the diagnostic quiz: notice that **answers are hidden** while answering.
3. **0:30 - 0:45:**
   - Click **Submit Quiz**: see the **Results Screen** with overall score %, question-by-question solutions, explanations, and inferred Teach/Learn chips.
   - Click a chip to swap a topic between "Teach" and "Learn".
4. **0:45 - 0:55:**
   - Select availability slots and click **"Find Complementary Study Partners"**.
   - Land directly in the **Coordination Hub**: view partners, Discord link, 15-minute teach-swap timer, and streak.
5. **0:55 - 1:00:**
   - Open **"Simulation Benchmark"** tab to view the live Recharts comparison of Random vs Greedy vs Smart Engine across 200 students.
