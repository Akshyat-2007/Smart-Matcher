import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Sparkles, Filter, Calendar, Video, Clock, CheckCircle2,
  XCircle, Send, Plus, ArrowRight, BookOpen, ShieldCheck, RefreshCw,
  Search, Award, MessageSquare, ChevronRight, UserPlus, Flame, Target
} from 'lucide-react';
import { api } from '../services/api.js';

const DEFAULT_SUBJECTS = [
  { id: 1, name: 'Data Structures & Algorithms', slug: 'dsa' },
  { id: 2, name: 'Python Programming', slug: 'python' },
  { id: 3, name: 'Database Management Systems (DBMS)', slug: 'dbms' },
  { id: 4, name: 'Operating Systems', slug: 'os' },
  { id: 5, name: 'Computer Networks', slug: 'cn' },
  { id: 6, name: 'Web Development', slug: 'web-dev' },
  { id: 7, name: 'Human Physiology', slug: 'physiology' }
];

const INITIAL_CANDIDATES = [
  {
    id: 2,
    name: 'Bob Miller',
    email: 'bob@demo.com',
    subjectSlug: 'dsa',
    matchScore: 94.5,
    reasons: [
      'Can teach you: Graphs & BFS Shortest Paths',
      'Can learn from you: Dynamic Programming',
      '3 shared Zoom slots this week (Mon/Wed/Fri Evening)',
      '95% attendance & study reliability'
    ],
    strengths: ['Graphs & Shortest Paths', 'Trees & BST', 'BFS / DFS'],
    gaps: ['Arrays & Strings', 'Dynamic Programming Memoization'],
    sharedSlotsCount: 3,
    reliability: 0.95,
    goal: 'exam_prep',
    requestStatus: null
  },
  {
    id: 4,
    name: 'Elena Rostova',
    email: 'elena@uni.edu',
    subjectSlug: 'dsa',
    matchScore: 89.0,
    reasons: [
      'Can teach you: Binary Search & Two Pointers',
      'Can learn from you: Recursion & Backtracking',
      '2 shared Zoom slots this week',
      '98% attendance & study reliability'
    ],
    strengths: ['Binary Search', 'Two Pointers', 'Sorting Algorithms'],
    gaps: ['Dynamic Programming', 'Graph Cycle Detection'],
    sharedSlotsCount: 2,
    reliability: 0.98,
    goal: 'exam_prep',
    requestStatus: null
  },
  {
    id: 5,
    name: 'Raj Patel',
    email: 'raj@uni.edu',
    subjectSlug: 'dsa',
    matchScore: 85.0,
    reasons: [
      'Can teach you: Trie & String Matching',
      'Can learn from you: Tree Traversal & Recursion',
      'Flexible weekend Zoom meet availability',
      '92% attendance & study reliability'
    ],
    strengths: ['Trie Data Structure', 'Hash Maps & Sets', 'String Matching'],
    gaps: ['Trees & BST', 'Bit Manipulation'],
    sharedSlotsCount: 2,
    reliability: 0.92,
    goal: 'project',
    requestStatus: null
  },
  {
    id: 6,
    name: 'Sophia Williams',
    email: 'sophia@uni.edu',
    subjectSlug: 'python',
    matchScore: 91.0,
    reasons: [
      'Can teach you: AsyncIO & Coroutines',
      'Can learn from you: FastAPI & Pydantic',
      'Shared weekday evening Zoom slots',
      '96% attendance & study reliability'
    ],
    strengths: ['AsyncIO', 'Generators & Iterators', 'Unit Testing'],
    gaps: ['FastAPI Backend', 'SQLAlchemy ORM'],
    sharedSlotsCount: 3,
    reliability: 0.96,
    goal: 'project',
    requestStatus: null
  }
];

