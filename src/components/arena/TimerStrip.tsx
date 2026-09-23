import React from 'react';
import { Clock } from 'lucide-react';

interface TimerStripProps {
  pacingMode: 'standard' | 'blitz' | 'untimed';
  isQuestionLocked: boolean;
  isTimeout: boolean;
  timeLeft: number;
  defaultTimeForQuestion: number;
  timeSpent: number;
}

export const TimerStrip: React.FC<TimerStripProps> = ({
  pacingMode,
  isQuestionLocked,
  isTimeout,
  timeLeft,
  defaultTimeForQuestion,
  timeSpent,
}) => {
  if (pacingMode === 'untimed') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-surface-elevated border border-border text-xs font-mono text-primary">
        <Clock className="w-3.5 h-3.5 text-[#0194a8]" />
        <span>{timeSpent}s</span>
      </div>
    );
  }

  if (isQuestionLocked) {
    return (
      <span className="text-[11px] font-sans text-muted">
        {isTimeout ? 'Timed Out' : <><span className="font-mono">{timeSpent}s</span> elapsed</>}
      </span>
    );
  }

  const timerRadius = 18;
  const timerCircumference = 2 * Math.PI * timerRadius;
  const timerProgress = Math.max(0, Math.min(1, timeLeft / defaultTimeForQuestion));
  const strokeDashoffset = timerCircumference - timerProgress * timerCircumference;

  // Visual restraint: calm neutral until final 20% of allotted time
  const isUrgent = timeLeft <= 5;
  const isThreshold = timeLeft <= 0.2 * defaultTimeForQuestion;

  const strokeColor = isUrgent
    ? '#e14e4e'
    : isThreshold
    ? '#f59e0b'
    : '#136c99';

  const textColor = isUrgent
    ? 'text-rose-400 animate-pulse'
    : isThreshold
    ? 'text-amber-400 font-bold'
    : 'text-secondary';

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-10 h-10 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
          <circle
            cx="22"
            cy="22"
            r={timerRadius}
            fill="none"
            stroke="#0a3d62"
            strokeWidth="2.5"
            strokeOpacity="0.3"
          />
          <circle
            cx="22"
            cy="22"
            r={timerRadius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeDasharray={timerCircumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <span
          className={`absolute font-mono text-[11px] ${textColor}`}
          aria-hidden="true"
        >
          {timeLeft}s
        </span>
      </div>

      {/* Screen reader live region for critical thresholds */}
      <div className="sr-only" aria-live={isUrgent ? 'assertive' : 'polite'} aria-atomic="true">
        {isUrgent ? `Warning: ${timeLeft} seconds remaining` : isThreshold ? `${timeLeft} seconds remaining` : undefined}
      </div>
    </div>
  );
};
