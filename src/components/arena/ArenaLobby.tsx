import React from 'react';
import { motion } from 'motion/react';
import { Swords, Target, Shield, Clock, Zap, BookOpen, ArrowRight } from 'lucide-react';
import { Modal } from '../shared';
import type { ArenaLaunchConfig } from '../../types';
import type { CachedSession } from './useArenaSession';

interface ArenaLobbyProps {
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
  onClearTargetPillar,
  onResumeSavedSession,
  onDiscardSavedSession,
  onStartTargetedDrill,
  onBeginAssessment,
  onTrainingGround,
  onReady,
}) => {
  // 100-cell question palette for Test Arena card preview matching DesignV3
  const PALETTE_MARKED = [7, 19, 23, 31, 40];
  const lobbyPalette = React.useMemo(() => {
    return Array.from({ length: 100 }, (_, i) => {
      let status: 'answered' | 'review' | 'current' | 'unvisited' = 'unvisited';
      if (i < 46 && !PALETTE_MARKED.includes(i)) {
        status = 'answered';
      } else if (PALETTE_MARKED.includes(i)) {
        status = 'review';
      } else if (i === 46) {
        status = 'current';
      }
      return { id: i, status };
    });
  }, []);

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
            <div className="space-y-0.5">
              <div className="text-xs font-mono font-semibold text-[#e0d0ab]">
                Unfinished Session Detected
              </div>
              <div className="text-[11px] font-sans text-[#9fb0c8]">
                Question <span className="font-mono text-white">{cachedSessionAvailable.currentQuestionIndex + 1}</span> of <span className="font-mono text-white">{cachedSessionAvailable.questions.length}</span> &bull; {cachedSessionAvailable.isRanked ? 'Ranked Crucible' : 'Training Drill'}
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
                {pacingMode === 'blitz' ? '20s Blitz' : pacingMode === 'untimed' ? 'Self-Paced' : '60s Prelims'}
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
        <>
          {/* Targeted Syllabus Pillar Drill Banner (if active without arenaConfig) */}
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
                  className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider bg-surface-elevated border border-border hover:border-border text-primary rounded-sm cursor-pointer transition-colors"
                >
                  Comprehensive Mock [×]
                </button>
              )}
            </div>
          )}

          {/* ── DESIGN V3 TEST ARENA CARD ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full p-1.5 rounded-[22px] bg-gradient-to-br from-[rgba(224,208,171,0.12)] via-[rgba(224,208,171,0.04)] to-[rgba(224,208,171,0.015)] border border-[rgba(224,208,171,0.2)] shadow-[0_12px_48px_rgba(0,0,0,0.4)] transition-all mb-4"
          >
            <div className="h-full bg-gradient-to-b from-[#0a2148] via-[#071b3b] to-[#04132b] rounded-[16px] border border-[rgba(224,208,171,0.1)] p-6 sm:p-8 lg:p-9 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] flex flex-col justify-between">
              <div>
                {/* Top Header */}
                <div className="flex items-center gap-3">
                  <Swords className="w-6 h-6 text-[#e0d0ab]" strokeWidth={2} />
                  <h2 className="m-0 font-sans font-bold text-[28px] sm:text-[32px] tracking-[-0.025em] text-[#f4ecd8]">
                    Test Arena
                  </h2>
                  <span className="ml-auto inline-flex items-center gap-1.5">
                    <kbd className="inline-flex items-center justify-center h-[24px] px-2.5 border border-[rgba(224,208,171,0.25)] border-b-2 rounded-[5px] bg-[rgba(224,208,171,0.05)] font-mono text-[11px] text-[#b5c1d1]">Alt</kbd>
                    <kbd className="inline-flex items-center justify-center min-w-[24px] h-[24px] px-2 border border-[rgba(224,208,171,0.25)] border-b-2 rounded-[5px] bg-[rgba(224,208,171,0.05)] font-mono text-[11px] text-[#b5c1d1]">3</kbd>
                  </span>
                </div>

                {/* Main Content Grid: Copy & Actions on Left, 10x10 Palette on Right */}
                <div className="mt-7 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_290px] gap-8 lg:gap-10 items-start">
                  {/* Left Column */}
                  <div className="flex flex-col justify-between h-full space-y-6">
                    <p className="m-0 font-serif text-[16px] sm:text-[17px] leading-[1.65] text-[#d4dfed]">
                      Timed Prelims practice with real negative marking, scored on our server. Skip, mark for review, and come back before you submit.
                    </p>

                    {/* Track Segregation Toggle */}
                    <div className="flex items-center p-1 bg-[#031124]/90 border border-[rgba(224,208,171,0.18)] rounded-md max-w-sm">
                      <button
                        type="button"
                        onClick={() => setExamTrack('upsc')}
                        className={`flex-1 py-1.5 px-3 text-xs font-sans font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-2 ${
                          examTrack === 'upsc'
                            ? 'bg-[#e0d0ab] text-[#072e63] shadow-xs'
                            : 'text-[#9fb0c8] hover:text-[#f4ecd8]'
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>UPSC CSE Track</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setExamTrack('ssc')}
                        className={`flex-1 py-1.5 px-3 text-xs font-sans font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-2 ${
                          examTrack === 'ssc'
                            ? 'bg-[#0194a8] text-white shadow-xs'
                            : 'text-[#9fb0c8] hover:text-[#f4ecd8]'
                        }`}
                      >
                        <Target className="w-3.5 h-3.5" />
                        <span>SSC CGL Track</span>
                      </button>
                    </div>

                    {/* Arena Protocol Launch Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={onBeginAssessment}
                        className="group p-4 rounded-sm bg-gradient-to-r from-[#e0d0ab] to-[#ebdcb6] hover:from-white hover:to-[#e0d0ab] text-[#072e63] font-sans font-bold text-left transition-all shadow-md hover:shadow-[0_0_24px_rgba(224,208,171,0.35)] cursor-pointer flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                            <Swords className="w-3.5 h-3.5" />
                            Ranked Crucible
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#072e63]/15 font-mono">
                            +2 / -0.66
                          </span>
                        </div>
                        <div className="text-[11px] font-normal opacity-85 leading-snug">
                          25 Multi-Domain MCQs &bull; 20s Blitz &bull; Server Evaluation
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={onTrainingGround}
                        className="p-4 rounded-sm bg-[rgba(3,18,42,0.6)] hover:bg-[rgba(3,18,42,0.9)] border border-[rgba(224,208,171,0.22)] hover:border-[#e0d0ab] text-[#f4ecd8] font-sans font-bold text-left transition-all cursor-pointer flex flex-col justify-between group"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs uppercase tracking-wider font-extrabold flex items-center gap-1.5 text-[#e0d0ab] group-hover:text-white">
                            <Target className="w-3.5 h-3.5" />
                            The Training Ground
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-elevated border border-border text-[#9fb0c8] font-mono">
                            Unranked
                          </span>
                        </div>
                        <div className="text-[11px] font-normal text-[#9fb0c8] group-hover:text-[#d4dfed] leading-snug">
                          Custom domain filtering &bull; 25/35/50 questions &bull; Untimed
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Right Column: 100-cell question palette */}
                  <div className="flex flex-col items-center lg:items-end">
                    <div aria-hidden="true" className="grid grid-cols-10 gap-1.5">
                      {lobbyPalette.map((cell) => (
                        <span
                          key={cell.id}
                          className={`w-[22px] h-[22px] rounded-[5px] border transition-colors ${
                            cell.status === 'answered'
                              ? 'bg-[#e0d0ab] border-[#e0d0ab]'
                              : cell.status === 'review'
                              ? 'bg-[rgba(224,208,171,0.14)] border-[#e0d0ab]'
                              : cell.status === 'current'
                              ? 'border-[#f4ecd8] shadow-[0_0_0_2px_rgba(244,236,216,0.28)]'
                              : 'bg-transparent border-[rgba(224,208,171,0.16)]'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap justify-center lg:justify-end gap-3.5 font-serif text-[13px] text-[#7d8ca4]">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-[3px] bg-[#e0d0ab]" /> Answered
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-[3px] bg-[rgba(224,208,171,0.14)] border border-[#e0d0ab]" /> For review
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-[3px] border border-[rgba(224,208,171,0.28)]" /> Not visited
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
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
              <span className="font-bold text-primary"><span className="font-mono">20s</span> Per Question</span>
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