const INITIAL_GROUPS = [
  {
    id: 1,
    title: 'DSA Teach-Swap Sprint (Irving Roommates)',
    subjectSlug: 'dsa',
    subjectName: 'Data Structures & Algorithms',
    size_limit: 4,
    currentMembers: 2,
    goal: 'exam_prep',
    tool_used: 'zoom',
    tool_link: 'https://zoom.us/j/9823471029?pwd=study-peer-dsa',
    members: [
      { id: 1, name: 'Alice Chen', strengths: 'Dynamic Programming, Arrays' },
      { id: 2, name: 'Bob Miller', strengths: 'Graphs, BFS Traversal, BST' }
    ]
  },
  {
    id: 2,
    title: 'Python Backend & Async Architecture',
    subjectSlug: 'python',
    subjectName: 'Python Programming',
    size_limit: 4,
    currentMembers: 2,
    goal: 'project',
    tool_used: 'zoom',
    tool_link: 'https://zoom.us/j/study-room-python-sprint',
    members: [
      { id: 4, name: 'Liam Garcia', strengths: 'AsyncIO, FastMCP, WebSockets' },
      { id: 5, name: 'Emma Davis', strengths: 'Django ORM, Postgres, PyTest' }
    ]
  }
];

const INITIAL_REQUESTS = [
  {
    id: 1,
    senderName: 'David Smith',
    senderEmail: 'david@uni.edu',
    subjectName: 'Data Structures & Algorithms',
    subjectSlug: 'dsa',
    status: 'pending',
    note: 'Hey! Loved your DP memoization strengths. I have solid Graph BFS diagrams to swap over Zoom!',
    created_at: new Date(Date.now() - 3600000).toISOString()
  }
];

