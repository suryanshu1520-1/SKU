import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import type { Question } from '../types';
import { Loader2, Hourglass, ChevronLeft, ChevronRight, Check, Bookmark, BookmarkCheck, Sparkles, ArrowRight, Lock, Crown, Swords, Target, WandSparkles } from 'lucide-react';
import InfoTooltip from './InfoTooltip';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ArenaProps {
  onComplete: (stats: { 
    correct: number; 
    incorrect: number; 
    unattempted: number;
    totalTimeSeconds: number;
    subjectStats: Record<string, { correct: number; total: number }>;
  }, percentile: number) => void;
  userId: string;
  onReturnToDashboard?: () => void;
  onNavigateManifesto?: () => void;
}

const SESSION_STORAGE_KEY = 'tark_arena_session';
const ACTIVE_SESSION_KEY = 'tark_active_session';

interface CachedSession {
  questions: Question[];
  currentQuestionIndex: number;
  userAnswers: Record<string, string>;
  timeouts: Record<string, boolean>;
  timeLeftMap: Record<string, number>;
  timeSpentMap: Record<string, number>;
  quizSubmitted: boolean;
  explanationCache: Record<string, string>;
  loadingExplanationMap: Record<string, boolean>;
  savedInsightIds: string[];
  userId: string;
  isRanked: boolean;
  pendingAnswersMap: Record<string, string>;
  lockedMap: Record<string, boolean>;
}

interface ActiveSessionMeta {
  currentQuestionIndex: number;
  isRanked: boolean;
  mode: 'vanguard' | 'training';
}

const MOTIVATIONAL_STRINGS = [
  "Deep breaths, fastened seatbelts.",
  "Remember to hydrate.",
  "Clear your mind, focus the signal.",
  "Trust your preparation, not your anxiety.",
  "Each question is a step toward mastery.",
  "The only competition is yesterday's you.",
  "Precision over speed. Clarity over guesswork.",
  "You've trained for this. Now execute.",
  "Breathe. Assess. Answer. Advance.",
  "Let your reasoning be your compass.",
  "Patience is the mark of a true analyst.",
  "Steady hands, sharp mind.",
  "Every expert was once a beginner.",
  "Focus on the question, not the outcome.",
  "The arena rewards the disciplined.",
];

function getRandomMotivation(): string {
  return MOTIVATIONAL_STRINGS[Math.floor(Math.random() * MOTIVATIONAL_STRINGS.length)];
}

function saveSessionToCache(data: Partial<CachedSession>) {
  try {
    const existing = loadSessionFromCache() || {};
    const merged = { ...existing, ...data };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(merged));
  } catch (e) {
    console.warn("Failed to save arena session cache:", e);
  }
}

function loadSessionFromCache(): CachedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedSession;
  } catch (e) {
    console.warn("Failed to load arena session cache:", e);
    return null;
  }
}

function clearSessionCache() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch (e) {
    console.warn("Failed to clear arena session cache:", e);
  }
}

function saveActiveSessionMeta(meta: ActiveSessionMeta) {
  try {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(meta));
  } catch (e) {
    console.warn("Failed to save active session meta:", e);
  }
}

function loadActiveSessionMeta(): ActiveSessionMeta | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveSessionMeta;
  } catch {
    return null;
  }
}

const RESULTS_STORAGE_KEY = 'tark_arena_results';

interface CachedResults {
  status: 'reviewing';
  resultsData: {
    correct: number;
    incorrect: number;
    unattempted: number;
    totalTimeSeconds: number;
    subjectStats: Record<string, { correct: number; total: number }>;
  };
  percentile: number;
}

