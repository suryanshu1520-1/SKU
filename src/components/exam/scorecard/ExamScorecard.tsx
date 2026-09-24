import React from 'react';
import type { CatalogResponse, SectionSubject, SubmitResponse } from '../types';
import { PAPER_SHORT_TITLES, SUBJECT_LABELS } from '../types';
import { hallEnd } from '../lib/clock';
import { ScoreHero } from './ScoreHero';
import { CutoffBand } from './CutoffBand';
import { RiskLedger } from './RiskLedger';
import { SheetDiscipline } from './SheetDiscipline';
import { PaceChart } from './PaceChart';
import { SubjectTable } from './SubjectTable';
import { ReviewBooklet } from './ReviewBooklet';
import { weakestOfferedSubject } from './interpret';

export interface ExamScorecardProps {
  response: SubmitResponse;
  collectedWhileAway: boolean;
  catalog: CatalogResponse | null;
  onSitAnother: () => void;
  onPractise: (subject: SectionSubject) => void;
  onBack: () => void;
}

export const ExamScorecard: React.FC<ExamScorecardProps> = ({
  response,
  collectedWhileAway,
  catalog,
  onSitAnother,
  onPractise,
  onBack,
}) => {
  const result = response.result;
  const paperTitle = `General Studies Paper I · ${PAPER_SHORT_TITLES[result.paperCode] ?? 'Full paper'}`;

  let formattedDate = '';
  try {
    formattedDate = new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(result.submittedAt));
  } catch {
    formattedDate = result.submittedAt;
  }

  const duration = result.durationSeconds;
  const offeredSubjects = catalog?.sectionSubjects?.map((s) => s.subject) ?? [];
  const weakestSubject = weakestOfferedSubject(result, offeredSubjects);

  return (
    <div className="py-6 grid gap-[22px] max-w-[1080px] font-sans text-primary mx-auto px-4 sm:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold font-serif text-primary m-0">
          Your answer sheet has been evaluated
        </h1>
        <div className="text-sm text-muted mt-1">
          {paperTitle} · {formattedDate}
        </div>
      </div>

      {/* Submit mode banner if applicable */}
      {result.submitMode === 'timeout' && (
        <div className="rounded-md border border-amber-500/35 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
          Collected at {hallEnd(duration)} when time ran out.
        </div>
      )}
      {(result.submitMode === 'recovered' || collectedWhileAway) && (
        <div className="rounded-md border border-amber-500/35 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
          Time ran out while you were away. We collected your sheet as it was last saved.
        </div>
      )}

      {/* Hero */}
      <ScoreHero result={result} />

      {/* Cut-off Band */}
      <CutoffBand result={result} />

      {/* Risk Ledger */}
      <RiskLedger result={result} />

      {/* Sheet Discipline (exam_day only) */}
      <SheetDiscipline result={result} />

      {/* Pace Chart */}
      <PaceChart result={result} />

      {/* Subject Breakdown */}
      <SubjectTable result={result} />

      <ReviewBooklet response={response} />

      {/* Next Actions */}
      <div className="border-t border-border pt-[18px]">
        <div className="flex flex-wrap gap-2.5 items-center">
          <button
            type="button"
            onClick={onSitAnother}
            className="px-5 py-2.5 rounded-md bg-[var(--gold,#e0d0ab)] text-[var(--eh-desk,#041228)] font-sans font-bold text-sm hover:opacity-90 cursor-pointer shadow-sm"
          >
            Sit another full paper
          </button>
          {weakestSubject && (
            <button
              type="button"
              onClick={() => onPractise(weakestSubject as SectionSubject)}
              className="px-4 py-2.5 rounded-md border border-border text-secondary font-sans text-sm hover:bg-surface-elevated hover:text-primary cursor-pointer"
            >
              Practise {SUBJECT_LABELS[weakestSubject] ?? weakestSubject}: 25 questions, 30 minutes
            </button>
          )}
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-2 text-secondary font-sans text-sm hover:text-primary underline underline-offset-4 cursor-pointer"
          >
            Back to Arena
          </button>
        </div>
      </div>
    </div>
  );
};
