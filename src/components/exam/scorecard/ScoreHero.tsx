import React from 'react';
import type { ExamResult } from '../types';
import { formatMarks } from '../lib/clock';
import { heroInterpretation } from './interpret';

export interface ScoreHeroProps {
  result: ExamResult;
}

export const ScoreHero: React.FC<ScoreHeroProps> = ({ result }) => {
  const maxScore = result.maxHundredths / 100;
  const splitInvalid = result.invalid > 0 ? ` · ${result.invalid} invalid` : '';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-x-7 gap-y-2">
        <div className="font-mono text-5xl font-semibold tracking-tight text-primary">
          {formatMarks(result.netHundredths)} <small className="text-xl text-muted font-medium">/ {maxScore}</small>
        </div>
        <div className="grid gap-1.5 pb-1">
          <div className="text-sm text-secondary">
            {result.correct} right · {result.wrong} wrong{splitInvalid} · {result.blank} blank
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/35 text-emerald-400 bg-emerald-500/10">
              +{formatMarks(result.grossHundredths)} earned
            </span>
            {result.penaltyHundredths > 0 ? (
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full border border-rose-500/35 text-rose-400 bg-rose-500/10">
                −{formatMarks(result.penaltyHundredths)} lost to negative marking
              </span>
            ) : (
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full border border-border text-muted">
                No marks lost to negative marking
              </span>
            )}
          </div>
        </div>
      </div>
      <p className="text-sm text-secondary max-w-[72ch] leading-relaxed">
        {heroInterpretation(result)}
      </p>
    </div>
  );
};