function loadCachedResults(): CachedResults | null {
  try {
    const raw = localStorage.getItem(RESULTS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedResults;
  } catch {
    return null;
  }
}

function clearCachedResults() {
  try {
    localStorage.removeItem(RESULTS_STORAGE_KEY);
  } catch {}
}

export default function Arena({ onComplete, userId, onReturnToDashboard, onNavigateManifesto }: ArenaProps) {
  const [arenaPhase, setArenaPhase] = useState<'intro' | 'quiz' | 'results'>('intro');
  const [cachedResults, setCachedResults] = useState<CachedResults | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [motivation, setMotivation] = useState('');
  const [userLimits, setUserLimits] = useState<{ vanguardUsed: number, insightsUsed: number, tier: string } | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Resume countdown state
  const [showResumeOverlay, setShowResumeOverlay] = useState(false);
  const [resumeCountdown, setResumeCountdown] = useState(3);

  // Cost Optimizations & Non-Linear Mapping States
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [timeouts, setTimeouts] = useState<Record<string, boolean>>({});
  const [timeLeftMap, setTimeLeftMap] = useState<Record<string, number>>({});
  const [timeSpentMap, setTimeSpentMap] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Map-Based Lock Architecture (per-question, no flat booleans)
  const [pendingAnswersMap, setPendingAnswersMap] = useState<Record<string, string>>({});
  const [lockedMap, setLockedMap] = useState<Record<string, boolean>>({});

  // Explanation cache states
  const [explanationCache, setExplanationCache] = useState<Record<string, string>>({});
  const [loadingExplanationMap, setLoadingExplanationMap] = useState<Record<string, boolean>>({});

  // Bookmark states
  const [savedInsightIds, setSavedInsightIds] = useState<Set<string>>(new Set());
  const [bookmarkToggling, setBookmarkToggling] = useState<Record<string, boolean>>({});
  const [isAIFrostedGlass, setIsAIFrostedGlass] = useState(false);
  const [toastMsg, setToastMsg] = useState('');



  // Bifurcation states
  const [isRanked, setIsRanked] = useState(true);
  const [showTrainingSetup, setShowTrainingSetup] = useState(false);

  // Training Ground parameter states
  const [allSubjects, setAllSubjects] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());
  const [trainingLength, setTrainingLength] = useState<number>(25);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Fetch user limits on mount if in intro
  useEffect(() => {
    if (arenaPhase === 'intro' && userId) {
      fetch(`/api/user-limits?userId=${encodeURIComponent(userId)}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setUserLimits(data);
          }
        })
        .catch(err => console.warn("Failed to fetch user limits:", err));
    }
  }, [arenaPhase, userId]);

  // On mount, check for active session or cached results
  useEffect(() => {
    const cached = loadCachedResults();
    if (cached) {
      setCachedResults(cached);
      setArenaPhase('results');
      return;
    }

    const activeMeta = loadActiveSessionMeta();
    if (activeMeta) {
      const fullCached = loadSessionFromCache();
      if (fullCached && fullCached.userId === userId && fullCached.questions.length > 0 && !fullCached.quizSubmitted) {
        // Hydrate all state from cache
        setQuestions(fullCached.questions);
        setCurrentQuestionIndex(fullCached.currentQuestionIndex);
        setUserAnswers(fullCached.userAnswers);
        setTimeouts(fullCached.timeouts);
        setTimeLeftMap(fullCached.timeLeftMap);
        setTimeSpentMap(fullCached.timeSpentMap);
        setQuizSubmitted(fullCached.quizSubmitted);
        setExplanationCache(fullCached.explanationCache || {});
        setLoadingExplanationMap(fullCached.loadingExplanationMap || {});
        setSavedInsightIds(new Set(fullCached.savedInsightIds || []));
        setIsRanked(fullCached.isRanked);
        // Hydrate map-based states
        if (fullCached.pendingAnswersMap) setPendingAnswersMap(fullCached.pendingAnswersMap);
        if (fullCached.lockedMap) setLockedMap(fullCached.lockedMap);
        setIsLoading(false);
        setShowResumeOverlay(true);
        setResumeCountdown(3);
        setArenaPhase('quiz');
        return;
      }
    }
  }, [userId]);

  // Countdown timer for resume overlay
  useEffect(() => {
    if (!showResumeOverlay || resumeCountdown <= 0) return;
    const timer = setTimeout(() => {
      setResumeCountdown(prev => {
        if (prev <= 1) {
          setShowResumeOverlay(false);
          return 3;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [showResumeOverlay, resumeCountdown]);

  // Pre-flight: "Begin Assessment" clicked -> show motivational modal
  const handleBeginAssessment = () => {
    if (userLimits && userLimits.tier !== 'premium' && userLimits.vanguardUsed >= 3) {
      if (onNavigateManifesto) onNavigateManifesto();
      return;
    }
    setIsRanked(true);
    setMotivation(getRandomMotivation());
    setShowModal(true);
  };

  // Open Training Ground setup
  const handleTrainingGround = async () => {
    let tier = 'free';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('user_profiles')
          .select('membership_tier')
          .eq('user_id', session.user.id)
          .maybeSingle();
        if (data) {
          tier = data.membership_tier || 'free';
        }
      }
    } catch {
      // Fallback to free
    }

    if (tier !== 'premium') {
      if (onNavigateManifesto) onNavigateManifesto();
      return;
    }

    setIsRanked(false);
    setLoadingSubjects(true);
    try {
      const { data } = await supabase
        .from('static_questions')
        .select('subject_category')
        .not('subject_category', 'is', null);

      if (data) {
        const unique = [...new Set(data.map((q: any) => q.subject_category).filter(Boolean))].sort() as string[];
        setAllSubjects(unique);
      }
    } catch (err) {
      console.warn("Failed to fetch subjects:", err);
    } finally {
      setLoadingSubjects(false);
    }
    setShowTrainingSetup(true);
  };

  // Toggle subject selection
  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(subject)) {
        next.delete(subject);
      } else {
        next.add(subject);
      }
      return next;
    });
  };

  // Start Training Ground quiz
  const startTraining = async () => {
    if (selectedSubjects.size === 0) return;

    setShowTrainingSetup(false);
    setShowModal(false);
    setArenaPhase('quiz');
    setIsLoading(true);

    try {
      const response = await fetch('/api/training-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjects: Array.from(selectedSubjects),
          count: trainingLength,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      const questionsList = data.questions || [];

      if (questionsList.length === 0) {
        setErrorMsg('No questions found for the selected subjects.');
        setIsLoading(false);
        setArenaPhase('intro');
        return;
      }

      setQuestions(questionsList);
      saveActiveSessionMeta({
        currentQuestionIndex: 0,
        isRanked: false,
        mode: 'training',
      });
      setIsLoading(false);
    } catch (err: any) {
      setErrorMsg('Failed to load training questions: ' + (err.message || 'Unknown error'));
      setIsLoading(false);
      setArenaPhase('intro');
    }
  };

  const handleReady = () => {
    setShowModal(false);
    setArenaPhase('quiz');
  };

  // Fetch questions for ranked mode
  useEffect(() => {
    if (arenaPhase !== 'quiz') return;
    if (!isRanked) return;
    if (questions.length > 0) return; // Already hydrated from resume

    const fetchQuestions = async () => {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const url = userId ? `/api/questions?userId=${encodeURIComponent(userId)}` : '/api/questions';
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Server returned status code ${response.status}`);
        }
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        const questionsList = data.questions || [];

        if (questionsList.length === 0) {
          setErrorMsg('No questions found in the origin database.');
          setIsLoading(false);
          return;
        }

        const shuffled = [...questionsList].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 25);
        setQuestions(selected);

        // Save active session meta after first fetch
        saveActiveSessionMeta({
          currentQuestionIndex: 0,
          isRanked: true,
          mode: 'vanguard',
        });
      } catch (error: any) {
        setErrorMsg('Failed to initialize arena: ' + (error.message || 'Unknown network error.'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [arenaPhase, userId, isRanked, questions.length]);

  // Persist core state to localStorage whenever it changes (only during quiz phase)
  useEffect(() => {
    if (arenaPhase !== 'quiz') return;
    if (questions.length === 0) return;
    saveSessionToCache({
      questions,
      currentQuestionIndex,
      userAnswers,
      timeouts,
      timeLeftMap,
      timeSpentMap,
      quizSubmitted,
      explanationCache,
      loadingExplanationMap,
      savedInsightIds: Array.from(savedInsightIds),
      userId,
      isRanked,
      pendingAnswersMap,
      lockedMap,
    });
    saveActiveSessionMeta({
      currentQuestionIndex,
      isRanked,
      mode: isRanked ? 'vanguard' : 'training',
    });
  }, [
    arenaPhase,
    questions,
    currentQuestionIndex,
    userAnswers,
    timeouts,
    timeLeftMap,
    timeSpentMap,
    quizSubmitted,
    explanationCache,
    loadingExplanationMap,
    savedInsightIds,
    userId,
    isRanked,
    pendingAnswersMap,
    lockedMap,
  ]);

  // Parse Matrix safely
  const getOptions = (matrix: any) => {
    try {
      if (typeof matrix === 'string') return JSON.parse(matrix);
      return matrix;
    } catch {
      return {};
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const currentQuestionId = currentQuestion?.id;

  // Timer: per-question map-based timer. Pauses if lockedMap[qId] is true.
  // When timeLeftMap[qId] === 0 and !lockedMap[qId], auto-locks and triggers insight.
  useEffect(() => {
    if (arenaPhase !== 'quiz' || isLoading || errorMsg || questions.length === 0 || !currentQuestionId || quizSubmitted) return;

    const isCurrentlyLocked = !!lockedMap[currentQuestionId];
    if (isCurrentlyLocked) return; // Pause timer when locked

    const currentTimeLeft = timeLeftMap[currentQuestionId] !== undefined ? timeLeftMap[currentQuestionId] : 20;

    if (currentTimeLeft <= 0) {
      // Auto-lock when timer expires: sets lockedMap AND timeouts simultaneously
      setLockedMap(prev => ({ ...prev, [currentQuestionId]: true }));
      setTimeouts(prev => ({ ...prev, [currentQuestionId]: true }));
      return;
    }

    const timer = setInterval(() => {
      setTimeLeftMap(prev => ({
        ...prev,
        [currentQuestionId]: Math.max(0, (prev[currentQuestionId] !== undefined ? prev[currentQuestionId] : 20) - 1)
      }));
      setTimeSpentMap(prev => ({
        ...prev,
        [currentQuestionId]: (prev[currentQuestionId] || 0) + 1
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [arenaPhase, currentQuestionId, timeLeftMap, lockedMap, isLoading, errorMsg, questions, quizSubmitted]);

  // Insights / Conceptual Explanation Fetching and Caching Loop
  useEffect(() => {
    if (arenaPhase !== 'quiz') return;
    if (!currentQuestionId || quizSubmitted) return;

    // Trigger insight if either lockedMap or timeouts marks this question as resolved
    const questionIsLocked = !!lockedMap[currentQuestionId] || !!timeouts[currentQuestionId];

    if (questionIsLocked) {
      if (currentQuestion.ai_insights) {
        setExplanationCache(prev => ({ ...prev, [currentQuestionId]: currentQuestion.ai_insights }));
        return;
      }

      if (explanationCache[currentQuestionId] || loadingExplanationMap[currentQuestionId]) return;

      setLoadingExplanationMap(prev => ({ ...prev, [currentQuestionId]: true }));

      const optionsStr = typeof currentQuestion.options_matrix === 'string'
        ? JSON.parse(currentQuestion.options_matrix)
        : currentQuestion.options_matrix;
      const answerStr = optionsStr ? optionsStr[currentQuestion.correct_option] : "Unknown";

      fetch('/api/explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion.question_text,
          answer: answerStr,
          questionId: currentQuestionId,
          userId
        })
      })
      .then(async (res) => {
        const data = await res.json();
        if (res.status === 403 && (data.error === 'PAYWALL_REACHED' || data.error === 'limit_reached')) {
          if (data.error === 'limit_reached') {
            setIsAIFrostedGlass(true);
          } else {
            if (onNavigateManifesto) onNavigateManifesto();
          }
          return null;
        }
        return data;
      })
      .then(data => {
        if (!data) return;
        if (data.explanation) {
          setExplanationCache(prev => ({ ...prev, [currentQuestionId]: data.explanation }));
          setQuestions(prevQ => prevQ.map(q => q.id === currentQuestionId ? { ...q, ai_insights: data.explanation, is_generated: true } : q));
        }
      })
      .catch(err => console.error("Cache retrieval fail:", err))
      .finally(() => {
        setLoadingExplanationMap(prev => ({ ...prev, [currentQuestionId]: false }));
      });
    }
  }, [arenaPhase, currentQuestionId, lockedMap, timeouts, quizSubmitted, questions]);

  // Select an option (stores in pendingAnswersMap only, does NOT lock)
  const handleSelect = (key: string) => {
    if (!currentQuestionId) return;
    const alreadyLocked = !!lockedMap[currentQuestionId] || !!timeouts[currentQuestionId] || quizSubmitted;
    if (alreadyLocked) return;
    setPendingAnswersMap(prev => ({ ...prev, [currentQuestionId]: key }));
  };

  // Lock the answer: move pendingAnswer to userAnswers, set lockedMap
  const handleLock = () => {
    if (!currentQuestionId) return;
    const pending = pendingAnswersMap[currentQuestionId];
    if (!pending) return;

    setUserAnswers(prev => ({ ...prev, [currentQuestionId]: pending }));
    setLockedMap(prev => ({ ...prev, [currentQuestionId]: true }));
    saveActiveSessionMeta({
      currentQuestionIndex,
      isRanked,
      mode: isRanked ? 'vanguard' : 'training',
    });
  };

  // Navigate to previous question (preserves all map-based state per question)
  const handlePrevious = () => {
    if (currentQuestionIndex <= 0) return;
    setCurrentQuestionIndex(prev => prev - 1);
    saveActiveSessionMeta({
      currentQuestionIndex: currentQuestionIndex - 1,
      isRanked,
      mode: isRanked ? 'vanguard' : 'training',
    });
  };

  // Advance to next question or submit
  const handleNext = () => {
    if (!currentQuestionId) return;

    // Ensure any pending answer is saved before moving forward
    const pending = pendingAnswersMap[currentQuestionId];
    if (pending && !userAnswers[currentQuestionId]) {
      setUserAnswers(prev => ({ ...prev, [currentQuestionId]: pending }));
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      saveActiveSessionMeta({
        currentQuestionIndex: currentQuestionIndex + 1,
        isRanked,
        mode: isRanked ? 'vanguard' : 'training',
      });
    } else {
      finishArena();
    }
  };

  // Escape Hatch: End assessment early
  const handleEndEarly = () => {
    const confirmed = window.confirm("Are you sure you want to end this assessment early? Progress will be lost.");
    if (confirmed) {
      clearSessionCache();
      setArenaPhase('intro');
      setQuestions([]);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setTimeouts({});
      setTimeLeftMap({});
      setTimeSpentMap({});
      setQuizSubmitted(false);
      setExplanationCache({});
      setLoadingExplanationMap({});
      setSavedInsightIds(new Set());
      setPendingAnswersMap({});
      setLockedMap({});
      if (onReturnToDashboard) {
        onReturnToDashboard();
      }
    }
  };

  // Bookmark toggle handler
  const toggleBookmark = async () => {
    if (!currentQuestionId || !userId) return;

    const qId = String(currentQuestionId);
    const isSaved = savedInsightIds.has(qId);
    const insightText = explanationCache[currentQuestionId] || currentQuestion.ai_insights || currentQuestion.conceptual_explanation || '';

    if (!insightText) return;

    setBookmarkToggling(prev => ({ ...prev, [qId]: true }));

    try {
      if (isSaved) {
        const res = await fetch('/api/bookmark', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            questionId: currentQuestionId,
            action: 'delete',
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSavedInsightIds(prev => {
            const next = new Set(prev);
            next.delete(qId);
            return next;
          });
        }
      } else {
        const res = await fetch('/api/bookmark', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            questionId: currentQuestionId,
            questionText: currentQuestion.question_text,
            insightText,
            action: 'save',
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSavedInsightIds(prev => {
            const next = new Set(prev);
            next.add(qId);
            return next;
          });

          if (!localStorage.getItem('tark_first_save_seen')) {
            localStorage.setItem('tark_first_save_seen', 'true');
            setToastMsg('Saved! You can view your saved insights and articles in your Profile section.');
          }
        }
      }
    } catch (err) {
      console.error("Bookmark toggle error:", err);
    } finally {
      setBookmarkToggling(prev => ({ ...prev, [qId]: false }));
    }
  };

  const handleRestart = () => {
    clearCachedResults();
    clearSessionCache();
    setCachedResults(null);
    setArenaPhase('intro');
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setTimeouts({});
    setTimeLeftMap({});
    setTimeSpentMap({});
    setQuizSubmitted(false);
    setExplanationCache({});
    setLoadingExplanationMap({});
    setSavedInsightIds(new Set());
    setShowResumeOverlay(false);
    setIsAIFrostedGlass(false);
    setPendingAnswersMap({});
    setLockedMap({});
  };

  const handleReturnToDashboard = () => {
    clearSessionCache();
    if (onReturnToDashboard) {
      onReturnToDashboard();
    }
  };

  const finishArena = async () => {
    setIsLoading(true);
    setQuizSubmitted(true);

    // Compute local stats first (before any fetch)
    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;
    let totalTime = 0;
    const finalSubjectStats: Record<string, { correct: number; total: number }> = {};

    questions.forEach(q => {
      const selected = userAnswers[q.id];
      const isTimeout = !!timeouts[q.id];
      const isCorrect = selected === q.correct_option?.trim();
      const subj = q.subject_category || 'CORE';

      if (!finalSubjectStats[subj]) {
        finalSubjectStats[subj] = { correct: 0, total: 0 };
      }
      finalSubjectStats[subj].total += 1;

      if (!selected) {
        unattemptedCount += 1;
      } else if (isCorrect) {
        correctCount += 1;
        finalSubjectStats[subj].correct += 1;
      } else {
        incorrectCount += 1;
      }

      totalTime += timeSpentMap[q.id] || 0;
    });

    try {
      const response = await fetch('/api/submit-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          answers: userAnswers,
          timeouts,
          timeSpentMap,
          questions: questions.map(q => ({
            id: q.id,
            subject_category: q.subject_category,
            correct_option: q.correct_option,
          })),
          subjectStats: finalSubjectStats,
          totalTimeSeconds: totalTime,
          isRanked,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: "Server returned non-JSON" }));
        throw new Error(errData.error || `Server responded with ${response.status}`);
      }

      const result = await response.json();

      clearSessionCache();

      const resultsToCache: CachedResults = {
        status: 'reviewing',
        resultsData: {
          correct: result.stats.correct,
          incorrect: result.stats.incorrect,
          unattempted: result.stats.unattempted,
          totalTimeSeconds: result.stats.totalTimeSeconds,
          subjectStats: result.stats.subjectStats,
        },
        percentile: result.percentile,
      };
      try {
        localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(resultsToCache));
      } catch {}

      onComplete({
        correct: result.stats.correct,
        incorrect: result.stats.incorrect,
        unattempted: result.stats.unattempted,
        totalTimeSeconds: result.stats.totalTimeSeconds,
        subjectStats: result.stats.subjectStats,
      }, result.percentile);
    } catch (err: any) {
      console.error(err);

      // Force results navigation with locally computed stats even if backend fails
      const resultsToCache: CachedResults = {
        status: 'reviewing',
        resultsData: {
          correct: correctCount,
          incorrect: incorrectCount,
          unattempted: unattemptedCount,
          totalTimeSeconds: totalTime,
          subjectStats: finalSubjectStats,
        },
        percentile: 0,
      };
      try {
        localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(resultsToCache));
      } catch {}

      onComplete({
        correct: correctCount,
        incorrect: incorrectCount,
        unattempted: unattemptedCount,
        totalTimeSeconds: totalTime,
        subjectStats: finalSubjectStats,
      }, 0);
    }
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(''), 3000);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // Fetch saved insight IDs on mount
  useEffect(() => {
    if (arenaPhase !== 'quiz') return;
    if (!userId) return;
    const cached = loadSessionFromCache();
    if (cached && cached.userId === userId && cached.savedInsightIds) {
      return;
    }
    fetch(`/api/bookmark?userId=${encodeURIComponent(userId)}`)
      .then(res => res.json())
      .then(data => {
        if (data.bookmarks) {
          const ids = new Set<string>(data.bookmarks.map((b: any) => String(b.question_id)));
          setSavedInsightIds(ids);
        }
      })
      .catch(err => console.warn("Failed to fetch saved bookmarks:", err));
  }, [arenaPhase, userId]);

  // ----------------------------------------------------------------
  // RENDER: INTRO PHASE
  // ----------------------------------------------------------------
  if (arenaPhase === 'intro' && !showTrainingSetup) {
    return (
      <div className="min-h-screen bg-zinc-950 text-stone-50 font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f23_1px,transparent_1px),linear-gradient(to_bottom,#1f1f23_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

        <div className="w-full max-w-xl z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-sm text-[8px] uppercase font-mono text-zinc-400 tracking-widest mb-8 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Test Arena - Pre-Flight Briefing
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-serif text-3xl md:text-4xl font-bold tracking-widest text-[#e0d0ab] drop-shadow-[0_0_12px_rgba(224,208,171,0.2)] mb-10 text-center"
          >
            Choose Your Assessment
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full mb-4"
          >
            <button
              onClick={handleBeginAssessment}
              className="w-full bg-zinc-900/30 border border-zinc-800/60 hover:border-emerald-500/40 hover:bg-zinc-900/50 rounded-sm p-6 text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-zinc-800/60 border border-zinc-700/40 rounded-sm group-hover:border-emerald-500/30 transition-colors">
                  {userLimits && userLimits.tier !== 'premium' && userLimits.vanguardUsed >= 3 ? (
                    <Lock className="w-5 h-5 text-rose-400" />
                  ) : (
                    <Swords className="w-5 h-5 text-emerald-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-sans font-bold text-sm uppercase tracking-widest text-stone-100 mb-1">
                    Vanguard Assessment
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-mono leading-relaxed">
                    Ranked mode - 25 questions, mixed subjects, awards Contender Points
                  </p>
                  {userLimits && userLimits.tier !== 'premium' && (
                    <p className="text-[10px] font-mono mt-1 font-bold text-emerald-500">
                      Assessment {Math.min(userLimits.vanguardUsed + 1, 3)} of 3 free
                    </p>
                  )}
                </div>
                {userLimits && userLimits.tier !== 'premium' && userLimits.vanguardUsed >= 3 ? (
                  <span className="text-[9px] font-mono uppercase bg-rose-500/10 text-rose-400 px-2 py-1 rounded-sm border border-rose-500/20">Locked</span>
                ) : (
                  <Sparkles className="w-4 h-4 text-emerald-400/60 group-hover:text-emerald-400 transition-colors" />
                )}
              </div>
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full mb-10"
          >
            <button
              onClick={handleTrainingGround}
              disabled={loadingSubjects}
              className="w-full bg-zinc-900/30 border border-zinc-800/60 hover:border-[#e0d0ab]/40 hover:bg-zinc-900/50 rounded-sm p-6 text-left transition-all group cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-zinc-800/60 border border-zinc-700/40 rounded-sm group-hover:border-[#e0d0ab]/30 transition-colors">
                  {loadingSubjects ? (
                    <Loader2 className="w-5 h-5 text-[#e0d0ab] animate-spin" />
                  ) : (
                    <Target className="w-5 h-5 text-[#e0d0ab]" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-sans font-bold text-sm uppercase tracking-widest text-stone-100 mb-1">
                    The Training Ground
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-mono leading-relaxed">
                    Unranked mode - custom subjects & length, no ranking pressure
                  </p>
                </div>
                <Lock className="w-4 h-4 text-zinc-600 group-hover:text-[#e0d0ab]/60 transition-colors" />
              </div>
            </button>
          </motion.div>
        </div>

        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-zinc-900 border border-zinc-700/60 p-8 md:p-10 rounded-sm max-w-md w-full shadow-2xl"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 bg-zinc-800/60 border border-zinc-700/40 rounded-sm mb-6">
                    <Sparkles className="w-6 h-6 text-[#e0d0ab]" />
                  </div>
                  <h2 className="text-xs uppercase tracking-widest font-bold text-zinc-400 mb-4">Pre-Flight Checklist</h2>
                  <div className="bg-zinc-950/60 border border-zinc-800/40 rounded-sm px-5 py-4 mb-6 w-full">
                    <p className="text-sm text-stone-200 font-serif italic leading-relaxed">"{motivation}"</p>
                  </div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-6 font-mono">25 questions - 20 seconds per question</p>
                  <button onClick={handleReady} className="w-full flex items-center justify-center gap-2 py-2.5 px-6 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-sans text-xs font-bold uppercase tracking-wider rounded-sm transition-all shadow-lg shadow-emerald-500/10">
                    I'm ready
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setShowModal(false)} className="mt-3 text-[10px] text-zinc-600 hover:text-zinc-400 uppercase tracking-wider font-mono transition-colors">
                    Not yet, go back
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>



        <AnimatePresence>
          {toastMsg && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 bg-zinc-900 border border-zinc-700/60 rounded-sm shadow-2xl"
            >
              <p className="text-xs text-stone-200 font-sans whitespace-nowrap">{toastMsg}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ----------------------------------------------------------------
  // RENDER: TRAINING GROUND SETUP
  // ----------------------------------------------------------------
  if (showTrainingSetup) {
    const lengthOptions = [25, 35, 50];

    return (
      <div className="min-h-screen bg-zinc-950 text-stone-50 font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f23_1px,transparent_1px),linear-gradient(to_bottom,#1f1f23_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

        <div className="w-full max-w-xl z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-sm text-[8px] uppercase font-mono text-zinc-400 tracking-widest mb-6 select-none">
            <Target className="w-3 h-3 text-[#e0d0ab]" />
            The Training Ground - Custom Setup
          </div>

          <h2 className="font-serif text-2xl font-bold tracking-widest text-[#e0d0ab] mb-8">Configure Your Assessment</h2>

          <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-sm p-6 mb-6">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-4">Select Subjects</h3>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {allSubjects.map(subject => (
                <button
                  key={subject}
                  onClick={() => toggleSubject(subject)}
                  className={`px-3 py-1.5 text-[10px] font-sans font-bold uppercase tracking-wider rounded-sm border transition-all cursor-pointer ${
                    selectedSubjects.has(subject)
                      ? 'bg-[#e0d0ab]/10 border-[#e0d0ab]/40 text-[#e0d0ab]'
                      : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  {subject}
                </button>
              ))}
            </div>
            {selectedSubjects.size === 0 && (
              <p className="text-[9px] text-zinc-600 mt-3 font-mono">Select at least one subject to continue.</p>
            )}
          </div>

          <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-sm p-6 mb-6">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-4">Quiz Length</h3>
            <div className="flex gap-3">
              {lengthOptions.map(opt => (
                <button
                  key={opt}
                  onClick={() => setTrainingLength(opt)}
                  className={`flex-1 py-3 text-xs font-sans font-bold uppercase tracking-wider rounded-sm border transition-all cursor-pointer ${
                    trainingLength === opt
                      ? 'bg-[#e0d0ab]/10 border-[#e0d0ab]/40 text-[#e0d0ab]'
                      : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setShowTrainingSetup(false); setArenaPhase('intro'); }}
              className="flex-1 py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-sans text-xs font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={startTraining}
              disabled={selectedSubjects.size === 0}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-sans text-xs font-bold uppercase tracking-wider rounded-sm transition-all shadow-lg shadow-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Target className="w-3.5 h-3.5" />
              Start Training
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------
  // RENDER: RESULTS PHASE
  // ----------------------------------------------------------------
  if (arenaPhase === 'results' && cachedResults) {
    const r = cachedResults.resultsData;
    const total = r.correct + r.incorrect + r.unattempted;
    const accuracy = total > 0 ? ((r.correct / total) * 100).toFixed(1) : '0';
    const isVanguard = Number(accuracy) >= 80 && isRanked;
    return (
      <div className="min-h-screen bg-zinc-950 text-stone-50 font-sans flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-xl text-center">
          {/* Vanguard Reward Badge */}
          <AnimatePresence>
            {isVanguard && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="relative overflow-hidden rounded-sm border border-[#e0d0ab]/30 mb-6"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#e0d0ab]/15 to-transparent animate-[glare_2s_ease-in-out_infinite]" />
                <div className="relative px-4 py-3 bg-[#e0d0ab]/5 text-[#e0d0ab] font-sans font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                  <Crown className="w-4 h-4" />
                  Vanguard Threshold Achieved: +25 CP
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <h1 className="text-3xl font-sans font-bold tracking-tight mb-2">Assessment Complete</h1>
          {isVanguard && (
            <p className="text-zinc-400 text-xs uppercase tracking-widest mb-8">Vanguard performance recorded</p>
          )}
          {!isVanguard && (
            <p className="text-zinc-500 text-xs uppercase tracking-widest mb-8">Session recorded</p>
          )}

          <div className="grid grid-cols-3 gap-px bg-zinc-800 border border-zinc-800 mb-8 rounded-sm overflow-hidden">
            <div className="bg-zinc-950 p-6 flex flex-col items-center justify-center">
              <span className="text-3xl font-mono font-bold text-emerald-400">{r.correct}</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Correct</span>
            </div>
            <div className="bg-zinc-950 p-6 flex flex-col items-center justify-center">
              <span className="text-3xl font-mono font-bold text-rose-500">{r.incorrect}</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Incorrect</span>
            </div>
            <div className="bg-zinc-950 p-6 flex flex-col items-center justify-center">
              <span className="text-3xl font-mono font-bold text-zinc-400">{r.unattempted}</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Unattempted</span>
            </div>
          </div>

          <div className="border border-zinc-800 bg-zinc-900/30 p-6 mb-8 rounded-sm">
            <p className="text-lg text-zinc-300 font-medium">
              Accuracy: <span className="text-emerald-400">{accuracy}%</span>
              <br />
              <span className="block mt-2 text-base text-zinc-400">
                Scored higher than <span className="text-[#e0d0ab] font-bold">{cachedResults.percentile}%</span> of the candidate pool
              </span>
            </p>
          </div>

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleReturnToDashboard}
              className="inline-flex items-center justify-center gap-2 py-3 px-8 bg-[#e0d0ab] hover:bg-stone-100 text-zinc-950 font-sans text-xs font-bold uppercase tracking-widest rounded-sm transition-all shadow-lg shadow-[#e0d0ab]/10"
            >
              Return to Dashboard
            </button>
            <button
              onClick={handleRestart}
              className="inline-flex items-center justify-center gap-2 py-3 px-8 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-sans text-xs font-bold uppercase tracking-widest rounded-sm transition-all border border-zinc-800"
            >
              <Sparkles className="w-4 h-4" />
              Deploy Next Assessment
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------
  // RENDER: QUIZ PHASE
  // ----------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-red-500 font-sans text-sm p-6 text-center">
        {errorMsg}
      </div>
    );
  }

  if (!currentQuestion) return null;

  const options = getOptions(currentQuestion.options_matrix);
  const correctOpt = currentQuestion.correct_option?.trim();
  const hasUserAnswered = userAnswers[currentQuestionId] !== undefined;
  const isTimeout = !!timeouts[currentQuestionId];
  const isQuestionLocked = !!lockedMap[currentQuestionId] || isTimeout || quizSubmitted;
  const hasLockedWithAnswer = isQuestionLocked && (hasUserAnswered || !!pendingAnswersMap[currentQuestionId] || isTimeout);

  const currentExplanation = explanationCache[currentQuestionId] || currentQuestion.ai_insights;
  const isLoadingExplanation = !!loadingExplanationMap[currentQuestionId];
  const isBookmarked = savedInsightIds.has(String(currentQuestionId));
  const isBookmarkLoading = !!bookmarkToggling[String(currentQuestionId)];

  const getButtonClass = (key: string) => {
    const baseClass = "w-full max-w-full text-left p-4 rounded border-2 font-sans text-sm transition-all focus:outline-none relative ";
    if (!isQuestionLocked) {
      // Pending answer highlight (gold) vs normal hover - keyed to currentQuestionId
      const pending = pendingAnswersMap[currentQuestionId];
      if (pending === key) {
        return baseClass + "border-[#e0d0ab]/70 bg-[#e0d0ab]/10 text-[#e0d0ab] cursor-pointer";
      }
      return baseClass + "border-transparent bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 cursor-pointer";
    }

    if (key === correctOpt) {
      return baseClass + "border-emerald-500 bg-emerald-500/20 text-emerald-400 opacity-100 font-medium z-10";
    }

    const selectedForReveal = userAnswers[currentQuestionId] || pendingAnswersMap[currentQuestionId];
    if (key === selectedForReveal && key !== correctOpt) {
      return baseClass + "border-rose-500/50 bg-rose-500/10 text-rose-400 opacity-100";
    }

    return baseClass + "border-transparent bg-zinc-900/20 text-zinc-500 opacity-40 select-none";
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-stone-50 p-4 md:p-8 flex flex-col items-center relative">
      {/* Resume Overlay */}
      <AnimatePresence>
        {showResumeOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] bg-zinc-950/90 backdrop-blur-sm flex items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              <h2 className="font-serif text-3xl font-bold text-[#e0d0ab] mb-4">Resuming Assessment</h2>
              <p className="text-6xl font-mono font-bold text-stone-100">{resumeCountdown}</p>
              <p className="text-zinc-500 text-xs uppercase tracking-widest mt-4 font-mono">Recalibrating focus...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-2xl mt-4 md:mt-12 flex-1">
        {/* Mode Badge with Escape Hatch */}
        <div className="flex items-center justify-between mb-4">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-semibold tracking-widest uppercase backdrop-blur-md ${
            isRanked
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-[#e0d0ab]/10 border border-[#e0d0ab]/20 text-[#e0d0ab]'
          }`}>
            {isRanked ? <Swords className="w-3.5 h-3.5" /> : <Target className="w-3.5 h-3.5" />}
            {isRanked ? 'Vanguard Assessment' : 'Training Ground'}
          </div>

          {/* Escape Hatch Button */}
          <button
            onClick={handleEndEarly}
            className="text-xs uppercase tracking-wider text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 px-3 py-1.5 rounded-sm transition-all duration-200 cursor-pointer"
          >
            End Assessment Early
          </button>
        </div>

        {/* Dynamic Clickable Progress Chain */}
        <div className="w-full flex items-center justify-between mb-8">
          {questions.map((q, idx) => {
            const answeredStatus = userAnswers[q.id] !== undefined;
            const isCorrect = answeredStatus ? userAnswers[q.id] === q.correct_option?.trim() : undefined;
            const isTimedOut = timeouts[q.id];
            const isCurrent = idx === currentQuestionIndex;

            let dotClass = 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700'; // Default: Unattempted
            if (isCurrent) {
              dotClass = 'bg-[#e0d0ab] border-zinc-400';
            } else if (isTimedOut) {
              dotClass = 'bg-amber-500/80 border-amber-500 hover:bg-amber-400/80';
            } else if (answeredStatus) {
              if (isCorrect) {
                dotClass = 'bg-emerald-500/80 border-emerald-500 hover:bg-emerald-400/80';
              } else {
                dotClass = 'bg-rose-500/80 border-rose-500 hover:bg-rose-400/80';
              }
            }

            return (
              <div key={idx} className="flex items-center flex-1 last:flex-none">
                <button
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className="relative group p-1 focus:outline-none focus:ring-0"
                  title={`Question ${idx + 1}`}
                >
                  <motion.div
                    className={`w-2.5 h-2.5 rounded-full border transition-all ${dotClass}`}
                    initial={false}
                    animate={{ scale: isCurrent ? 1.3 : 1 }}
                    transition={{ duration: 0.3 }}
                  />
                </button>
                {idx < questions.length - 1 && <div className="flex-1 h-[1px] mx-0.5 bg-zinc-800" />}
              </div>
            );
          })}
        </div>

        {/* Timer Display - reads from timeLeftMap keyed to currentQuestionId */}
        <div className="flex items-center justify-end mb-4">
          <div className="flex relative items-center justify-center min-w-[60px] h-[30px]">
            <AnimatePresence mode="popLayout">
              {!isQuestionLocked ? (
                <motion.div
                  key={`timer-${currentQuestionIndex}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className={`font-mono text-sm font-bold tracking-wider ${
                    timeLeftMap[currentQuestionId] !== undefined && timeLeftMap[currentQuestionId] <= 5 ? 'text-rose-500' : 'text-zinc-400'
                  }`}
                >
                  {timeLeftMap[currentQuestionId] !== undefined ? timeLeftMap[currentQuestionId] : 20}s
                </motion.div>
              ) : (
                <motion.div
                  key="time-taken"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="font-sans font-medium text-xs tracking-wider text-zinc-500 uppercase whitespace-nowrap"
                >
                  {isTimeout ? 'Timed Out / ' : ''}{timeSpentMap[currentQuestionId] || 0}s spent
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Header & Meta */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-zinc-500 border border-zinc-800 rounded-full px-2 py-1">
              {currentQuestion.exam_origin_tag || 'GENERIC'}
            </span>
            <span className="text-xs text-zinc-500 border border-zinc-800 rounded-full px-2 py-1">
              {currentQuestion.subject_category || 'CORE'}
            </span>
            <span className="text-xs text-zinc-500 border border-zinc-800 rounded-full px-2 py-1">
              {currentQuestion.difficulty_level || 'standard'}
            </span>
          </div>
        </div>

        {/* Query Headline */}
        <div className="text-lg md:text-xl font-serif font-medium leading-relaxed mb-6 text-stone-100">
          <Markdown 
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({node, ...props}: any) => <p className="mb-4 last:mb-0" {...props} />,
              ol: ({node, ...props}: any) => <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />,
              ul: ({node, ...props}: any) => <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />,
              li: ({node, ...props}: any) => <li className="pl-1 [&>p]:mb-0 [&>p]:mt-0" {...props} />,
              table: ({node, ...props}: any) => <div className="overflow-x-auto mb-4 border border-zinc-800 rounded-sm"><table className="w-full text-left border-collapse text-sm font-sans" {...props} /></div>,
              thead: ({node, ...props}: any) => <thead className="border-b border-zinc-800 bg-zinc-900/30" {...props} />,
              tbody: ({node, ...props}: any) => <tbody className="divide-y divide-zinc-800/50" {...props} />,
              tr: ({node, ...props}: any) => <tr className="hover:bg-zinc-900/20 transition-colors" {...props} />,
              th: ({node, ...props}: any) => <th className="px-4 py-2.5 font-sans text-xs uppercase tracking-wider text-zinc-500 font-bold" {...props} />,
              td: ({node, ...props}: any) => <td className="px-4 py-2.5" {...props} />
            }}
          >
            {currentQuestion.question_text}
          </Markdown>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-8 max-h-[calc(85vh-300px)] overflow-y-auto overflow-x-hidden">
          {Object.entries(options).map(([key, value]) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              disabled={isQuestionLocked}
              className={getButtonClass(key)}
            >
              <div className="flex items-start">
                <span className="font-sans font-medium text-xs mr-4 mt-0.5 opacity-50">{key}.</span>
                <Markdown 
                  remarkPlugins={[remarkGfm]}
                  components={{ p: ({node, ...props}: any) => <span {...props} /> }}
                >
                  {value as string}
                </Markdown>
              </div>
            </button>
          ))}
        </div>

        {/* Explanation Container - Only shows when locked, animated with Framer Motion */}
        <AnimatePresence>
          {hasLockedWithAnswer && (
            <motion.div
              key={`insight-${currentQuestionIndex}`}
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 24 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="bg-zinc-900/50 border border-zinc-800 rounded p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-sans font-medium text-xs text-zinc-500 uppercase tracking-widest inline-flex items-center gap-1.5">
                    Conceptual Insights
                    <InfoTooltip text="Free tier grants 15 total AI explanations to ensure server stability. Founders Club members receive unlimited access." />
                  </h3>
                  {currentExplanation && (
                    <button
                      onClick={toggleBookmark}
                      disabled={isBookmarkLoading || isLoadingExplanation}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] uppercase font-bold tracking-widest rounded-sm border transition-all ${
                        isBookmarked
                          ? 'bg-[#e0d0ab]/10 text-[#e0d0ab] border-[#e0d0ab]/30 hover:bg-[#e0d0ab]/20'
                          : 'bg-zinc-800/50 text-zinc-400 border-zinc-700/50 hover:text-zinc-300 hover:border-zinc-600'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                      title={isBookmarked ? 'Remove from saved insights' : 'Save this insight'}
                    >
                      {isBookmarkLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : isBookmarked ? (
                        <BookmarkCheck className="w-3 h-3 text-[#e0d0ab]" />
                      ) : (
                        <Bookmark className="w-3 h-3" />
                      )}
                      <span>{isBookmarked ? 'Saved' : 'Bookmark'}</span>
                    </button>
                  )}
                </div>

                {isLoadingExplanation && !currentExplanation && !isAIFrostedGlass ? (
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Retrieving insights...
                  </div>
                ) : isAIFrostedGlass ? (
                  <div className="relative">
                    <div className="select-none blur-sm">
                      <p className="text-[15px] md:text-base text-stone-300 leading-relaxed font-serif whitespace-pre-wrap">
                        Detailed AI-powered conceptual insights are generated for each question after submission, providing in-depth analysis of the correct answer, contextual background, and related policy frameworks.
                      </p>
                    </div>
                    <div className="absolute inset-0 backdrop-blur-md bg-zinc-950/40 flex items-center justify-center">
                      <button
                        onClick={() => onNavigateManifesto && onNavigateManifesto()}
                        className="px-4 py-2.5 bg-[#e0d0ab] text-zinc-950 font-sans text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-stone-100 transition-all shadow-lg shadow-[#e0d0ab]/10"
                      >
                        Limit Reached. Join the Founders Club for unlimited subjective analysis.
                      </button>
                    </div>
                  </div>
                ) : currentExplanation ? (
                   <div className="prose prose-invert prose-p:text-sm prose-li:text-sm prose-p:leading-relaxed prose-li:leading-relaxed max-w-none text-stone-300 font-serif">
                     <Markdown>{currentExplanation}</Markdown>
                   </div>
                ) : (
                  <p className="text-[15px] md:text-base text-stone-300 leading-relaxed font-serif whitespace-pre-wrap">
                    {currentQuestion.conceptual_explanation || "No further explanation provided by the architect."}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Assessment UX Protocol: Previous + Lock/Next Navigation */}
        <div className="flex items-center justify-between gap-4 mt-12 pt-6 border-t border-zinc-900">
          {/* Previous Button - always visible */}
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="flex items-center gap-1 py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-sans text-xs font-semibold uppercase tracking-wider rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-zinc-800 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          {/* Lock / Next Button */}
          {!isQuestionLocked ? (
            <button
              onClick={handleLock}
              disabled={!pendingAnswersMap[currentQuestionId]}
              className="flex items-center gap-2 py-2.5 px-6 bg-[#e0d0ab] hover:bg-stone-100 text-zinc-950 font-sans text-xs font-bold uppercase tracking-widest rounded-sm transition-all shadow-lg shadow-[#e0d0ab]/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              Lock Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 py-2.5 px-6 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-sans text-xs font-bold uppercase tracking-widest rounded-sm transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
            >
              {currentQuestionIndex < questions.length - 1 ? (
                <>
                  Next Question
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Submit Exam
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="mt-16 pb-8 text-center">
        <p className="text-[10px] font-sans text-zinc-600 uppercase tracking-widest">
          TARK 1.0 IS AN AD-FREE INITIATIVE FOREVER.
        </p>
      </div>

      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 bg-zinc-900 border border-zinc-700/60 rounded-sm shadow-2xl"
          >
            <p className="text-xs text-stone-200 font-sans whitespace-nowrap">{toastMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}