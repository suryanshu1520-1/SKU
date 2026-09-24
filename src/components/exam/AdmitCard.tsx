import React, { useState } from 'react';
import type {
  PaperCode,
  SectionSubject,
  CatalogResponse,
  ExamPrefs,
  RulesPreset,
  Series,
} from './types';
import { SUBJECT_LABELS, PAPER_SHORT_TITLES, OPTIONS } from './types';
import { durationLabel, hallEnd } from './lib/clock';
import { primeBell } from './lib/bell';

export interface AdmitCardProps {
  paperCode: PaperCode;
  subject?: SectionSubject;
  catalog: CatalogResponse | null;
  candidateName: string | null;
  roll: string;
  series: Series;
  prefs: ExamPrefs;
  starting: boolean;
  error: string | null;
  onPrefsChange: (patch: Partial<ExamPrefs>) => void;
  onStart: (rules: RulesPreset, opts: { fullscreen: boolean }) => void;
  onBack: () => void;
}

const FALLBACK_SPECS: Record<PaperCode, { questions: number; duration: number }> = {
  GS1_FULL: { questions: 100, duration: 7200 },
  GS1_HALF: { questions: 50, duration: 3600 },
  GS1_SECTION: { questions: 25, duration: 1800 },
};

export const AdmitCard: React.FC<AdmitCardProps> = ({
  paperCode,
  subject,
  catalog,
  candidateName,
  roll,
  series,
  prefs,
  starting,
  error,
  onPrefsChange,
  onStart,
  onBack,
}) => {
  const [localRules, setLocalRules] = useState<RulesPreset>(prefs.rules);
  const [declared, setDeclared] = useState(false);
  const [encodedSeries, setEncodedSeries] = useState<Series | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const spec = catalog?.papers.find((p) => p.code === paperCode);
  const n = spec?.questionCount ?? FALLBACK_SPECS[paperCode].questions;
  const duration = spec?.durationSeconds ?? FALLBACK_SPECS[paperCode].duration;
  const durLabel = durationLabel(duration);
  const endLabel = hallEnd(duration);

  const paperTitle = `General Studies Paper I · ${PAPER_SHORT_TITLES[paperCode]}`;

  // Series encoding valid?
  const seriesCorrect = encodedSeries === series;
  const seriesWrong = encodedSeries !== null && !seriesCorrect;

  // Start button enabled
  const canStart =
    declared &&
    !starting &&
    (localRules === 'practice' || seriesCorrect);

  // Composition
  const blueprint = catalog?.blueprints[paperCode];
  const compositionLine = blueprint
    ? Object.entries(blueprint)
        .filter(([, count]) => count > 0)
        .map(([subj, count]) => `${SUBJECT_LABELS[subj] ?? subj} ${count}`)
        .join(' · ')
    : subject && subject !== 'Mixed'
    ? `${SUBJECT_LABELS[subject] ?? subject} ${n}`
    : null;

  const isExamDay = localRules === 'exam_day';
  const fsAvailable = typeof document !== 'undefined' && !!document.fullscreenEnabled;

  return (
    <div className="exam-hall" data-booklet={prefs.booklet}>
      <div className="mx-auto w-full max-w-3xl mt-7 mb-10 rounded-md border border-[var(--eh-paper-edge)] bg-[var(--eh-paper)] text-[var(--eh-ink)] shadow-[0_12px_32px_rgba(0,0,0,0.35)] px-5 py-6 sm:px-10 sm:py-8 font-serif">
        {/* 1. Eyebrow + Title + Subtitle */}
        <div className="font-sans text-[11px] font-semibold tracking-[0.14em] uppercase text-[var(--eh-print)]">
          Tark Exam Hall · Admit slip
        </div>
        <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.01em] text-balance leading-tight">
          {paperTitle}
        </h1>
        <p className="mt-1 font-sans text-sm text-[var(--eh-ink-soft)]">
          {n} questions · {durLabel} · Series {series}
        </p>

        {/* 2. Particulars grid */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 border border-[var(--eh-paper-edge)] rounded">
          {[
            ['Candidate', candidateName ?? 'Candidate'],
            ['Roll No.', roll],
            ['Booklet series', series],
            ['Hall clock', `09:30 – ${endLabel}`],
            ['Marking', '+2 · −0.66 · 0'],
            ['Paper', 'GS-I'],
          ].map(([label, value], idx) => (
            <div
              key={label}
              className={`px-3 py-2 border-b border-[var(--eh-paper-edge)] text-sm ${
                idx % 2 === 1 ? 'sm:border-l' : ''
              }`}
            >
              <span className="font-sans text-[11px] text-[var(--eh-ink-soft)] block">{label}</span>
              <span className="font-mono">{value}</span>
            </div>
          ))}
        </div>

        {/* 3. Rules for this sitting */}
        <h2 className="mt-6 mb-3 font-sans text-base font-semibold">Rules for this sitting</h2>
        <div role="radiogroup" aria-label="Rules preset" className="grid gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            role="radio"
            aria-checked={localRules === 'exam_day'}
            onClick={() => setLocalRules('exam_day')}
            className={`text-left rounded-md border px-4 py-3 transition-colors cursor-pointer ${
              localRules === 'exam_day'
                ? 'border-[var(--eh-ink)] bg-[var(--eh-hover)]'
                : 'border-[var(--eh-paper-edge)]'
            }`}
          >
            <span className="font-sans text-sm font-semibold block">Exam-day rules</span>
            <span className="font-sans text-xs text-[var(--eh-ink-soft)] block mt-0.5">
              Circle in the booklet, commit on the answer sheet. Ink is permanent after 5 seconds.
            </span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={localRules === 'practice'}
            onClick={() => setLocalRules('practice')}
            className={`text-left rounded-md border px-4 py-3 transition-colors cursor-pointer ${
              localRules === 'practice'
                ? 'border-[var(--eh-ink)] bg-[var(--eh-hover)]'
                : 'border-[var(--eh-paper-edge)]'
            }`}
          >
            <span className="font-sans text-sm font-semibold block">Practice rules</span>
            <span className="font-sans text-xs text-[var(--eh-ink-soft)] block mt-0.5">
              Tap an option to bubble it. You can erase and change answers.
            </span>
          </button>
        </div>

        {/* 4. Instructions */}
        <h2 className="mt-6 mb-3 font-sans text-base font-semibold">Instructions</h2>
        <ol className="list-decimal pl-6 space-y-1.5 font-sans text-sm text-[var(--eh-ink)] leading-relaxed">
          <li>This booklet has {n} questions, each with four options. Choose the single best answer.</li>
          <li>Only the answer sheet is scored. An answer counts when its bubble is filled.</li>
          <li>A wrong answer costs 0.66 marks. A blank costs nothing. Two bubbles in one row count as a wrong answer.</li>
          <li>The clock starts when you break the seal and keeps running if you close the tab. At {endLabel} on the hall clock the sheet is collected automatically.</li>
          <li>Scores, answers and explanations appear only after you hand in.</li>
          {isExamDay && (
            <>
              <li>Tap an option to circle it. Circles are rough work and are not scored.</li>
              <li>Fill a bubble to commit. You have 5 seconds to lift the pen; after that, a second bubble makes the row invalid.</li>
            </>
          )}
        </ol>

        {/* 5. Encode your booklet series (exam-day only) */}
        {isExamDay && (
          <div className="mt-6">
            <h2 className="mb-3 font-sans text-base font-semibold">Encode your booklet series</h2>
            <div
              role="radiogroup"
              aria-label="Booklet series"
              className="flex gap-3 mb-2"
            >
              {(['A', 'B', 'C', 'D'] as Series[]).map((s) => {
                const filled = encodedSeries === s;
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={filled}
                    aria-label={`Series ${s}`}
                    onClick={() => setEncodedSeries(s)}
                    className={`w-[26px] h-[26px] rounded-full border-[1.25px] font-mono text-xs grid place-items-center cursor-pointer transition-colors ${
                      filled
                        ? 'bg-[var(--eh-bubble-ink)] border-[var(--eh-bubble-ink)] text-[var(--eh-bubble-letter)]'
                        : 'border-[var(--eh-print)] text-[var(--eh-print)]'
                    }`}
                  >
                    {s.toLowerCase()}
                  </button>
                );
              })}
            </div>
            {encodedSeries === null && (
              <p className="font-sans text-xs text-[var(--eh-ink-soft)]">
                Your booklet is Series {series}. Fill the matching bubble. In the real exam, a wrong series code can void your answer sheet.
              </p>
            )}
            {seriesCorrect && (
              <p className="font-sans text-xs text-[var(--eh-ink-soft)]">
                Series {series} encoded.
              </p>
            )}
            {seriesWrong && (
              <p className="font-sans text-xs text-[var(--eh-danger)]">
                That&apos;s not your series. Your booklet is Series {series}.
              </p>
            )}
          </div>
        )}

        {/* 6. Options */}
        <h2 className="mt-6 mb-3 font-sans text-base font-semibold">Options</h2>
        <div className="space-y-2.5 font-sans text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.bell}
              onChange={() => onPrefsChange({ bell: !prefs.bell })}
              className="accent-[var(--eh-ink)]"
            />
            Hall bell at time checks (sound)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[var(--eh-ink-soft)] text-xs">Booklet:</span>
            <div className="inline-flex rounded-full border border-[var(--eh-paper-edge)] overflow-hidden">
              <button
                type="button"
                onClick={() => onPrefsChange({ booklet: 'paper' })}
                className={`px-2.5 py-1 text-xs cursor-pointer ${
                  prefs.booklet === 'paper'
                    ? 'bg-[var(--eh-ink)] text-[var(--eh-paper)]'
                    : ''
                }`}
              >
                Paper
              </button>
              <button
                type="button"
                onClick={() => onPrefsChange({ booklet: 'night' })}
                className={`px-2.5 py-1 text-xs cursor-pointer ${
                  prefs.booklet === 'night'
                    ? 'bg-[var(--eh-ink)] text-[var(--eh-paper)]'
                    : ''
                }`}
              >
                Night
              </button>
            </div>
          </div>
          {fsAvailable && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={fullscreen}
                onChange={(e) => setFullscreen(e.target.checked)}
                className="accent-[var(--eh-ink)]"
              />
              Full screen while I write
            </label>
          )}
        </div>

        {/* 7. Declaration */}
        <div className="mt-6 pt-4 border-t border-[var(--eh-paper-edge)]">
          <label className="flex items-start gap-2 cursor-pointer font-sans text-sm">
            <input
              type="checkbox"
              checked={declared}
              onChange={(e) => setDeclared(e.target.checked)}
              className="accent-[var(--eh-ink)] mt-0.5"
            />
            I have read the instructions.
          </label>
        </div>

        {/* 9. Error */}
        {error && (
          <p role="alert" className="mt-3 font-sans text-sm text-[var(--eh-danger)]">
            {error}
          </p>
        )}

        {/* 8. Buttons */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!canStart}
            onClick={() => {
              primeBell();
              onStart(localRules, { fullscreen });
            }}
            className="bg-[var(--eh-ink)] text-[var(--eh-paper)] px-[18px] py-2.5 rounded-md font-sans font-bold disabled:opacity-40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]"
          >
            {starting ? 'Distributing your booklet…' : 'Break the seal and start'}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="font-sans text-sm text-[var(--eh-ink-soft)] underline underline-offset-2 cursor-pointer hover:text-[var(--eh-ink)]"
          >
            Back to Arena
          </button>
        </div>

        {/* 10. Footer */}
        <div className="mt-5 pt-3.5 border-t border-[var(--eh-paper-edge)] font-sans text-[12.5px] leading-relaxed text-[var(--eh-ink-soft)] space-y-1.5">
          {compositionLine && <p>This paper: {compositionLine}</p>}
          <p>
            About this paper: questions come from UPSC Prelims GS Paper I, 2011–2023, as recorded
            in Tark&apos;s PYQ bank. We left out 2020, 2024 and 2025 because those records mixed in
            questions UPSC never set. Our bank is thin on Polity, so this paper has fewer Polity
            questions than a real one.
          </p>
        </div>
      </div>
    </div>
  );
};