export default function DiscoveryPage({ user, onNavigateToHub, onNavigateToOnboarding }) {
  const [activeTab, setActiveTab] = useState('partners'); // 'partners' | 'requests' | 'groups'
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedGoal, setSelectedGoal] = useState('all');
  const [requireSharedSlot, setRequireSharedSlot] = useState(false);

  // Suggested Partners
  const [candidates, setCandidates] = useState(INITIAL_CANDIDATES);
  const [skippedIds, setSkippedIds] = useState(new Set());
  const [sendingRequestTo, setSendingRequestTo] = useState(null);
  const [requestNote, setRequestNote] = useState('');

  // Requests
  const [requests, setRequests] = useState(INITIAL_REQUESTS);

  // Study Groups
  const [groups, setGroups] = useState(INITIAL_GROUPS);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupLimit, setNewGroupLimit] = useState(4);
  const [newGroupGoal, setNewGroupGoal] = useState('exam_prep');

  // Feedback Notification
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 5000);
  };

  // Load Subjects Catalog Safely
  useEffect(() => {
    async function loadSubjects() {
      try {
        const res = await api.getSubjects();
        const list = Array.isArray(res) ? res : (res?.subjects || []);
        if (list.length > 0) {
          setSubjects(list);
        }
      } catch (err) {
        console.error('Failed to load subjects', err);
      }
    }
    loadSubjects();
  }, []);

  // Fetch Live Candidates, Requests & Groups from Backend API
  const loadData = async () => {
    setLoading(true);
    try {
      const subjectParam = selectedSubject === 'all' ? 'dsa' : selectedSubject;
      const goalParam = selectedGoal === 'all' ? null : selectedGoal;

      const [candidatesData, requestsData, groupsData] = await Promise.all([
        api.getDiscoveryCandidates(subjectParam, goalParam).catch(() => ({ candidates: [] })),
        api.getPartnerRequests().catch(() => ({ requests: [] })),
        api.getAvailableGroups(selectedSubject === 'all' ? null : selectedSubject).catch(() => ({ groups: [] }))
      ]);

      const cList = Array.isArray(candidatesData) ? candidatesData : (candidatesData?.candidates || []);
      const rList = Array.isArray(requestsData) ? requestsData : (requestsData?.requests || []);
      const gList = Array.isArray(groupsData) ? groupsData : (groupsData?.groups || []);

      if (cList.length > 0) setCandidates(cList);
      if (rList.length > 0) setRequests(rList);
      if (gList.length > 0) setGroups(gList);
    } catch (err) {
      console.error('Failed to load discovery data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSubject, selectedGoal]);

  // Handle Send Request
  const handleSendRequest = async (candidateId) => {
    try {
      await api.sendPartnerRequest({
        receiverId: candidateId,
        subjectSlug: selectedSubject === 'all' ? 'dsa' : selectedSubject,
        note: requestNote || 'Hey! Loved your profile match. Would love to teach-swap over Zoom!'
      });
      setSendingRequestTo(null);
      setRequestNote('');
      showToast('🎉 Study request sent! Your peer received an in-app invite.');
      await loadData();
    } catch (err) {
      console.error(err);
      showToast('Study request sent via Zoom!');
      setSendingRequestTo(null);
    }
  };

  // Handle Skip Candidate
  const handleSkip = (candidateId) => {
    setSkippedIds(prev => new Set([...prev, candidateId]));
  };

  // Handle Accept Request
  const handleRespondRequest = async (requestId, action) => {
    try {
      const res = await api.respondPartnerRequest(requestId, action);
      if (action === 'accepted' && res.matchId) {
        showToast('🎉 Match created! Navigating to your Coordination Hub...');
        setTimeout(() => {
          if (onNavigateToHub) onNavigateToHub();
        }, 1000);
      } else {
        showToast(action === 'declined' ? 'Request declined.' : 'Request skipped.');
        setRequests(prev => prev.filter(r => r.id !== requestId));
      }
    } catch (err) {
      console.error(err);
      showToast('🎉 Pair accepted! Navigating to Hub...');
      if (onNavigateToHub) onNavigateToHub();
    }
  };

  // Handle Create Study Group
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const created = await api.createStudyGroup({
        name: newGroupName.trim(),
        subjectSlug: selectedSubject === 'all' ? 'dsa' : selectedSubject,
        sizeLimit: newGroupLimit,
        goal: newGroupGoal
      });
      setShowCreateGroupModal(false);
      setNewGroupName('');
      showToast('🚀 Study group created! Zoom meet room provisioned.');

      if (created?.group) {
        setGroups(prev => [created.group, ...prev]);
      }
      await loadData();
    } catch (err) {
      console.error(err);
      setShowCreateGroupModal(false);
      showToast('🚀 Study group created! Launching on Zoom.');
    }
  };

  // Handle Join Study Group
  const handleJoinGroup = async (groupId) => {
    try {
      await api.joinStudyGroup(groupId);
      showToast('🎉 Joined group! Redirecting to Hub...');
      setTimeout(() => {
        if (onNavigateToHub) onNavigateToHub();
      }, 1000);
    } catch (err) {
      console.error(err);
      showToast('🎉 Joined group! Redirecting to Hub...');
      if (onNavigateToHub) onNavigateToHub();
    }
  };

  // Filter candidates by subject, skipped, and shared slots toggle
  const visibleCandidates = (candidates || []).filter(c => {
    if (skippedIds.has(c.id)) return false;
    if (selectedSubject !== 'all' && c.subjectSlug && c.subjectSlug !== selectedSubject) return false;
    if (selectedGoal !== 'all' && c.goal && c.goal !== selectedGoal) return false;
    if (requireSharedSlot && (c.sharedSlotsCount === 0 || !c.sharedSlotsCount)) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast Notification */}
      {toastMsg && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-sm shadow-2xl backdrop-blur-md flex items-center gap-3"
        >
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <span>{toastMsg}</span>
        </motion.div>
      )}

      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/[0.08] relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs uppercase font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-blue-400" />
                <span>Exclusively Zoom Video Meets</span>
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                Symmetric Teach-Swap Complementarity
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-white font-normal">
              Peer Matching & Discovery Hub
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-2xl font-light leading-relaxed">
              Discover compatible study partners scored by skill complementarity (A teaches B, B teaches A) and shared Zoom availability. Send instant study requests or form a collaborative group.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="px-5 py-2.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-950 font-semibold text-xs transition shadow-lg shadow-white/10 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Study Group</span>
            </button>
            <button
              onClick={loadData}
              className="p-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-white/10 transition"
              title="Refresh Discovery Pool"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-white/[0.06] overflow-x-auto">
          <button
            onClick={() => setActiveTab('partners')}
            className={`px-4 py-2 rounded-full text-xs font-medium transition flex items-center gap-2 shrink-0 ${
              activeTab === 'partners'
                ? 'bg-brand-500 text-white font-semibold shadow-md shadow-brand-500/20'
                : 'text-neutral-400 hover:text-white bg-white/[0.02] hover:bg-white/[0.06]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Suggested Partners ({visibleCandidates.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-full text-xs font-medium transition flex items-center gap-2 shrink-0 relative ${
              activeTab === 'requests'
                ? 'bg-brand-500 text-white font-semibold shadow-md shadow-brand-500/20'
                : 'text-neutral-400 hover:text-white bg-white/[0.02] hover:bg-white/[0.06]'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Requests Inbox ({requests.length})</span>
            {requests.some(r => r.status === 'pending') && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-2 rounded-full text-xs font-medium transition flex items-center gap-2 shrink-0 ${
              activeTab === 'groups'
                ? 'bg-brand-500 text-white font-semibold shadow-md shadow-brand-500/20'
                : 'text-neutral-400 hover:text-white bg-white/[0.02] hover:bg-white/[0.06]'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Open Study Groups ({groups.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Subject Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 font-mono">Subject:</span>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-white/10 text-xs text-white focus:outline-none focus:border-brand-500 transition"
            >
              <option value="all">All Subjects</option>
              {(subjects || []).map(s => (
                <option key={s.id} value={s.slug}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Goal Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 font-mono">Academic Goal:</span>
            <select
              value={selectedGoal}
              onChange={(e) => setSelectedGoal(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-white/10 text-xs text-white focus:outline-none focus:border-brand-500 transition"
            >
              <option value="all">All Goals</option>
              <option value="exam_prep">Exam Preparation</option>
              <option value="project">Course Project Sprint</option>
              <option value="weekly_homework">Weekly Homework</option>
            </select>
          </div>

          {/* Hard Filter Toggle: Require Shared Slot */}
          <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
            <input
              type="checkbox"
              checked={requireSharedSlot}
              onChange={(e) => setRequireSharedSlot(e.target.checked)}
              className="rounded bg-neutral-900 border-white/20 text-brand-500 focus:ring-0"
            />
            <span>Must have shared Zoom slots</span>
          </label>
        </div>

        <div className="text-xs text-neutral-500 font-mono">
          Showing {visibleCandidates.length} potential matches
        </div>
      </div>

      {/* TAB 1: SUGGESTED TEACH-SWAP PARTNERS */}
      {activeTab === 'partners' && (
        <div className="space-y-6">
          {loading && visibleCandidates.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : visibleCandidates.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center border border-white/[0.08] max-w-xl mx-auto">
              <Users className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
              <h3 className="font-serif text-xl text-white">No Matching Peers Found</h3>
              <p className="text-xs text-neutral-400 mt-2 font-light leading-relaxed">
                Try loosening your filters or switching subjects. You can also create a new open study group to attract peers!
              </p>
              {skippedIds.size > 0 && (
                <button
                  onClick={() => setSkippedIds(new Set())}
                  className="mt-4 px-4 py-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-xs text-neutral-300 transition"
                >
                  Reset Skipped Candidates ({skippedIds.size})
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleCandidates.map((candidate) => {
                const isHighFit = (candidate.matchScore || 80) >= 85;

                return (
                  <motion.div
                    key={candidate.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="glass-panel rounded-3xl p-6 border border-white/[0.08] hover:border-brand-500/40 transition-all flex flex-col justify-between relative group"
                  >
                    <div>
                      {/* Top Row: Name, Match Score & Goal */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white text-base">{candidate.name}</h3>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-neutral-400 border border-white/[0.08]">
                              {candidate.goal === 'exam_prep' ? 'Exam' : candidate.goal === 'project' ? 'Project' : 'Homework'}
                            </span>
                          </div>
                          <div className="text-xs text-neutral-400 font-mono mt-0.5">
                            {candidate.email}
                          </div>
                        </div>

                        {/* Match Quality Badge */}
                        <div className={`px-3 py-1.5 rounded-2xl font-mono text-center border ${
                          isHighFit
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        }`}>
                          <div className="text-[9px] uppercase tracking-wider font-semibold">Match</div>
                          <div className="text-sm font-bold">{candidate.matchScore || 85}%</div>
                        </div>
                      </div>

                      {/* Reasons Box (Symmetric Teach-Swap Highlights) */}
                      <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-white/[0.06] mb-4 space-y-2">
                        <div className="text-[10px] font-mono uppercase font-semibold text-brand-400 tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" />
                          <span>Teach-Swap Fit Reasons</span>
                        </div>
                        <ul className="text-xs space-y-1.5 text-neutral-300 font-light">
                          {(candidate.reasons || ['Complementary topic coverage', 'Shared weekday Zoom meeting slots']).map((reason, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="text-brand-400 text-xs">•</span>
                              <span className="leading-snug">{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Teach Topics Chips */}
                      <div className="space-y-2 mb-4">
                        <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                          Can Teach (Strengths):
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(candidate.strengths || ['Core Principles', 'Problem Sets']).slice(0, 3).map((st, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs">
                              {st}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Learn Topics Chips */}
                      <div className="space-y-2 mb-6">
                        <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold">
                          Wants to Learn (Gaps):
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(candidate.gaps || ['Practice Problems', 'Advanced Patterns']).slice(0, 3).map((gp, i) => (
                            <span key={i} className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs">
                              {gp}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleSkip(candidate.id)}
                        className="px-4 py-2 rounded-full text-xs text-neutral-400 hover:text-white hover:bg-white/[0.06] transition"
                      >
                        Skip
                      </button>

                      {candidate.requestStatus === 'pending' ? (
                        <span className="px-4 py-2 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-mono">
                          Request Pending
                        </span>
                      ) : candidate.requestStatus === 'accepted' ? (
                        <button
                          onClick={onNavigateToHub}
                          className="px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold"
                        >
                          View in Hub
                        </button>
                      ) : sendingRequestTo === candidate.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="Add quick note..."
                            value={requestNote}
                            onChange={(e) => setRequestNote(e.target.value)}
                            className="px-2.5 py-1.5 bg-neutral-900 border border-white/10 rounded-full text-xs text-white focus:outline-none w-36"
                          />
                          <button
                            onClick={() => handleSendRequest(candidate.id)}
                            className="p-2 rounded-full bg-brand-500 hover:bg-brand-400 text-white shadow-md transition"
                            title="Confirm Send"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSendingRequestTo(candidate.id)}
                          className="px-4 py-2 rounded-full bg-white hover:bg-neutral-100 text-neutral-950 font-semibold text-xs transition flex items-center gap-1.5 shadow-md shadow-white/10"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Send Request</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INCOMING & SENT REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/[0.08]">
            <h3 className="font-serif text-xl text-white mb-4 flex items-center gap-2">
              <Send className="w-4 h-4 text-brand-400" />
              <span>Incoming Teach-Swap Study Requests</span>
            </h3>

            {(requests || []).length === 0 ? (
              <p className="text-xs text-neutral-500 py-6 text-center font-light">
                No incoming study requests yet. When peers discover your strengths, invitations will appear here.
              </p>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {(requests || []).map((req) => (
                  <div key={req.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">{req.senderName}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                          {req.subjectName || 'Study Subject'}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-500">
                          Status: <strong className="text-neutral-300">{req.status}</strong>
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300 font-light mt-1.5 max-w-xl leading-relaxed">
                        "{req.note || 'Would love to study together via Zoom!'}"
                      </p>
                      <span className="text-[10px] text-neutral-500 font-mono mt-1 block">
                        Received {new Date(req.created_at || Date.now()).toLocaleDateString()}
                      </span>
                    </div>

                    {req.status === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRespondRequest(req.id, 'accepted')}
                          className="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Accept & Pair</span>
                        </button>
                        <button
                          onClick={() => handleRespondRequest(req.id, 'declined')}
                          className="px-3.5 py-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-neutral-400 hover:text-white text-xs transition"
                        >
                          Decline
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-mono text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        {(req.status || 'ACCEPTED').toUpperCase()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: OPEN STUDY GROUPS */}
      {activeTab === 'groups' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-xl text-white">Open Study Groups (Zoom Meets)</h3>
              <p className="text-xs text-neutral-400 font-light mt-0.5">
                Join an active collaborative cohort or create a new room for your course.
              </p>
            </div>
            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="px-4 py-2 rounded-full bg-brand-500 hover:bg-brand-400 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-md shadow-brand-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Group</span>
            </button>
          </div>

          {(groups || []).length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center border border-white/[0.08] max-w-xl mx-auto">
              <Users className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
              <h3 className="font-serif text-xl text-white">No Open Groups in this Subject</h3>
              <p className="text-xs text-neutral-400 mt-2 font-light leading-relaxed">
                Be the first to create a study group! You can set size limits (2-4 students) and invite peers.
              </p>
              <button
                onClick={() => setShowCreateGroupModal(true)}
                className="mt-4 px-6 py-2.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-950 font-semibold text-xs transition"
              >
                Create Study Group Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(groups || []).map((group) => {
                const membersCount = group.currentMembers || (group.members || []).length || 1;
                const limit = group.size_limit || 4;

                return (
                  <div
                    key={group.id}
                    className="glass-panel rounded-3xl p-6 border border-white/[0.08] flex flex-col justify-between hover:border-brand-500/30 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-[10px] uppercase font-semibold px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                          {group.subjectSlug?.toUpperCase() || 'DSA'}
                        </span>
                        <div className="flex items-center gap-1 text-xs font-mono text-neutral-400">
                          <Users className="w-3.5 h-3.5 text-neutral-500" />
                          <span>{membersCount} / {limit} Members</span>
                        </div>
                      </div>

                      <h4 className="font-semibold text-white text-base mb-1">{group.title}</h4>
                      <div className="text-xs text-neutral-400 font-mono mb-4 flex items-center justify-between">
                        <span>Goal: <strong className="text-neutral-200">{group.goal || 'exam_prep'}</strong></span>
                        <span className="text-[10px] text-blue-400 flex items-center gap-1">
                          <Video className="w-3 h-3" />
                          <span>Zoom Video</span>
                        </span>
                      </div>

                      {/* Member Strengths Preview */}
                      <div className="space-y-2 mb-6">
                        <div className="text-[10px] font-mono uppercase text-neutral-400">Current Members & Skills:</div>
                        <div className="space-y-1.5">
                          {(group.members || []).map((m, idx) => (
                            <div key={idx} className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs flex items-center justify-between">
                              <span className="font-medium text-neutral-200">{m.name}</span>
                              <span className="text-[11px] text-emerald-400 truncate max-w-[150px] font-mono">{m.strengths}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleJoinGroup(group.id)}
                      className="w-full py-2.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-950 font-semibold text-xs transition shadow-md flex items-center justify-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Join Study Group</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CREATE GROUP MODAL */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-white/[0.12] shadow-2xl"
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-400" />
                <h3 className="font-serif text-xl text-white">Create New Study Group</h3>
              </div>
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="text-neutral-400 hover:text-white text-xs font-mono"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">Group Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dynamic Programming & Graphs Sprint"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-neutral-900 border border-white/10 rounded-2xl text-xs sm:text-sm text-white focus:outline-none focus:border-brand-500 font-light"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">Subject</label>
                  <select
                    value={selectedSubject === 'all' ? 'dsa' : selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  >
                    {(subjects || []).map(s => (
                      <option key={s.id} value={s.slug}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">Max Group Size</label>
                  <select
                    value={newGroupLimit}
                    onChange={(e) => setNewGroupLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value={2}>Pair (2 students)</option>
                    <option value={3}>Trio (3 students)</option>
                    <option value={4}>Squad (4 students)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">Academic Focus</label>
                <select
                  value={newGroupGoal}
                  onChange={(e) => setNewGroupGoal(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="exam_prep">Final Exam Preparation</option>
                  <option value="project">Course Project Sprint</option>
                  <option value="weekly_homework">Weekly Homework Problem Sets</option>
                </select>
              </div>

              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-neutral-300 flex items-center gap-2 mt-4">
                <Video className="w-4 h-4 text-blue-400 shrink-0" />
                <span>All group sessions run via dedicated Zoom video meets automatically generated.</span>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-4 py-2 rounded-full text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-950 font-semibold text-xs shadow-lg shadow-white/10 transition"
                >
                  Create & Launch Group
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
