/**
 * src/components/observatory/radar-v2/SignalsQuadrant.tsx
 *
 * Scatter plot of syllabus node signals (exam_weight vs signal score).
 * Displays median guide, surge markers, and accessible table representation.
 * TASK_085Q
 */

import React, { useState, useId } from "react";
import type { NodeSignalV2 } from "../../../lib/policy-radar-v2-types.ts";

interface SignalsQuadrantProps {
  signals: NodeSignalV2[];
}

export function SignalsQuadrant({ signals }: SignalsQuadrantProps) {
  const [hoveredNode, setHoveredNode] = useState<NodeSignalV2 | null>(null);
  const titleId = useId();

  if (!signals || signals.length === 0) {
    return null;
  }

  // Compute median exam_weight
  const sortedWeights = [...signals]
    .map((s) => s.exam_weight)
    .sort((a, b) => a - b);
  const mid = Math.floor(sortedWeights.length / 2);
  const medianWeight =
    sortedWeights.length % 2 !== 0
      ? sortedWeights[mid]
      : (sortedWeights[mid - 1] + sortedWeights[mid]) / 2;

  // Compute bounds
  const maxScore = Math.max(3.0, ...signals.map((s) => s.score));
  const maxWeight = Math.max(1.0, ...signals.map((s) => s.exam_weight));

  // SVG coordinate conversions (viewBox 0 0 500 240, padding: x: 40..480, y: 20..210)
  const padL = 45;
  const padR = 480;
  const padT = 20;
  const padB = 210;

  const toX = (w: number) => padL + ((w / (maxWeight || 1)) * (padR - padL));
  const toY = (s: number) => padB - ((s / (maxScore || 1)) * (padB - padT));

  const medianX = toX(medianWeight);

  return (
    <section
      aria-labelledby={titleId}
      className="p-4 rounded-lg bg-[rgba(4,18,40,0.65)] border border-[rgba(224,208,171,0.18)] space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3
            id={titleId}
            className="text-xs font-mono uppercase tracking-wider text-[#e0d0ab]"
          >
            Syllabus Node Signals
          </h3>
          <p className="text-[11px] text-[#8fa2bd]">
            Exam weight × Recent news frequency anomaly
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-[#8fa2bd]">
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="w-2.5 h-2.5 rounded-full bg-[#0194a8]"
            />
            Surging (Filled)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="w-2.5 h-2.5 rounded-full border border-[#8fa2bd]"
            />
            Baseline (Outline)
          </span>
        </div>
      </div>

      {/* Interactive Scatter Canvas */}
      <div className="relative w-full aspect-[25/12] max-h-[260px] bg-[#031124] rounded border border-[rgba(224,208,171,0.1)] overflow-hidden">
        <svg
          viewBox="0 0 500 240"
          className="w-full h-full select-none"
          role="img"
          aria-label="Scatter plot showing exam weight versus signal score"
        >
          {/* Axis lines */}
          <line
            x1={padL}
            y1={padB}
            x2={padR}
            y2={padB}
            stroke="rgba(224,208,171,0.2)"
            strokeWidth="1"
          />
          <line
            x1={padL}
            y1={padT}
            x2={padL}
            y2={padB}
            stroke="rgba(224,208,171,0.2)"
            strokeWidth="1"
          />

          {/* Vertical Guide: Median Exam Weight */}
          <line
            x1={medianX}
            y1={padT}
            x2={medianX}
            y2={padB}
            stroke="rgba(95,227,245,0.35)"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
          <text
            x={medianX + 4}
            y={padT + 10}
            fill="#5fe3f5"
            fontSize="9"
            fontFamily="monospace"
          >
            Median Weight
          </text>

          {/* Scatter points */}
          {signals.map((sig) => {
            const cx = toX(sig.exam_weight);
            const cy = toY(sig.score);
            const isHovered = hoveredNode?.node_id === sig.node_id;

            return (
              <g
                key={sig.node_id}
                tabIndex={0}
                role="button"
                aria-label={`${sig.title}: ${sig.x_recent} items in 14 days vs ${sig.expected.toFixed(1)} expected`}
                onMouseEnter={() => setHoveredNode(sig)}
                onMouseLeave={() => setHoveredNode(null)}
                onFocus={() => setHoveredNode(sig)}
                onBlur={() => setHoveredNode(null)}
                className="cursor-pointer outline-none focus:ring-1 focus:ring-[#5fe3f5]"
              >
                {sig.surging ? (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 6 : 4.5}
                    fill="#0194a8"
                    stroke="#5fe3f5"
                    strokeWidth={isHovered ? 2 : 1}
                  />
                ) : (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 5.5 : 4}
                    fill="transparent"
                    stroke="#8fa2bd"
                    strokeWidth={isHovered ? 2 : 1.2}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredNode && (
          <div className="absolute top-2 right-2 p-2 rounded bg-[#041936] border border-[#5fe3f5]/40 text-xs shadow-md pointer-events-none max-w-xs space-y-0.5">
            <div className="font-semibold text-[#f4ecd8] truncate">
              {hoveredNode.title}
            </div>
            <div className="text-[11px] text-[#8fa2bd] font-mono">
              {hoveredNode.x_recent} items in 14 days vs{" "}
              {hoveredNode.expected.toFixed(1)} expected
            </div>
            <div className="text-[10px] text-[#5fe3f5] font-mono">
              Exam Weight: {hoveredNode.exam_weight.toFixed(2)} · Score:{" "}
              {hoveredNode.score.toFixed(2)}
              {hoveredNode.surging ? " · Surging" : ""}
            </div>
          </div>
        )}
      </div>

      {/* Accessible Table Mirror */}
      <table className="sr-only">
        <caption>Syllabus Node Signals Table</caption>
        <thead>
          <tr>
            <th scope="col">Node</th>
            <th scope="col">Title</th>
            <th scope="col">Exam Weight</th>
            <th scope="col">Signal Score</th>
            <th scope="col">Recent Items</th>
            <th scope="col">Expected Items</th>
            <th scope="col">Surge Status</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((sig) => (
            <tr key={sig.node_id}>
              <td>{sig.node_id}</td>
              <td>{sig.title}</td>
              <td>{sig.exam_weight}</td>
              <td>{sig.score}</td>
              <td>{sig.x_recent}</td>
              <td>{sig.expected}</td>
              <td>{sig.surging ? "Surging" : "Baseline"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default SignalsQuadrant;
