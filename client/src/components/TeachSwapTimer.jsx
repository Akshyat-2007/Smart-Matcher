import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Sparkles, MessageSquare, Volume2, Shield, CheckCircle } from 'lucide-react';

const SEGMENTS = [
  { id: 1, title: 'Segment 1: Partner A Teaches Partner B', duration: 300, color: 'from-sky-500 to-blue-600', role: 'Teach Core Concept' },
  { id: 2, title: 'Segment 2: Partner B Teaches Partner A', duration: 300, color: 'from-emerald-500 to-teal-600', role: 'Teach Complementary Topic' },
  { id: 3, title: 'Segment 3: Joint Practice & Problem Solving', duration: 300, color: 'from-indigo-500 to-purple-600', role: 'Collaborative Application' }
];

export default function TeachSwapTimer({ session, members, suggestedTopics, onCompleteSession }) {
  const [currentSegmentIdx, setCurrentSegmentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SEGMENTS[0].duration);
  const [isRunning, setIsRunning] = useState(false);
  const [showIcebreaker, setShowIcebreaker] = useState(true);
  const [introvertMode, setIntrovertMode] = useState(false);

  const currentSegment = SEGMENTS[currentSegmentIdx];

  useEffect(() => {
    let interval = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      if (currentSegmentIdx < SEGMENTS.length - 1) {
        setCurrentSegmentIdx(prev => prev + 1);
        setTimeLeft(SEGMENTS[currentSegmentIdx + 1].duration);
      } else {
        setIsRunning(false);
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, currentSegmentIdx]);

  const toggleRun = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(currentSegment.duration);
  };

  const nextSegment = () => {
    if (currentSegmentIdx < SEGMENTS.length - 1) {
      setCurrentSegmentIdx(prev => prev + 1);
      setTimeLeft(SEGMENTS[currentSegmentIdx + 1].duration);
      setIsRunning(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const memberA = members?.[0]?.name || 'Partner A';
  const memberB = members?.[1]?.name || 'Partner B';

  const topicAtoB = suggestedTopics?.aTeachesB?.[0] || 'Core Algorithm & Patterns';
  const topicBtoA = suggestedTopics?.bTeachesA?.[0] || 'Graph & Tree Traversal';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-sky-500/20 text-sky-400 font-mono text-xs font-bold border border-sky-500/30">
              15-Minute Teach-Swap Engine
            </span>
            <span className="text-xs text-slate-400">Structured Peer Learning</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            Guided Session Facilitator
          </h2>
        </div>

        {/* Introvert Text-First Toggle */}
        <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
          <MessageSquare className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-semibold text-slate-300">Text-First Icebreaker:</span>
          <button
            type="button"
            onClick={() => setIntrovertMode(!introvertMode)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
              introvertMode
                ? 'bg-indigo-500 text-white'
                : 'bg-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {introvertMode ? 'ON (Introvert Mode)' : 'OFF (Standard)'}
          </button>
        </div>
      </div>

      {/* Introvert Text-First Icebreaker Card */}
      {showIcebreaker && (
        <div className={`mt-6 p-4 rounded-2xl border transition ${
          introvertMode
            ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
            : 'bg-slate-800/60 border-slate-700 text-slate-300'
        }`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold tracking-wide uppercase">
                {introvertMode ? '📝 Introvert-Friendly Written Icebreaker' : '💬 Verbal Warmup Prompt'}
              </span>
            </div>
            <button
              onClick={() => setShowIcebreaker(false)}
              className="text-slate-500 hover:text-slate-300 text-xs"
            >
              Dismiss
            </button>
          </div>
          <p className="text-xs sm:text-sm mt-2 font-medium">
            {introvertMode
              ? 'Both partners type 2 sentences in the chat: "What is one specific code bug you spent more than 30 mins fixing this week, and what was the root cause?"'
              : session?.icebreaker_text || 'Take 60 seconds to introduce what concept you found most counter-intuitive this week.'}
          </p>
        </div>
      )}

      {/* Segments Tracker Bar */}
      <div className="grid grid-cols-3 gap-3 my-6">
        {SEGMENTS.map((seg, idx) => {
          const isActive = idx === currentSegmentIdx;
          const isDone = idx < currentSegmentIdx;
          return (
            <div
              key={seg.id}
              className={`p-3 rounded-xl border transition ${
                isActive
                  ? 'bg-slate-800 border-sky-500 ring-2 ring-sky-500/20'
                  : isDone
                  ? 'bg-slate-900 border-emerald-500/40 opacity-70'
                  : 'bg-slate-900 border-slate-800 opacity-50'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-white">Part {idx + 1} (5m)</span>
                {isDone && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate">{seg.role}</p>
            </div>
          );
        })}
      </div>

      {/* Main Big Timer Display */}
      <div className="bg-gradient-to-b from-slate-850 to-slate-900 border border-slate-800 rounded-3xl p-8 text-center my-6 relative">
        <div className="text-xs font-mono font-bold text-sky-400 tracking-wider uppercase mb-2">
          {currentSegment.title}
        </div>

        {/* Dynamic Topic Advice */}
        <div className="text-xs sm:text-sm text-slate-300 mb-6 max-w-lg mx-auto">
          {currentSegmentIdx === 0 && (
            <span>
              🎯 <strong className="text-white">{memberA}</strong> explains <strong className="text-sky-300">{topicAtoB}</strong> to <strong className="text-white">{memberB}</strong>. Focus on high-level intuition and common pitfalls.
            </span>
          )}
          {currentSegmentIdx === 1 && (
            <span>
              🎯 <strong className="text-white">{memberB}</strong> explains <strong className="text-emerald-300">{topicBtoA}</strong> to <strong className="text-white">{memberA}</strong>. Walk through the algorithmic mental model.
            </span>
          )}
          {currentSegmentIdx === 2 && (
            <span>
              🤝 Both partners collaboratively code or solve an exercise combining both topics!
            </span>
          )}
        </div>

        {/* Time Digits */}
        <div className="text-6xl sm:text-8xl font-black font-mono text-white tracking-tight drop-shadow-md my-4">
          {formatTime(timeLeft)}
        </div>

        {/* Timer Control Buttons */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={resetTimer}
            className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Reset Current Segment"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={toggleRun}
            className={`px-8 py-4 rounded-2xl font-bold text-base flex items-center gap-2 shadow-xl transition ${
              isRunning
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-amber-500/20'
                : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-sky-500/25'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-5 h-5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Start Segment</span>
              </>
            )}
          </button>

          <button
            onClick={nextSegment}
            disabled={currentSegmentIdx >= SEGMENTS.length - 1}
            className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
            title="Next Segment"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Auto-suggested Topics Overlay */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700">
          <span className="text-[10px] font-mono text-sky-400 uppercase font-bold">Mutual Strengths Overlap</span>
          <div className="text-xs font-semibold text-white mt-1">
            {memberA} teaches: <span className="text-sky-300">{topicAtoB}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Complementarity score derived via harmonic mean</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700">
          <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">Mutual Gaps Covered</span>
          <div className="text-xs font-semibold text-white mt-1">
            {memberB} teaches: <span className="text-emerald-300">{topicBtoA}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Symmetric exchange ensures no one-sided fatigue</p>
        </div>
      </div>
    </div>
  );
}
