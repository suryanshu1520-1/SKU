/**
 * src/components/radar/RadarCardExtras.tsx
 *
 * Lineage and surge information component for feed cards (CurrentAffairs & DailyEdition).
 * Reads data safely via hooks and renders lineage & topic resurgence lines.
 * TASK_085Q2
 */

import React from "react";
import { GitFork, Flame, ArrowUpRight } from "lucide-react";
import { useDispatchLineage, useNodeSignal } from "./useRadarV2.ts";
import { RING_LABEL, INSTRUMENT_LABEL } from "../observatory/radar-v2/labels.ts";
import { sourceHref, sourceLabel } from "../observatory/radar-v2/sourceLink.ts";

interface RadarCardExtrasProps {
  dispatchId?: string;
  nodeId?: string;
  variant: "signal" | "edition";
}

export function RadarCardExtras({
  dispatchId,
  nodeId,
  variant,
}: RadarCardExtrasProps) {
  const lineage = useDispatchLineage(dispatchId);
  const signal = useNodeSignal(nodeId);

  const hasLineage = Boolean(lineage);
  const hasSurge = Boolean(signal && signal.surging);

  if (!hasLineage && !hasSurge) {
    return null;
  }

  const navigateToRadar = (e: React.MouseEvent<HTMLAnchorElement>, slug: string) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    const targetUrl = `/observatory?tab=ripple&program=${encodeURIComponent(slug)}`;
    window.history.pushState(null, "", targetUrl);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  if (variant === "edition") {
    return (
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {/* Surge pill for DailyEdition */}
        {hasSurge && signal && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500/15 text-rose-300 text-[9px] font-mono font-bold uppercase tracking-wider rounded-xs border border-rose-500/40 shadow-xs"
            title={`${signal.x_recent} items in the last 14 days vs ${signal.expected.toFixed(1)} expected for this syllabus node`}
          >
            <Flame className="w-2.5 h-2.5 text-rose-400" />
            TOPIC RESURGENCE // {signal.x_recent} ITEMS / 14D (EXP {signal.expected.toFixed(1)}) · EXAM WEIGHT {signal.exam_weight.toFixed(2)}
          </span>
        )}

        {/* Lineage pill for DailyEdition */}
        {hasLineage && lineage && (
          <a
            href={`/observatory?tab=ripple&program=${encodeURIComponent(lineage.program_slug)}`}
            onClick={(e) => navigateToRadar(e, lineage.program_slug)}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[rgba(1,148,168,0.2)] text-[#5fe3f5] hover:bg-[rgba(1,148,168,0.35)] hover:text-white border border-[rgba(1,148,168,0.5)] text-[9px] font-mono font-bold tracking-wider rounded-xs transition-colors cursor-pointer shadow-xs"
            title={`View policy lineage: ${lineage.program_name}`}
          >
            <GitFork className="w-2.5 h-2.5 text-[#0194a8]" />
            <span>
              [LINEAGE r{lineage.ring} // {lineage.program_name.toUpperCase()} → VIEW RADAR]
            </span>
          </a>
        )}
      </div>
    );
  }

  // Variant === "signal" (for CurrentAffairs card)
  const instName = lineage
    ? (INSTRUMENT_LABEL as Record<string, string>)[lineage.instrument] ||
      lineage.instrument
    : "";
  const ringName = lineage ? RING_LABEL[lineage.ring] || "Stage" : "";
  const sHref = lineage ? sourceHref(lineage.evidence) : "";
  const sHost = lineage ? sourceLabel(lineage.evidence.source_url) : "";

  return (
    <div className="space-y-2 pt-2 border-t border-[rgba(19,108,153,0.25)] text-xs">
      {/* Topic Resurgence */}
      {hasSurge && signal && (
        <div className="flex items-start gap-2 text-rose-300 font-mono text-[11px]">
          <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold uppercase tracking-wider text-rose-200">
              Topic resurgence
            </div>
            <div className="text-[10.5px] text-[#9fb0c8]">
              {signal.x_recent} items in the last 14 days vs{" "}
              {signal.expected.toFixed(1)} expected for this syllabus node · Exam
              weight {signal.exam_weight.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Policy Lineage */}
      {hasLineage && lineage && (
        <div className="space-y-1 bg-[rgba(4,18,40,0.5)] p-2.5 rounded border border-[rgba(1,148,168,0.25)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-[#e0d0ab] text-[11.5px]">
              {lineage.program_name} · {instName} ({ringName})
            </span>
            <a
              href={`/observatory?tab=ripple&program=${encodeURIComponent(lineage.program_slug)}`}
              onClick={(e) => navigateToRadar(e, lineage.program_slug)}
              className="inline-flex items-center gap-1 text-[10px] font-mono text-[#5fe3f5] hover:underline"
            >
              Open in Policy Radar <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>

          {lineage.gap_sentence && (
            <p className="text-[11px] text-[#9fb0c8] italic">
              {lineage.gap_sentence}
            </p>
          )}

          {sHref && (
            <div className="pt-0.5">
              <a
                href={sHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open source: ${sHost}`}
                className="inline-flex items-center gap-1 text-[10px] font-mono text-[#5fe3f5] hover:underline"
              >
                <span>Source: {sHost}</span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RadarCardExtras;
