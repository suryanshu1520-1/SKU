import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Loader2,
  Sparkles,
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react';
import { Modal, ConceptInsightRenderer } from './shared';
import type { CandidatePreferences, ArenaLaunchConfig } from '../types';
import { useArenaSession } from './arena/useArenaSession';
import { ArenaLobby } from './arena/ArenaLobby';
import { TrainingSetup } from './arena/TrainingSetup';
import { QuestionHeader } from './arena/QuestionHeader';
import { QuestionPalette } from './arena/QuestionPalette';
import { QuestionBody } from './arena/QuestionBody';
import { AnswerOption } from './arena/AnswerOption';
import { ReviewControls } from './arena/ReviewControls';
import type { ExamLaunch } from './exam/types';

const ExamHall = React.lazy(() => import('./exam/ExamHall'));

export interface ArenaProps {
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
  candidateName?: string | null;
  onRequestLogin?: () => void;
  targetPillar?: { id: string; title: string } | null;
  arenaConfig?: ArenaLaunchConfig | null;
  candidatePreferences?: CandidatePreferences;
  onClearTargetPillar?: () => void;
  onReturnToDashboard?: (originTab?: string) => void;
  onNavigateManifesto?: () => void;
  onTestStatusChange?: (isActive: boolean, kind?: 'drill' | 'exam') => void;
}

