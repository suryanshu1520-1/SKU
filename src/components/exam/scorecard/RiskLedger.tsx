import React from 'react';
import type { ExamResult, LedgerRow } from '../types';
import { formatMarks, formatPercent, formatSignedMarks } from '../lib/clock';
import { ledgerHeadline, ledgerVerdict, perAnswerHundredths, type VerdictTone } from './interpret';

export interface RiskLedgerProps {
  result: ExamResult;
}

interface TableRowConfig {
  label: string;
  row: LedgerRow;
}

const VERDICT_CLASSES: Record<VerdictTone, string> = {
  good: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  even: 'text-amber-200 bg-amber-500/10 border-amber-500/30',
  bad: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  few: 'text-muted bg-slate-500/10 border-slate-500/30',
};

function renderLedgerTable(titleColumn: string, rows: TableRowConfig[]) {
  return (
    <div className="overflow-x-auto border border-border/60 rounded-md">
      <table className="w-full text-left font-sans text-xs border-collapse min-w-[560px]">
        <thead>
          <tr className="border-b border-border/60 text-muted bg-surface-elevated/40">
            <th className="py-2 px-3 font-semibold">{titleColumn}</th>
            <th className="py-2 px-3 font-semibold text-right font-mono">Attempted</th>
            <th className="py-2 px-3 font-semibold text-right font-mono">Right</th>
            <th className="py-2 px-3 font-semibold text-right font-mono">Wrong</th>
            <th className="py-2 px-3 font-semibold text-right font-mono">Accuracy</th>
            <th className="py-2 px-3 font-semibold text-right font-mono">Net marks</th>
            <th className="py-2 px-3 font-semibold text-right font-mono">Per answer</th>
            <th className="py-2 px-3 font-semibold">Verdict</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {rows.map(({ label, row }) => {
            const perAnswer = perAnswerHundredths(row);
            const verdict = ledgerVerdict(row);
            return (
              <tr key={label} className="hover:bg-surface-elevated/30">
                <td className="py-2 px-3 text-primary font-medium">{label}</td>
                <td className="py-2 px-3 text-right font-mono text-primary">{row.attempted}</td>
                <td className="py-2 px-3 text-right font-mono text-primary">{row.correct}</td>
                <td className="py-2 px-3 text-right font-mono text-primary">{row.wrong}</td>
                <td className="py-2 px-3 text-right font-mono text-primary">
                  {formatPercent(row.correct, row.attempted)}
                </td>
                <td className="py-2 px-3 text-right font-mono text-primary">
                  {formatMarks(row.netHundredths)}
                </td>
                <td className="py-2 px-3 text-right font-mono text-primary">
                  {perAnswer === null ? '—' : formatSignedMarks(perAnswer)}
                </td>
                <td className="py-2 px-3">
                  <span
                    className={`inline-block text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap ${
                      VERDICT_CLASSES[verdict.tone]
                    }`}
                  >
                    {verdict.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export const RiskLedger: React.FC<RiskLedgerProps> = ({ result }) => {
  const confidenceRows: TableRowConfig[] = [
    { label: 'Sure', row: result.byConfidence.sure },
    { label: '50:50', row: result.byConfidence.fifty },
    { label: 'Guess', row: result.byConfidence.guess },
    { label: 'Not tagged', row: result.byConfidence.untagged },
  ];

  const struckRows: TableRowConfig[] = [
    { label: 'None', row: result.byStruckCount['0'] },
    { label: 'One', row: result.byStruckCount['1'] },
    { label: 'Two', row: result.byStruckCount['2'] },
    { label: 'Three', row: result.byStruckCount['3'] },
  ];

  return (
    <div className="border-t border-border pt-[18px] grid gap-3">
      <h2 className="text-[15px] font-semibold text-primary m-0">Risk ledger</h2>
      <p className="text-sm text-secondary max-w-[72ch] m-0">
        {ledgerHeadline(result)}
      </p>

      <div className="grid gap-3 mt-1">
        {renderLedgerTable('Confidence', confidenceRows)}
        {renderLedgerTable('Options struck', struckRows)}
      </div>

      <p className="text-xs text-muted max-w-[72ch] m-0">
        A wrong answer costs a third of a right one. With four options a blind guess roughly breaks even; every option you can rule out tips the odds your way.
      </p>
    </div>
  );
};
