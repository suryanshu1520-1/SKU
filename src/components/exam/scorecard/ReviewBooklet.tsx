import React, { useMemo, useState } from 'react';
import type { ItemResult, PaperItem, SubmitResponse } from '../types';
import { SUBJECT_LABELS } from '../types';
import { Booklet } from '../Booklet';

export interface ReviewBookletProps {
  response: SubmitResponse;
}

type Filter = 'all' | 'wrong' | 'blank' | 'invalid' | 'circled' | 'revisit';

const FILTERS: readonly { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'wrong', label: 'Wrong' },
  { key: 'blank', label: 'Blank' },
  { key: 'invalid', label: 'Invalid' },
  { key: 'circled', label: 'Circled, not bubbled' },
  { key: 'revisit', label: 'Revisit' },
];

const EMPTY_SET: ReadonlySet<string> = Object.freeze(new Set<string>());

export const ReviewBooklet: React.FC<ReviewBookletProps> = ({ response }) => {
  const results = useMemo(() => {
    return Object.fromEntries(
      (response.result.items ?? []).map((item) => [item.qid, item])
    ) as Record<string, ItemResult>;
  }, [response.result.items]);

  const counts: Record<Filter, number> = useMemo(() => {
    let all = 0;
    let wrong = 0;
    let blank = 0;
    let invalid = 0;
    let circled = 0;
    let revisit = 0;

    for (const item of response.result.items ?? []) {
      all += 1;
      if (item.verdict === 'wrong') wrong += 1;
      if (item.verdict === 'blank') blank += 1;
      if (item.verdict === 'invalid') invalid += 1;
      if (item.circled !== null && item.bubbled.length === 0) circled += 1;
      if (item.flagged) revisit += 1;
    }

    return { all, wrong, blank, invalid, circled, revisit };
  }, [response.result.items]);

  const [activeFilter, setActiveFilter] = useState<Filter>(() => {
    const wrongCount =
      response.result.wrong ??
      (response.result.items ?? []).filter((i) => i.verdict === 'wrong').length;
    return wrongCount > 0 ? 'wrong' : 'all';
  });

  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  const presentSubjects = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const item of response.result.items ?? []) {
      if (item.subject && !seen.has(item.subject)) {
        seen.add(item.subject);
        list.push(item.subject);
      }
    }
    return list;
  }, [response.result.items]);

  const visible: PaperItem[] = useMemo(() => {
    return (response.paper ?? []).filter((p) => {
      const res = results[p.qid];
      if (!res) return false;

      // Subject filter
      if (selectedSubject !== 'all' && res.subject !== selectedSubject) {
        return false;
      }

      // Verdict / action filter
      switch (activeFilter) {
        case 'wrong':
          return res.verdict === 'wrong';
        case 'blank':
          return res.verdict === 'blank';
        case 'invalid':
          return res.verdict === 'invalid';
        case 'circled':
          return res.circled !== null && res.bubbled.length === 0;
        case 'revisit':
          return Boolean(res.flagged);
        case 'all':
        default:
          return true;
      }
    });
  }, [response.paper, results, selectedSubject, activeFilter]);

  return (
    <div className="border-t border-border pt-[18px] grid gap-3">
      <h2 className="text-[15px] font-semibold text-primary m-0">Review your paper</h2>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filter questions" className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const count = counts[f.key];
            const isSelected = activeFilter === f.key;
            const disabled = f.key !== 'all' && count === 0;

            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={isSelected}
                disabled={disabled}
                onClick={() => setActiveFilter(f.key)}
                className={`px-3 py-1 rounded-full text-xs font-sans transition-colors ${
                  isSelected
                    ? 'bg-surface-elevated text-[var(--gold,#e0d0ab)] border border-[rgba(224,208,171,0.4)] font-medium'
                    : disabled
                      ? 'opacity-40 border border-border/40 text-muted cursor-not-allowed'
                      : 'text-secondary border border-border hover:border-[rgba(224,208,171,0.3)] hover:text-primary cursor-pointer'
                }`}
              >
                {f.label} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="review-subject" className="sr-only">
            Subject
          </label>
          <select
            id="review-subject"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-2.5 py-1 text-xs font-sans rounded-md border border-border bg-surface text-secondary focus:outline-none focus:border-[var(--gold,#e0d0ab)] cursor-pointer"
          >
            <option value="all">All subjects</option>
            {presentSubjects.map((s) => (
              <option key={s} value={s}>
                {SUBJECT_LABELS[s] ?? s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs text-secondary font-mono m-0">
        Showing {visible.length} of {response.paper?.length ?? 0}
      </p>

      {visible.length === 0 ? (
        <p className="text-sm text-secondary italic py-6 m-0">
          No questions match this filter.
        </p>
      ) : (
        <Booklet
          mode="review"
          items={visible}
          rules={response.result.rules}
          results={results}
          explanations={response.explanations}
          activeQid={null}
          graceQids={EMPTY_SET}
        />
      )}
    </div>
  );
};
