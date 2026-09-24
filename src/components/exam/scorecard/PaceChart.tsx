import React from 'react';
import type { ExamResult } from '../types';
import { hallClockAtMinute } from '../lib/clock';
import { paceLines } from './interpret';

export interface PaceChartProps {
  result: ExamResult;
}

export const PaceChart: React.FC<PaceChartProps> = ({ result }) => {
  const duration = result.durationSeconds;
  const questionCount = result.questionCount;
  const pace = result.pace;
  const lines = paceLines(result);

  const left = 45;
  const right = 820;
  const top = 25;
  const bottom = 185;
  const chartWidth = right - left;
  const chartHeight = bottom - top;

  const sx = (sec: number) => left + (Math.max(0, Math.min(duration, sec)) / duration) * chartWidth;
  const sy = (q: number) => bottom - (Math.max(0, Math.min(questionCount, q)) / questionCount) * chartHeight;

  // Gridlines at 0%, 25%, 50%, 75%, 100%
  const gridPercents = [0, 0.25, 0.5, 0.75, 1];
  const gridValues = gridPercents.map((pct) => Math.round(pct * questionCount));

  // Build step-path
  let pathD = '';
  if (pace.length > 0) {
    const firstX = sx(pace[0].minute * 60);
    const firstY = sy(pace[0].bubbled);
    pathD = `M ${firstX.toFixed(1)} ${firstY.toFixed(1)}`;
    for (let i = 1; i < pace.length; i++) {
      const curX = sx(pace[i].minute * 60);
      const curY = sy(pace[i].bubbled);
      const prevY = sy(pace[i - 1].bubbled);
      pathD += ` L ${curX.toFixed(1)} ${prevY.toFixed(1)} L ${curX.toFixed(1)} ${curY.toFixed(1)}`;
    }
  }

  const lastPoint = pace.length > 0 ? pace[pace.length - 1] : null;
  const lastX = lastPoint ? sx(lastPoint.minute * 60) : 0;
  const lastY = lastPoint ? sy(lastPoint.bubbled) : 0;

  // X-axis minute intervals
  const intervalMin = duration <= 1800 ? 10 : 30;
  const xLabels: { minute: number; x: number; label: string }[] = [];
  for (let m = 0; m * 60 <= duration; m += intervalMin) {
    xLabels.push({
      minute: m,
      x: sx(m * 60),
      label: hallClockAtMinute(m),
    });
  }

  return (
    <div className="border-t border-border pt-[18px] grid gap-2.5">
      <h2 className="text-[15px] font-semibold text-primary m-0">Pace</h2>

      <div className="overflow-x-auto">
        <svg
          className="w-full min-w-[700px] h-[230px]"
          viewBox="0 0 900 230"
          role="img"
          aria-label={lines[0]}
        >
          {/* Y Gridlines and labels */}
          {gridValues.map((qVal, idx) => {
            const y = sy(qVal);
            return (
              <g key={idx}>
                <line
                  x1={left}
                  y1={y}
                  x2={right}
                  y2={y}
                  stroke="rgba(224,208,171,0.12)"
                  strokeWidth="1"
                />
                <text
                  x={left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fill="var(--muted, #8fa2bd)"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {qVal}
                </text>
              </g>
            );
          })}

          {/* Dashed Even-Pace Line */}
          <line
            x1={sx(0)}
            y1={sy(0)}
            x2={sx(duration)}
            y2={sy(questionCount)}
            stroke="rgba(224,208,171,0.3)"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />

          {/* Actual Candidate Step Path */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#e0d0ab"
              strokeWidth="2"
            />
          )}

          {/* Endpoint Dot & Label */}
          {lastPoint && (
            <g>
              <circle cx={lastX} cy={lastY} r="4" fill="#e0d0ab" />
              <text
                x={Math.min(880, lastX + 8)}
                y={lastY + 3.5}
                fill="#e0d0ab"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="600"
              >
                {lastPoint.bubbled} bubbled
              </text>
            </g>
          )}

          {/* X Axis Time Labels */}
          {xLabels.map(({ minute, x, label }) => (
            <text
              key={minute}
              x={x}
              y="206"
              textAnchor="middle"
              fill="var(--muted, #8fa2bd)"
              fontSize="10"
              fontFamily="monospace"
            >
              {label}
            </text>
          ))}
        </svg>
      </div>

      {/* Screen-reader accessible data table */}
      <div className="sr-only">
        <table>
          <caption>Pace Progression</caption>
          <thead>
            <tr>
              <th>Minute</th>
              <th>Bubbled</th>
            </tr>
          </thead>
          <tbody>
            {pace.map((pt) => (
              <tr key={pt.minute}>
                <td>{pt.minute}</td>
                <td>{pt.bubbled}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-secondary max-w-[72ch] m-0 leading-relaxed">
        {lines[0]} {lines[1]}
      </p>
    </div>
  );
};
