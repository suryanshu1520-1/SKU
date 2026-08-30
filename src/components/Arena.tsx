import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../lib/api';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Question } from '../types';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  ArrowRight,
  Lock,
  Swords,
  Target,
  AlertTriangle,
  HelpCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
} from 'lucide-react';
import InfoTooltip from './InfoTooltip';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { Modal, EmptyState, ConceptInsightRenderer, formatInsightToText } from './shared';
import staticQuestionsData from '../data/static-subject-questions.json';

interface ArenaProps {
  onComplete: (
    stats: {
      correct: number;
      incorrect: number;
      unattempted: number;
      totalTimeSeconds: number;
      subjectStats: Record<string, { correct: number; total: number; missedQuestions?: string[] }>;
      isRanked?: boolean;
    },
    percentile: number
  ) => void;
  userId: string;
  targetPillar?: { id: string; title: string } | null;
  onClearTargetPillar?: () => void;
  onReturnToDashboard?: () => void;
  onNavigateManifesto?: () => void;
}

const SESSION_STORAGE_KEY = 'tark_arena_session';
const ACTIVE_SESSION_KEY = 'tark_active_session';
const RESULTS_STORAGE_KEY = 'tark_arena_results';

interface CachedSession {
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

interface ActiveSessionMeta {
  currentQuestionIndex: number;
  isRanked: boolean;
  mode: 'vanguard' | 'training';
}

interface CachedResults {
  status: 'reviewing';
  resultsData: {
    correct: number;
    incorrect: number;
    unattempted: number;
    totalTimeSeconds: number;
    subjectStats: Record<string, { correct: number; total: number; missedQuestions?: string[] }>;
    isRanked?: boolean;
  };
  percentile: number;
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

function loadCachedResults(): CachedResults | null {
  try {
    const raw = localStorage.getItem(RESULTS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedResults;
  } catch {
    return null;
  }
}

export default function Arena({
  onComplete,
  userId,
  targetPillar,
  onClearTargetPillar,
  onReturnToDashboard,
  onNavigateManifesto,
}: ArenaProps) {
  const [arenaPhase, setArenaPhase] = useState<'intro' | 'quiz'>('intro');
  const [examTrack, setExamTrack] = useState<'upsc' | 'ssc'>('upsc');
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
  const [trainingLength, setTrainingLength] = useState<number>(25);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const prefersReduced = useReducedMotion();

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
        setQuestions(fullCached.questions);
        setCurrentQuestionIndex(fullCached.currentQuestionIndex);
        setUserAnswers(fullCached.userAnswers);
        setTimeouts(fullCached.timeouts);
        setTimeLeftMap(fullCached.timeLeftMap);
        setTimeSpentMap(fullCached.timeSpentMap);
        setQuizSubmitted(fullCached.quizSubmitted);
        setExplanationCache(fullCached.explanationCache || {});
        if (fullCached.revealedAnswers) setRevealedAnswers(fullCached.revealedAnswers);
        setLoadingExplanationMap(fullCached.loadingExplanationMap || {});
        setSavedInsightIds(new Set(fullCached.savedInsightIds || []));
        setIsRanked(fullCached.isRanked);
        if (fullCached.pendingAnswersMap) setPendingAnswersMap(fullCached.pendingAnswersMap);
        if (fullCached.lockedMap) setLockedMap(fullCached.lockedMap);
        setIsLoading(false);
        setShowResumeOverlay(true);
        setResumeCountdown(3);
        setArenaPhase('quiz');
        return;
      }
    }
  }, [userId, onComplete]);

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
    setIsRanked(true);
    setMotivation(getRandomMotivation());
    setShowPreflightModal(true);
  };

  const handleTrainingGround = async () => {
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
          // Fallback to locally ingested static subject questions
          questionsList = (staticQuestionsData.questions || []).map((q: any, i: number) => ({
            id: q.id || `static_${i + 1}`,
            exam_origin_tag: q.exam_origin_tag || 'UPSC CSE Practice',
            subject_category: q.subject_category || 'General Studies',
            difficulty_level: q.difficulty_level || 'medium',
            question_text: q.question_text,
            options_matrix: q.options_matrix,
            conceptual_explanation: q.conceptual_explanation
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
        // Fallback to locally ingested static questions on network error
        const fallbackList = (staticQuestionsData.questions || []).map((q: any, i: number) => ({
          id: q.id || `static_${i + 1}`,
          exam_origin_tag: q.exam_origin_tag || 'UPSC CSE Practice',
          subject_category: q.subject_category || 'General Studies',
          difficulty_level: q.difficulty_level || 'medium',
          question_text: q.question_text,
          options_matrix: q.options_matrix,
          conceptual_explanation: q.conceptual_explanation
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

  const currentQuestion = questions[currentQuestionIndex];
  const currentQuestionId = currentQuestion?.id;

  const getOptions = (matrix: any) => {
    try {
      if (typeof matrix === 'string') return JSON.parse(matrix);
      return matrix;
    } catch {
      return {};
    }
  };

  // Timer interval loop
  useEffect(() => {
    if (arenaPhase !== 'quiz' || isLoading || errorMsg || questions.length === 0 || !currentQuestionId || quizSubmitted) return;

    const isCurrentlyLocked = !!lockedMap[currentQuestionId];
    if (isCurrentlyLocked) return;

    const currentTimeLeft = timeLeftMap[currentQuestionId] !== undefined ? timeLeftMap[currentQuestionId] : 20;

    if (currentTimeLeft <= 0) {
      setLockedMap((prev) => ({ ...prev, [currentQuestionId]: true }));
      setTimeouts((prev) => ({ ...prev, [currentQuestionId]: true }));
      return;
    }

    const timer = setInterval(() => {
      setTimeLeftMap((prev) => ({
        ...prev,
        [currentQuestionId]: Math.max(0, (prev[currentQuestionId] !== undefined ? prev[currentQuestionId] : 20) - 1),
      }));
      setTimeSpentMap((prev) => ({
        ...prev,
        [currentQuestionId]: (prev[currentQuestionId] || 0) + 1,
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [arenaPhase, currentQuestionId, timeLeftMap, lockedMap, isLoading, errorMsg, questions, quizSubmitted]);

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

  // Select Option (Two-Step pending state)
  const handleSelect = (key: string) => {
    if (!currentQuestionId) return;
    const alreadyLocked = !!lockedMap[currentQuestionId] || !!timeouts[currentQuestionId] || quizSubmitted;
    if (alreadyLocked) return;
    setPendingAnswersMap((prev) => ({ ...prev, [currentQuestionId]: key }));
  };

  // Lock Answer Commit
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

  // Abandon Dialog Confirm
  const handleConfirmAbandon = () => {
    setShowAbandonModal(false);
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
    if (onReturnToDashboard) onReturnToDashboard();
  };

  // Bookmark Insight
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

      const resultsToCache: CachedResults = {
        status: 'reviewing',
        resultsData: {
          correct: result.stats.correct,
          incorrect: result.stats.incorrect,
          unattempted: result.stats.unattempted,
          totalTimeSeconds: result.stats.totalTimeSeconds,
          subjectStats: result.stats.subjectStats,
          isRanked,
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
        },
        result.percentile
      );
    } catch (err: any) {
      console.error(err);
      clearSessionCache();

      onComplete(
        {
          correct: correctCount,
          incorrect: incorrectCount,
          unattempted: unattemptedCount,
          totalTimeSeconds: totalTime,
          subjectStats: finalSubjectStats,
          isRanked,
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

      // Ignore if modifier keys (like Alt or Ctrl or Meta) are held, to allow global app shortcuts
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

  // ----------------------------------------------------------------
  // RENDER: INTRO PHASE
  // ----------------------------------------------------------------
  if (arenaPhase === 'intro' && !showTrainingSetup) {
    return (
      <div className="w-full max-w-2xl mx-auto font-sans flex flex-col items-center justify-center p-4 sm:p-6 min-h-[75vh]">
        
        {/* Pre-Flight Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-sm text-[10px] uppercase font-sans font-medium text-[#e0d0ab] tracking-wider mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Analytical Test Arena</span>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2 text-center"
        >
          Choose Your Test
        </motion.h1>
        <p className="text-xs font-sans text-zinc-400 mb-8 text-center max-w-md">
          Time-bound competitive testing with zero-trust server evaluation and negative marking.
        </p>

        {/* Targeted Syllabus Pillar Drill Banner (if active) */}
        {targetPillar && (
          <div className="w-full mb-6 p-4 rounded-sm bg-[#e0d0ab]/10 border border-[#e0d0ab]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-sm bg-[#e0d0ab]/20 text-[#e0d0ab]">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase text-[#e0d0ab] font-bold tracking-wider">
                  Targeted Syllabus Pillar Drill
                </div>
                <div className="text-sm font-serif font-bold text-white">
                  {targetPillar.title} ({targetPillar.id})
                </div>
              </div>
            </div>
            {onClearTargetPillar && (
              <button
                onClick={onClearTargetPillar}
                className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-300 rounded-sm cursor-pointer transition-colors"
              >
                Comprehensive Mock [×]
              </button>
            )}
          </div>
        )}

        {/* Exam Track Segregation Switcher */}
        <div className="w-full mb-6 flex items-center p-1 bg-zinc-900/80 border border-zinc-800 rounded-sm">
          <button
            onClick={() => setExamTrack('upsc')}
            className={`flex-1 py-2 text-xs font-mono font-bold rounded-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
              examTrack === 'upsc'
                ? 'bg-[#e0d0ab] text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-stone-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            UPSC CSE Track (Default)
          </button>
          <button
            onClick={() => setExamTrack('ssc')}
            className={`flex-1 py-2 text-xs font-mono font-bold rounded-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
              examTrack === 'ssc'
                ? 'bg-[#0194a8] text-white shadow-sm'
                : 'text-zinc-400 hover:text-stone-200'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            SSC CGL Exam Track
          </button>
        </div>

        {/* Protocol Option Cards */}
        <div className="w-full space-y-4">
          {/* 1. Ranked Test */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            whileHover={prefersReduced ? undefined : { y: -2 }}
            onClick={handleBeginAssessment}
            className="p-6 bg-zinc-900/30 hover:bg-zinc-900/50 border border-zinc-800 hover:border-[#0194a8]/50 rounded-sm cursor-pointer transition-all flex items-start gap-4 backdrop-blur-sm group"
          >
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-sm group-hover:border-[#0194a8]/40 transition-colors">
              <Swords className="w-6 h-6 text-[#0194a8]" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-stone-100 group-hover:text-[#e0d0ab] transition-colors">
                  Ranked Test
                </h3>
                <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-sans font-bold uppercase rounded-sm">
                  Ranked + Points
                </span>
              </div>
              <p className="text-xs font-sans text-zinc-400 leading-relaxed">
                25 multi-domain questions &bull; 20s per question &bull; Negative marking (+2 / -0.66) &bull; Earns Rank Points.
              </p>
            </div>
          </motion.div>

          {/* 2. Training Ground Custom Setup */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={prefersReduced ? undefined : { y: -2 }}
            onClick={handleTrainingGround}
            className="p-6 bg-zinc-900/30 hover:bg-zinc-900/50 border border-zinc-800 hover:border-[#e0d0ab]/50 rounded-sm cursor-pointer transition-all flex items-start gap-4 backdrop-blur-sm group"
          >
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-sm group-hover:border-[#e0d0ab]/40 transition-colors">
              <Target className="w-6 h-6 text-[#e0d0ab]" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-stone-100 group-hover:text-[#e0d0ab] transition-colors">
                  The Training Ground
                </h3>
                <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-sans font-bold uppercase rounded-sm">
                  Unranked
                </span>
              </div>
              <p className="text-xs font-sans text-zinc-400 leading-relaxed">
                Custom domain filtering & adjustable test lengths (25 / 35 / 50 questions) for deliberate conceptual practice.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Pre-Flight Checklist Modal */}
        <Modal
          isOpen={showPreflightModal}
          onClose={() => setShowPreflightModal(false)}
          title="Before You Begin"
          subtitle="Timed ranked test"
        >
          <div className="space-y-5 font-sans">
            <div className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-sm space-y-2">
              <h4 className="font-serif text-xs font-bold text-[#e0d0ab]">
                Focus Rule
              </h4>
              <p className="text-sm font-serif italic text-stone-200 leading-relaxed">
                "{motivation}"
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-sans">
              <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-sm">
                <span className="text-[10px] text-zinc-500 uppercase block mb-0.5 font-medium">Length</span>
                <span className="font-bold text-stone-200"><span className="font-mono">25</span> Questions</span>
              </div>
              <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-sm">
                <span className="text-[10px] text-zinc-500 uppercase block mb-0.5 font-medium">Pacing</span>
                <span className="font-bold text-stone-200"><span className="font-mono">20s</span> Per Question</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowPreflightModal(false)}
                className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 font-sans text-xs font-medium uppercase rounded-sm transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReady}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-[#e0d0ab] hover:bg-stone-100 text-zinc-950 font-sans text-xs font-bold uppercase rounded-sm transition-all shadow-md shadow-[#e0d0ab]/10 cursor-pointer"
              >
                <span>Enter Arena</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </Modal>

      </div>
    );
  }

  // ----------------------------------------------------------------
  // RENDER: TRAINING GROUND SETUP
  // ----------------------------------------------------------------
  if (showTrainingSetup) {
    const lengthOptions = [25, 35, 50];

    return (
      <div className="w-full max-w-2xl mx-auto font-sans p-4 sm:p-6 space-y-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-sm text-[10px] uppercase font-sans font-medium text-[#e0d0ab] tracking-wider">
          <Target className="w-3 h-3 text-[#e0d0ab]" />
          <span>Training Ground Configuration</span>
        </div>

        <h2 className="font-serif text-2xl font-bold text-white">Custom Domain & Volume Setup</h2>

        {/* Subject Selection */}
        <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-sm font-bold tracking-tight text-[#e0d0ab]">
              Select Focus Subjects ({selectedSubjects.size} Selected)
            </h3>
            <button
              onClick={() => setSelectedSubjects(new Set(allSubjects))}
              className="text-[10px] font-sans text-[#0194a8] hover:text-[#e0d0ab] transition-colors cursor-pointer"
            >
              Select All
            </button>
          </div>

          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {allSubjects.map((subject) => (
              <button
                key={subject}
                onClick={() => toggleSubject(subject)}
                className={`px-3 py-1.5 text-xs font-sans font-medium rounded-sm border transition-all cursor-pointer ${
                  selectedSubjects.has(subject)
                    ? 'bg-[#e0d0ab] text-zinc-950 border-[#e0d0ab] font-bold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-stone-200'
                }`}
              >
                {subject}
              </button>
            ))}
          </div>
        </div>

        {/* Question Count Selection */}
        <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-sm space-y-4">
          <h3 className="font-serif text-sm font-bold tracking-tight text-[#e0d0ab]">
            Question Target
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {lengthOptions.map((count) => (
              <button
                key={count}
                onClick={() => setTrainingLength(count)}
                className={`py-3 text-sm font-sans font-bold uppercase rounded-sm border transition-all cursor-pointer ${
                  trainingLength === count
                    ? 'bg-[#0194a8] text-white border-[#0194a8]'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-stone-200'
                }`}
              >
                <span className="font-mono">{count}</span> Questions
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowTrainingSetup(false);
              setArenaPhase('intro');
            }}
            className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-sans text-xs font-medium uppercase rounded-sm transition-all cursor-pointer"
          >
            Back
          </button>
          <button
            onClick={startTraining}
            disabled={selectedSubjects.size === 0}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 bg-[#e0d0ab] hover:bg-stone-100 disabled:opacity-40 text-zinc-950 font-sans text-xs font-bold uppercase rounded-sm transition-all cursor-pointer"
          >
            <Target className="w-4 h-4" />
            <span>Launch Training Ground</span>
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------
  // RENDER: QUIZ PHASE
  // ----------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-zinc-500 font-sans text-xs gap-3">
        <Loader2 className="w-6 h-6 text-[#0194a8] animate-spin" />
        <span>Initializing examination state...</span>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center font-sans">
        <AlertTriangle className="w-10 h-10 text-rose-400 mb-3" />
        <p className="text-sm font-sans text-rose-400 font-bold">{errorMsg}</p>
        <button
          onClick={() => {
            setErrorMsg('');
            setArenaPhase('intro');
          }}
          className="mt-4 px-4 py-2 bg-zinc-900 border border-zinc-800 text-[#e0d0ab] font-sans text-xs uppercase rounded-sm cursor-pointer hover:bg-zinc-800 transition-colors"
        >
          Return to Selection
        </button>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const options = getOptions(currentQuestion.options_matrix);
  const correctOpt = revealedAnswers[currentQuestionId]?.trim();
  const hasUserAnswered = userAnswers[currentQuestionId] !== undefined;
  const isTimeout = !!timeouts[currentQuestionId];
  const isQuestionLocked = !!lockedMap[currentQuestionId] || isTimeout || quizSubmitted;
  const hasLockedWithAnswer = isQuestionLocked && (hasUserAnswered || !!pendingAnswersMap[currentQuestionId] || isTimeout);

  const currentExplanation = explanationCache[currentQuestionId] || currentQuestion.ai_insights;
  const isLoadingExplanation = !!loadingExplanationMap[currentQuestionId];
  const isBookmarked = savedInsightIds.has(String(currentQuestionId));
  const isBookmarkLoading = !!bookmarkToggling[String(currentQuestionId)];

  const timeLeft = timeLeftMap[currentQuestionId] !== undefined ? timeLeftMap[currentQuestionId] : 20;
  const timerRadius = 18;
  const timerCircumference = 2 * Math.PI * timerRadius;
  const timerProgress = Math.max(0, Math.min(1, timeLeft / 20));
  const strokeDashoffset = timerCircumference - timerProgress * timerCircumference;

  return (
    <div className="w-full max-w-3xl mx-auto font-sans p-4 sm:p-6 pb-24 text-stone-100">
      
      {/* Resume Overlay */}
      <AnimatePresence>
        {showResumeOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-md flex items-center justify-center font-sans"
          >
            <div className="text-center space-y-3">
              <h2 className="font-serif text-2xl font-bold text-[#e0d0ab]">Resuming Assessment</h2>
              <p className="text-6xl font-mono font-bold text-white">{resumeCountdown}</p>
              <p className="text-xs font-sans uppercase tracking-widest text-zinc-400">Restoring active session state...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Protocol Header & Timer Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <span
            className={`px-2.5 py-1 rounded-sm text-[10px] font-sans font-bold uppercase tracking-wider border ${
              isRanked
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-[#e0d0ab]/10 border-[#e0d0ab]/30 text-[#e0d0ab]'
            }`}
          >
            {isRanked ? 'Ranked' : 'Practice'}
          </span>

          {targetPillar && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold bg-[#e0d0ab]/10 border border-[#e0d0ab]/30 text-[#e0d0ab] uppercase">
              <Target className="w-3 h-3" />
              {targetPillar.id}
            </span>
          )}

          <span className="text-xs font-sans text-zinc-400">
            Question <span className="font-mono">{currentQuestionIndex + 1}</span> of <span className="font-mono">{questions.length}</span>
          </span>
        </div>

        {/* Right Action: Radial Countdown Timer & Abandon Button */}
        <div className="flex items-center gap-4">
          {!isQuestionLocked ? (
            <div className="flex items-center gap-2">
              <div className="relative w-11 h-11 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
                  <circle
                    cx="22"
                    cy="22"
                    r={timerRadius}
                    fill="none"
                    stroke="#136c99"
                    strokeWidth="3"
                    strokeOpacity="0.4"
                  />
                  <circle
                    cx="22"
                    cy="22"
                    r={timerRadius}
                    fill="none"
                    stroke={timeLeft <= 5 ? '#e14e4e' : '#0194a8'}
                    strokeWidth="3"
                    strokeDasharray={timerCircumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <span
                  className={`absolute font-mono text-xs font-bold ${
                    timeLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-stone-100'
                  }`}
                >
                  {timeLeft}s
                </span>
              </div>
            </div>
          ) : (
            <span className="text-[11px] font-sans text-zinc-500">
              {isTimeout ? 'Timed Out' : <><span className="font-mono">{timeSpentMap[currentQuestionId] || 0}s</span> elapsed</>}
            </span>
          )}

          <button
            onClick={() => setShowAbandonModal(true)}
            className="text-[10px] font-sans uppercase tracking-wider text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
          >
            Abandon
          </button>
        </div>
      </div>

      {/* Segmented Question Navigator Palette (Touch-Accessible) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-6 custom-scrollbar">
        {questions.map((q, idx) => {
          const isCurrent = idx === currentQuestionIndex;
          const isAnswered = userAnswers[q.id] !== undefined;
          const isLocked = lockedMap[q.id];
          const isTimeOut = timeouts[q.id];
          const correctForQ = revealedAnswers[q.id]?.trim();
          const isCorrect = isAnswered && correctForQ ? userAnswers[q.id] === correctForQ : false;

          let statusStyle = 'bg-zinc-900/60 border-zinc-800 text-zinc-500';
          if (isCurrent) {
            statusStyle = 'bg-[#e0d0ab] text-zinc-950 font-bold border-[#e0d0ab] shadow-sm';
          } else if (isTimeOut) {
            statusStyle = 'bg-rose-950/40 border-rose-800/60 text-rose-400 font-bold';
          } else if (isLocked && isAnswered) {
            statusStyle = isCorrect
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400 font-bold'
              : 'bg-rose-950/40 border-rose-800/60 text-rose-400 font-bold';
          }

          return (
            <button
              key={q.id || idx}
              onClick={() => setCurrentQuestionIndex(idx)}
              className={`min-w-[32px] h-8 flex items-center justify-center rounded-sm border text-xs font-mono transition-all cursor-pointer ${statusStyle}`}
              title={`Jump to Question ${idx + 1}`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Main Question Card with Animated Transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionId}
          initial={prefersReduced ? undefined : { opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={prefersReduced ? undefined : { opacity: 0, x: -8 }}
          transition={{ duration: 0.25 }}
          className="p-6 sm:p-8 bg-zinc-900/30 border border-zinc-800 rounded-sm space-y-6 backdrop-blur-sm"
        >
          {/* Question Metadata Tags */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 text-[9px] font-sans uppercase tracking-wider font-bold bg-zinc-900 text-[#e0d0ab] border border-zinc-800 rounded-sm">
              {currentQuestion.subject_category || 'CORE DOMAIN'}
            </span>
            {currentQuestion.exam_origin_tag && (
              <span className="px-2.5 py-0.5 text-[9px] font-sans text-zinc-400 border border-zinc-800 rounded-sm">
                {currentQuestion.exam_origin_tag}
              </span>
            )}
          </div>

          {/* Question Stem Typography */}
          <div className="font-serif text-base sm:text-lg leading-relaxed text-white prose prose-invert max-w-none">
            <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
              {currentQuestion.question_text}
            </Markdown>
          </div>

          {/* Options Grid */}
          <div className="space-y-3 pt-2">
            {Object.entries(options).map(([key, val]) => {
              const pending = pendingAnswersMap[currentQuestionId];
              const isSelected = pending === key || userAnswers[currentQuestionId] === key;
              const isOptionCorrect = key === correctOpt;

              let optionStyle = 'bg-zinc-900/40 border-zinc-800 text-stone-200 hover:border-[#0194a8]/60';
              if (isQuestionLocked) {
                if (isOptionCorrect) {
                  optionStyle = 'bg-emerald-950/40 border-emerald-500/80 text-emerald-300';
                } else if (isSelected && !isOptionCorrect) {
                  optionStyle = 'bg-rose-950/40 border-rose-500/80 text-rose-300';
                } else {
                  optionStyle = 'bg-zinc-900/20 border-zinc-900 text-zinc-600 opacity-40';
                }
              } else if (isSelected) {
                optionStyle = 'bg-[#0194a8]/15 border-[#0194a8] text-[#e0d0ab] shadow-sm';
              }

              return (
                <motion.button
                  key={key}
                  whileTap={isQuestionLocked ? undefined : { scale: 0.985 }}
                  onClick={() => handleSelect(key)}
                  disabled={isQuestionLocked}
                  className={`w-full p-4 rounded-sm border text-left flex items-start gap-3 transition-all cursor-pointer ${optionStyle}`}
                >
                  <span className="w-6 h-6 shrink-0 rounded-sm bg-zinc-900 border border-zinc-800 flex items-center justify-center font-mono text-xs font-bold text-[#e0d0ab]">
                    {key}
                  </span>
                  <div className="font-sans text-xs sm:text-sm leading-relaxed flex-1 pt-0.5">
                    <Markdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeSanitize]}
                      components={{ p: ({ node, ...props }: any) => <span {...props} /> }}
                    >
                      {val as string}
                    </Markdown>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* AI Conceptual Insights Flashcard (Revealed after lock or timeout) */}
          <AnimatePresence>
            {hasLockedWithAnswer && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-6 border-t border-zinc-800 space-y-3 overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#e0d0ab]" />
                    <h4 className="font-serif text-sm font-bold tracking-tight text-[#e0d0ab]">
                      Conceptual Synthesis
                    </h4>
                  </div>

                  <button
                    onClick={toggleBookmark}
                    disabled={isBookmarkLoading || isLoadingExplanation}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-sans font-bold uppercase rounded-sm border transition-all cursor-pointer ${
                      isBookmarked
                        ? 'bg-[#e0d0ab]/15 text-[#e0d0ab] border-[#e0d0ab]/40'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-stone-200'
                    }`}
                  >
                    {isBookmarkLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin text-[#0194a8]" />
                    ) : isBookmarked ? (
                      <BookmarkCheck className="w-3 h-3 text-[#e0d0ab]" />
                    ) : (
                      <Bookmark className="w-3 h-3" />
                    )}
                    <span>{isBookmarked ? 'Saved' : 'Save'}</span>
                  </button>
                </div>

                {isLoadingExplanation && !currentExplanation && !currentQuestion.conceptual_explanation ? (
                  <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-sm flex items-center gap-2 text-xs font-sans text-zinc-400">
                    <Loader2 className="w-4 h-4 animate-spin text-[#0194a8]" />
                    <span>Synthesizing conceptual analysis...</span>
                  </div>
                ) : (
                  <div className="p-5 bg-zinc-950/60 border border-zinc-800 rounded-sm">
                    <ConceptInsightRenderer
                      content={currentExplanation}
                      fallbackText={currentQuestion.conceptual_explanation}
                      showBadges={true}
                    />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation & Two-Step Lock Footer */}
          <div className="flex items-center justify-between gap-3 pt-6 border-t border-zinc-800/80">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 border border-zinc-800 text-zinc-300 font-sans text-xs font-medium uppercase rounded-sm transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {!isQuestionLocked ? (
              <button
                onClick={handleLock}
                disabled={!pendingAnswersMap[currentQuestionId]}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#e0d0ab] hover:bg-stone-100 disabled:opacity-40 text-zinc-950 font-sans text-xs font-bold uppercase tracking-wider rounded-sm transition-all shadow-md shadow-[#e0d0ab]/10 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Lock Answer</span>
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-sans text-xs font-bold uppercase tracking-wider rounded-sm transition-all shadow-md shadow-emerald-400/10 cursor-pointer"
              >
                {currentQuestionIndex < questions.length - 1 ? (
                  <>
                    <span>Next Question</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Submit Assessment</span>
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Abandon Confirmation Modal */}
      <Modal
        isOpen={showAbandonModal}
        onClose={() => setShowAbandonModal(false)}
        title="Abandon Active Assessment?"
        subtitle="Unsaved progress will be terminated"
      >
        <div className="space-y-4 font-sans">
          <p className="text-xs text-zinc-400 leading-relaxed">
            Exiting the arena now will reset your active session. This run will not be recorded on the leaderboard.
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowAbandonModal(false)}
              className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-sans text-xs font-medium uppercase rounded-sm transition-all cursor-pointer"
            >
              Resume Test
            </button>
            <button
              onClick={handleConfirmAbandon}
              className="flex-1 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-sans text-xs font-medium uppercase rounded-sm transition-all cursor-pointer"
            >
              Confirm Exit
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[500] px-5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-sm shadow-2xl font-sans text-xs text-stone-200"
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}