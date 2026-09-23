import React from 'react';
import { ChevronLeft, ChevronRight, Lock, Check, Bookmark, BookmarkCheck, FastForward } from 'lucide-react';

interface ReviewControlsProps {
  currentQuestionIndex: number;
  totalQuestions: number;
  isQuestionLocked: boolean;
  hasPendingAnswer: boolean;
  isMarkedForReview?: boolean;
  onToggleMarkForReview?: () => void;
  onSkip?: () => void;
  onPrevious: () => void;
  onLock: () => void;
  onNext: () => void;
}

export const ReviewControls: React.FC<ReviewControlsProps> = ({
  currentQuestionIndex,
  totalQuestions,
  isQuestionLocked,
  hasPendingAnswer,
  isMarkedForReview = false,
  onToggleMarkForReview,
  onSkip,
  onPrevious,
  onLock,
  onNext,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-6 border-t border-[rgba(224,208,171,0.12)]">
      {/* Left controls: Previous, Skip, and Mark for Review */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onPrevious}
          disabled={currentQuestionIndex === 0}
          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-surface-elevated hover:bg-[#0a2148] disabled:opacity-30 border border-[rgba(224,208,171,0.18)] text-[#f4ecd8] font-sans text-xs font-medium uppercase rounded-[6px] transition-all cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        {onSkip && !isQuestionLocked && currentQuestionIndex < totalQuestions - 1 && (
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-transparent hover:bg-[rgba(224,208,171,0.06)] border border-[rgba(224,208,171,0.18)] text-[#b5c1d1] hover:text-[#f4ecd8] font-sans text-xs font-medium uppercase rounded-[6px] transition-all cursor-pointer"
            title="Skip this question and return before submitting"
          >
            <FastForward className="w-3.5 h-3.5 text-[#7d8ca4]" />
            <span>Skip</span>
          </button>
        )}

        {onToggleMarkForReview && (
          <button
            type="button"
            onClick={onToggleMarkForReview}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 border rounded-[6px] font-sans text-xs font-medium uppercase transition-all cursor-pointer ${
              isMarkedForReview
                ? 'bg-[rgba(224,208,171,0.18)] border-[#e0d0ab] text-[#e0d0ab] shadow-sm'
                : 'bg-transparent border-[rgba(224,208,171,0.18)] text-[#7d8ca4] hover:text-[#e0d0ab] hover:border-[rgba(224,208,171,0.4)]'
            }`}
            title="Flag question to review before submitting"
          >
            {isMarkedForReview ? (
              <BookmarkCheck className="w-3.5 h-3.5 text-[#e0d0ab]" />
            ) : (
              <Bookmark className="w-3.5 h-3.5" />
            )}
            <span>{isMarkedForReview ? 'Marked for Review' : 'Mark for Review'}</span>
          </button>
        )}
      </div>

      {/* Right controls: Lock Answer or Next / Submit */}
      <div className="flex items-center gap-2">
        {!isQuestionLocked ? (
          <button
            type="button"
            onClick={onLock}
            disabled={!hasPendingAnswer}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#e0d0ab] hover:bg-white disabled:opacity-40 text-[#050b1a] font-sans text-xs font-bold uppercase tracking-wider rounded-[6px] transition-all shadow-md shadow-[#e0d0ab]/10 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>Lock Answer</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-[#050b1a] font-sans text-xs font-bold uppercase tracking-wider rounded-[6px] transition-all shadow-md shadow-emerald-400/10 cursor-pointer"
          >
            {currentQuestionIndex < totalQuestions - 1 ? (
              <>
                <span>Next Question</span>
                <ChevronRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Submit Assessment</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
