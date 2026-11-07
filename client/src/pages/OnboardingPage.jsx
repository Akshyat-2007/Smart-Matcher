import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, CheckCircle2, XCircle, BookOpen, Calendar, Settings, ArrowRight, ArrowLeft,
  Sparkles, Check, HelpCircle, Layers, Award, RefreshCw, MessageSquare, Video, MapPin, ChevronRight
} from 'lucide-react';
import { api } from '../services/api.js';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_BLOCKS = [
  { index: 0, label: 'Morning', hours: '08:00 - 11:00' },
  { index: 1, label: 'Midday', hours: '11:00 - 14:00' },
  { index: 2, label: 'Afternoon', hours: '14:00 - 17:00' },
  { index: 3, label: 'Evening', hours: '17:00 - 20:00' },
  { index: 4, label: 'Night', hours: '20:00 - 23:00' }
];

export default function OnboardingPage({ onComplete, user }) {
  // Step navigation: 1: Field, 2: Subjects (1-3), 3: Diagnostic Quiz, 4: Results & Teach-Swap, 5: Availability & Cadence
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  // Field & Subject Selection
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [subjectsInField, setSubjectsInField] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]); // array of subject objects (max 3)
  const [academicGoal, setAcademicGoal] = useState('exam_prep');

  // Diagnostic Quiz State
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizAnswers, setQuizAnswers] = useState({}); // questionId -> selectedOptionIndex
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [quizLoading, setQuizLoading] = useState(false);

  // Results State (populated ONLY after quiz submission!)
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [strengths, setStrengths] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [expandedQuestionReview, setExpandedQuestionReview] = useState(null);

  // Availability Grid & Preferences
  const [selectedSlots, setSelectedSlots] = useState(
    new Set(['0_3', '2_3', '4_3']) // Default Mon/Wed/Fri Evening
  );
  const [selectedTools, setSelectedTools] = useState(['zoom']);
  const [frequency, setFrequency] = useState('2x');

  // Speedrun Elapsed Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initial Load: Fields
  useEffect(() => {
    async function loadFields() {
      try {
        const data = await api.getFields();
        const fList = data.fields || [];
        setFields(fList);
        if (fList.length > 0) {
          setSelectedField(fList[0]);
        }
      } catch (err) {
        console.error('Failed to load fields', err);
      } finally {
        setLoading(false);
      }
    }
    loadFields();
  }, []);

  // When selected field changes, load subjects
  useEffect(() => {
    if (!selectedField) return;
    async function loadSubjects() {
      try {
        const data = await api.getSubjects(selectedField.id);
        const subs = data.subjects || [];
        setSubjectsInField(subs);
        // Default select the first subject
        if (subs.length > 0) {
          setSelectedSubjects([subs[0]]);
        } else {
          setSelectedSubjects([]);
        }
      } catch (err) {
        console.error('Failed to load subjects', err);
      }
    }
    loadSubjects();
  }, [selectedField]);

  // Toggle Subject Selection (1 to 3 subjects)
  const toggleSubject = (subject) => {
    setSelectedSubjects(prev => {
      const exists = prev.some(s => s.slug === subject.slug);
      if (exists) {
        if (prev.length === 1) return prev; // Keep at least 1
        return prev.filter(s => s.slug !== subject.slug);
      } else {
        if (prev.length >= 3) {
          return prev; // Max 3 subjects
        }
        return [...prev, subject];
      }
    });
  };

  // Start Diagnostic Quiz
  const handleStartQuiz = async () => {
    if (selectedSubjects.length === 0) return;
    setQuizLoading(true);
    setErrorMsg('');
    try {
      const slugs = selectedSubjects.map(s => s.slug);
      const data = await api.getDiagnosticQuiz(slugs);
      setQuizQuestions(data.questions || []);
      setQuizAnswers({});
      setActiveQuestionIdx(0);
      setStep(3);
    } catch (err) {
      console.error('Failed to load diagnostic questions', err);
      setErrorMsg('Failed to load diagnostic quiz questions.');
    } finally {
      setQuizLoading(false);
    }
  };

  // Record Answer During Quiz (strictly NO answers/explanations revealed here!)
  const handleSelectQuizOption = (qId, optionIdx) => {
    setQuizAnswers(prev => ({
      ...prev,
      [qId]: optionIdx
    }));
  };

  // Submit Quiz for Evaluation
  const handleSubmitQuiz = async () => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      const slotObjects = Array.from(selectedSlots).map(key => {
        const [day, slot] = key.split('_').map(Number);
        return { day, slot };
      });

      const payload = {
        subjectSlugs: selectedSubjects.map(s => s.slug),
        answers: quizAnswers,
        goal: academicGoal,
        slots: slotObjects.length > 0 ? slotObjects : [{ day: 0, slot: 3 }],
        tools: selectedTools,
        frequency
      };

      const evalData = await api.submitDiagnosticQuiz(payload);
      setEvaluationResult(evalData);
      setStrengths(evalData.inferredStrengths || []);
      setGaps(evalData.inferredGaps || []);
      setStep(4); // Advance to Results Review
    } catch (err) {
      console.error('Quiz submission failed', err);
      setErrorMsg(err.message || 'Failed to evaluate quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Topic between Teach (Strength) and Learn (Gap)
  const toggleTopicTeachLearn = (topic) => {
    if (strengths.includes(topic)) {
      setStrengths(prev => prev.filter(t => t !== topic));
      setGaps(prev => [...new Set([...prev, topic])]);
    } else {
      setStrengths(prev => [...new Set([...prev, topic])]);
      setGaps(prev => prev.filter(t => t !== topic));
    }
  };

  // Slot Toggling
  const toggleSlot = (day, slot) => {
    const key = `${day}_${slot}`;
    setSelectedSlots(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Tool Toggling
  const toggleTool = () => {
    setSelectedTools(['zoom']);
  };

  // Final Profile Confirmation & Match Engine Trigger
  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      const slotObjects = Array.from(selectedSlots).map(key => {
        const [day, slot] = key.split('_').map(Number);
        return { day, slot };
      });

      const primarySubject = selectedSubjects[0]?.slug || 'dsa';

      await api.submitDiagnosticQuiz({
        subjectSlugs: selectedSubjects.map(s => s.slug),
        answers: quizAnswers,
        goal: academicGoal,
        slots: slotObjects,
        tools: selectedTools,
        frequency,
        manualAdjustments: { strengths, gaps }
      });

      // Run match for primary subject
      await api.runMatch(primarySubject);
      onComplete();
    } catch (err) {
      console.error('Final setup error', err);
      setErrorMsg(err.message || 'Error finalizing match setup.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stepLabels = [
    'Choose Field',
    'Select Subjects',
    'Diagnostic Quiz',
    'Quiz Results',
    'Availability'
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Top Bar: Progress & Speedrun Timer */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-3xl p-6 mb-8 shadow-2xl border border-white/[0.12]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div>
            <h2 className="font-serif text-2xl font-normal text-white flex items-center gap-2">
              <span>90-Second Matchmaking Setup</span>
              <span className="text-[10px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                &lt; 90s Speedrun Target
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-1 font-light">
              Step {step} of 5 • {stepLabels[step - 1]}
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-brand-300 font-mono text-xs">
              <Clock className="w-3.5 h-3.5 text-brand-400 animate-pulse" />
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-white/[0.05] h-1.5 rounded-full mt-4 overflow-hidden">
          <div
            className="bg-gradient-to-r from-brand-500 via-amber-400 to-emerald-400 h-1.5 transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </motion.div>

      {/* Global Error Banner */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between shadow-lg">
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg('')}
            className="p-1 text-rose-400 hover:text-white rounded-lg transition"
          >
            ✕
          </button>
        </div>
      )}

      {/* STEP 1: CHOOSE FIELD */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/[0.08]">
              <div className="mb-6">
                <span className="text-xs font-mono uppercase tracking-wider text-brand-400 font-semibold">Step 1 of 5</span>
                <h3 className="font-serif text-2xl text-white mt-1">Select Your Academic Field</h3>
                <p className="text-xs text-neutral-400 font-light mt-1">
                  Choose your discipline to explore tailored subjects and topic diagnostics.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {fields.map(f => {
                  const isSelected = selectedField?.id === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedField(f)}
                      className={`p-6 rounded-2xl text-left border transition-all relative overflow-hidden group ${
                        isSelected
                          ? 'bg-brand-500/10 border-brand-500 text-white shadow-xl shadow-brand-500/10 ring-1 ring-brand-500'
                          : 'bg-white/[0.02] border-white/[0.06] text-neutral-400 hover:text-white hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="text-3xl mb-3">{f.icon || '📚'}</div>
                      <div className="font-semibold text-base text-white">{f.name}</div>
                      <p className="text-xs text-neutral-400 mt-1 line-clamp-2 font-light">{f.description}</p>
                      <div className="mt-4 flex items-center justify-between text-xs font-mono text-brand-400">
                        <span>Select Field</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  disabled={!selectedField}
                  onClick={() => setStep(2)}
                  className="px-6 py-3 rounded-full bg-white hover:bg-neutral-100 text-neutral-950 font-semibold text-sm transition flex items-center gap-2 group shadow-lg shadow-white/10"
                >
                  <span>Continue to Subjects</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 2: SELECT 1 TO 3 SUBJECTS */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/[0.08]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-brand-400 font-semibold">Step 2 of 5</span>
                  <h3 className="font-serif text-2xl text-white mt-1">
                    Choose Up to 3 Subjects in {selectedField?.name}
                  </h3>
                  <p className="text-xs text-neutral-400 font-light mt-1">
                    Select 1 to 3 subjects you want to find study partners for.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-mono font-medium border ${
                    selectedSubjects.length >= 1 && selectedSubjects.length <= 3
                      ? 'bg-brand-500/10 text-brand-300 border-brand-500/30'
                      : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  }`}>
                    {selectedSubjects.length} of 3 Selected
                  </span>
                </div>
              </div>

              {/* Subject Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {subjectsInField.map(sub => {
                  const isSelected = selectedSubjects.some(s => s.slug === sub.slug);
                  return (
                    <button
                      key={sub.slug}
                      type="button"
                      onClick={() => toggleSubject(sub)}
                      className={`p-4 rounded-2xl text-left border transition-all ${
                        isSelected
                          ? 'bg-brand-500/15 border-brand-400 text-white shadow-lg shadow-brand-500/10'
                          : 'bg-white/[0.02] border-white/[0.06] text-neutral-400 hover:text-white hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs uppercase text-brand-400 font-bold">{sub.slug}</span>
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                          isSelected ? 'bg-brand-500 border-brand-500 text-white' : 'border-white/20'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                      <div className="font-medium text-sm text-white mt-1.5">{sub.name}</div>
                      <p className="text-xs text-neutral-400 mt-1 font-light line-clamp-2">{sub.description}</p>
                    </button>
                  );
                })}
              </div>

              {/* Academic Goal */}
              <div className="mt-8 pt-6 border-t border-white/[0.06]">
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">Primary Academic Goal</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'exam_prep', label: 'Midterm & Final Exam Prep' },
                    { id: 'project', label: 'Course Project Collaboration' },
                    { id: 'weekly_homework', label: 'Weekly Problem Sets & Labs' }
                  ].map(g => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setAcademicGoal(g.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-medium border transition ${
                        academicGoal === g.id
                          ? 'bg-white text-neutral-950 border-white shadow-md'
                          : 'bg-white/[0.03] text-neutral-400 border-white/[0.08] hover:text-white'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="mt-8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 rounded-full border border-white/10 text-neutral-400 hover:text-white text-xs font-medium transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Fields</span>
                </button>

                <button
                  type="button"
                  disabled={selectedSubjects.length === 0 || quizLoading}
                  onClick={handleStartQuiz}
                  className="px-6 py-3 rounded-full bg-white hover:bg-neutral-100 text-neutral-950 font-semibold text-sm transition flex items-center gap-2 group shadow-lg shadow-white/10 disabled:opacity-50"
                >
                  {quizLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Take Diagnostic Quiz ({selectedSubjects.length} {selectedSubjects.length === 1 ? 'Subject' : 'Subjects'})</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 3: DIAGNOSTIC QUIZ (Answers strictly hidden during quiz!) */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/[0.08]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.08]">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-brand-400 font-semibold">Step 3 of 5</span>
                  <h3 className="font-serif text-2xl text-white mt-1">Diagnostic Quiz</h3>
                  <p className="text-xs text-neutral-400 font-light mt-1">
                    Answer these conceptual questions to calibrate your teach-swap complementarity profile.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-neutral-300">
                    Question {activeQuestionIdx + 1} of {quizQuestions.length}
                  </span>
                </div>
              </div>

              {/* Notice that answers are hidden */}
              <div className="mb-6 p-3.5 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 shrink-0 text-brand-400" />
                <span>
                  Answers and detailed explanations will be revealed on the <strong>Results Screen</strong> after submitting your diagnostic.
                </span>
              </div>

              {quizQuestions.length > 0 && (
                <div className="space-y-6">
                  {/* Current Question Card */}
                  {(() => {
                    const q = quizQuestions[activeQuestionIdx];
                    if (!q) return null;
                    const selectedOption = quizAnswers[q.id];

                    return (
                      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/[0.06] text-neutral-300 border border-white/10">
                            {q.subjectName}
                          </span>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-400 border border-brand-500/20">
                            {q.topicName}
                          </span>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-white/[0.03] text-neutral-400 ml-auto">
                            {q.difficulty}
                          </span>
                        </div>

                        <h4 className="text-base sm:text-lg font-medium text-white mb-5 leading-relaxed">
                          {q.prompt}
                        </h4>

                        <div className="grid grid-cols-1 gap-2.5">
                          {q.options.map((opt, optIdx) => {
                            const isChosen = selectedOption === optIdx;
                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => handleSelectQuizOption(q.id, optIdx)}
                                className={`p-4 rounded-xl text-left border transition flex items-center justify-between text-xs sm:text-sm ${
                                  isChosen
                                    ? 'bg-brand-500/20 border-brand-400 text-white font-medium shadow-md shadow-brand-500/10 ring-1 ring-brand-400'
                                    : 'bg-white/[0.02] border-white/[0.06] text-neutral-300 hover:bg-white/[0.05] hover:text-white'
                                }`}
                              >
                                <span>{opt}</span>
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition ${
                                  isChosen ? 'border-brand-400 bg-brand-400 text-neutral-950' : 'border-neutral-600'
                                }`}>
                                  {isChosen && <div className="w-1.5 h-1.5 rounded-full bg-neutral-950" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Navigation Stepper between questions */}
                  <div className="flex items-center justify-between pt-4">
                    <button
                      type="button"
                      disabled={activeQuestionIdx === 0}
                      onClick={() => setActiveQuestionIdx(prev => Math.max(0, prev - 1))}
                      className="px-4 py-2 rounded-full border border-white/10 text-neutral-400 hover:text-white text-xs font-medium transition disabled:opacity-40"
                    >
                      Previous Question
                    </button>

                    <div className="flex items-center gap-1.5">
                      {quizQuestions.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActiveQuestionIdx(i)}
                          className={`w-7 h-7 rounded-full text-xs font-mono transition flex items-center justify-center ${
                            activeQuestionIdx === i
                              ? 'bg-brand-500 text-white font-bold'
                              : quizAnswers[quizQuestions[i].id] !== undefined
                              ? 'bg-white/20 text-neutral-200'
                              : 'bg-white/5 text-neutral-500 hover:bg-white/10'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>

                    {activeQuestionIdx < quizQuestions.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => setActiveQuestionIdx(prev => Math.min(quizQuestions.length - 1, prev + 1))}
                        className="px-4 py-2 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-medium transition"
                      >
                        Next Question
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={handleSubmitQuiz}
                        className="px-5 py-2.5 rounded-full bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-lg shadow-brand-500/20"
                      >
                        {submitting ? 'Evaluating...' : 'Submit & View Results'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* STEP 4: QUIZ RESULTS SCREEN & TEACH/LEARN TOPIC ADJUSTMENTS */}
        {step === 4 && evaluationResult && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/[0.08]">
              {/* Score Header Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-brand-500/10 via-amber-500/10 to-emerald-500/10 border border-white/10 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-brand-400 font-semibold">Diagnostic Complete</span>
                  <h3 className="font-serif text-3xl text-white mt-1">Quiz Results & Topic Calibration</h3>
                  <p className="text-xs text-neutral-300 font-light mt-1 max-w-md">
                    Here are your answers, official solutions, and inferred teach-swap topics. You can freely adjust your teach/learn preferences below.
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-neutral-950/60 p-4 rounded-2xl border border-white/10">
                  <div className="text-right">
                    <div className="text-3xl font-mono font-bold text-white">
                      {evaluationResult.score?.percentage}%
                    </div>
                    <div className="text-[11px] font-mono text-neutral-400">
                      {evaluationResult.score?.correctCount} of {evaluationResult.score?.totalCount} Correct
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-brand-500/20 flex items-center justify-center text-brand-400 border border-brand-500/30">
                    <Award className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Teach-Swap Chip Calibration */}
              <div className="mb-8 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                <h4 className="font-serif text-lg text-white mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-400" />
                  <span>Your Teach-Swap Match Profile</span>
                </h4>
                <p className="text-xs text-neutral-400 font-light mb-5">
                  Click any chip to toggle between <strong>I can teach this</strong> and <strong>I want to learn this</strong>.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Strengths */}
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <div className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Topics You Can Teach (Strengths)</span>
                      <span className="text-[10px] lowercase text-emerald-400/80">click to swap</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 min-h-[48px]">
                      {strengths.map(topic => (
                        <button
                          key={topic}
                          type="button"
                          onClick={() => toggleTopicTeachLearn(topic)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium border border-emerald-500/40 transition flex items-center gap-1.5 group"
                        >
                          <span>{topic}</span>
                          <span className="text-[10px] text-emerald-400 group-hover:scale-125 transition-transform">⇄</span>
                        </button>
                      ))}
                      {strengths.length === 0 && (
                        <span className="text-xs text-neutral-500 italic py-1">No teach topics selected</span>
                      )}
                    </div>
                  </div>

                  {/* Gaps */}
                  <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    <div className="text-xs font-mono font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Topics You Want to Learn (Gaps)</span>
                      <span className="text-[10px] lowercase text-amber-400/80">click to swap</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 min-h-[48px]">
                      {gaps.map(topic => (
                        <button
                          key={topic}
                          type="button"
                          onClick={() => toggleTopicTeachLearn(topic)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium border border-amber-500/40 transition flex items-center gap-1.5 group"
                        >
                          <span>{topic}</span>
                          <span className="text-[10px] text-amber-400 group-hover:scale-125 transition-transform">⇄</span>
                        </button>
                      ))}
                      {gaps.length === 0 && (
                        <span className="text-xs text-neutral-500 italic py-1">No learn topics selected</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Question Review with Solutions & Explanations */}
              <div className="space-y-4">
                <h4 className="font-serif text-lg text-white mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Question-by-Question Solution Breakdown</span>
                </h4>

                <div className="space-y-3">
                  {(evaluationResult.results || []).map((q, idx) => {
                    const isCorrect = q.isCorrect;
                    const isExpanded = expandedQuestionReview === q.id || expandedQuestionReview === null;

                    return (
                      <div
                        key={q.id}
                        className={`p-5 rounded-2xl border transition-all ${
                          isCorrect
                            ? 'bg-emerald-500/[0.03] border-emerald-500/20'
                            : 'bg-rose-500/[0.03] border-rose-500/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-neutral-400">
                                Q{idx + 1} • {q.subjectName}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-neutral-400">
                                {q.topicName}
                              </span>
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                                isCorrect
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}>
                                {isCorrect ? 'Correct (+1)' : 'Needs Practice (0)'}
                              </span>
                            </div>
                            <div className="text-sm text-white font-medium">{q.prompt}</div>
                          </div>

                          <div className="shrink-0 mt-1">
                            {isCorrect ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <XCircle className="w-5 h-5 text-rose-400" />
                            )}
                          </div>
                        </div>

                        {/* Options comparison */}
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {q.options.map((opt, optIdx) => {
                            const isChosen = q.selectedIndex === optIdx;
                            const isCorrectAnswer = q.correctIndex === optIdx;

                            let optStyle = 'bg-white/[0.02] border-white/[0.05] text-neutral-400';
                            if (isCorrectAnswer) {
                              optStyle = 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold';
                            } else if (isChosen && !isCorrect) {
                              optStyle = 'bg-rose-500/15 border-rose-500/40 text-rose-300 line-through';
                            }

                            return (
                              <div
                                key={optIdx}
                                className={`p-2.5 rounded-xl border flex items-center justify-between ${optStyle}`}
                              >
                                <span>{opt}</span>
                                {isCorrectAnswer && <span className="text-[10px] font-mono text-emerald-400">✓ Correct</span>}
                                {isChosen && !isCorrect && <span className="text-[10px] font-mono text-rose-400">Your Choice</span>}
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation Callout */}
                        {q.explanation && (
                          <div className="mt-3.5 p-3 rounded-xl bg-neutral-900/80 border border-white/10 text-xs text-neutral-300 font-light flex items-start gap-2">
                            <span className="font-mono text-brand-400 font-bold shrink-0">Explanation:</span>
                            <span>{q.explanation}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Continue to Availability */}
              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="px-7 py-3.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-950 font-semibold text-sm transition flex items-center gap-2 group shadow-lg shadow-white/10"
                >
                  <span>Continue to Availability & Cadence</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 5: AVAILABILITY & CADENCE */}
        {step === 5 && (
          <motion.div
            key="step5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/[0.08]">
              <div className="mb-6">
                <span className="text-xs font-mono uppercase tracking-wider text-brand-400 font-semibold">Step 5 of 5</span>
                <h3 className="font-serif text-2xl text-white mt-1">Availability Grid & Study Cadence</h3>
                <p className="text-xs text-neutral-400 font-light mt-1">
                  Click time blocks when you are open for a 15-minute teach-swap session.
                </p>
              </div>

              {/* 7x5 Availability Grid */}
              <div className="overflow-x-auto pb-2 mb-8">
                <div className="min-w-[500px]">
                  <div className="grid grid-cols-8 gap-1.5 text-center text-xs font-mono text-neutral-400 mb-2">
                    <div></div>
                    {DAYS.map(d => (
                      <div key={d} className="font-medium text-white">{d}</div>
                    ))}
                  </div>

                  {TIME_BLOCKS.map(block => (
                    <div key={block.index} className="grid grid-cols-8 gap-1.5 mb-1.5">
                      <div className="text-[11px] font-mono text-neutral-400 flex flex-col justify-center text-right pr-2">
                        <span className="text-white font-medium">{block.label}</span>
                        <span className="text-[9px] text-neutral-500">{block.hours.split(' - ')[0]}</span>
                      </div>

                      {DAYS.map((_, dayIdx) => {
                        const key = `${dayIdx}_${block.index}`;
                        const isSelected = selectedSlots.has(key);

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleSlot(dayIdx, block.index)}
                            className={`h-11 rounded-xl text-[10px] font-mono transition flex items-center justify-center border ${
                              isSelected
                                ? 'bg-brand-500 border-brand-400 text-white font-bold shadow-md shadow-brand-500/20'
                                : 'bg-white/[0.02] border-white/[0.05] text-neutral-500 hover:bg-white/[0.06] hover:text-white'
                            }`}
                          >
                            {isSelected ? '✓' : ''}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tool Preferences & Cadence */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-white/[0.06]">
                {/* Exclusively Zoom Meets */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2.5">
                    Peer Collaboration Tool (Exclusively Zoom)
                  </label>
                  <div className="p-3.5 rounded-2xl border bg-blue-500/10 border-blue-500/30 text-white flex items-center justify-between shadow-md shadow-blue-500/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white font-bold shadow">
                        <Video className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                          <span>Zoom Meets</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-400/20 text-blue-300 border border-blue-400/30">Active</span>
                        </div>
                        <p className="text-[11px] text-neutral-300 font-light mt-0.5">
                          Direct 15-min live video & screen-share links generated per session
                        </p>
                      </div>
                    </div>
                    <Check className="w-4 h-4 text-blue-400 shrink-0" />
                  </div>
                </div>

                {/* Cadence */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2.5">
                    Weekly Meeting Cadence
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: '1x', label: '1x / week', sub: 'Light' },
                      { id: '2x', label: '2x / week', sub: 'Balanced' },
                      { id: '3x', label: '3x / week', sub: 'Intensive' }
                    ].map(cadence => {
                      const isSelected = frequency === cadence.id;
                      return (
                        <button
                          key={cadence.id}
                          type="button"
                          onClick={() => setFrequency(cadence.id)}
                          className={`p-3.5 rounded-2xl text-center border transition flex flex-col items-center gap-0.5 ${
                            isSelected
                              ? 'bg-white text-neutral-950 border-white font-semibold shadow-lg shadow-white/10'
                              : 'bg-white/[0.02] border-white/[0.06] text-neutral-400 hover:text-white hover:bg-white/[0.05]'
                          }`}
                        >
                          <span className="text-xs font-bold">{cadence.label}</span>
                          <span className={`text-[10px] font-light ${isSelected ? 'text-neutral-700' : 'text-neutral-500'}`}>
                            {cadence.sub}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-5 py-2.5 rounded-full border border-white/10 text-neutral-400 hover:text-white text-xs font-medium transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Results</span>
                </button>

                <button
                  type="button"
                  disabled={submitting || selectedSlots.size === 0}
                  onClick={handleFinalSubmit}
                  className="px-8 py-3.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-950 font-semibold text-sm transition flex items-center gap-2 group shadow-xl shadow-white/10 disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="inline-block w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Find Complementary Study Partners</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
