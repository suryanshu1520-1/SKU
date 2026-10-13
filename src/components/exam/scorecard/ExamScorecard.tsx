import React, { useEffect, useState } from 'react';
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
import { saveScorecardToLocal } from '../lib/scorecardStorage';
import { Printer, Check, Copy, Trophy, Sparkles } from 'lucide-react';

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
  const [copied, setCopied] = useState(false);

  // Auto-persist scorecard to client storage on arrival
  useEffect(() => {
    saveScorecardToLocal(response);
  }, [response]);

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

  const handleCopyLink = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}?tab=arena&scorecard=${result.attemptId}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Fallback
    }
  };

  return (
    <div className="py-6 grid gap-[22px] max-w-[1080px] font-sans text-primary mx-auto px-4 sm:px-6">
      {/* Print stylesheet override */}
      <style>{`
        @media print {
          .no-print, nav, header, button, .exam-bar { display: none !important; }
          body { background: #ffffff !important; color: #000000 !important; }
          .exam-hall { max-width: 100% !important; padding: 0 !important; }
          .text-primary { color: #050b1a !important; }
          .text-muted, .text-secondary { color: #475569 !important; }
          .bg-\\[\\#071630\\], .bg-\\[\\#041228\\], .bg-\\[\\#031126\\] { background: #f8fafc !important; border-color: #cbd5e1 !important; }
        }
      `}</style>

      {/* Header Strip with Persistence Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-2xl font-semibold font-serif text-primary m-0">
            Your answer sheet has been evaluated
          </h1>
          <div className="text-sm text-muted mt-1">
            {paperTitle} · {formattedDate}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap no-print">
          {/* Synchronized status pill */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono"
            title="Scorecard stored in local dossier and server record"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Dossier Synchronized</span>
          </div>

          {/* Export PDF */}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[rgba(224,208,171,0.25)] bg-[#071630] hover:bg-[#0a2148] text-[#e0d0ab] text-xs font-mono font-medium transition-colors cursor-pointer shadow-xs"
            title="Print or save as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>

          {/* Share / Copy Link */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[rgba(224,208,171,0.25)] bg-[#071630] hover:bg-[#0a2148] text-[#e0d0ab] text-xs font-mono font-medium transition-colors cursor-pointer shadow-xs"
            title="Copy evaluation deep-link"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Share Result'}</span>
          </button>
        </div>
      </div>

      {/* Weekly Leaderboard Yield Banner */}
      {result.cpEarned !== undefined && result.cpEarned > 0 && (
        <div className="rounded-md border border-[#e0d0ab]/30 bg-gradient-to-r from-[#0a2148] via-[#071630] to-[#0a2148] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xs bg-[#e0d0ab]/10 border border-[#e0d0ab]/30 flex items-center justify-center text-[#e0d0ab] shrink-0">
              <Trophy className="w-4 h-4 text-[#e0d0ab]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-[#e0d0ab] uppercase tracking-wider">
                  Weekly Leaderboard: +{result.cpEarned} Contender Points
                </span>
                {result.cutoffCleared && (
                  <span className="px-1.5 py-0.5 rounded-xs text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/35 uppercase flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    Cutoff Cleared (+25 Bonus)
                  </span>
                )}
              </div>
              <p className="text-xs text-[#b5c1d1] m-0 mt-0.5">
                Standardized mock performance successfully credited toward your weekly rank standing.
              </p>
            </div>
          </div>

          <span className="text-[11px] font-mono text-[#34d399] font-bold px-2 py-1 bg-emerald-950/30 border border-emerald-500/30 rounded-xs self-start sm:self-auto shrink-0">
            CONTENDER POINTS APPLIED
          </span>
        </div>
      )}

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
      <div className="border-t border-border pt-[18px] no-print">
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
