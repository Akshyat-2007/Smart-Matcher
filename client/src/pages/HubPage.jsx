import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, MessageSquare, CheckCircle, Flame, ExternalLink, Calendar, Clock,
  Send, ThumbsUp, ThumbsDown, RefreshCw, AlertTriangle, ShieldCheck, PlayCircle,
  Sparkles, Video, Share2, Link2, FileText, Plus, UserCheck, HelpCircle, ArrowRight
} from 'lucide-react';
import { api } from '../services/api.js';
import TeachSwapTimer from '../components/TeachSwapTimer.jsx';

export default function HubPage({ user, onNavigateToOnboarding }) {
  const [activeMatch, setActiveMatch] = useState(null);
  const [hubData, setHubData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tabs: 'overview' | 'resources' | 'scheduling'
  const [activeTab, setActiveTab] = useState('overview');

  // Chat State
  const [chatMode, setChatMode] = useState('group'); // 'group' | 'direct'
  const [messageInput, setMessageInput] = useState('');
  const [directMessages, setDirectMessages] = useState([]);
  const [icebreakerText, setIcebreakerText] = useState('What is one concept in this subject you initially found challenging?');

  // Modals & Feedback
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [adaptiveMsg, setAdaptiveMsg] = useState('');

  // Resources State
  const [resources, setResources] = useState([]);
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);
  const [resTitle, setResTitle] = useState('');
  const [resUrl, setResUrl] = useState('');
  const [resNote, setResNote] = useState('');
  const [resType, setResType] = useState('link');

  // Scheduling & Best Time Slot State
  const [bestSlot, setBestSlot] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedDate, setSchedDate] = useState('');
  const [schedTopicA, setSchedTopicA] = useState('');
  const [schedTopicB, setSchedTopicB] = useState('');

  const loadData = async () => {
    try {
      const matchRes = await api.getMyMatch();
      if (matchRes.hasMatch) {
        setActiveMatch(matchRes.match);
        const matchId = matchRes.match.matchId;

        const [hubRes, resList, slotRec] = await Promise.all([
          api.getGroupHub(matchId),
          api.getGroupResources(matchId).catch(() => ({ resources: [] })),
          api.getBestTimeSlot(matchId).catch(() => ({ recommendation: null }))
        ]);

        setHubData(hubRes);
        setResources(resList.resources || []);
        if (slotRec?.recommendation) {
          setBestSlot(slotRec.recommendation);
        }

        const partner = hubRes.members?.find(m => m.id !== user.id);
        if (partner) {
          const dmRes = await api.getDirectMessages(partner.id).catch(() => ({ messages: [] }));
          setDirectMessages(dmRes.messages || []);
        }
      } else {
        setActiveMatch(null);
        setHubData(null);
      }
    } catch (err) {
      console.error('Failed to load hub data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, []);

  const partner = hubData?.members?.find(m => m.id !== user.id);

  // Send Message (Group or Direct)
  const handleSendMessage = async (e, isIcebreaker = false) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || !activeMatch) return;

    try {
      if (chatMode === 'group') {
        await api.sendMessage(activeMatch.matchId, messageInput.trim());
      } else if (partner) {
        await api.sendDirectMessage(partner.id, {
          content: messageInput.trim(),
          isIcebreaker
        });
      }
      setMessageInput('');
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // 1-Click Icebreaker Reply for Introverted Students
  const handleSendIcebreakerResponse = async () => {
    if (!partner) return;
    const promptText = `Icebreaker Answer: For me, ${hubData?.match?.subjectName || 'this subject'} really clicked once I started visualizing state transitions with diagrams!`;
    try {
      if (chatMode === 'direct') {
        await api.sendDirectMessage(partner.id, { content: promptText, isIcebreaker: true });
      } else {
        await api.sendMessage(activeMatch.matchId, promptText);
      }
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckoffMilestone = async (milestoneId) => {
    try {
      await api.checkoffMilestone(milestoneId);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReschedule = async (milestoneId) => {
    try {
      const res = await api.rescheduleMilestone(milestoneId, 3);
      setAdaptiveMsg(res.message);
      setTimeout(() => setAdaptiveMsg(''), 6000);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFeedback = async (productive, requestReshuffle = false) => {
    if (!hubData?.sessions?.[0] || !partner) return;

    try {
      const res = await api.submitFeedback(hubData.sessions[0].id, {
        revieweeId: partner.id,
        productive,
        comments: productive ? 'Great productive teach-swap session!' : 'Pacing was difficult.',
        requestReshuffle
      });
      setFeedbackSuccess(
        requestReshuffle
          ? 'Reshuffle request recorded. You will be matched with a new study partner.'
          : `Feedback recorded! Partner reliability updated to ${(res.newReliability * 100).toFixed(0)}%.`
      );
      setTimeout(() => setFeedbackSuccess(''), 5000);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Add Resource
  const handleAddResource = async (e) => {
    e.preventDefault();
    if (!resTitle.trim() || !activeMatch) return;

    try {
      await api.addGroupResource(activeMatch.matchId, {
        title: resTitle.trim(),
        url: resUrl.trim(),
        note: resNote.trim(),
        type: resType
      });
      setShowAddResourceModal(false);
      setResTitle('');
      setResUrl('');
      setResNote('');
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Schedule Session
  const handleScheduleSession = async (e) => {
    e.preventDefault();
    if (!activeMatch) return;

    try {
      await api.scheduleSession(activeMatch.matchId, {
        scheduledAt: schedDate ? new Date(schedDate) : new Date(Date.now() + 48 * 3600 * 1000),
        topicA: schedTopicA || activeMatch.suggestedTeachSwap?.aTeachesB?.[0] || 'Core Principles',
        topicB: schedTopicB || activeMatch.suggestedTeachSwap?.bTeachesA?.[0] || 'Practical Problems'
      });
      setShowScheduleModal(false);
      setSchedDate('');
      setSchedTopicA('');
      setSchedTopicB('');
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // 1-Click Adopt Recommended Best Time Slot
  const handleAdoptBestSlot = async () => {
    if (!activeMatch || !bestSlot) return;
    try {
      const date = new Date(Date.now() + 72 * 3600 * 1000);
      date.setHours(18, 0, 0, 0); // 6:00 PM evening

      await api.scheduleSession(activeMatch.matchId, {
        scheduledAt: date,
        topicA: activeMatch.suggestedTeachSwap?.aTeachesB?.[0] || 'Topic 1 Teach-Swap',
        topicB: activeMatch.suggestedTeachSwap?.bTeachesA?.[0] || 'Topic 2 Teach-Swap'
      });
      setFeedbackSuccess(`🎉 Session booked for ${bestSlot.day} ${bestSlot.timeBlock} via Zoom!`);
      setTimeout(() => setFeedbackSuccess(''), 5000);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!activeMatch || !hubData) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-3xl glass-panel text-brand-400 flex items-center justify-center mx-auto mb-4 border border-white/10">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="font-serif text-3xl sm:text-4xl font-normal text-white">No Active Study Group</h2>
        <p className="text-neutral-400 text-sm mt-2 max-w-md mx-auto font-light leading-relaxed">
          You are not currently in an active group. Complete the 90-second onboarding diagnostic or discover peer candidates to get paired!
        </p>
        <button
          onClick={onNavigateToOnboarding}
          className="mt-6 px-8 py-3.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-950 font-semibold text-sm transition-all shadow-xl shadow-white/10"
        >
          Start 90-Second Matchmaking
        </button>
      </div>
    );
  }

  const nextSession = hubData.sessions?.[0];
  const activeMessages = chatMode === 'group' ? (hubData.messages || []) : directMessages;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner: Group Info, Streak, & Zoom Deep Link */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-white/[0.12]"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs uppercase font-semibold px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                {hubData.match.subjectSlug || 'DSA'}
              </span>
              <span className="text-xs text-neutral-300 font-medium">
                {hubData.match.subjectName || 'Data Structures & Algorithms'}
              </span>
              {hubData.match.fieldName && (
                <span className="text-[11px] text-neutral-500 font-mono">
                  • {hubData.match.fieldName}
                </span>
              )}
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-white font-normal">
              Study Room: {hubData.match.title || hubData.members.map(m => m.name).join(' & ')}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1 font-light">
              Teach-Swap Complementarity: <strong className="text-brand-300 font-mono">{hubData.match.compatibility_score || 94.5}%</strong> • Exclusively Zoom Video Meets
            </p>
          </div>

          {/* Right Action Widgets */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Streak Counter */}
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <Flame className="w-5 h-5 text-amber-400 fill-current" />
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400/80">Study Streak</div>
                <div className="text-sm font-bold font-mono">{hubData.match.streak_count} Sessions</div>
              </div>
            </div>

            {/* Direct Zoom Meets Deep Link (Strictly Zoom Meets!) */}
            <a
              href={hubData.match.tool_link || 'https://zoom.us'}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition shadow-md shadow-blue-500/20 border border-blue-400/30"
            >
              <Video className="w-4 h-4 text-white" />
              <span>Join Zoom Meet</span>
              <ExternalLink className="w-3.5 h-3.5 text-blue-200" />
            </a>

            {/* Launch Guided Timer */}
            <button
              onClick={() => setShowTimerModal(true)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-950 font-semibold text-xs transition shadow-lg shadow-white/10"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Launch 15m Facilitator</span>
            </button>
          </div>
        </div>

        {/* Adaptive Plan Alert Banner */}
        {adaptiveMsg && (
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
            <span>{adaptiveMsg}</span>
          </div>
        )}

        {/* Feedback Alert Banner */}
        {feedbackSuccess && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{feedbackSuccess}</span>
          </div>
        )}

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-white/[0.06] overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
              activeTab === 'overview'
                ? 'bg-brand-500 text-white font-semibold'
                : 'text-neutral-400 hover:text-white bg-white/[0.02]'
            }`}
          >
            Teach-Swap & Milestones
          </button>

          <button
            onClick={() => setActiveTab('resources')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${
              activeTab === 'resources'
                ? 'bg-brand-500 text-white font-semibold'
                : 'text-neutral-400 hover:text-white bg-white/[0.02]'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Resource Sharing ({resources.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('scheduling')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${
              activeTab === 'scheduling'
                ? 'bg-brand-500 text-white font-semibold'
                : 'text-neutral-400 hover:text-white bg-white/[0.02]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Shared Calendar & Best Slot</span>
          </button>
        </div>
      </motion.div>

      {/* Main Grid: Left Column (Content) | Right Column (Chat with Icebreakers) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* TAB 1: OVERVIEW (Upcoming Session + Milestones + Feedback) */}
          {activeTab === 'overview' && (
            <>
              {/* Upcoming Session Card */}
              <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-xl border border-white/[0.08]">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-brand-400" />
                    <h3 className="font-serif font-normal text-lg text-white">Next Teach-Swap Session</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      Zoom Video
                    </span>
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      15 Mins
                    </span>
                  </div>
                </div>

                {nextSession ? (
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between text-xs text-neutral-400">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-neutral-500" />
                        <span>Scheduled: <strong className="text-neutral-200">{new Date(nextSession.scheduled_at).toLocaleString()}</strong></span>
                      </div>
                      <span className="font-mono text-emerald-400">Status: {nextSession.status}</span>
                    </div>

                    {/* Structured Agenda Preview */}
                    <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] space-y-2">
                      <div className="text-[10px] font-mono font-bold text-brand-400 uppercase tracking-wider">
                        15-Min Teach-Swap Breakdown
                      </div>
                      <div className="text-xs text-neutral-300 leading-relaxed font-light">
                        {typeof nextSession.teach_swap_agenda === 'string'
                          ? nextSession.teach_swap_agenda
                          : (
                            <div className="space-y-1.5">
                              <div>• Part 1 (5m): {nextSession.teach_swap_agenda?.part1 || 'Peer A teaches strengths'}</div>
                              <div>• Part 2 (5m): {nextSession.teach_swap_agenda?.part2 || 'Peer B teaches strengths'}</div>
                              <div>• Part 3 (5m): {nextSession.teach_swap_agenda?.part3 || 'Collaborative problem solving'}</div>
                            </div>
                          )}
                      </div>
                    </div>

                    {/* Quick Post-Session Productivity Rating & Reshuffle Trigger */}
                    <div className="pt-3 border-t border-white/[0.08]">
                      <div className="text-xs font-medium text-neutral-300 mb-2">
                        Post-Session Feedback (Productivity Rating & Reshuffle):
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleFeedback(true, false)}
                          className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>Productive (+0.03 Reliability)</span>
                        </button>

                        <button
                          onClick={() => handleFeedback(false, false)}
                          className="px-3.5 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-1.5 transition"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          <span>Unproductive (-0.07)</span>
                        </button>

                        <button
                          onClick={() => handleFeedback(false, true)}
                          className="px-3.5 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition ml-auto"
                          title="Flags group for re-match if partners are not collaborating"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Request Reshuffle</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500 py-4 font-light">No upcoming session scheduled.</p>
                )}
              </div>

              {/* Group Milestones & Adaptive Plan */}
              <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-xl border border-white/[0.08]">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-serif font-normal text-lg text-white">Accountability Milestones</h3>
                  </div>
                  <span className="text-xs text-neutral-500 font-mono">Shared Goals</span>
                </div>

                <div className="divide-y divide-white/[0.06] mt-4">
                  {(hubData.milestones || []).map(m => {
                    const isCheckedByMe = m.checkoffs?.some(c => c.user_id === user.id);
                    const isCompleted = m.status === 'completed';

                    return (
                      <div key={m.id} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className={`text-sm font-medium ${isCompleted ? 'text-neutral-500 line-through' : 'text-white'}`}>
                                {m.title}
                              </h4>
                              {m.status === 'rescheduled' && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Rescheduled (Adaptive Plan)
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-400 mt-1 font-light leading-relaxed">{m.description}</p>
                            <div className="text-[11px] text-neutral-500 mt-2 flex items-center gap-3 font-mono">
                              <span>Due: <strong className="text-neutral-300">{new Date(m.due_date).toLocaleDateString()}</strong></span>
                              <span>•</span>
                              <span>Checks: <strong className="text-brand-300">{m.checkoffs?.length || 0} / {hubData.members.length}</strong></span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 shrink-0">
                            <button
                              onClick={() => handleCheckoffMilestone(m.id)}
                              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition ${
                                isCheckedByMe
                                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                                  : 'bg-white/[0.04] border border-white/10 text-neutral-300 hover:bg-white/[0.08]'
                              }`}
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>{isCheckedByMe ? 'Checked' : 'Check Off'}</span>
                            </button>

                            {!isCompleted && (
                              <button
                                onClick={() => handleReschedule(m.id)}
                                className="px-3.5 py-1.5 rounded-full text-[11px] text-neutral-400 hover:text-amber-300 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] transition"
                                title="Reschedules deadline and proposes lighter 15-min catchup"
                              >
                                Adaptive +3 Days
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: RESOURCE SHARING (Links, Notes, Documents) */}
          {activeTab === 'resources' && (
            <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-xl border border-white/[0.08] space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-brand-400" />
                  <div>
                    <h3 className="font-serif font-normal text-xl text-white">Group Resources & Notes</h3>
                    <p className="text-xs text-neutral-400 font-light mt-0.5">
                      Share helpful links, problem solutions, visual cheatsheets, and lecture notes with your study partners.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowAddResourceModal(true)}
                  className="px-4 py-2 rounded-full bg-white hover:bg-neutral-100 text-neutral-950 font-semibold text-xs transition shadow flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Share Resource</span>
                </button>
              </div>

              {resources.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500 font-light">
                  No resources shared yet. Be the first to add a cheatsheet or practice problem link!
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {resources.map((res) => (
                    <div
                      key={res.id}
                      className="p-4 rounded-2xl bg-neutral-900/60 border border-white/[0.06] flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-md bg-white/[0.05] text-neutral-300 border border-white/[0.08]">
                            {res.type}
                          </span>
                          <h4 className="font-semibold text-sm text-white">{res.title}</h4>
                        </div>
                        {res.note && (
                          <p className="text-xs text-neutral-300 font-light leading-relaxed">{res.note}</p>
                        )}
                        <div className="text-[10px] text-neutral-500 font-mono mt-1">
                          Shared by {res.authorName} • {new Date(res.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {res.url && (
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-brand-300 hover:text-brand-200 text-xs font-mono flex items-center gap-1 shrink-0 transition"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SCHEDULING & SHARED CALENDAR (Best Slot Recommendation) */}
          {activeTab === 'scheduling' && (
            <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-xl border border-white/[0.08] space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-brand-400" />
                  <div>
                    <h3 className="font-serif font-normal text-xl text-white">Shared Calendar & Scheduling</h3>
                    <p className="text-xs text-neutral-400 font-light mt-0.5">
                      Coordinates meetings based on the intersection of all members' availability slots.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="px-4 py-2 rounded-full bg-white hover:bg-neutral-100 text-neutral-950 font-semibold text-xs transition shadow flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Custom Session</span>
                </button>
              </div>

              {/* Best Common Time Slot Recommendation Card */}
              {bestSlot && (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-500/10 to-brand-500/10 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-brand-400" />
                      <span className="font-mono text-xs uppercase tracking-wider text-brand-300 font-semibold">
                        AI Recommended Best Time Slot
                      </span>
                    </div>
                    <div className="text-base font-semibold text-white">
                      {bestSlot.day} • {bestSlot.timeBlock}
                    </div>
                    <div className="text-xs text-neutral-400 font-light">
                      Maximum availability intersection ({bestSlot.overlapCount} of {bestSlot.totalMembers} members open)
                    </div>
                  </div>

                  <button
                    onClick={handleAdoptBestSlot}
                    className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-md shadow-blue-500/20 shrink-0"
                  >
                    1-Tap Book on Zoom
                  </button>
                </div>
              )}

              {/* Sessions List */}
              <div className="space-y-3">
                <h4 className="font-semibold text-xs text-neutral-400 uppercase tracking-wider font-mono">
                  All Group Sessions
                </h4>
                {(hubData.sessions || []).map((s) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-2xl bg-neutral-900/60 border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">
                          {new Date(s.scheduled_at).toLocaleDateString()} at {new Date(s.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {s.status}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-400 font-light mt-1">
                        15-min teach-swap session via Zoom
                      </div>
                    </div>

                    <a
                      href={s.zoom_url || hubData.match.tool_link || 'https://zoom.us'}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-blue-300 text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                    >
                      <Video className="w-3.5 h-3.5 text-blue-400" />
                      <span>Join Zoom</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (5 cols): Coordination Hub Live Chat + Text-First Icebreakers */}
        <div className="lg:col-span-5">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col h-[640px] border border-white/[0.08]">
            {/* Chat Header: Toggle Group vs 1:1 Direct Chat */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-full border border-white/[0.06]">
                <button
                  onClick={() => setChatMode('group')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    chatMode === 'group'
                      ? 'bg-white text-neutral-950 font-semibold shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Group Chat
                </button>
                <button
                  onClick={() => setChatMode('direct')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    chatMode === 'direct'
                      ? 'bg-white text-neutral-950 font-semibold shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  1:1 Direct
                </button>
              </div>

              <span className="text-[10px] text-neutral-500 font-mono">
                {chatMode === 'group' ? 'All Members' : partner?.name || 'Partner'}
              </span>
            </div>

            {/* Text-First Icebreaker Prompt for Shy/Introverted Students */}
            <div className="my-2 p-3 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase font-bold text-brand-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-brand-400" />
                  <span>Text-First Icebreaker</span>
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">Quick Connect</span>
              </div>
              <p className="text-[11px] text-neutral-200 font-light leading-relaxed">
                "{icebreakerText}"
              </p>
              <button
                type="button"
                onClick={handleSendIcebreakerResponse}
                className="text-[10px] font-semibold text-brand-400 hover:text-brand-300 underline block"
              >
                + Tap to share 1-click icebreaker response
              </button>
            </div>

            {/* Chat message stream */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {activeMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-neutral-500 font-light">
                  No messages yet. Send a quick hello to coordinate your Zoom session!
                </div>
              ) : (
                activeMessages.map((msg, idx) => {
                  const isMe = msg.user_id === user.id;
                  return (
                    <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="text-[10px] text-neutral-500 mb-1 font-mono flex items-center gap-1.5">
                        <span>{isMe ? 'You' : msg.userName || 'Peer'}</span>
                        {msg.is_icebreaker && (
                          <span className="px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-300 text-[9px]">
                            Icebreaker
                          </span>
                        )}
                        <span>•</span>
                        <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className={`p-3.5 rounded-2xl text-xs sm:text-sm max-w-[85%] font-light leading-relaxed ${
                        isMe
                          ? 'bg-white text-neutral-950 font-medium rounded-tr-none shadow'
                          : 'bg-neutral-900 text-neutral-200 border border-white/[0.08] rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message input */}
            <form onSubmit={handleSendMessage} className="pt-3 border-t border-white/[0.08] flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={chatMode === 'group' ? 'Message the study room...' : `Direct message to ${partner?.name || 'partner'}...`}
                className="flex-1 px-4 py-2.5 bg-neutral-900 border border-white/10 rounded-full text-xs sm:text-sm text-white focus:outline-none focus:border-brand-500 transition font-light"
              />
              <button
                type="submit"
                className="p-2.5 rounded-full bg-white hover:bg-neutral-200 text-neutral-950 transition shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Guided Timer Modal */}
      {showTimerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setShowTimerModal(false)}
                className="px-3 py-1 rounded-full bg-neutral-800 text-neutral-300 text-xs hover:text-white"
              >
                Close Facilitator
              </button>
            </div>
            <TeachSwapTimer
              session={nextSession}
              members={hubData.members}
              suggestedTopics={activeMatch.suggestedTeachSwap}
              onCompleteSession={() => setShowTimerModal(false)}
            />
          </div>
        </div>
      )}

      {/* Add Resource Modal */}
      {showAddResourceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-white/[0.12] shadow-2xl"
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
              <h3 className="font-serif text-xl text-white">Share Group Resource</h3>
              <button
                onClick={() => setShowAddResourceModal(false)}
                className="text-neutral-400 hover:text-white text-xs font-mono"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleAddResource} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Graph BFS Traversal Cheat Sheet"
                  value={resTitle}
                  onChange={(e) => setResTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-neutral-900 border border-white/10 rounded-2xl text-xs sm:text-sm text-white focus:outline-none focus:border-brand-500 font-light"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">Resource Type</label>
                <select
                  value={resType}
                  onChange={(e) => setResType(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="link">Web Link / Practice Problem</option>
                  <option value="document">Google Doc / Slide Deck</option>
                  <option value="note">Short Note / Code Snippet</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">URL (optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={resUrl}
                  onChange={(e) => setResUrl(e.target.value)}
                  className="w-full px-4 py-2 bg-neutral-900 border border-white/10 rounded-2xl text-xs sm:text-sm text-white focus:outline-none focus:border-brand-500 font-light"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">Notes / Description</label>
                <textarea
                  rows={3}
                  placeholder="Why is this resource useful for our teach-swap session?"
                  value={resNote}
                  onChange={(e) => setResNote(e.target.value)}
                  className="w-full px-4 py-2 bg-neutral-900 border border-white/10 rounded-2xl text-xs sm:text-sm text-white focus:outline-none focus:border-brand-500 font-light"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddResourceModal(false)}
                  className="px-4 py-2 rounded-full text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-950 font-semibold text-xs shadow-lg shadow-white/10 transition"
                >
                  Share With Group
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Custom Schedule Session Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-white/[0.12] shadow-2xl"
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
              <h3 className="font-serif text-xl text-white">Schedule Custom Zoom Session</h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-neutral-400 hover:text-white text-xs font-mono"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleScheduleSession} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">Session Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={schedDate}
                  onChange={(e) => setSchedDate(e.target.value)}
                  className="w-full px-4 py-2 bg-neutral-900 border border-white/10 rounded-2xl text-xs sm:text-sm text-white focus:outline-none focus:border-brand-500 font-light"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">Part 1 Topic (Peer A Teaches)</label>
                <input
                  type="text"
                  placeholder="e.g. Dynamic Programming Memoization"
                  value={schedTopicA}
                  onChange={(e) => setSchedTopicA(e.target.value)}
                  className="w-full px-4 py-2 bg-neutral-900 border border-white/10 rounded-2xl text-xs sm:text-sm text-white focus:outline-none font-light"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">Part 2 Topic (Peer B Teaches)</label>
                <input
                  type="text"
                  placeholder="e.g. Graph BFS Traversal"
                  value={schedTopicB}
                  onChange={(e) => setSchedTopicB(e.target.value)}
                  className="w-full px-4 py-2 bg-neutral-900 border border-white/10 rounded-2xl text-xs sm:text-sm text-white focus:outline-none font-light"
                />
              </div>

              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-neutral-300 flex items-center gap-2">
                <Video className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Automatic 15-min Zoom video meet room created upon scheduling.</span>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 rounded-full text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-950 font-semibold text-xs shadow-lg shadow-white/10 transition"
                >
                  Add Session to Calendar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
