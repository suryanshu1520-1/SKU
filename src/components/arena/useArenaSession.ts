import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import staticQuestionsData from '../../data/static-subject-questions.json';
import { formatInsightToText } from '../shared';
import type { Question, CandidatePreferences, ArenaLaunchConfig } from '../../types';

export const SESSION_STORAGE_KEY = 'tark_arena_session';
export const ACTIVE_SESSION_KEY = 'tark_active_session';
export const RESULTS_STORAGE_KEY = 'tark_arena_results';

export interface CachedSession {
  questions: Question[];
  currentQuestionIndex: number;
  userAnswers: Record<string, string>;
  timeouts: Record<string, boolean>;
  timeLeftMap: Record<string, number>;
  timeSpentMap: Record<string, number>;
  quizSubmitted: boolean;
  explanationCache: Record<string, string>;
  revealedAnswers?: Record<string, string>;
  loadingExplanationMap: Record<string, boolean>;
  savedInsightIds: string[];
  userId: string;
  isRanked: boolean;
  pendingAnswersMap: Record<string, string>;
  lockedMap: Record<string, boolean>;
}

export interface ActiveSessionMeta {
  currentQuestionIndex: number;
  isRanked: boolean;
  mode: 'vanguard' | 'training';
}

export interface CachedResults {
  status: 'reviewing';
  resultsData: {
    correct: number;
    incorrect: number;
    unattempted: number;
    totalTimeSeconds: number;
    subjectStats: Record<string, { correct: number; total: number; missedQuestions?: string[] }>;
    isRanked?: boolean;
    contextTag?: string;
  };
  percentile: number;
}

export const MOTIVATIONAL_STRINGS = [
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

export function getRandomMotivation(): string {
  return MOTIVATIONAL_STRINGS[Math.floor(Math.random() * MOTIVATIONAL_STRINGS.length)];
}

export function saveSessionToCache(data: Partial<CachedSession>) {
  try {
    const existing = loadSessionFromCache() || {};
    const merged = { ...existing, ...data };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(merged));
  } catch (e) {
    console.warn("Failed to save arena session cache:", e);
  }
}

export function loadSessionFromCache(): CachedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedSession;
  } catch (e) {
    console.warn("Failed to load arena session cache:", e);
    return null;
  }
}

export function clearSessionCache() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch (e) {
    console.warn("Failed to clear arena session cache:", e);
  }
}

export function saveActiveSessionMeta(meta: ActiveSessionMeta) {
  try {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(meta));
  } catch (e) {
    console.warn("Failed to save active session meta:", e);
  }
}

export function loadActiveSessionMeta(): ActiveSessionMeta | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveSessionMeta;
  } catch {
    return null;
  }
}

