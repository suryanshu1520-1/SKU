import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Swords, Target, Clock, Zap, BookOpen, ArrowRight } from 'lucide-react';
import { Modal } from '../shared';
import type { ArenaLaunchConfig } from '../../types';
import type { CachedSession } from './useArenaSession';
import type {
  ActiveResponse,
  AttemptSummary,
  CatalogResponse,
  ExamLaunch,
  PaperCode,
  SectionSubject,
} from '../exam/types';
import { PAPER_SHORT_TITLES, SUBJECT_LABELS } from '../exam/types';
import { examApi } from '../exam/lib/examApi';
import { formatMarks, formatTimeLeft, secondsLeft, serverOffsetMs } from '../exam/lib/clock';

export interface ArenaLobbyProps {
  arenaConfig?: ArenaLaunchConfig | null;
  targetPillar?: { id: string; title: string } | null;
  cachedSessionAvailable: CachedSession | null;
  examTrack: 'upsc' | 'ssc';
  setExamTrack: (track: 'upsc' | 'ssc') => void;
  pacingMode: 'standard' | 'blitz' | 'untimed';
  setPacingMode: (mode: 'standard' | 'blitz' | 'untimed') => void;
  prefersReduced: boolean | null;
  showPreflightModal: boolean;
  setShowPreflightModal: (show: boolean) => void;
  motivation: string;
  isGuest: boolean;
  onOpenExam: (launch: ExamLaunch) => void;
  onRequestLogin?: () => void;
  onClearTargetPillar?: () => void;
  onResumeSavedSession: () => void;
  onDiscardSavedSession: () => void;
  onStartTargetedDrill: () => void;
  onBeginAssessment: () => void;
  onTrainingGround: () => void;
  onReady: () => void;
}

