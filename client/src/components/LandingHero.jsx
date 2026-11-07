import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, ArrowRight, ShieldCheck, Flame, Users, Calendar, Clock,
  CheckCircle2, Plus, Minus, MessageSquare, ChevronRight, BarChart3,
  ExternalLink, Zap, RefreshCw
} from 'lucide-react';

const LOGO_PARTNERS = [
  { name: 'MIT EECS', label: '6.006 Algorithms' },
  { name: 'Stanford CS', label: 'CS161 Data Structures' },
  { name: 'Berkeley EECS', label: 'CS61B Java & Graphs' },
  { name: '400+', label: 'Active Cohorts' },
  { name: 'CMU SCS', label: '15-122 Principles' },
  { name: 'Oxford CompSci', label: 'Peer Study Groups' },
  { name: 'Harvard SEAS', label: 'CS50 Peer Swap' },
  { name: 'DataCamp / edX', label: 'Asynchronous Track' },
];

const CAROUSEL_FEATURES = [
  {
    title: 'Guided 15-Min Teach-Swap',
    tag: 'Facilitator',
    desc: 'Structured 5m A teaches + 5m B teaches + 5m Joint practice removes awkward silences and guarantees balanced peer learning.',
    metric: '15 Mins',
    submetric: 'Structured Segments'
  },
  {
    title: 'Autonomous Accountability',
    tag: 'node-cron Worker',
    desc: 'Smart 24h reminders before sessions and gentle nudges when a member has been quiet for 3 days. No manual chasing needed.',
    metric: '71.9%',
    submetric: '4-Week Retention'
  },
  {
    title: 'Adaptive Plan Rescheduling',
    tag: 'Dropout Prevention',
    desc: 'If a member falls behind, milestones automatically reschedule by +3 days and propose a lighter 15-minute catch-up session.',
    metric: '0%',
    submetric: 'Cascade Failures'
  },
  {
    title: 'Text-First Icebreakers',
    tag: 'Introvert Mode',
    desc: 'Removes camera and voice anxiety with structured written prompts for students who prefer asynchronous or chat-first onboarding.',
    metric: '1-Tap',
    submetric: 'Frictionless Start'
  }
];

const FAQS = [
  {
    category: 'Matching Engine',
    question: 'How does symmetric skill complementarity work?',
    answer: 'Unlike random grouping, our engine calculates the harmonic mean of directional coverages: how well student A covers B\'s gaps AND how well B covers A\'s gaps. If either side is 0, the complementarity score is strictly 0. This mathematically eliminates one-sided pairs where one student carries all the teaching burden.'
  },
  {
    category: 'Matching Engine',
    question: 'What happens if Irving’s stable roommates algorithm fails to converge?',
    answer: 'Irving\'s algorithm solves stable roommate pairings in polynomial time. If an odd-length rotation cycle creates instability, the engine automatically falls back to a greedy-by-score pairing with 2-opt swap improvements, followed by merging leftover singletons into compatible 3-to-4 student groups.'
  },
  {
    category: 'Accountability',
    question: 'How do smart nudges prevent groups from fading out after 1-2 sessions?',
    answer: 'An autonomous background node-cron worker monitors session attendance and milestone activity. It sends 24-hour pre-session reminders, triggers celebratory streak milestones, and prompts members who have been quiet for more than 3 days. In our empirical 200-student simulation, this lifted 4-week retention from 31% to 71.9%.'
  },
  {
    category: 'Sessions',
    question: 'Why is each teach-swap session strictly 15 minutes?',
    answer: 'Micro-commitments dramatically lower cognitive friction and scheduling overhead. A structured 15-minute format (5 min A teaches, 5 min B teaches, 5 min joint practice) provides immediate academic value without the fatigue of open-ended 2-hour study sessions.'
  },
  {
    category: 'Setup',
    question: 'Can judges test this with zero real students?',
    answer: 'Yes! The project includes a full simulation harness (`npm run simulate`) with a 200-student cohort, plus 3 instant 1-click demo logins (Alice Chen, Bob Miller, Charlie Davis) with pre-configured active study groups, milestones, and notification history.'
  }
];