export default function Arena({
  onComplete,
  userId,
  candidateName,
  onRequestLogin,
  targetPillar,
  arenaConfig,
  candidatePreferences,
  onClearTargetPillar,
  onReturnToDashboard,
  onNavigateManifesto,
  onTestStatusChange,
}: ArenaProps) {
  const session = useArenaSession({
    onComplete,
    userId,
    targetPillar,
    arenaConfig,
    candidatePreferences,
    onClearTargetPillar,
    onReturnToDashboard,
    onNavigateManifesto,
    onTestStatusChange,
  });

  const prefersReduced = useReducedMotion();

  const [examLaunch, setExamLaunch] = React.useState<ExamLaunch | null>(null);
  const [examKey, setExamKey] = React.useState(0);

  if (examLaunch) {
    return (
      <React.Suspense fallback={<div className="min-h-[50vh] grid place-items-center text-sm text-muted">Opening the exam hall…</div>}>
        <ExamHall
          key={examKey}
          launch={examLaunch}
          userId={userId}
          candidateName={candidateName ?? null}
          onExit={() => setExamLaunch(null)}
          onSittingChange={(active) => onTestStatusChange?.(active, 'exam')}
          onStartPaper={(paperCode, subject) => {
            setExamLaunch({ kind: 'new', paperCode, subject });
            setExamKey((k) => k + 1);
          }}
        />
      </React.Suspense>
    );
  }

  // 1. RENDER: INTRO LOBBY
  if (session.arenaPhase === 'intro' && !session.showTrainingSetup) {
    return (
      <ArenaLobby
        arenaConfig={arenaConfig}
        targetPillar={targetPillar}
        cachedSessionAvailable={session.cachedSessionAvailable}
        examTrack={session.examTrack}
        setExamTrack={session.setExamTrack}
        pacingMode={session.pacingMode}
        setPacingMode={session.setPacingMode}
        prefersReduced={prefersReduced}
        showPreflightModal={session.showPreflightModal}
        setShowPreflightModal={session.setShowPreflightModal}
        motivation={session.motivation}
        isGuest={userId === 'guest'}
        onOpenExam={(launch) => {
          setExamLaunch(launch);
          setExamKey((k) => k + 1);
        }}
        onRequestLogin={onRequestLogin}
        onClearTargetPillar={onClearTargetPillar}
        onResumeSavedSession={session.handleResumeSavedSession}
        onDiscardSavedSession={session.handleDiscardSavedSession}
        onStartTargetedDrill={session.handleStartTargetedDrill}
        onBeginAssessment={session.handleBeginAssessment}
        onTrainingGround={session.handleTrainingGround}
        onReady={session.handleReady}
      />
    );
  }

  // 2. RENDER: TRAINING GROUND SETUP
  if (session.showTrainingSetup) {
    return (
      <TrainingSetup
        candidatePreferences={candidatePreferences}
        allSubjects={session.allSubjects}
        selectedSubjects={session.selectedSubjects}
        toggleSubject={session.toggleSubject}
        setSelectedSubjects={session.setSelectedSubjects}
        trainingLength={session.trainingLength}
        setTrainingLength={session.setTrainingLength}
        onBack={() => {
          session.setShowTrainingSetup(false);
          session.setArenaPhase('intro');
        }}
        onLaunch={session.startTraining}
      />
    );
  }

  // 3. RENDER: LOADING / ERROR
  if (session.isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-muted font-sans text-xs gap-3">
        <Loader2 className="w-6 h-6 text-[#0194a8] animate-spin" />
        <span>Initializing examination state...</span>
      </div>
    );
  }

  if (session.errorMsg) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center font-sans">
        <AlertTriangle className="w-10 h-10 text-rose-400 mb-3" />
        <p className="text-sm font-sans text-rose-400 font-bold">{session.errorMsg}</p>
        <button
          onClick={() => {
            session.setErrorMsg('');
            session.setArenaPhase('intro');
          }}
          className="mt-4 px-4 py-2 bg-surface-elevated border border-border text-[#e0d0ab] font-sans text-xs uppercase rounded-sm cursor-pointer hover:bg-surface-elevated transition-colors"
        >
          Return to Selection
        </button>
      </div>
    );
  }

  if (!session.currentQuestion) return null;

  const currentQ = session.currentQuestion;
  const currentQId = session.currentQuestionId!;
  const options: Record<string, string> = (() => {
    try {
      if (typeof currentQ.options_matrix === 'string') return JSON.parse(currentQ.options_matrix);
      return currentQ.options_matrix || {};
    } catch {
      return {};
    }
  })();

  const correctOpt = session.revealedAnswers[currentQId]?.trim();
  const hasUserAnswered = session.userAnswers[currentQId] !== undefined;
  const isTimeout = !!session.timeouts[currentQId];
  const isQuestionLocked = !!session.lockedMap[currentQId] || isTimeout || session.quizSubmitted;
  const hasLockedWithAnswer = isQuestionLocked && (hasUserAnswered || !!session.pendingAnswersMap[currentQId] || isTimeout);

  const currentExplanation = session.explanationCache[currentQId] || currentQ.ai_insights;
  const isLoadingExplanation = !!session.loadingExplanationMap[currentQId];
  const isBookmarked = session.savedInsightIds.has(String(currentQId));
  const isBookmarkLoading = !!session.bookmarkToggling[String(currentQId)];

  const timeLeft = session.timeLeftMap[currentQId] !== undefined ? session.timeLeftMap[currentQId] : session.defaultTimeForQuestion;
  const timeSpent = session.timeSpentMap[currentQId] || 0;

  return (
    <div className="w-full max-w-3xl mx-auto font-sans p-4 sm:p-6 pb-24 text-primary">
      {/* Resume Overlay */}
      <AnimatePresence>
        {session.showResumeOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-md flex items-center justify-center font-sans"
          >
            <div className="text-center space-y-3">
              <h2 className="font-serif text-2xl font-bold text-[#e0d0ab]">Resuming Assessment</h2>
              <p className="text-6xl font-mono font-bold text-white">{session.resumeCountdown}</p>
              <p className="text-xs font-sans uppercase tracking-widest text-secondary">
                Restoring active session state...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Protocol Header & Timer Bar */}
      <QuestionHeader
        isRanked={session.isRanked}
        arenaConfig={arenaConfig}
        targetPillar={targetPillar}
        currentQuestionIndex={session.currentQuestionIndex}
        totalQuestions={session.questions.length}
        pacingMode={session.pacingMode}
        isQuestionLocked={isQuestionLocked}
        isTimeout={isTimeout}
        timeLeft={timeLeft}
        defaultTimeForQuestion={session.defaultTimeForQuestion}
        timeSpent={timeSpent}
        onAbandon={() => session.setShowAbandonModal(true)}
      />

      {/* Segmented Question Navigator Palette */}
      <QuestionPalette
        questions={session.questions}
        currentQuestionIndex={session.currentQuestionIndex}
        userAnswers={session.userAnswers}
        lockedMap={session.lockedMap}
        timeouts={session.timeouts}
        revealedAnswers={session.revealedAnswers}
        markedForReviewMap={session.markedForReviewMap}
        onSelectIndex={(idx) => session.setCurrentQuestionIndex(idx)}
      />

      {/* Main Question Card with Animated Transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQId}
          initial={prefersReduced ? undefined : { opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={prefersReduced ? undefined : { opacity: 0, x: -8 }}
          transition={{ duration: 0.25 }}
          className="p-6 sm:p-8 bg-surface-elevated/30 border border-border rounded-sm space-y-6 backdrop-blur-sm min-h-[60vh] flex flex-col justify-between"
        >
          <div className="space-y-6 flex-1">
            {/* Question Metadata & Stem */}
            <QuestionBody
              subjectCategory={currentQ.subject_category}
              examOriginTag={currentQ.exam_origin_tag}
              questionText={currentQ.question_text}
            />

            {/* Options Grid */}
            <div className="space-y-3 pt-2">
              {Object.entries(options).map(([key, val]) => {
                const pending = session.pendingAnswersMap[currentQId];
                const isSelected = pending === key || session.userAnswers[currentQId] === key;
                const isOptionCorrect = key === correctOpt;

                return (
                  <AnswerOption
                    key={key}
                    optionKey={key}
                    optionVal={val}
                    isSelected={isSelected}
                    isQuestionLocked={isQuestionLocked}
                    isOptionCorrect={isOptionCorrect}
                    onSelect={session.handleSelect}
                  />
                );
              })}
            </div>
          </div>

          {/* AI Conceptual Insights Flashcard */}
          <AnimatePresence>
            {hasLockedWithAnswer && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-6 border-t border-border space-y-3 overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#e0d0ab]" />
                    <h4 className="font-serif text-sm font-bold tracking-tight text-[#e0d0ab]">
                      Conceptual Synthesis
                    </h4>
                  </div>

                  <button
                    onClick={session.toggleBookmark}
                    disabled={isBookmarkLoading || isLoadingExplanation}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-sans font-bold uppercase rounded-sm border transition-all cursor-pointer ${
                      isBookmarked
                        ? 'bg-[#e0d0ab]/15 text-[#e0d0ab] border-[#e0d0ab]/40'
                        : 'bg-surface-elevated text-secondary border-border hover:text-primary'
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

                {isLoadingExplanation && !currentExplanation && !currentQ.conceptual_explanation ? (
                  <div className="p-4 bg-surface/60 border border-border rounded-sm flex items-center gap-2 text-xs font-sans text-secondary">
                    <Loader2 className="w-4 h-4 animate-spin text-[#0194a8]" />
                    <span>Synthesizing conceptual analysis...</span>
                  </div>
                ) : (
                  <div className="p-5 bg-surface/60 border border-border rounded-sm">
                    <ConceptInsightRenderer
                      content={currentExplanation}
                      fallbackText={currentQ.conceptual_explanation}
                      showBadges={true}
                    />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation & Two-Step Lock Footer */}
          <ReviewControls
            currentQuestionIndex={session.currentQuestionIndex}
            totalQuestions={session.questions.length}
            isQuestionLocked={isQuestionLocked}
            hasPendingAnswer={!!session.pendingAnswersMap[currentQId]}
            isMarkedForReview={!!session.markedForReviewMap[currentQId]}
            onToggleMarkForReview={() => session.toggleMarkForReview(currentQId)}
            onSkip={session.handleSkip}
            onPrevious={session.handlePrevious}
            onLock={session.handleLock}
            onNext={session.handleNext}
          />
        </motion.div>
      </AnimatePresence>

      {/* Abandon Confirmation Modal */}
      <Modal
        isOpen={session.showAbandonModal}
        onClose={() => session.setShowAbandonModal(false)}
        title="Abandon Active Assessment?"
        subtitle="Unsaved progress will be terminated"
      >
        <div className="space-y-4 font-sans">
          <p className="text-xs text-secondary leading-relaxed">
            Exiting the arena now will reset your active session. This run will not be recorded on the leaderboard.
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => session.setShowAbandonModal(false)}
              className="flex-1 py-2.5 bg-surface-elevated hover:bg-surface-elevated border border-border text-primary font-sans text-xs font-medium uppercase rounded-sm transition-all cursor-pointer"
            >
              Resume Test
            </button>
            <button
              onClick={session.handleConfirmAbandon}
              className="flex-1 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-sans text-xs font-medium uppercase rounded-sm transition-all cursor-pointer"
            >
              Confirm Exit
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification */}
      <AnimatePresence>
        {session.toastMsg && (
          <motion.div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[500] px-5 py-2.5 bg-surface-elevated border border-border rounded-sm shadow-2xl font-sans text-xs text-primary"
          >
            {session.toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}