import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Swords,
  Target,
  Clock,
  Zap,
  BookOpen,
  ArrowRight,
  ChevronDown,
  ShieldCheck,
  Timer,
  FileText,
} from 'lucide-react';
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
            className="w-full relative border border-[rgba(224,208,171,0.25)] bg-gradient-to-b from-[#0a234d] via-[#071936] to-[#041228] rounded-2xl p-6 sm:p-8 grid gap-5 text-left shadow-[0_16px_48px_rgba(0,0,0,0.45)] overflow-hidden"
          >
            {/* Top accent line */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--gold,#e0d0ab)]/40 to-transparent" />

            {/* Header: OMR Eyebrow & Arena badge */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(224,208,171,0.08)] border border-[rgba(224,208,171,0.2)] text-[11px] font-mono tracking-wider text-[var(--gold,#e0d0ab)]">
                <span className="flex items-center gap-1 font-mono text-[9px] font-bold text-muted/70" aria-hidden="true">
                  <span className="w-3.5 h-3.5 rounded-full border border-current grid place-items-center">A</span>
                  <span className="w-3.5 h-3.5 rounded-full bg-[var(--gold,#e0d0ab)] text-[#041228] font-bold grid place-items-center">B</span>
                  <span className="w-3.5 h-3.5 rounded-full border border-current grid place-items-center">C</span>
                  <span className="w-3.5 h-3.5 rounded-full border border-current grid place-items-center">D</span>
                </span>
                <span className="text-muted/40">|</span>
                <span className="font-semibold uppercase tracking-wider">UPSC CSE Prelims · GS Paper I</span>
              </div>
              <span className="text-[11px] font-mono text-[#8fa2bd] uppercase tracking-wider hidden sm:inline-block">
                Simulation Hall
              </span>
            </div>

            <div>
              <h2
                id="hall-title"
                className="m-0 font-serif font-semibold text-[26px] sm:text-[30px] leading-[1.2] text-[#f4ecd8] tracking-tight"
              >
                Sit the paper the way UPSC sets it
              </h2>
              <p className="mt-2 text-secondary text-[14px] sm:text-[15px] max-w-[64ch] leading-relaxed">
                One clock for the whole paper. Read in the booklet, bubble on the answer sheet, lose 0.66 for every wrong answer. Results only after you hand in.
              </p>
            </div>

            {/* Paper Selection Cards */}
            <div
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
              role="radiogroup"
              aria-label="Choose a paper"
            >
              {/* Full Paper */}
              <button
                type="button"
                role="radio"
                aria-checked={selectedPaper === 'GS1_FULL'}
                onClick={() => setSelectedPaper('GS1_FULL')}
                className={`p-4 rounded-xl text-left flex flex-col justify-between border transition-all cursor-pointer ${
                  selectedPaper === 'GS1_FULL'
                    ? 'border-[var(--gold,#e0d0ab)] bg-[rgba(224,208,171,0.08)] shadow-[0_0_0_1px_rgba(224,208,171,0.4),0_8px_20px_rgba(0,0,0,0.3)]'
                    : 'border-[rgba(19,108,153,0.3)] bg-[#031228]/50 hover:border-[rgba(224,208,171,0.3)] hover:bg-[#031228]/80'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <b className="text-[15px] font-sans font-bold text-primary">Full paper</b>
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                      selectedPaper === 'GS1_FULL'
                        ? 'border-[var(--gold,#e0d0ab)] bg-[var(--gold,#e0d0ab)]'
                        : 'border-[rgba(19,108,153,0.5)] bg-transparent'
                    }`}
                  >
                    {selectedPaper === 'GS1_FULL' && <span className="w-1.5 h-1.5 rounded-full bg-[#041228]" />}
                  </span>
                </div>
                <small className="text-[#8fa2bd] font-mono text-xs mt-2 block">
                  100 questions · 2 hours
                </small>
              </button>

              {/* Half Paper */}
              <button
                type="button"
                role="radio"
                aria-checked={selectedPaper === 'GS1_HALF'}
                onClick={() => setSelectedPaper('GS1_HALF')}
                className={`p-4 rounded-xl text-left flex flex-col justify-between border transition-all cursor-pointer ${
                  selectedPaper === 'GS1_HALF'
                    ? 'border-[var(--gold,#e0d0ab)] bg-[rgba(224,208,171,0.08)] shadow-[0_0_0_1px_rgba(224,208,171,0.4),0_8px_20px_rgba(0,0,0,0.3)]'
                    : 'border-[rgba(19,108,153,0.3)] bg-[#031228]/50 hover:border-[rgba(224,208,171,0.3)] hover:bg-[#031228]/80'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <b className="text-[15px] font-sans font-bold text-primary">Half paper</b>
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                      selectedPaper === 'GS1_HALF'
                        ? 'border-[var(--gold,#e0d0ab)] bg-[var(--gold,#e0d0ab)]'
                        : 'border-[rgba(19,108,153,0.5)] bg-transparent'
                    }`}
                  >
                    {selectedPaper === 'GS1_HALF' && <span className="w-1.5 h-1.5 rounded-full bg-[#041228]" />}
                  </span>
                </div>
                <small className="text-[#8fa2bd] font-mono text-xs mt-2 block">
                  50 questions · 1 hour
                </small>
              </button>

              {/* Sectional */}
              <button
                type="button"
                role="radio"
                aria-checked={selectedPaper === 'GS1_SECTION'}
                onClick={() => setSelectedPaper('GS1_SECTION')}
                className={`p-4 rounded-xl text-left flex flex-col justify-between border transition-all cursor-pointer ${
                  selectedPaper === 'GS1_SECTION'
                    ? 'border-[var(--gold,#e0d0ab)] bg-[rgba(224,208,171,0.08)] shadow-[0_0_0_1px_rgba(224,208,171,0.4),0_8px_20px_rgba(0,0,0,0.3)]'
                    : 'border-[rgba(19,108,153,0.3)] bg-[#031228]/50 hover:border-[rgba(224,208,171,0.3)] hover:bg-[#031228]/80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between w-full">
                    <b className="text-[15px] font-sans font-bold text-primary">Sectional</b>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                        selectedPaper === 'GS1_SECTION'
                          ? 'border-[var(--gold,#e0d0ab)] bg-[var(--gold,#e0d0ab)]'
                          : 'border-[rgba(19,108,153,0.5)] bg-transparent'
                      }`}
                    >
                      {selectedPaper === 'GS1_SECTION' && <span className="w-1.5 h-1.5 rounded-full bg-[#041228]" />}
                    </span>
                  </div>
                  <small className="text-[#8fa2bd] font-mono text-xs mt-2 block">
                    25 questions · 30 minutes
                  </small>
                </div>

                {/* Sleek subject selector revealed ONLY when Sectional is active */}
                {selectedPaper === 'GS1_SECTION' && (
                  <div
                    className="mt-3 pt-2.5 border-t border-[rgba(224,208,171,0.2)] w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="exam-section-subject" className="text-[10px] uppercase font-mono tracking-wider text-[var(--gold,#e0d0ab)] font-bold">
                        Subject
                      </label>
                      <span className="text-[10px] font-mono text-muted">
                        {selectedSubject === 'Mixed' ? 'All GS' : (catalog?.sectionSubjects?.find(s => s.subject === selectedSubject)?.available ?? '') + ' Qs'}
                      </span>
                    </div>
                    <div className="relative w-full">
                      <select
                        id="exam-section-subject"
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value as SectionSubject)}
                        className="w-full pl-2.5 pr-7 py-1 bg-[#031228] text-primary border border-[rgba(224,208,171,0.35)] rounded-md text-xs font-sans cursor-pointer focus:outline-none focus:border-[var(--gold,#e0d0ab)] focus:ring-1 focus:ring-[var(--gold,#e0d0ab)] transition-colors appearance-none"
                      >
                        <option value="Mixed">Mixed (All Subjects)</option>
                        {(catalog?.sectionSubjects ?? [])
                          .filter((s) => s.subject !== 'Mixed')
                          .map((s) => (
                            <option key={s.subject} value={s.subject}>
                              {SUBJECT_LABELS[s.subject] ?? s.subject} ({s.available})
                            </option>
                          ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-[var(--gold,#e0d0ab)] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                )}
              </button>
            </div>

            {/* Action Bar & Trust Badges */}
            <div className="space-y-4 pt-1">
              <div className="flex flex-wrap items-center gap-3">
                {isGuest ? (
                  <button
                    type="button"
                    onClick={() => onRequestLogin?.()}
                    className="px-6 py-2.5 rounded-lg bg-[var(--gold,#e0d0ab)] hover:bg-[#ebdcc0] text-[#041228] font-sans font-bold text-sm hover:opacity-95 cursor-pointer shadow-[0_4px_16px_rgba(224,208,171,0.25)] transition-all flex items-center gap-2 group"
                  >
                    <span>Sign in to sit a paper</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
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
                    className="px-6 py-2.5 rounded-lg bg-[var(--gold,#e0d0ab)] hover:bg-[#ebdcc0] text-[#041228] font-sans font-bold text-sm hover:opacity-95 cursor-pointer shadow-[0_4px_16px_rgba(224,208,171,0.25)] transition-all flex items-center gap-2 group"
                  >
                    <span>Go to the exam hall</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                )}
                {isGuest && (
                  <span className="text-xs text-secondary">
                    Your answer sheet is saved to your account, so a closed tab never costs you the paper.
                  </span>
                )}
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#8fa2bd] pt-3 border-t border-[rgba(19,108,153,0.25)]">
                <span className="flex items-center gap-1.5 font-sans">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Real UPSC GS-I (2011–2023)</span>
                </span>
                <span className="flex items-center gap-1.5 font-sans">
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Zero-Trust Server Grading</span>
                </span>
                <span className="flex items-center gap-1.5 font-sans">
                  <Clock className="w-3.5 h-3.5 text-[#0194a8] shrink-0" />
                  <span>Continuous Cloud Autosave</span>
                </span>
              </div>
            </div>
          </section>

          {/* 3. Your Papers */}
          {!isGuest && attempts !== null && (
            <section className="w-full text-left rounded-xl border border-[rgba(19,108,153,0.25)] bg-[#041228]/50 p-4 space-y-3" aria-labelledby="yours-title">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[var(--gold,#e0d0ab)]" />
                  <h3 id="yours-title" className="m-0 text-sm font-semibold text-primary">
                    Your Paper History
                  </h3>
                </div>
                {attempts.length > 0 && (
                  <span className="text-xs font-mono text-muted">
                    {attempts.length} {attempts.length === 1 ? 'attempt' : 'attempts'} recorded
                  </span>
                )}
              </div>

              {attempts.length === 0 ? (
                <p className="text-xs text-secondary m-0 py-2">
                  No papers yet. Your first full paper sets your baseline and ranking.
                </p>
              ) : (
                <ul className="list-none m-0 p-0 border border-border/50 rounded-lg divide-y divide-border/30 overflow-hidden bg-[#031126]/60">
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
                        className="flex items-center gap-3 px-3.5 py-2.5 text-[13.5px] text-secondary hover:bg-surface-elevated/30 transition-colors"
                      >
                        <span className="truncate">
                          {dateStr} · {title}
                          {subj}
                        </span>
                        <b className="ml-auto font-mono text-primary font-medium shrink-0">
                          {formatMarks(a.netHundredths)} / {maxMarks}
                        </b>
                        <button
                          type="button"
                          onClick={() => onOpenExam({ kind: 'result', attemptId: a.attemptId })}
                          className="text-xs text-[var(--gold,#e0d0ab)] hover:underline cursor-pointer ml-1 shrink-0"
                        >
                          View scorecard &rarr;
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          {/* 4. Quick Practice & Targeted Drills */}
          <section className="grid gap-3.5 w-full text-left" aria-labelledby="quick-title">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[rgba(19,108,153,0.2)]">
              <div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[var(--gold,#e0d0ab)]" />
                  <h3 id="quick-title" className="m-0 text-sm font-semibold text-primary">
                    Quick Practice & Targeted Drills
                  </h3>
                </div>
                <p className="m-0 text-xs text-muted mt-0.5">
                  High-speed analytical MCQ practice with instant solutions after every question.
                </p>
              </div>

              {/* Unified Track Toggle */}
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <span className="text-[11px] font-mono text-[#8fa2bd] uppercase tracking-wider hidden sm:inline">
                  Track:
                </span>
                <div
                  className="inline-flex p-0.5 bg-[#031228] border border-[rgba(19,108,153,0.35)] rounded-lg overflow-hidden"
                  role="group"
                  aria-label="Exam track"
                >
                  <button
                    type="button"
                    aria-pressed={examTrack === 'upsc'}
                    onClick={() => setExamTrack('upsc')}
                    className={`px-3 py-1 text-xs font-sans rounded-md transition-all cursor-pointer font-semibold ${
                      examTrack === 'upsc'
                        ? 'bg-[var(--gold,#e0d0ab)] text-[#041228] shadow-sm'
                        : 'text-[#8fa2bd] hover:text-primary hover:bg-surface-elevated/40'
                    }`}
                  >
                    UPSC CSE
                  </button>
                  <button
                    type="button"
                    aria-pressed={examTrack === 'ssc'}
                    onClick={() => setExamTrack('ssc')}
                    className={`px-3 py-1 text-xs font-sans rounded-md transition-all cursor-pointer font-semibold ${
                      examTrack === 'ssc'
                        ? 'bg-[var(--gold,#e0d0ab)] text-[#041228] shadow-sm'
                        : 'text-[#8fa2bd] hover:text-primary hover:bg-surface-elevated/40'
                    }`}
                  >
                    SSC CGL
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Timed Drill Card */}
              <button
                type="button"
                onClick={onBeginAssessment}
                className="group relative rounded-xl border border-[rgba(19,108,153,0.35)] hover:border-[rgba(224,208,171,0.5)] bg-gradient-to-b from-[#061a38] to-[#031126] p-4 sm:p-5 text-left transition-all duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)] cursor-pointer flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-2 rounded-lg bg-[rgba(224,208,171,0.1)] text-[var(--gold,#e0d0ab)]">
                      <Timer className="w-4 h-4" />
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      Ranked
                    </span>
                  </div>
                  <h4 className="text-base font-sans font-bold text-primary group-hover:text-[var(--gold,#e0d0ab)] transition-colors">
                    Timed Speed Drill
                  </h4>
                  <p className="text-xs text-secondary mt-1 leading-relaxed">
                    25 mixed MCQs with Prelims time pressure. Answers and detailed analytics revealed immediately after each question.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-[rgba(19,108,153,0.2)] text-[11px] font-mono text-[#8fa2bd]">
                  <span>
                    {pacingMode === 'blitz' ? '20s blitz' : pacingMode === 'untimed' ? 'Untimed' : '60s per MCQ'} · +2.00 / −0.66
                  </span>
                  <span className="text-[var(--gold,#e0d0ab)] flex items-center gap-1 group-hover:translate-x-1 transition-transform font-sans font-semibold text-xs">
                    Start drill &rarr;
                  </span>
                </div>
              </button>

              {/* Training Ground Card */}
              <button
                type="button"
                onClick={onTrainingGround}
                className="group relative rounded-xl border border-[rgba(19,108,153,0.35)] hover:border-[rgba(224,208,171,0.5)] bg-gradient-to-b from-[#061a38] to-[#031126] p-4 sm:p-5 text-left transition-all duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)] cursor-pointer flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-2 rounded-lg bg-[rgba(1,148,168,0.1)] text-[#0194a8]">
                      <Target className="w-4 h-4" />
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold bg-[#0194a8]/15 text-[#0194a8] border border-[#0194a8]/30">
                      Self-Paced
                    </span>
                  </div>
                  <h4 className="text-base font-sans font-bold text-primary group-hover:text-[var(--gold,#e0d0ab)] transition-colors">
                    Training Ground
                  </h4>
                  <p className="text-xs text-secondary mt-1 leading-relaxed">
                    Customize your session by subject and question volume. Learn at your own pace without ticking clocks.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-[rgba(19,108,153,0.2)] text-[11px] font-mono text-[#8fa2bd]">
                  <span>Custom subjects · 25, 35 or 50 Qs</span>
                  <span className="text-[var(--gold,#e0d0ab)] flex items-center gap-1 group-hover:translate-x-1 transition-transform font-sans font-semibold text-xs">
                    Configure &rarr;
                  </span>
                </div>
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