export function loadCachedResults(): CachedResults | null {
  try {
    const raw = localStorage.getItem(RESULTS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedResults;
  } catch {
    return null;
  }
}

interface UseArenaSessionProps {
  onComplete: (
    stats: {
      correct: number;
      incorrect: number;
      unattempted: number;
      totalTimeSeconds: number;
      subjectStats: Record<string, { correct: number; total: number; missedQuestions?: string[] }>;
      isRanked?: boolean;
      contextTag?: string;
    },
    percentile: number
  ) => void;
  userId: string;
  targetPillar?: { id: string; title: string } | null;
  arenaConfig?: ArenaLaunchConfig | null;
  candidatePreferences?: CandidatePreferences;
  onClearTargetPillar?: () => void;
  onReturnToDashboard?: (originTab?: string) => void;
  onNavigateManifesto?: () => void;
  onTestStatusChange?: (isActive: boolean) => void;
}

export function useArenaSession({
  onComplete,
  userId,
  targetPillar,
  arenaConfig,
  candidatePreferences,
  onClearTargetPillar,
  onReturnToDashboard,
  onNavigateManifesto,
  onTestStatusChange,
}: UseArenaSessionProps) {
  const [arenaPhase, setArenaPhase] = useState<'intro' | 'quiz'>('intro');
  const [cachedSessionAvailable, setCachedSessionAvailable] = useState<CachedSession | null>(null);
  const [examTrack, setExamTrack] = useState<'upsc' | 'ssc'>('upsc');
  const [pacingMode, setPacingMode] = useState<'standard' | 'blitz' | 'untimed'>(() => {
    if (arenaConfig?.timePerQuestionSeconds === 20) return 'blitz';
    if (arenaConfig?.timePerQuestionSeconds === 0) return 'untimed';
    return 'standard';
  });
  const [showPreflightModal, setShowPreflightModal] = useState(false);
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [motivation, setMotivation] = useState('');
  const [userLimits, setUserLimits] = useState<{ vanguardUsed: number; insightsUsed: number; tier: string } | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Resume overlay state
  const [showResumeOverlay, setShowResumeOverlay] = useState(false);
  const [resumeCountdown, setResumeCountdown] = useState(3);

  // Per-Question Answers & Timing State
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [timeouts, setTimeouts] = useState<Record<string, boolean>>({});
  const [timeLeftMap, setTimeLeftMap] = useState<Record<string, number>>({});
  const [timeSpentMap, setTimeSpentMap] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Two-Step Lock State
  const [pendingAnswersMap, setPendingAnswersMap] = useState<Record<string, string>>({});
  const [lockedMap, setLockedMap] = useState<Record<string, boolean>>({});
  const [markedForReviewMap, setMarkedForReviewMap] = useState<Record<string, boolean>>({});

  // Explanation cache states
  const [explanationCache, setExplanationCache] = useState<Record<string, any>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, string>>({});
  const [loadingExplanationMap, setLoadingExplanationMap] = useState<Record<string, boolean>>({});

  // Bookmark states
  const [savedInsightIds, setSavedInsightIds] = useState<Set<string>>(new Set());
  const [bookmarkToggling, setBookmarkToggling] = useState<Record<string, boolean>>({});
  const [isAIFrostedGlass, setIsAIFrostedGlass] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Mode and Training Ground states
  const [isRanked, setIsRanked] = useState(true);
  const [showTrainingSetup, setShowTrainingSetup] = useState(false);
  const [allSubjects, setAllSubjects] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());
  const [trainingLength, setTrainingLength] = useState<number>(() => candidatePreferences?.dailyMcqTarget || 25);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Fetch user limits on mount if in intro
  useEffect(() => {
    if (arenaPhase === 'intro' && userId) {
      fetchWithAuth(`/api/user-limits?userId=${encodeURIComponent(userId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            setUserLimits(data);
          }
        })
        .catch((err) => console.warn('Failed to fetch user limits:', err));
    }
  }, [arenaPhase, userId]);

  // Check for cached results or active session on mount
  useEffect(() => {
    const cached = loadCachedResults();
    if (cached) {
      onComplete(
        {
          correct: cached.resultsData.correct,
          incorrect: cached.resultsData.incorrect,
          unattempted: cached.resultsData.unattempted,
          totalTimeSeconds: cached.resultsData.totalTimeSeconds,
          subjectStats: cached.resultsData.subjectStats,
          isRanked: cached.resultsData.isRanked,
        },
        cached.percentile
      );
      return;
    }

    const activeMeta = loadActiveSessionMeta();
    if (activeMeta) {
      const fullCached = loadSessionFromCache();
      if (fullCached && fullCached.userId === userId && fullCached.questions.length > 0 && !fullCached.quizSubmitted) {
        if (arenaConfig?.autoStart || (targetPillar && targetPillar.id)) {
          clearSessionCache();
          setCachedSessionAvailable(null);
        } else {
          setCachedSessionAvailable(fullCached);
        }
        return;
      }
    }
  }, [userId, onComplete, arenaConfig?.autoStart, targetPillar]);

  const handleResumeSavedSession = () => {
    if (!cachedSessionAvailable) return;
    setQuestions(cachedSessionAvailable.questions);
    setCurrentQuestionIndex(cachedSessionAvailable.currentQuestionIndex);
    setUserAnswers(cachedSessionAvailable.userAnswers);
    setTimeouts(cachedSessionAvailable.timeouts);
    setTimeLeftMap(cachedSessionAvailable.timeLeftMap);
    setTimeSpentMap(cachedSessionAvailable.timeSpentMap);
    setQuizSubmitted(cachedSessionAvailable.quizSubmitted);
    setExplanationCache(cachedSessionAvailable.explanationCache || {});
    if (cachedSessionAvailable.revealedAnswers) setRevealedAnswers(cachedSessionAvailable.revealedAnswers);
    setLoadingExplanationMap(cachedSessionAvailable.loadingExplanationMap || {});
    setSavedInsightIds(new Set(cachedSessionAvailable.savedInsightIds || []));
    setIsRanked(cachedSessionAvailable.isRanked);
    if (cachedSessionAvailable.pendingAnswersMap) setPendingAnswersMap(cachedSessionAvailable.pendingAnswersMap);
    if (cachedSessionAvailable.lockedMap) setLockedMap(cachedSessionAvailable.lockedMap);
    setIsLoading(false);
    setShowResumeOverlay(true);
    setResumeCountdown(3);
    setArenaPhase('quiz');
    setCachedSessionAvailable(null);
  };

  const handleDiscardSavedSession = () => {
    clearSessionCache();
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_SESSION_KEY);
      localStorage.removeItem(RESULTS_STORAGE_KEY);
    } catch {}
    setCachedSessionAvailable(null);
  };

  // Resume overlay countdown
  useEffect(() => {
    if (!showResumeOverlay || resumeCountdown <= 0) return;
    const timer = setTimeout(() => {
      setResumeCountdown((prev) => {
        if (prev <= 1) {
          setShowResumeOverlay(false);
          return 3;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [showResumeOverlay, resumeCountdown]);

  // Start Assessment Triggers
  const handleBeginAssessment = () => {
    clearSessionCache();
    setCachedSessionAvailable(null);
    setIsRanked(true);
    setMotivation(getRandomMotivation());
    setShowPreflightModal(true);
  };

  const handleStartTargetedDrill = async () => {
    clearSessionCache();
    setCachedSessionAvailable(null);
    const drillIsRanked = arenaConfig?.isRanked ?? false;
    setIsRanked(drillIsRanked);
    setArenaPhase('quiz');
    setIsLoading(true);
    setErrorMsg('');

    try {
      const targetId = arenaConfig?.targetId || targetPillar?.id || '';
      const targetTitle = arenaConfig?.title || targetPillar?.title || targetId;
      const targetCount = arenaConfig?.questionCount || 10;

      const queryParams = new URLSearchParams();
      if (userId) queryParams.append('userId', userId);
      queryParams.append('examTrack', examTrack);
      if (targetId) queryParams.append('pillar', targetId);
      if (targetTitle) queryParams.append('subject', targetTitle);
      queryParams.append('count', targetCount.toString());

      const url = `/api/questions?${queryParams.toString()}`;
      const response = await fetchWithAuth(url);
      if (!response.ok) throw new Error(`Server returned status code ${response.status}`);
      const data = await response.json();

      if (data.error) throw new Error(data.error);

      let questionsList = data.questions || [];
      if (questionsList.length === 0) {
        throw new Error('No questions found for this targeted drill.');
      }

      setQuestions(questionsList);
      saveActiveSessionMeta({
        currentQuestionIndex: 0,
        isRanked: drillIsRanked,
        mode: drillIsRanked ? 'vanguard' : 'training',
      });
    } catch (error: any) {
      setErrorMsg('Failed to initialize drill: ' + (error.message || 'Unknown network error.'));
      setArenaPhase('intro');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrainingGround = async () => {
    clearSessionCache();
    setCachedSessionAvailable(null);
    setIsRanked(false);
    setLoadingSubjects(true);
    try {
      const { data } = await supabase
        .from('static_questions')
        .select('subject_category')
        .not('subject_category', 'is', null);

      if (data) {
        let unique = [...new Set(data.map((q: any) => q.subject_category).filter(Boolean))].sort() as string[];
        if (!unique.includes('Current Affairs')) {
          unique.push('Current Affairs');
        }
        setAllSubjects(unique);

        const activeTarget = arenaConfig?.targetId || targetPillar?.id || targetPillar?.title || '';
        let matched = false;

        if (activeTarget) {
          const directMatch = unique.filter((s) =>
            s.toLowerCase().includes(activeTarget.toLowerCase()) || activeTarget.toLowerCase().includes(s.toLowerCase())
          );
          if (directMatch.length > 0) {
            setSelectedSubjects(new Set(directMatch));
            matched = true;
          } else if (activeTarget.toUpperCase() === 'CURRENT_AFFAIRS') {
            setSelectedSubjects(new Set(['Current Affairs']));
            matched = true;
          }
        }

        if (!matched && candidatePreferences?.focusPillars && candidatePreferences.focusPillars.length > 0) {
          const pillars = candidatePreferences.focusPillars;
          const preselected = unique.filter((subj) => {
            const s = subj.toLowerCase();
            if (pillars.includes('gs2') && (s.includes('polity') || s.includes('governance') || s.includes('constitution') || s.includes('international') || s.includes('law'))) return true;
            if (pillars.includes('gs3') && (s.includes('economy') || s.includes('environment') || s.includes('science') || s.includes('tech') || s.includes('agriculture'))) return true;
            if (pillars.includes('gs1') && (s.includes('history') || s.includes('geography') || s.includes('culture') || s.includes('society'))) return true;
            if (pillars.includes('gs4') && (s.includes('ethics') || s.includes('integrity') || s.includes('aptitude'))) return true;
            if (pillars.includes('csat') && (s.includes('csat') || s.includes('reasoning') || s.includes('comprehension'))) return true;
            return false;
          });
          if (preselected.length > 0) {
            setSelectedSubjects(new Set(preselected));
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch subjects:', err);
    } finally {
      setLoadingSubjects(false);
    }
    setShowTrainingSetup(true);
  };

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(subject)) next.delete(subject);
      else next.add(subject);
      return next;
    });
  };

  const startTraining = async () => {
    if (selectedSubjects.size === 0) return;

    setShowTrainingSetup(false);
    setShowPreflightModal(false);
    setArenaPhase('quiz');
    setIsLoading(true);

    try {
      const response = await fetchWithAuth('/api/training-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjects: Array.from(selectedSubjects),
          count: trainingLength,
          userId,
          examTrack,
        }),
      });

      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const data = await response.json();
      const questionsList = data.questions || [];

      if (data.isBackfilled) {
        if (!localStorage.getItem('tark_backfill_seen')) {
          localStorage.setItem('tark_backfill_seen', 'true');
          setToastMsg('Diagnostic notice: Additional questions added to complete your set.');
        }
      }

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
    setShowPreflightModal(false);
    setArenaPhase('quiz');
  };

  // Fetch questions for ranked Vanguard
  useEffect(() => {
    if (arenaPhase !== 'quiz') return;
    if (!isRanked) return;
    if (questions.length > 0) return;

    const fetchQuestions = async () => {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const queryParams = new URLSearchParams();
        if (userId) queryParams.append('userId', userId);
        queryParams.append('examTrack', examTrack);
        if (targetPillar?.id) {
          queryParams.append('pillar', targetPillar.id);
          queryParams.append('subject', targetPillar.title || targetPillar.id);
        }

        const url = `/api/questions?${queryParams.toString()}`;
        const response = await fetchWithAuth(url);
        if (!response.ok) throw new Error(`Server returned status code ${response.status}`);
        const data = await response.json();

        if (data.error) throw new Error(data.error);

        let questionsList = data.questions || [];
        if (questionsList.length === 0) {
          questionsList = (staticQuestionsData.questions || []).map((q: any, i: number) => ({
            id: q.id || `static_${i + 1}`,
            exam_origin_tag: q.exam_origin_tag || 'UPSC CSE Practice',
            subject_category: q.subject_category || 'General Studies',
            difficulty_level: q.difficulty_level || 'medium',
            question_text: q.question_text,
            options_matrix: q.options_matrix,
            conceptual_explanation: q.conceptual_explanation,
          }));
        }

        if (questionsList.length === 0) {
          setErrorMsg('No questions found in the origin database.');
          setIsLoading(false);
          return;
        }

        const shuffled = [...questionsList].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 25);
        setQuestions(selected);

        saveActiveSessionMeta({
          currentQuestionIndex: 0,
          isRanked: true,
          mode: 'vanguard',
        });
      } catch (error: any) {
        const fallbackList = (staticQuestionsData.questions || []).map((q: any, i: number) => ({
          id: q.id || `static_${i + 1}`,
          exam_origin_tag: q.exam_origin_tag || 'UPSC CSE Practice',
          subject_category: q.subject_category || 'General Studies',
          difficulty_level: q.difficulty_level || 'medium',
          question_text: q.question_text,
          options_matrix: q.options_matrix,
          conceptual_explanation: q.conceptual_explanation,
        }));

        if (fallbackList.length > 0) {
          const shuffled = [...fallbackList].sort(() => 0.5 - Math.random());
          setQuestions(shuffled.slice(0, 25));
          saveActiveSessionMeta({
            currentQuestionIndex: 0,
            isRanked: true,
            mode: 'vanguard',
          });
        } else {
          setErrorMsg('Failed to initialize arena: ' + (error.message || 'Unknown network error.'));
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [arenaPhase, userId, isRanked, questions.length]);

  // Persist session to cache
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
      revealedAnswers,
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
    revealedAnswers,
    loadingExplanationMap,
    savedInsightIds,
    userId,
    isRanked,
    pendingAnswersMap,
    lockedMap,
  ]);

  useEffect(() => {
    const isQuizActive = arenaPhase === 'quiz' && questions.length > 0 && !quizSubmitted;
    onTestStatusChange?.(isQuizActive);
    return () => {
      onTestStatusChange?.(false);
    };
  }, [arenaPhase, questions.length, quizSubmitted, onTestStatusChange]);

  const currentQuestion = questions[currentQuestionIndex];
  const currentQuestionId = currentQuestion?.id;

  const defaultTimeForQuestion =
    pacingMode === 'blitz' ? 20 : pacingMode === 'standard' ? (arenaConfig?.timePerQuestionSeconds || 60) : 999999;

  // Timer interval loop
  useEffect(() => {
    if (arenaPhase !== 'quiz' || isLoading || errorMsg || questions.length === 0 || !currentQuestionId || quizSubmitted) return;

    const isCurrentlyLocked = !!lockedMap[currentQuestionId];
    if (isCurrentlyLocked) return;

    if (pacingMode === 'untimed') {
      const timer = setInterval(() => {
        setTimeSpentMap((prev) => ({
          ...prev,
          [currentQuestionId]: (prev[currentQuestionId] || 0) + 1,
        }));
      }, 1000);
      return () => clearInterval(timer);
    }

    const currentTimeLeft = timeLeftMap[currentQuestionId] !== undefined ? timeLeftMap[currentQuestionId] : defaultTimeForQuestion;

    if (currentTimeLeft <= 0) {
      setLockedMap((prev) => ({ ...prev, [currentQuestionId]: true }));
      setTimeouts((prev) => ({ ...prev, [currentQuestionId]: true }));
      return;
    }

    const timer = setInterval(() => {
      setTimeLeftMap((prev) => ({
        ...prev,
        [currentQuestionId]: Math.max(0, (prev[currentQuestionId] !== undefined ? prev[currentQuestionId] : defaultTimeForQuestion) - 1),
      }));
      setTimeSpentMap((prev) => ({
        ...prev,
        [currentQuestionId]: (prev[currentQuestionId] || 0) + 1,
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [arenaPhase, currentQuestionId, timeLeftMap, lockedMap, isLoading, errorMsg, questions, quizSubmitted, pacingMode, defaultTimeForQuestion]);

  // AI Conceptual Insights loop
  useEffect(() => {
    if (arenaPhase !== 'quiz') return;
    if (!currentQuestionId || quizSubmitted) return;

    const questionIsLocked = !!lockedMap[currentQuestionId] || !!timeouts[currentQuestionId];

    if (questionIsLocked) {
      if (currentQuestion?.ai_insights) {
        setExplanationCache((prev) => ({ ...prev, [currentQuestionId]: currentQuestion.ai_insights }));
        return;
      }

      if (explanationCache[currentQuestionId] || loadingExplanationMap[currentQuestionId]) return;

      setLoadingExplanationMap((prev) => ({ ...prev, [currentQuestionId]: true }));

      fetchWithAuth('/api/explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion.question_text,
          questionId: currentQuestionId,
          userId,
        }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (res.status === 403 && (data.error === 'PAYWALL_REACHED' || data.error === 'limit_reached')) {
            if (data.error === 'limit_reached') setIsAIFrostedGlass(true);
            else if (onNavigateManifesto) onNavigateManifesto();
            return null;
          }
          return data;
        })
        .then((data) => {
          if (!data) return;
          if (data.correct_option) {
            setRevealedAnswers((prev) => ({ ...prev, [currentQuestionId]: data.correct_option }));
          }
          if (data.explanation) {
            setExplanationCache((prev) => ({ ...prev, [currentQuestionId]: data.explanation }));
            setQuestions((prevQ) =>
              prevQ.map((q) => (q.id === currentQuestionId ? { ...q, ai_insights: data.explanation, is_generated: true } : q))
            );
          }
        })
        .catch((err) => console.error('Insight fetch failure:', err))
        .finally(() => {
          setLoadingExplanationMap((prev) => ({ ...prev, [currentQuestionId]: false }));
        });
    }
  }, [arenaPhase, currentQuestionId, lockedMap, timeouts, quizSubmitted, currentQuestion, explanationCache, loadingExplanationMap, onNavigateManifesto, userId]);

  const handleSelect = (key: string) => {
    if (!currentQuestionId) return;
    const alreadyLocked = !!lockedMap[currentQuestionId] || !!timeouts[currentQuestionId] || quizSubmitted;
    if (alreadyLocked) return;
    setPendingAnswersMap((prev) => ({ ...prev, [currentQuestionId]: key }));
  };

  const handleLock = () => {
    if (!currentQuestionId) return;
    const pending = pendingAnswersMap[currentQuestionId];
    if (!pending) return;

    setUserAnswers((prev) => ({ ...prev, [currentQuestionId]: pending }));
    setLockedMap((prev) => ({ ...prev, [currentQuestionId]: true }));
    saveActiveSessionMeta({
      currentQuestionIndex,
      isRanked,
      mode: isRanked ? 'vanguard' : 'training',
    });
  };

  const handlePrevious = () => {
    if (currentQuestionIndex <= 0) return;
    setCurrentQuestionIndex((prev) => prev - 1);
    saveActiveSessionMeta({
      currentQuestionIndex: currentQuestionIndex - 1,
      isRanked,
      mode: isRanked ? 'vanguard' : 'training',
    });
  };

  const handleNext = () => {
    if (!currentQuestionId) return;

    const pending = pendingAnswersMap[currentQuestionId];
    if (pending && !userAnswers[currentQuestionId]) {
      setUserAnswers((prev) => ({ ...prev, [currentQuestionId]: pending }));
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      saveActiveSessionMeta({
        currentQuestionIndex: currentQuestionIndex + 1,
        isRanked,
        mode: isRanked ? 'vanguard' : 'training',
      });
    } else {
      finishArena();
    }
  };

  const toggleMarkForReview = (questionId?: string) => {
    const id = questionId || currentQuestionId;
    if (!id) return;
    setMarkedForReviewMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSkip = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      saveActiveSessionMeta({
        currentQuestionIndex: currentQuestionIndex + 1,
        isRanked,
        mode: isRanked ? 'vanguard' : 'training',
      });
    }
  };

  const handleConfirmAbandon = () => {
    setShowAbandonModal(false);
    clearSessionCache();
    setCachedSessionAvailable(null);
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_SESSION_KEY);
      localStorage.removeItem(RESULTS_STORAGE_KEY);
    } catch {}
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
    setMarkedForReviewMap({});
    onTestStatusChange?.(false);
    const origin = arenaConfig?.originTab || 'arena';
    if (onReturnToDashboard) onReturnToDashboard(origin);
  };

  const toggleBookmark = async () => {
    if (!currentQuestionId || !userId) return;

    const qId = String(currentQuestionId);
    const isSaved = savedInsightIds.has(qId);
    const rawInsight = explanationCache[currentQuestionId] || currentQuestion.ai_insights || currentQuestion.conceptual_explanation || '';
    const insightText = formatInsightToText(rawInsight, currentQuestion.conceptual_explanation);

    if (!insightText) return;

    setBookmarkToggling((prev) => ({ ...prev, [qId]: true }));

    try {
      if (isSaved) {
        await fetchWithAuth('/api/bookmark', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, questionId: currentQuestionId, action: 'delete' }),
        });
        setSavedInsightIds((prev) => {
          const next = new Set(prev);
          next.delete(qId);
          return next;
        });
        setToastMsg('Flashcard removed from bookmarks.');
      } else {
        await fetchWithAuth('/api/bookmark', {
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
        setSavedInsightIds((prev) => new Set(prev).add(qId));
        setToastMsg('Conceptual flashcard saved to dossier.');
      }
    } catch (err) {
      console.error('Bookmark toggle fail:', err);
    } finally {
      setBookmarkToggling((prev) => ({ ...prev, [qId]: false }));
    }
  };

  const finishArena = async () => {
    setIsLoading(true);
    setQuizSubmitted(true);

    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;
    let totalTime = 0;
    const finalSubjectStats: Record<string, { correct: number; total: number; missedQuestions: string[] }> = {};

    questions.forEach((q) => {
      const selected = userAnswers[q.id];
      const revealedKey = revealedAnswers[q.id]?.trim();
      const isCorrect = selected && revealedKey ? selected === revealedKey : false;
      const subj = q.subject_category || 'CORE';

      if (!finalSubjectStats[subj]) {
        finalSubjectStats[subj] = { correct: 0, total: 0, missedQuestions: [] };
      }
      finalSubjectStats[subj].total += 1;

      if (!selected) {
        unattemptedCount += 1;
        if (q.question_text) finalSubjectStats[subj].missedQuestions.push(q.question_text);
      } else if (isCorrect) {
        correctCount += 1;
        finalSubjectStats[subj].correct += 1;
      } else {
        incorrectCount += 1;
        if (q.question_text) finalSubjectStats[subj].missedQuestions.push(q.question_text);
      }

      totalTime += timeSpentMap[q.id] || 0;
    });

    try {
      const response = await fetchWithAuth('/api/submit-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          answers: userAnswers,
          timeouts,
          timeSpentMap,
          questions: questions.map((q) => ({
            id: q.id,
            subject_category: q.subject_category,
          })),
          subjectStats: finalSubjectStats,
          totalTimeSeconds: totalTime,
          isRanked,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Server non-JSON response' }));
        throw new Error(errData.error || `Server responded with ${response.status}`);
      }

      const result = await response.json();
      clearSessionCache();

      const resolvedContextTag = arenaConfig?.contextTag || arenaConfig?.title || (targetPillar ? `${targetPillar.title} Review` : undefined);

      const resultsToCache: CachedResults = {
        status: 'reviewing',
        resultsData: {
          correct: result.stats.correct,
          incorrect: result.stats.incorrect,
          unattempted: result.stats.unattempted,
          totalTimeSeconds: result.stats.totalTimeSeconds,
          subjectStats: result.stats.subjectStats,
          isRanked,
          contextTag: resolvedContextTag,
        },
        percentile: result.percentile,
      };

      try {
        localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(resultsToCache));
      } catch {}

      onComplete(
        {
          correct: result.stats.correct,
          incorrect: result.stats.incorrect,
          unattempted: result.stats.unattempted,
          totalTimeSeconds: result.stats.totalTimeSeconds,
          subjectStats: result.stats.subjectStats,
          isRanked,
          contextTag: resolvedContextTag,
        },
        result.percentile
      );
    } catch (err: any) {
      console.error(err);
      clearSessionCache();

      const fallbackContextTag = arenaConfig?.contextTag || arenaConfig?.title || (targetPillar ? `${targetPillar.title} Review` : undefined);

      onComplete(
        {
          correct: correctCount,
          incorrect: incorrectCount,
          unattempted: unattemptedCount,
          totalTimeSeconds: totalTime,
          subjectStats: finalSubjectStats,
          isRanked,
          contextTag: fallbackContextTag,
        },
        0
      );
    }
  };

  // Keyboard Shortcuts during Arena Quiz
  useEffect(() => {
    if (arenaPhase !== 'quiz') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.altKey || e.ctrlKey || e.metaKey) return;

      const key = e.key.toUpperCase();
      const code = e.code;

      if (key === 'A' || code === 'KeyA' || key === '1' || code === 'Digit1' || code === 'Numpad1') {
        e.preventDefault();
        handleSelect('A');
      } else if (key === 'B' || code === 'KeyB' || key === '2' || code === 'Digit2' || code === 'Numpad2') {
        e.preventDefault();
        handleSelect('B');
      } else if (key === 'C' || code === 'KeyC' || key === '3' || code === 'Digit3' || code === 'Numpad3') {
        e.preventDefault();
        handleSelect('C');
      } else if (key === 'D' || code === 'KeyD' || key === '4' || code === 'Digit4' || code === 'Numpad4') {
        e.preventDefault();
        handleSelect('D');
      } else if (key === 'L' || code === 'KeyL') {
        e.preventDefault();
        handleLock();
      } else if (key === 'ARROWLEFT' || code === 'ArrowLeft' || key === 'P' || code === 'KeyP') {
        e.preventDefault();
        handlePrevious();
      } else if (key === 'ARROWRIGHT' || code === 'ArrowRight' || key === 'N' || code === 'KeyN') {
        e.preventDefault();
        handleNext();
      } else if (key === 'ENTER' || code === 'Enter' || key === ' ' || code === 'Space') {
        e.preventDefault();
        if (currentQuestionId) {
          const pending = pendingAnswersMap[currentQuestionId];
          const locked = lockedMap[currentQuestionId];
          if (pending && !locked) {
            handleLock();
          } else {
            handleNext();
          }
        }
      } else if (key === 'M' || code === 'KeyM') {
        e.preventDefault();
        toggleBookmark();
      } else if (key === 'ESCAPE' || code === 'Escape') {
        e.preventDefault();
        setShowAbandonModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [arenaPhase, currentQuestionId, pendingAnswersMap, lockedMap, currentQuestionIndex, questions.length]);

  return {
    arenaPhase,
    setArenaPhase,
    cachedSessionAvailable,
    examTrack,
    setExamTrack,
    pacingMode,
    setPacingMode,
    showPreflightModal,
    setShowPreflightModal,
    showAbandonModal,
    setShowAbandonModal,
    motivation,
    userLimits,
    questions,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    isLoading,
    errorMsg,
    setErrorMsg,
    showResumeOverlay,
    resumeCountdown,
    userAnswers,
    timeouts,
    timeLeftMap,
    timeSpentMap,
    quizSubmitted,
    pendingAnswersMap,
    lockedMap,
    explanationCache,
    revealedAnswers,
    loadingExplanationMap,
    savedInsightIds,
    bookmarkToggling,
    isAIFrostedGlass,
    toastMsg,
    isRanked,
    showTrainingSetup,
    setShowTrainingSetup,
    allSubjects,
    selectedSubjects,
    setSelectedSubjects,
    trainingLength,
    setTrainingLength,
    loadingSubjects,
    currentQuestion,
    currentQuestionId,
    defaultTimeForQuestion,
    handleResumeSavedSession,
    handleDiscardSavedSession,
    handleBeginAssessment,
    handleStartTargetedDrill,
    handleTrainingGround,
    toggleSubject,
    startTraining,
    handleReady,
    handleSelect,
    handleLock,
    handlePrevious,
    handleNext,
    handleSkip,
    markedForReviewMap,
    toggleMarkForReview,
    handleConfirmAbandon,
    toggleBookmark,
  };
}
