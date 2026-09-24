import React from 'react';
import type { ExamResult } from '../types';
import { PRELIMS_CUTOFFS } from '../data/prelimsCutoffs';
import { formatMarks } from '../lib/clock';

export interface CutoffBandProps {
  result: ExamResult;
}

export const CutoffBand: React.FC<CutoffBandProps> = ({ result }) => {
  if (result.paperCode !== 'GS1_FULL') {
    return (
      <div className="border-t border-border pt-[18px]">
        <p className="text-sm text-secondary">
          Cut-off comparison is shown for full papers only.
        </p>
      </div>
    );
  }

  const candidateMarks = result.netHundredths / 100;
  const sx = (v: number) => 30 + (v / 200) * 840;

  const ticks: number[] = [];
  for (let v = 0; v <= 200; v += 25) {
    ticks.push(v);
  }

  const sorted = PRELIMS_CUTOFFS.slice().sort((a, b) => a.general - b.general);
  let lastX = -99;
  let row = 0;
  const cutoffDots = sorted.map((c) => {
    const x = sx(c.general);
    row = x - lastX < 34 ? (row + 1) % 3 : 0;
    lastX = x;
    const ly = 44 - row * 12;
    return { c, x, ly };
  });

  const clampedMarks = Math.max(0, Math.min(200, candidateMarks));
  const meX = sx(clampedMarks);

  const aboveYears = PRELIMS_CUTOFFS.filter((c) => candidateMarks < c.general).map((c) => c.year);
  const belowYears = PRELIMS_CUTOFFS.filter((c) => candidateMarks >= c.general).map((c) => c.year);
  const ariaLabel = `Your score ${formatMarks(result.netHundredths)} on a 0 to 200 scale, above the General cut-offs of ${
    belowYears.length > 0 ? belowYears.join(', ') : 'none'
  } and below those of ${aboveYears.length > 0 ? aboveYears.join(', ') : 'none'}.`;

  const formatCutoffNum = (val: number | null) => (val === null ? '—' : val.toFixed(2));

  return (
    <div className="border-t border-border pt-[18px] grid gap-2.5">
      <h2 className="text-[15px] font-semibold text-primary m-0">Against real cut-offs</h2>

      <div className="overflow-x-auto">
        <svg
          className="w-full min-w-[700px] h-24"
          viewBox="0 0 900 96"
          role="img"
          aria-label={ariaLabel}
        >
          {/* Main Axis */}
          <line
            x1="30"
            y1="56"
            x2="870"
            y2="56"
            stroke="rgba(224,208,171,0.25)"
            strokeWidth="1"
          />

          {/* Axis Ticks */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={sx(t)}
                y1="52"
                x2={sx(t)}
                y2="60"
                stroke="rgba(224,208,171,0.25)"
                strokeWidth="1"
              />
              <text
                x={sx(t)}
                y="78"
                textAnchor="middle"
                fill="var(--muted, #8fa2bd)"
                fontSize="10"
                fontFamily="monospace"
              >
                {t}
              </text>
            </g>
          ))}

          {/* Official Cut-off Points */}
          {cutoffDots.map(({ c, x, ly }) => (
            <g key={c.year}>
              <circle cx={x} cy="56" r="3.5" fill="#8fa2bd" />
              <text
                x={x}
                y={ly}
                textAnchor="middle"
                fill="#8fa2bd"
                fontSize="10"
                fontFamily="monospace"
              >
                {c.year}
              </text>
            </g>
          ))}

          {/* Candidate Pin */}
          <line
            x1={meX}
            y1="20"
            x2={meX}
            y2="66"
            stroke="#e0d0ab"
            strokeWidth="2"
          />
          <circle cx={meX} cy="56" r="6" fill="#e0d0ab" />
          <text
            x={meX}
            y="94"
            textAnchor="middle"
            fill="#e0d0ab"
            fontWeight="bold"
            fontSize="10"
            fontFamily="monospace"
          >
            You {formatMarks(result.netHundredths)}
          </text>
        </svg>
      </div>

      <p className="text-xs text-muted max-w-[72ch] m-0">
        Official UPSC Prelims cut-offs, General category, GS Paper I. Reference only: each cut-off reflects that year's paper, not this one.
      </p>

      <details className="mt-1 text-sm">
        <summary className="cursor-pointer text-[var(--gold,#e0d0ab)] hover:underline font-medium text-xs">
          All categories
        </summary>
        <div className="overflow-x-auto mt-2 border border-border/60 rounded-md">
          <table className="w-full text-left font-sans text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/60 text-muted bg-surface-elevated/40">
                <th className="py-1.5 px-3 font-semibold">Year</th>
                <th className="py-1.5 px-3 font-semibold text-right font-mono">General</th>
                <th className="py-1.5 px-3 font-semibold text-right font-mono">EWS</th>
                <th className="py-1.5 px-3 font-semibold text-right font-mono">OBC</th>
                <th className="py-1.5 px-3 font-semibold text-right font-mono">SC</th>
                <th className="py-1.5 px-3 font-semibold text-right font-mono">ST</th>
                <th className="py-1.5 px-3 font-semibold">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {PRELIMS_CUTOFFS.map((c) => (
                <tr key={c.year} className="hover:bg-surface-elevated/30">
                  <td className="py-1.5 px-3 text-primary">{c.year}</td>
                  <td className="py-1.5 px-3 text-right font-mono text-primary">
                    {formatCutoffNum(c.general)}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono text-primary">
                    {formatCutoffNum(c.ews)}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono text-primary">
                    {formatCutoffNum(c.obc)}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono text-primary">
                    {formatCutoffNum(c.sc)}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono text-primary">
                    {formatCutoffNum(c.st)}
                  </td>
                  <td className="py-1.5 px-3">
                    <a
                      href={c.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--gold,#e0d0ab)] hover:underline"
                    >
                      UPSC PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
};