export const ArenaLobby: React.FC<ArenaLobbyProps> = ({
  arenaConfig,
  targetPillar,
  cachedSessionAvailable,
  examTrack,
  setExamTrack,
  pacingMode,
  setPacingMode,
  prefersReduced,
  showPreflightModal,
  setShowPreflightModal,
  motivation,
  isGuest,
  onOpenExam,
  onRequestLogin,
  onClearTargetPillar,
  onResumeSavedSession,
  onDiscardSavedSession,
  onStartTargetedDrill,
  onBeginAssessment,
  onTrainingGround,
  onReady,
}) => {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<ActiveResponse | null>(null);
  const [attempts, setAttempts] = useState<AttemptSummary[] | null>(null);

  const [selectedPaper, setSelectedPaper] = useState<PaperCode>('GS1_FULL');
  const [selectedSubject, setSelectedSubject] = useState<SectionSubject>('Mixed');

  // Fetch catalog, active attempts and attempt history on mount
  useEffect(() => {
    let mounted = true;
    const promises: Promise<unknown>[] = [
      examApi.catalog().then((c) => {
        if (mounted) setCatalog(c);
      }),
    ];

    if (!isGuest) {
      promises.push(
        examApi.active().then((a) => {
          if (mounted) setActiveAttempt(a);
        }),
        examApi.attempts().then((res) => {
          if (mounted) setAttempts(res.attempts);
        })
      );
    }

    Promise.allSettled(promises);
    return () => {
      mounted = false;
    };
  }, [isGuest]);

  // Compute remaining seconds once if an attempt is currently running
  const runningSeconds = useMemo(() => {
    if (!activeAttempt?.active) return 0;
    const offset = serverOffsetMs(activeAttempt.active.serverNow, Date.now());
    return secondsLeft(activeAttempt.active.deadlineAt, Date.now(), offset);
  }, [activeAttempt]);

  return (
    <div className="w-full max-w-4xl mx-auto font-sans flex flex-col items-center justify-center p-4 sm:p-6 min-h-[75vh]">
      {/* Unfinished Session Detected Banner */}
      {cachedSessionAvailable && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mb-6 p-4 rounded-xs bg-[rgba(11,61,120,0.35)] border border-[rgba(19,108,153,0.5)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#0194a8] animate-pulse shrink-0" />
            <div>
              <div className="text-xs font-serif font-bold text-white">
                Unfinished Session Detected &bull; Question{' '}
                {cachedSessionAvailable.currentQuestionIndex + 1} of{' '}
                {cachedSessionAvailable.questions.length}
              </div>
              <div className="text-[11px] text-[#9fb0c8] font-sans">
                You have an active drill in local storage. Would you like to resume?
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={onResumeSavedSession}
              className="px-3.5 py-1.5 bg-[#e0d0ab] hover:bg-white text-[#072e63] font-sans text-xs font-bold uppercase tracking-wider rounded-xs transition-colors shadow-sm cursor-pointer"
            >
              Resume Test &rarr;
            </button>
            <button
              type="button"
              onClick={onDiscardSavedSession}
              className="px-2.5 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-sans text-xs font-medium uppercase rounded-xs transition-colors cursor-pointer"
            >
              Discard
            </button>
          </div>
        </motion.div>
      )}

      {/* If targeted drill active: Show dedicated preflight card */}
      {arenaConfig && arenaConfig.mode !== 'full_mock' ? (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mb-6 p-6 rounded-md bg-[rgba(4,25,54,0.85)] border border-[rgba(224,208,171,0.35)] shadow-2xl backdrop-blur-xl space-y-5 text-left"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-sm bg-[#e0d0ab]/10 border border-[#e0d0ab]/30 text-[#e0d0ab] text-[10px] font-mono font-bold uppercase tracking-wider">
                <Target className="w-3.5 h-3.5" />
                <span>
                  {arenaConfig.mode === 'daily_brief'
                    ? 'Daily Intelligence Drill'
                    : arenaConfig.mode === 'topic_drill'
                    ? 'Topic Mastery Drill'
                    : 'Syllabus Pillar Drill'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#e8e0cf]">
                {arenaConfig.title}
              </h2>
              <p className="text-xs text-[#9fb0c8] font-sans">
                {arenaConfig.subtitle || 'Targeted analytical assessment with zero-trust evaluation.'}
              </p>
            </div>

            {onClearTargetPillar && (
              <button
                type="button"
                onClick={onClearTargetPillar}
                className="self-start text-[11px] font-mono text-[#8fa2bd] hover:text-[#e0d0ab] border border-[rgba(19,108,153,0.35)] bg-[rgba(3,18,42,0.6)] px-2.5 py-1 rounded-sm cursor-pointer transition-colors"
              >
                Comprehensive Mock [×]
              </button>
            )}
          </div>

          {/* Drill Parameters */}
          <div className="grid grid-cols-3 gap-2.5 py-2 border-y border-[rgba(19,108,153,0.3)] text-center text-xs font-sans">
            <div className="p-2.5 rounded-sm bg-[rgba(3,18,42,0.5)] border border-[rgba(19,108,153,0.2)]">
              <span className="text-[10px] uppercase font-mono text-[#8fa2bd] block mb-0.5">MCQ Count</span>
              <span className="font-mono text-base font-bold text-[#e0d0ab]">
                {arenaConfig.questionCount || 10} Questions
              </span>
            </div>
            <div className="p-2.5 rounded-sm bg-[rgba(3,18,42,0.5)] border border-[rgba(19,108,153,0.2)]">
              <span className="text-[10px] uppercase font-mono text-[#8fa2bd] block mb-0.5">Evaluation</span>
              <span className="font-mono text-base font-bold text-emerald-400">+2.00 / -0.66</span>
            </div>
            <div className="p-2.5 rounded-sm bg-[rgba(3,18,42,0.5)] border border-[rgba(19,108,153,0.2)]">
              <span className="text-[10px] uppercase font-mono text-[#8fa2bd] block mb-0.5">Selected Pace</span>
              <span className="font-mono text-base font-bold text-[#0194a8]">
                {pacingMode === 'blitz' ? '20s speed' : pacingMode === 'untimed' ? 'Self-Paced' : '60s Prelims'}
              </span>
            </div>
          </div>

          {/* Pacing Mode Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-mono tracking-wider text-[#0194a8] font-bold block">
              Select Your Test Pacing
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPacingMode('standard')}
                className={`p-2.5 rounded-sm border text-xs font-sans font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  pacingMode === 'standard'
                    ? 'bg-[rgba(224,208,171,0.15)] border-[#e0d0ab] text-[#e0d0ab] shadow-sm'
                    : 'bg-[rgba(3,16,38,0.7)] border-[rgba(19,108,153,0.3)] text-[#8fa2bd] hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Standard (60s)</span>
              </button>
              <button
                type="button"
                onClick={() => setPacingMode('blitz')}
                className={`p-2.5 rounded-sm border text-xs font-sans font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  pacingMode === 'blitz'
                    ? 'bg-[rgba(224,208,171,0.15)] border-[#e0d0ab] text-[#e0d0ab] shadow-sm'
                    : 'bg-[rgba(3,16,38,0.7)] border-[rgba(19,108,153,0.3)] text-[#8fa2bd] hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Speed Blitz (20s)</span>
              </button>
              <button
                type="button"
                onClick={() => setPacingMode('untimed')}
                className={`p-2.5 rounded-sm border text-xs font-sans font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  pacingMode === 'untimed'
                    ? 'bg-[rgba(224,208,171,0.15)] border-[#e0d0ab] text-[#e0d0ab] shadow-sm'
                    : 'bg-[rgba(3,16,38,0.7)] border-[rgba(19,108,153,0.3)] text-[#8fa2bd] hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-[#0194a8]" />
                <span>Untimed Practice</span>
              </button>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={onStartTargetedDrill}
            className="w-full py-3.5 bg-[#e0d0ab] hover:bg-white text-[#072e63] font-sans text-sm font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(224,208,171,0.4)]"
          >
            <Swords className="w-4 h-4" />
            <span>Begin {arenaConfig.title} &rarr;</span>
          </button>
        </motion.div>
      ) : (
        <div className="w-full flex flex-col gap-4">
          {/* Targeted Syllabus Pillar Drill Banner (if active without arenaConfig) */}
          {targetPillar && (
            <div className="w-full p-4 rounded-sm bg-[#e0d0ab]/10 border border-[#e0d0ab]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-sm">
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
                  type="button"
                  onClick={onClearTargetPillar}
                  className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider bg-surface-elevated border border-border hover:border-border text-primary rounded-sm cursor-pointer transition-colors"
                >
                  Comprehensive Mock [×]
                </button>
              )}
            </div>
          )}

          {/* 1. Resume / Finalized Banner */}
          {activeAttempt?.active && (
            <div className="w-full p-3 sm:p-3.5 rounded-lg border border-[rgba(1,148,168,0.45)] bg-[rgba(11,61,120,0.35)] flex flex-wrap items-center justify-between gap-3 text-left">
              <span className="text-[13.5px] text-secondary">
                Your paper is still running ·{' '}
                <b className="text-primary font-mono font-bold">
                  {formatTimeLeft(runningSeconds)}
                </b>{' '}
                left
              </span>
              <button
                type="button"
                onClick={() => onOpenExam({ kind: 'resume' })}
                className="px-3.5 py-1.5 rounded-md border border-[rgba(1,148,168,0.5)] bg-surface text-xs font-sans font-medium text-primary hover:bg-surface-elevated cursor-pointer transition-colors"
              >
                Return to the paper
              </button>
            </div>
          )}

          {!activeAttempt?.active && activeAttempt?.finalized && (
            <div className="w-full p-3 sm:p-3.5 rounded-lg border border-[rgba(1,148,168,0.45)] bg-[rgba(11,61,120,0.35)] flex flex-wrap items-center justify-between gap-3 text-left">
              <span className="text-[13.5px] text-secondary">
                Your last paper was collected when time ran out.
              </span>
              <button
                type="button"
                onClick={() =>
                  onOpenExam({
                    kind: 'result',
                    attemptId: activeAttempt.finalized!.result.attemptId,
                  })
                }
                className="px-3.5 py-1.5 rounded-md border border-[rgba(1,148,168,0.5)] bg-surface text-xs font-sans font-medium text-primary hover:bg-surface-elevated cursor-pointer transition-colors"
              >
                See your result
              </button>
            </div>
          )}

          {/* 2. Exam Hall Card */}
          <section
            aria-labelledby="hall-title"
            className="w-full border border-[rgba(224,208,171,0.28)] bg-gradient-to-b from-[#0a2148] to-[#071630] rounded-[14px] p-6 sm:p-7 grid gap-4 text-left shadow-[0_12px_48px_rgba(0,0,0,0.4)]"
          >
            <div className="text-xs text-muted flex items-center">
              <span className="inline-flex gap-1.5 mr-2.5 items-center" aria-hidden="true">
                <i className="w-3.5 h-3.5 rounded-full border border-[rgba(224,208,171,0.55)] inline-block" />
                <i className="w-3.5 h-3.5 rounded-full border border-[var(--gold,#e0d0ab)] bg-[var(--gold,#e0d0ab)] inline-block" />
                <i className="w-3.5 h-3.5 rounded-full border border-[rgba(224,208,171,0.55)] inline-block" />
                <i className="w-3.5 h-3.5 rounded-full border border-[rgba(224,208,171,0.55)] inline-block" />
              </span>
              UPSC CSE Prelims · GS Paper I
            </div>

            <h2
              id="hall-title"
              className="m-0 font-serif font-semibold text-[26px] sm:text-[28px] leading-[1.15] text-[#f4ecd8]"
            >
              Sit the paper the way UPSC sets it
            </h2>

            <p className="m-0 text-secondary text-[14.5px] sm:text-[15px] max-w-[62ch] leading-relaxed">
              One clock for the whole paper. Read in the booklet, bubble on the answer sheet, lose 0.66 for every wrong answer. Results only after you hand in.
            </p>

            <div
              className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
              role="radiogroup"
              aria-label="Choose a paper"
            >
              <button
                type="button"
                role="radio"
                aria-checked={selectedPaper === 'GS1_FULL'}
                onClick={() => setSelectedPaper('GS1_FULL')}
                className={`p-3 sm:p-3.5 rounded-[10px] text-left grid gap-1 border transition-all cursor-pointer ${
                  selectedPaper === 'GS1_FULL'
                    ? 'border-[var(--gold,#e0d0ab)] shadow-[inset_0_0_0_1px_var(--gold,#e0d0ab)] bg-[#041228]/80'
                    : 'border-border bg-[#041228]/40 hover:border-border/80'
                }`}
              >
                <b className="text-[15px] font-sans font-bold text-primary">Full paper</b>
                <small className="text-muted font-mono text-[12px]">100 questions · 2 hours</small>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={selectedPaper === 'GS1_HALF'}
                onClick={() => setSelectedPaper('GS1_HALF')}
                className={`p-3 sm:p-3.5 rounded-[10px] text-left grid gap-1 border transition-all cursor-pointer ${
                  selectedPaper === 'GS1_HALF'
                    ? 'border-[var(--gold,#e0d0ab)] shadow-[inset_0_0_0_1px_var(--gold,#e0d0ab)] bg-[#041228]/80'
                    : 'border-border bg-[#041228]/40 hover:border-border/80'
                }`}
              >
                <b className="text-[15px] font-sans font-bold text-primary">Half paper</b>
                <small className="text-muted font-mono text-[12px]">50 questions · 1 hour</small>
              </button>

              <div
                role="radio"
                tabIndex={-1}
                aria-checked={selectedPaper === 'GS1_SECTION'}
                onClick={() => setSelectedPaper('GS1_SECTION')}
                className={`p-3 sm:p-3.5 rounded-[10px] text-left grid gap-1 border transition-all cursor-pointer ${
                  selectedPaper === 'GS1_SECTION'
                    ? 'border-[var(--gold,#e0d0ab)] shadow-[inset_0_0_0_1px_var(--gold,#e0d0ab)] bg-[#041228]/80'
                    : 'border-border bg-[#041228]/40 hover:border-border/80'
                }`}
              >
                <b className="text-[15px] font-sans font-bold text-primary">Sectional</b>
                <small className="text-muted font-mono text-[12px]">25 questions · 30 minutes</small>
                <label htmlFor="exam-section-subject" className="sr-only">
                  Sectional subject
                </label>
                <select
                  id="exam-section-subject"
                  value={selectedSubject}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    setSelectedSubject(e.target.value as SectionSubject);
                    setSelectedPaper('GS1_SECTION');
                  }}
                  className="mt-1.5 px-2 py-1 bg-surface text-primary border border-border rounded-md text-xs font-sans cursor-pointer focus:outline-none focus:border-[var(--gold,#e0d0ab)]"
                >
                  <option value="Mixed">Mixed</option>
                  {(catalog?.sectionSubjects ?? [])
                    .filter((s) => s.subject !== 'Mixed')
                    .map((s) => (
                      <option key={s.subject} value={s.subject}>
                        {SUBJECT_LABELS[s.subject] ?? s.subject}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 items-center pt-1">
              {isGuest ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onRequestLogin?.()}
                    className="px-5 py-2.5 rounded-md bg-[var(--gold,#e0d0ab)] text-[#041228] font-sans font-bold text-sm hover:opacity-90 cursor-pointer shadow-sm transition-all"
                  >
                    Sign in to sit a paper
                  </button>
                  <span className="text-xs text-secondary">
                    Your answer sheet is saved to your account, so a closed tab never costs you the paper.
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    onOpenExam({
                      kind: 'new',
                      paperCode: selectedPaper,
                      subject: selectedPaper === 'GS1_SECTION' ? selectedSubject : undefined,
                    })
                  }
                  className="px-5 py-2.5 rounded-md bg-[var(--gold,#e0d0ab)] text-[#041228] font-sans font-bold text-sm hover:opacity-90 cursor-pointer shadow-sm transition-all"
                >
                  Go to the exam hall
                </button>
              )}
              <span className="text-[12.5px] text-muted">
                Real UPSC GS-I questions, 2011–2023 · scored on our server · your sheet saves as you write
              </span>
            </div>
          </section>

          {/* 3. Your Papers */}
          {!isGuest && attempts !== null && (
            <section className="grid gap-2 w-full text-left" aria-labelledby="yours-title">
              <h3 id="yours-title" className="m-0 text-sm font-semibold text-primary">
                Your papers
              </h3>
              {attempts.length === 0 ? (
                <p className="text-xs text-secondary m-0">
                  No papers yet. Your first full paper sets your baseline.
                </p>
              ) : (
                <ul className="list-none m-0 p-0 border border-border/60 rounded-lg divide-y divide-border/40 overflow-hidden bg-[#041228]/30">
                  {attempts.slice(0, 5).map((a) => {
                    const dateStr = new Date(a.submittedAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    });
                    const title = PAPER_SHORT_TITLES[a.paperCode] ?? a.paperCode;
                    const subj =
                      a.subject && a.subject !== 'Mixed'
                        ? ` · ${SUBJECT_LABELS[a.subject] ?? a.subject}`
                        : '';
                    const maxMarks = a.questionCount * 2;

                    return (
                      <li
                        key={a.attemptId}
                        className="flex items-center gap-3 px-3.5 py-2.5 text-[13.5px] text-secondary"
                      >
                        <span>
                          {dateStr} · {title}
                          {subj}
                        </span>
                        <b className="ml-auto font-mono text-primary font-medium">
                          {formatMarks(a.netHundredths)} / {maxMarks}
                        </b>
                        <button
                          type="button"
                          onClick={() => onOpenExam({ kind: 'result', attemptId: a.attemptId })}
                          className="text-xs text-[var(--gold,#e0d0ab)] hover:underline cursor-pointer ml-1"
                        >
                          View
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          {/* 4. Quick Practice */}
          <section className="grid gap-2.5 w-full text-left" aria-labelledby="quick-title">
            <h3 id="quick-title" className="m-0 text-sm font-semibold text-primary">
              Quick practice
            </h3>
            <div
              className="inline-flex border border-border rounded-md overflow-hidden w-max"
              role="group"
              aria-label="Exam track"
            >
              <button
                type="button"
                aria-pressed={examTrack === 'upsc'}
                onClick={() => setExamTrack('upsc')}
                className={`px-3 py-1 text-xs font-sans transition-colors cursor-pointer ${
                  examTrack === 'upsc'
                    ? 'bg-[var(--gold,#e0d0ab)] text-[#072e63] font-bold'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                UPSC CSE
              </button>
              <button
                type="button"
                aria-pressed={examTrack === 'ssc'}
                onClick={() => setExamTrack('ssc')}
                className={`px-3 py-1 text-xs font-sans transition-colors cursor-pointer ${
                  examTrack === 'ssc'
                    ? 'bg-[var(--gold,#e0d0ab)] text-[#072e63] font-bold'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                SSC CGL
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onBeginAssessment}
                className="border border-border/60 hover:border-[rgba(224,208,171,0.4)] rounded-[10px] p-3 sm:p-3.5 grid gap-1 bg-[#041228]/40 hover:bg-[#041228]/70 text-left transition-all cursor-pointer"
              >
                <b className="text-sm font-sans font-bold text-primary">Timed drill · ranked</b>
                <small className="text-muted text-[12.5px] font-sans">
                  25 mixed questions ·{' '}
                  {pacingMode === 'blitz'
                    ? '20 s each'
                    : pacingMode === 'untimed'
                    ? 'untimed'
                    : '60 s each'}{' '}
                  · answer shown after each question
                </small>
              </button>

              <button
                type="button"
                onClick={onTrainingGround}
                className="border border-border/60 hover:border-[rgba(224,208,171,0.4)] rounded-[10px] p-3 sm:p-3.5 grid gap-1 bg-[#041228]/40 hover:bg-[#041228]/70 text-left transition-all cursor-pointer"
              >
                <b className="text-sm font-sans font-bold text-primary">Training ground</b>
                <small className="text-muted text-[12.5px] font-sans">
                  Pick subjects · 25, 35 or 50 questions · untimed
                </small>
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Pre-Flight Checklist Modal */}
      <Modal
        isOpen={showPreflightModal}
        onClose={() => setShowPreflightModal(false)}
        title="Before You Begin"
        subtitle="Timed ranked test"
      >
        <div className="space-y-5 font-sans">
          <div className="p-4 bg-surface-elevated/70 border border-border rounded-sm space-y-2">
            <h4 className="font-serif text-xs font-bold text-[#e0d0ab]">
              Focus Rule
            </h4>
            <p className="text-sm font-serif italic text-primary leading-relaxed">
              "{motivation}"
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-sans">
            <div className="p-3 bg-surface-elevated/40 border border-border rounded-sm">
              <span className="text-[10px] text-muted uppercase block mb-0.5 font-medium">Length</span>
              <span className="font-bold text-primary"><span className="font-mono">25</span> Questions</span>
            </div>
            <div className="p-3 bg-surface-elevated/40 border border-border rounded-sm">
              <span className="text-[10px] text-muted uppercase block mb-0.5 font-medium">Pacing</span>
              <span className="font-bold text-primary">
                <span className="font-mono">
                  {pacingMode === 'blitz' ? '20s per question' : pacingMode === 'untimed' ? 'Untimed' : '60s per question'}
                </span>
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowPreflightModal(false)}
              className="flex-1 py-2.5 bg-surface-elevated hover:bg-surface-elevated border border-border text-secondary font-sans text-xs font-medium uppercase rounded-sm transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={onReady}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-[#e0d0ab] hover:bg-primary text-surface font-sans text-xs font-bold uppercase rounded-sm transition-all shadow-md shadow-[#e0d0ab]/10 cursor-pointer"
            >
              <span>Enter Arena</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
