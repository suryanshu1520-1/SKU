import React from 'react';
import type { ExamResult } from '../types';
import { SUBJECT_LABELS } from '../types';
import { formatMarks, formatPercent } from '../lib/clock';
import { SUBJECT_ORDER, subjectLine } from './interpret';

export interface SubjectTableProps {
  result: ExamResult;
}

export const SubjectTable: React.FC<SubjectTableProps> = ({ result }) => {
  const line = subjectLine(result);

  const rows = SUBJECT_ORDER.map((subjectKey) => {
    const data = result.bySubject[subjectKey];
    if (!data || data.total === 0) return null;
    return {
      key: subjectKey,
      label: SUBJECT_LABELS[subjectKey] ?? subjectKey,
      ...data,
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <div className="border-t border-border pt-[18px] grid gap-2.5">
      <h2 className="text-[15px] font-semibold text-primary m-0">Subjects</h2>
      {line && <p className="text-sm text-secondary max-w-[72ch] m-0">{line}</p>}

      <div className="overflow-x-auto border border-border/60 rounded-md">
        <table className="w-full text-left font-sans text-xs border-collapse min-w-[560px]">
          <thead>
            <tr className="border-b border-border/60 text-muted bg-surface-elevated/40">
              <th className="py-2 px-3 font-semibold">Subject</th>
              <th className="py-2 px-3 font-semibold text-right font-mono">Questions</th>
              <th className="py-2 px-3 font-semibold text-right font-mono">Attempted</th>
              <th className="py-2 px-3 font-semibold text-right font-mono">Right</th>
              <th className="py-2 px-3 font-semibold text-right font-mono">Wrong</th>
              <th className="py-2 px-3 font-semibold text-right font-mono">Net</th>
              <th className="py-2 px-3 font-semibold">Accuracy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {rows.map((row) => {
              const accPct =
                row.attempted === 0 ? 0 : Math.round((100 * row.correct) / row.attempted);
              return (
                <tr key={row.key} className="hover:bg-surface-elevated/30">
                  <td className="py-2 px-3 text-primary font-medium">{row.label}</td>
                  <td className="py-2 px-3 text-right font-mono text-primary">{row.total}</td>
                  <td className="py-2 px-3 text-right font-mono text-primary">{row.attempted}</td>
                  <td className="py-2 px-3 text-right font-mono text-primary">{row.correct}</td>
                  <td className="py-2 px-3 text-right font-mono text-primary">{row.wrong}</td>
                  <td className="py-2 px-3 text-right font-mono text-primary">
                    {formatMarks(row.netHundredths)}
                  </td>
                  <td className="py-2 px-3">
                    <span className="inline-block w-[90px] h-[6px] bg-[rgba(224,208,171,0.12)] rounded-[3px] overflow-hidden align-middle mr-2">
                      <i
                        className="block h-full bg-[var(--gold,#e0d0ab)]"
                        style={{ width: `${accPct}%` }}
                      />
                    </span>
                    <span className="font-mono text-primary text-xs">
                      {formatPercent(row.correct, row.attempted)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
