import React, { useState } from 'react';
import type { ActiveAttempt } from './types';
import { formatTimeLeft } from './lib/clock';
import { primeBell } from './lib/bell';

export interface ResumePromptProps {
  info: ActiveAttempt;
  secondsLeft: number;
  submitting: boolean;
  error?: string | null;
  onResume: () => void;
  onHandIn: () => void;
  onBack: () => void;
}

export const ResumePrompt: React.FC<ResumePromptProps> = ({
  info,
  secondsLeft,
  submitting,
  error,
  onResume,
  onHandIn,
  onBack,
}) => {
  const [confirmHandIn, setConfirmHandIn] = useState(false);
  const seriesLabel = info.paper.series;

  return (
    <div className="exam-hall">
      <div className="mx-auto w-full max-w-3xl mt-7 mb-10 rounded-md border border-[var(--eh-paper-edge)] bg-[var(--eh-paper)] text-[var(--eh-ink)] shadow-[0_12px_32px_rgba(0,0,0,0.35)] px-5 py-6 sm:px-10 sm:py-8 font-serif">
        <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-balance leading-tight">
          Your paper is still running
        </h1>
        <p className="mt-3 font-sans text-sm text-[var(--eh-ink-soft)] leading-relaxed">
          {info.paper.title} · Series {seriesLabel}. {formatTimeLeft(secondsLeft)} left on the
          clock. It kept running while you were away.
        </p>

        {error && (
          <p role="alert" className="mt-4 font-sans text-sm text-[#e06c75] font-medium">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              primeBell();
              onResume();
            }}
            className="bg-[var(--eh-ink)] text-[var(--eh-paper)] px-[18px] py-2.5 rounded-md font-sans font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]"
          >
            Return to the paper
          </button>

          {!confirmHandIn ? (
            <button
              type="button"
              onClick={() => setConfirmHandIn(true)}
              className="px-4 py-2 rounded-md border border-[var(--eh-paper-edge)] font-sans text-sm text-[var(--eh-ink-soft)] cursor-pointer hover:bg-[var(--eh-hover)]"
            >
              Hand in now
            </button>
          ) : (
            <div className="flex items-center gap-2 font-sans text-sm">
              <span className="text-[var(--eh-ink-soft)]">Hand in with the answers saved so far?</span>
              <button
                type="button"
                disabled={submitting}
                onClick={onHandIn}
                className="px-3 py-1.5 rounded-md bg-[var(--eh-danger)] text-white text-xs font-semibold cursor-pointer disabled:opacity-40"
              >
                Hand in
              </button>
              <button
                type="button"
                onClick={() => setConfirmHandIn(false)}
                className="px-3 py-1.5 rounded-md border border-[var(--eh-paper-edge)] text-xs text-[var(--eh-ink-soft)] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onBack}
            className="font-sans text-sm text-[var(--eh-ink-soft)] underline underline-offset-2 cursor-pointer hover:text-[var(--eh-ink)]"
          >
            Back to Arena
          </button>
        </div>
      </div>
    </div>
  );
};
