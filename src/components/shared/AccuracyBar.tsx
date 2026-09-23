import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface AccuracyBarProps {
  label: string;
  accuracy: number;
  correctCount?: number;
  totalCount?: number;
  delay?: number;
  className?: string;
}

export function AccuracyBar({
  label,
  accuracy,
  correctCount,
  totalCount,
  delay = 0,
  className = '',
}: AccuracyBarProps) {
  const prefersReduced = useReducedMotion();
  const clampedAccuracy = Math.max(0, Math.min(100, Math.round(accuracy)));

  const getBarColor = (acc: number) => {
    if (acc >= 70) return 'bg-emerald-400';
    if (acc >= 40) return 'bg-[#0194a8]';
    return 'bg-rose-400';
  };

  return (
    <div className={`space-y-1.5 ${className} font-sans`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-primary font-medium truncate max-w-[220px]" title={label}>
          {label}
        </span>
        <div className="flex items-center gap-2">
          {totalCount !== undefined && correctCount !== undefined && (
            <span className="text-[10px] font-mono text-muted">
              ({correctCount}/{totalCount})
            </span>
          )}
          <span className={`font-mono font-bold ${clampedAccuracy >= 70 ? 'text-emerald-400' : clampedAccuracy >= 40 ? 'text-[#0194a8]' : 'text-rose-400'}`}>
            {clampedAccuracy}%
          </span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full h-2 bg-surface-elevated border border-border rounded-sm overflow-hidden p-0.5">
        <motion.div
          initial={prefersReduced ? { width: `${clampedAccuracy}%` } : { width: 0 }}
          animate={{ width: `${clampedAccuracy}%` }}
          transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
          className={`h-full rounded-sm ${getBarColor(clampedAccuracy)}`}
        />
      </div>
    </div>
  );
}

export default AccuracyBar;
