import React from 'react';
import { Target } from 'lucide-react';
import { TimerStrip } from './TimerStrip';
import type { ArenaLaunchConfig } from '../../types';

interface QuestionHeaderProps {
  isRanked: boolean;
  arenaConfig?: ArenaLaunchConfig | null;
  targetPillar?: { id: string; title: string } | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  pacingMode: 'standard' | 'blitz' | 'untimed';
  isQuestionLocked: boolean;
  isTimeout: boolean;
  timeLeft: number;
  defaultTimeForQuestion: number;
  timeSpent: number;
  onAbandon: () => void;
}

export const QuestionHeader: React.FC<QuestionHeaderProps> = ({
  isRanked,
  arenaConfig,
  targetPillar,
  currentQuestionIndex,
  totalQuestions,
  pacingMode,
  isQuestionLocked,
  isTimeout,
  timeLeft,
  defaultTimeForQuestion,
  timeSpent,
  onAbandon,
}) => {
  return (
    <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-surface/95 backdrop-blur-md border-b border-border mb-6 flex items-center justify-between gap-4 transition-all">
      <div className="flex items-center gap-3">
        <span
          className={`px-2 py-0.5 rounded-sm text-[10px] font-sans font-bold uppercase tracking-wider border ${
            isRanked
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-[#e0d0ab]/10 border-[#e0d0ab]/30 text-[#e0d0ab]'
          }`}
        >
          {isRanked ? 'Ranked' : 'Practice'}
        </span>

        {(arenaConfig?.title || targetPillar) && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold bg-[#e0d0ab]/10 border border-[#e0d0ab]/30 text-[#e0d0ab] uppercase truncate max-w-[200px]">
            <Target className="w-3 h-3 shrink-0" />
            <span className="truncate">{arenaConfig?.title || targetPillar?.title || targetPillar?.id}</span>
          </span>
        )}

        <span className="text-xs font-sans text-secondary">
          Question <span className="font-mono text-primary font-bold">{currentQuestionIndex + 1}</span> of{' '}
          <span className="font-mono text-primary font-bold">{totalQuestions}</span>
        </span>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <TimerStrip
          pacingMode={pacingMode}
          isQuestionLocked={isQuestionLocked}
          isTimeout={isTimeout}
          timeLeft={timeLeft}
          defaultTimeForQuestion={defaultTimeForQuestion}
          timeSpent={timeSpent}
        />

        <button
          onClick={onAbandon}
          className="text-[10px] font-sans uppercase tracking-wider text-muted hover:text-rose-400 transition-colors cursor-pointer"
        >
          Abandon
        </button>
      </div>
    </div>
  );
};
