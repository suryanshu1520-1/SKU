import React from 'react';
import type { Question } from '../../types';

interface QuestionPaletteProps {
  questions: Question[];
  currentQuestionIndex: number;
  userAnswers: Record<string, string>;
  lockedMap: Record<string, boolean>;
  timeouts: Record<string, boolean>;
  revealedAnswers: Record<string, string>;
  markedForReviewMap?: Record<string, boolean>;
  onSelectIndex: (index: number) => void;
}

export const QuestionPalette: React.FC<QuestionPaletteProps> = ({
  questions,
  currentQuestionIndex,
  userAnswers,
  lockedMap,
  timeouts,
  revealedAnswers,
  markedForReviewMap = {},
  onSelectIndex,
}) => {
  const answeredCount = Object.keys(userAnswers).length;
  const reviewCount = Object.values(markedForReviewMap).filter(Boolean).length;
  const notVisitedCount = questions.filter(
    (q) => userAnswers[q.id] === undefined && !timeouts[q.id]
  ).length;

  return (
    <div className="w-full mb-6 p-4 rounded-[14px] bg-[#071630] border border-[rgba(224,208,171,0.12)] shadow-xl backdrop-blur-md">
      {/* Header bar with question counts */}
      <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-[rgba(224,208,171,0.08)]">
        <div className="flex items-center gap-2.5">
          <span className="font-sans font-bold text-xs uppercase tracking-wider text-[#e0d0ab]">
            Question Palette
          </span>
          <span className="text-[11px] font-mono text-[#7d8ca4] tabular-nums">
            {answeredCount}/{questions.length} answered
          </span>
        </div>
        <div className="font-mono text-[11px] text-[#7d8ca4] hidden sm:block">
          Click any cell to jump
        </div>
      </div>

      {/* Responsive Grid matching DesignV3 (up to 10 columns) */}
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 sm:gap-2 max-h-[190px] overflow-y-auto pr-1 custom-scrollbar">
        {questions.map((q, idx) => {
          const isCurrent = idx === currentQuestionIndex;
          const isAnswered = userAnswers[q.id] !== undefined;
          const isMarkedForReview = !!markedForReviewMap[q.id];
          const isTimeOut = timeouts[q.id];
          const isLocked = lockedMap[q.id];
          const correctForQ = revealedAnswers[q.id]?.trim();
          const isCorrect = isAnswered && correctForQ ? userAnswers[q.id] === correctForQ : false;

          let cellClass =
            'bg-transparent border border-[rgba(224,208,171,0.18)] text-[#7d8ca4] hover:border-[rgba(224,208,171,0.45)]';

          if (isCurrent) {
            cellClass =
              'border-[#f4ecd8] ring-2 ring-[rgba(244,236,216,0.35)] font-bold text-[#f4ecd8] ' +
              (isAnswered
                ? 'bg-[#e0d0ab] !text-[#050b1a]'
                : isMarkedForReview
                ? 'bg-[rgba(224,208,171,0.18)] text-[#e0d0ab]'
                : 'bg-[rgba(224,208,171,0.08)]');
          } else if (isTimeOut) {
            cellClass = 'bg-rose-950/40 border border-rose-800/60 text-rose-400 font-bold';
          } else if (isLocked && isAnswered && correctForQ) {
            cellClass = isCorrect
              ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 font-bold'
              : 'bg-rose-950/40 border border-rose-800/60 text-rose-400 font-bold';
          } else if (isAnswered) {
            cellClass = 'bg-[#e0d0ab] border border-[#e0d0ab] text-[#050b1a] font-bold shadow-xs';
          } else if (isMarkedForReview) {
            cellClass =
              'bg-[rgba(224,208,171,0.14)] border border-[#e0d0ab] text-[#e0d0ab] font-medium shadow-xs';
          }

          return (
            <button
              type="button"
              key={q.id || idx}
              onClick={() => onSelectIndex(idx)}
              className={`min-w-[28px] h-8 sm:h-8.5 rounded-[5px] flex items-center justify-center font-mono text-[11.5px] transition-all cursor-pointer outline-none ${cellClass}`}
              title={`Question ${idx + 1}${isAnswered ? ' (Answered)' : ''}${
                isMarkedForReview ? ' (Marked for Review)' : ''
              }`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Legend matching DesignV3 */}
      <div className="mt-3.5 pt-2.5 border-t border-[rgba(224,208,171,0.08)] flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#7d8ca4]">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[3px] bg-[#e0d0ab]" />
            <span className="text-[#f4ecd8]">Answered</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[3px] bg-[rgba(224,208,171,0.14)] border border-[#e0d0ab]" />
            <span className="text-[#e0d0ab]">For review</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[3px] border border-[rgba(224,208,171,0.28)]" />
            <span>Not visited</span>
          </span>
        </div>
        <span className="font-mono text-[11px] text-[#6e7d94] hidden md:inline">
          {reviewCount > 0
            ? `${reviewCount} question${reviewCount > 1 ? 's' : ''} flagged for review`
            : `${notVisitedCount} remaining`}
        </span>
      </div>
    </div>
  );
};