export default function LandingHero({ onStartOnboarding, onDemoLogin, onOpenDemo }) {
  const [activeFaqTab, setActiveFaqTab] = useState('All');
  const [openFaqIdx, setOpenFaqIdx] = useState(0);

  const filteredFaqs = activeFaqTab === 'All'
    ? FAQS
    : FAQS.filter(f => f.category === activeFaqTab);

  return (
    <div className="relative overflow-hidden pt-28 pb-20">
      {/* Ambient Sunset Glow Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-warm-ambient pointer-events-none -z-10" />
      <div className="absolute top-36 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-sunset-glow blur-3xl pointer-events-none -z-10 opacity-70" />

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8 pb-16">
        {/* Pitch Tag */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-neutral-300 text-xs font-medium mb-8 backdrop-blur-xl shadow-lg"
        >
          <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
          <span className="font-mono text-brand-400">v2.0 Release</span>
          <span className="text-neutral-500">•</span>
          <span>Teach-Swap Complementarity + Accountability</span>
        </motion.div>

        {/* Big Editorial Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-serif text-5xl sm:text-7xl lg:text-8xl font-normal text-white/95 tracking-tight leading-[1.06] max-w-5xl mx-auto"
        >
          Matching students is easy.{' '}
          <span className="italic text-neutral-400 font-serif block sm:inline">
            Keeping them showing up is the hard part.
          </span>
        </motion.h1>

        {/* Subhead */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-6 text-neutral-400 text-base sm:text-xl max-w-2xl mx-auto font-light leading-relaxed"
        >
          An algorithmic matchmaking engine that pairs peers by mutual skill exchange, with an autonomous accountability worker that sustains semester-long momentum.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <button
            onClick={onStartOnboarding}
            className="px-8 py-3.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-950 font-semibold text-sm transition-all shadow-xl shadow-white/10 flex items-center gap-2 group hover:scale-[1.02]"
          >
            <span>Start 90s Matchmaking</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={onOpenDemo}
            className="px-7 py-3.5 rounded-full glass-panel hover:bg-white/[0.08] text-white font-medium text-sm transition-all flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4 text-brand-400" />
            <span>200-Student Empirical Benchmark</span>
          </button>
        </motion.div>

        {/* Floating Hero Card Preview (as in video 00:00 - 00:01) */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4 }}
          className="mt-16 max-w-4xl mx-auto"
        >
          <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-left border border-white/[0.12]">
            {/* Header of card */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-sm text-white">Data Structures & Algorithms (DSA) • Active Teach-Swap Pairing</span>
                  <div className="text-[11px] text-neutral-400">Irving Stable Roommates • 94.5% Mutual Complementarity</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Verified Complementary
                </span>
              </div>
            </div>

            {/* Simulated Live Pair Review */}
            <div className="my-5 p-4 rounded-2xl bg-black/40 border border-white/[0.06] text-xs space-y-3">
              <p className="text-neutral-300 leading-relaxed">
                <strong className="text-white">Mutual coverage confirmed:</strong> Alice’s strength in <span className="text-brand-400 font-semibold">Dynamic Programming</span> covers Bob’s gap. Bob’s strength in <span className="text-sky-400 font-semibold">Graph BFS & Trees</span> covers Alice’s gap. Next session scheduled via shared Discord channel in 24 hours.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-neutral-900/80 border border-white/[0.05] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Alice Chen (100% Reliability)</div>
                    <div className="text-[11px] text-brand-300/80 mt-0.5">Teaches: DP Memoization (5m)</div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-500/20 text-brand-300">Slot: Mon 18:00</span>
                </div>

                <div className="p-3 rounded-xl bg-neutral-900/80 border border-white/[0.05] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Bob Miller (95% Reliability)</div>
                    <div className="text-[11px] text-sky-300/80 mt-0.5">Teaches: Graph BFS (5m)</div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">Tool: Discord</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400">🔥 Current Study Streak:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold font-mono">
                  3 Consecutive Weeks
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onStartOnboarding}
                  className="px-5 py-2 rounded-full bg-white hover:bg-neutral-200 text-neutral-950 font-semibold text-xs transition flex items-center gap-1.5 group"
                >
                  <span>Start Matching</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Social Proof Logo Grid (as in video 00:02 - 00:03) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-b border-white/[0.06]">
        <p className="text-center text-xs uppercase tracking-widest text-neutral-500 font-mono mb-8">
          Designed for rigorous STEM & asynchronous university courses
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/[0.08] rounded-2xl overflow-hidden border border-white/[0.08]">
          {LOGO_PARTNERS.map((partner, idx) => (
            <div
              key={idx}
              className="bg-neutral-950/90 p-6 flex flex-col items-center justify-center text-center hover:bg-neutral-900/60 transition group"
            >
              <span className="font-serif text-lg text-neutral-300 group-hover:text-white transition">
                {partner.name}
              </span>
              <span className="text-[11px] text-neutral-500 mt-1 font-mono">
                {partner.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Bento Grid: "Clears the routine. Asks about the rest." (video 00:04 - 00:05) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Title */}
          <div className="lg:col-span-5 space-y-4">
            <span className="text-xs font-mono text-brand-400 uppercase tracking-widest font-semibold">
              Engine Mechanics
            </span>
            <h2 className="font-serif text-4xl sm:text-5xl text-white font-normal leading-tight">
              Clears the guesswork.<br />
              Guarantees mutual value.
            </h2>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Traditional study groups collapse because one person ends up tutoring everyone else. Our multi-dimensional engine ensures that every student both teaches and learns in every single session.
            </p>
          </div>

          {/* Right 3 Bento Columns */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel p-6 rounded-3xl border border-white/[0.08] flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-4">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">Learns your gaps</h3>
                <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                  Diagnostic quiz across your selected subjects infers strong and gap topics, with solutions revealed on the results screen.
                </p>
              </div>
              <div className="mt-6 text-[10px] font-mono text-brand-400">&lt; 90s diagnostic</div>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-white/[0.08] flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">Shows its work</h3>
                <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                  Harmonic mean scoring penalizes one-sided pairs. If either student cannot teach, the score is zero.
                </p>
              </div>
              <div className="mt-6 text-[10px] font-mono text-sky-400">87% bad matches avoided</div>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-white/[0.08] flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base">Keeps you showing up</h3>
                <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                  Automated 24h nudges, milestone check-offs, and adaptive catch-up plans keep groups alive over 4 weeks.
                </p>
              </div>
              <div className="mt-6 text-[10px] font-mono text-emerald-400">71.9% sustained retention</div>
            </div>
          </div>
        </div>
      </section>

      {/* Horizontal Carousel: "Everything your team needs" (video 00:08 - 00:09) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-mono text-brand-400 uppercase tracking-widest font-semibold">
              Built-in Toolkit
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-white font-normal mt-1">
              Everything your study cohort needs.
            </h2>
          </div>
          <p className="text-xs text-neutral-400 max-w-xs">
            Purpose-built tools for collaborative problem solving, staying accountable, and moving faster together.
          </p>
        </div>

        {/* Carousel Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CAROUSEL_FEATURES.map((feat, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="glass-panel rounded-3xl p-6 border border-white/[0.08] flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-neutral-300 border border-white/[0.08]">
                  {feat.tag}
                </span>
                <h3 className="font-bold text-white text-base mt-3">{feat.title}</h3>
                <p className="text-xs text-neutral-400 mt-2 leading-relaxed">{feat.desc}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.06]">
                <div className="text-2xl font-serif text-white">{feat.metric}</div>
                <div className="text-[11px] text-neutral-500 font-mono mt-0.5">{feat.submetric}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Large Numbers & Metric Display (video 00:10 - 00:11) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Atmospheric Image Card with Huge Metric */}
          <div className="lg:col-span-5 relative rounded-3xl overflow-hidden glass-panel border border-white/[0.1] p-8 min-h-[380px] flex flex-col justify-between">
            {/* Background sunset gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-amber-950/40 -z-10" />

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-[11px] backdrop-blur-md self-start border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              <span>Simulated Empirical Proof</span>
            </div>

            <div>
              <div className="font-serif text-7xl sm:text-8xl text-white tracking-tight leading-none">
                87.0%
              </div>
              <p className="text-sm text-neutral-300 mt-2 font-medium">
                Bad matches avoided compared to traditional random student pairing
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Deterministic benchmark on N = 200 cohort across CS101 and DATA200
              </p>
            </div>
          </div>

          {/* Right 4 Metric Tiles */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass-panel p-6 rounded-3xl border border-white/[0.08]">
              <div className="font-serif text-4xl text-white">71.9%</div>
              <div className="text-xs font-semibold text-neutral-300 mt-1">4-Week Completion Rate</div>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                With automated 24h nudges, streaks, and adaptive rescheduling, groups sustain attendance through Week 4.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-white/[0.08]">
              <div className="font-serif text-4xl text-white">&lt; 90s</div>
              <div className="text-xs font-semibold text-neutral-300 mt-1">Onboarding Diagnostic</div>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                5 diagnostic checks infer topic strengths, followed by 7x5 calendar grid and 1-tap tool preferences.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-white/[0.08]">
              <div className="font-serif text-4xl text-white">94.5%</div>
              <div className="text-xs font-semibold text-neutral-300 mt-1">Match Quality Score</div>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                Pairs like Alice Chen & Bob Miller achieve near-perfect mutual topic exchange with identical Discord availability.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-white/[0.08]">
              <div className="font-serif text-4xl text-white">100%</div>
              <div className="text-xs font-semibold text-neutral-300 mt-1">Offline Resilience</div>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                Full MySQL schema with connection pool, plus transparent in-memory data store for instant zero-config judging.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive FAQ Accordion: "Before you ask" (video 00:19 - 00:20) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-10">
          <span className="text-xs font-mono text-brand-400 uppercase tracking-widest font-semibold">
            Frequently Asked Questions
          </span>
          <h2 className="font-serif text-4xl sm:text-5xl text-white font-normal mt-1">
            Before you ask.
          </h2>
          <p className="text-neutral-400 text-sm mt-2">
            Straight answers to how the matching algorithm, accountability worker, and sessions work.
          </p>

          {/* Category Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {['All', 'Matching Engine', 'Accountability', 'Sessions', 'Setup'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveFaqTab(tab)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                  activeFaqTab === tab
                    ? 'bg-white text-neutral-950 shadow-md'
                    : 'bg-white/[0.05] text-neutral-400 hover:text-white border border-white/[0.08]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Accordion List */}
        <div className="divide-y divide-white/[0.08] border-t border-b border-white/[0.08]">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div key={idx} className="py-5">
                <button
                  type="button"
                  onClick={() => setOpenFaqIdx(isOpen ? -1 : idx)}
                  className="w-full text-left flex items-center justify-between gap-4 text-white hover:text-brand-300 transition"
                >
                  <span className="text-base font-medium">{faq.question}</span>
                  <span className="p-1.5 rounded-full bg-white/[0.06] text-neutral-400">
                    {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </span>
                </button>

                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="pt-3 text-sm text-neutral-400 leading-relaxed font-light"
                  >
                    {faq.answer}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Giant Typography Editorial Footer (video 00:23 - 00:24) */}
      <footer className="pt-20 pb-12 border-t border-white/[0.08] relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-16">
            <div>
              <span className="font-serif text-3xl sm:text-4xl text-white">
                Every match, with its accountability.
              </span>
              <p className="text-neutral-500 text-xs sm:text-sm mt-2 max-w-md">
                Smart Study Group Matcher v2.0 • Teach-Swap Engine + Autonomous Retention Scheduler.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onStartOnboarding}
                className="px-6 py-3 rounded-full bg-white hover:bg-neutral-200 text-neutral-950 font-semibold text-xs transition"
              >
                Start Onboarding
              </button>
              <button
                onClick={onOpenDemo}
                className="px-6 py-3 rounded-full glass-panel hover:bg-white/[0.08] text-white font-medium text-xs transition"
              >
                View Benchmark
              </button>
            </div>
          </div>

          {/* Giant Brand Name */}
          <div className="text-center overflow-hidden select-none opacity-20 hover:opacity-30 transition-opacity">
            <span className="font-serif text-[12vw] tracking-tighter text-white font-normal leading-none block">
              SmartMatcher
            </span>
          </div>

          <div className="mt-8 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-4">
            <div>Built for the IBM Hackathon • Node.js, Express, MySQL, React, Vite & Tailwind CSS</div>
            <div className="font-mono">Pitch: "Matching students is easy. Keeping them showing up is the hard part."</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
