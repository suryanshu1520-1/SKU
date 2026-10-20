/**
 * src/components/observatory/radar-v2/ProgramLineage.tsx
 *
 * Lineage lanes representation for policy programs:
 * - Desktop (>= 768px): 4 horizontal lanes (Mandate, Law, Execution, Delivery) with SVG links
 * - Mobile (< 768px): chronological vertical list with lane badges and parent references
 * - Ghost node for next stage gap estimate
 * - Mutation badges with expandable quotes
 * - Upstream and downstream ripples
 * TASK_085Q
 */

import React, { useState } from "react";
import type {
  Program,
  LineageNode,
  Evidence,
} from "../../../lib/policy-radar-v2-types.ts";
import { RING_LABEL, INSTRUMENT_LABEL } from "./labels.ts";
import { sourceHref, sourceLabel } from "./sourceLink.ts";
import { RING_OF, type InstrumentClass } from "../../../../server-lib/policy/instruments.ts";

interface ProgramLineageProps {
  program: Program;
}

export function ProgramLineage({ program }: ProgramLineageProps) {
  const [expandedMutations, setExpandedMutations] = useState<Record<string, boolean>>({});

  const toggleMutation = (id: string) => {
    setExpandedMutations((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const nodes = program.nodes ?? [];
  const nodesById = new Map<string, LineageNode>();
  nodes.forEach((n) => nodesById.set(n.event_id, n));

  // Determine whether ghost node should be shown
  const showGhost =
    program.gap &&
    program.gap.status !== "complete" &&
    program.gap.status !== "not_applicable" &&
    Boolean(program.gap.sentence);

  const ghostLane =
    program.gap?.nextStage && (program.gap.nextStage in RING_OF)
      ? RING_OF[program.gap.nextStage as InstrumentClass]
      : (nodes.length > 0 ? nodes[nodes.length - 1].ring : 3);

  // Group mutations by event_id
  const mutationsByEvent = new Map<string, typeof program.mutations>();
  for (const m of program.mutations ?? []) {
    let list = mutationsByEvent.get(m.event_id);
    if (!list) {
      list = [];
      mutationsByEvent.set(m.event_id, list);
    }
    list.push(m);
  }

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. DESKTOP VIEW (>= 768px): 4 Horizontal Lanes
          ───────────────────────────────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto pb-4">
        <div
          role="list"
          aria-label="Policy lineage horizontal lanes"
          className="min-w-[680px] grid grid-cols-4 gap-4 p-4 rounded-lg bg-[rgba(4,18,40,0.6)] border border-[rgba(224,208,171,0.15)]"
        >
          {RING_LABEL.map((label, ringIdx) => {
            const laneNodes = nodes.filter((n) => n.ring === ringIdx);
            const isGhostHere = showGhost && ghostLane === ringIdx;

            return (
              <div
                key={label}
                role="listitem"
                className="flex flex-col space-y-3 border-r last:border-r-0 border-[rgba(224,208,171,0.08)] pr-3"
              >
                {/* Lane Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[rgba(224,208,171,0.12)]">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#e0d0ab]">
                    {label}
                  </span>
                  <span className="text-[10px] font-mono text-[#8fa2bd]">
                    Ring {ringIdx}
                  </span>
                </div>

                {/* Nodes in this lane */}
                <div className="flex flex-col space-y-3 min-h-[140px]">
                  {laneNodes.map((n) => {
                    const instLabel =
                      (INSTRUMENT_LABEL as Record<string, string>)[n.instrument] ||
                      n.instrument;
                    const primaryEv = n.evidence[0];
                    const href = primaryEv ? sourceHref(primaryEv) : "";
                    const host = primaryEv ? sourceLabel(primaryEv.source_url) : "";
                    const mutations = mutationsByEvent.get(n.event_id) ?? [];

                    return (
                      <div
                        key={n.event_id}
                        className="p-3 rounded bg-[#031124] border border-[rgba(224,208,171,0.18)] hover:border-[#5fe3f5]/50 transition-colors space-y-2 text-xs"
                      >
                        {/* Date & Date Source */}
                        <div className="space-y-0.5">
                          <div className="font-mono text-[11px] text-[#e0d0ab]">
                            {n.event_date}
                          </div>
                          {n.date_source === "ingested" && (
                            <div className="text-[9px] font-mono text-[#8fa2bd]">
                              date of Tark ingestion
                            </div>
                          )}
                        </div>

                        {/* Instrument & Actor */}
                        <div>
                          <div className="font-semibold text-[#f4ecd8]">
                            {instLabel}
                          </div>
                          {n.actor && (
                            <div className="text-[11px] text-[#8fa2bd]">
                              {n.actor.name}
                              {n.actor.tier !== null && (
                                <span className="ml-1 text-[10px] text-[#5fe3f5] font-mono">
                                  Tier {n.actor.tier}
                                </span>
                              )}
                              {n.actor.legal_basis_ref && (
                                <span className="block text-[10px] text-[#8fa2bd]/80 italic truncate">
                                  {n.actor.legal_basis_ref}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Summary */}
                        {n.summary && (
                          <p className="text-[11px] text-[#e8e0cf] line-clamp-3 leading-relaxed">
                            {n.summary}
                          </p>
                        )}

                        {/* What-changed Mutation Badge */}
                        {mutations.map((m, mIdx) => {
                          const isExpanded = Boolean(
                            expandedMutations[`${n.event_id}-${mIdx}`]
                          );
                          return (
                            <div
                              key={mIdx}
                              className="pt-1 border-t border-[rgba(224,208,171,0.1)]"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  toggleMutation(`${n.event_id}-${mIdx}`)
                                }
                                className="w-full text-left text-[10px] font-mono text-amber-300 bg-amber-950/40 hover:bg-amber-950/60 p-1.5 rounded border border-amber-600/30 flex items-center justify-between"
                              >
                                <span className="truncate">{m.headline}</span>
                                <span className="text-[9px] ml-1">
                                  {isExpanded ? "▲" : "▼"}
                                </span>
                              </button>
                              {isExpanded && m.sources && m.sources.length > 0 && (
                                <div className="mt-1.5 p-2 rounded bg-[#041936] text-[10px] space-y-1.5 border border-amber-500/20">
                                  {m.sources.map((s, sIdx) => {
                                    const sHref = sourceHref({
                                      quote: s.quote,
                                      source_url: s.url,
                                    });
                                    const sHost = sourceLabel(s.url);
                                    return (
                                      <div key={sIdx} className="space-y-0.5">
                                        <div className="italic text-[#8fa2bd]">
                                          "{s.quote}"
                                        </div>
                                        {sHref && (
                                          <a
                                            href={sHref}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label={`Open source: ${sHost}`}
                                            className="text-[#5fe3f5] hover:underline block"
                                          >
                                            {sHost} ↗
                                          </a>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Source Chip */}
                        {href && (
                          <div className="pt-1">
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Open source: ${host}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[rgba(1,148,168,0.12)] hover:bg-[rgba(1,148,168,0.25)] border border-[rgba(95,227,245,0.25)] text-[#5fe3f5] text-[10px] font-mono transition-colors"
                            >
                              <span>{host}</span>
                              <span aria-hidden="true">↗</span>
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Ghost Node for Next Stage */}
                  {isGhostHere && (
                    <div
                      data-testid="ghost-node"
                      className="p-3 rounded border-2 border-dashed border-[rgba(224,208,171,0.35)] bg-[rgba(4,18,40,0.35)] space-y-1.5 text-xs text-[#8fa2bd]"
                    >
                      <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#e0d0ab]">
                        <span
                          className="w-1.5 h-1.5 rounded-full border border-[#e0d0ab]"
                          aria-hidden="true"
                        />
                        <span>Next Anticipated Stage</span>
                      </div>
                      <p className="text-[11px] leading-relaxed italic text-[#e8e0cf]">
                        {program.gap?.sentence}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MOBILE VIEW (< 768px): Chronological Vertical List
          ───────────────────────────────────────────────────────────── */}
      <div className="block md:hidden space-y-3">
        <ol
          role="list"
          aria-label="Policy lineage vertical list"
          className="space-y-3"
        >
          {nodes.map((n) => {
            const laneLabel = RING_LABEL[n.ring] || "Stage";
            const instLabel =
              (INSTRUMENT_LABEL as Record<string, string>)[n.instrument] ||
              n.instrument;
            const primaryEv = n.evidence[0];
            const href = primaryEv ? sourceHref(primaryEv) : "";
            const host = primaryEv ? sourceLabel(primaryEv.source_url) : "";
            const parent = n.parent_event_id
              ? nodesById.get(n.parent_event_id)
              : null;
            const parentInst = parent
              ? (INSTRUMENT_LABEL as Record<string, string>)[parent.instrument] ||
                parent.instrument
              : null;
            const mutations = mutationsByEvent.get(n.event_id) ?? [];

            return (
              <li
                key={n.event_id}
                className="p-3.5 rounded-lg bg-[rgba(4,18,40,0.7)] border border-[rgba(224,208,171,0.18)] space-y-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded bg-[rgba(224,208,171,0.1)] text-[#e0d0ab] font-mono text-[10px] uppercase">
                    {laneLabel}
                  </span>
                  <span className="font-mono text-[11px] text-[#8fa2bd]">
                    {n.event_date}
                  </span>
                </div>

                {n.date_source === "ingested" && (
                  <div className="text-[9px] font-mono text-[#8fa2bd]">
                    date of Tark ingestion
                  </div>
                )}

                <div>
                  <div className="font-semibold text-sm text-[#f4ecd8]">
                    {instLabel}
                  </div>
                  {n.actor && (
                    <div className="text-[11px] text-[#8fa2bd]">
                      {n.actor.name}
                      {n.actor.tier !== null && (
                        <span className="ml-1 text-[10px] text-[#5fe3f5] font-mono">
                          Tier {n.actor.tier}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {parent && parentInst && (
                  <div className="text-[10px] font-mono text-[#8fa2bd]">
                    follows {parentInst} of {parent.event_date}
                  </div>
                )}

                {n.summary && (
                  <p className="text-[11px] text-[#e8e0cf] leading-relaxed">
                    {n.summary}
                  </p>
                )}

                {/* What-changed Mutation Badge */}
                {mutations.map((m, mIdx) => (
                  <div
                    key={mIdx}
                    className="p-1.5 rounded bg-amber-950/40 border border-amber-600/30 text-[10px] font-mono text-amber-300"
                  >
                    {m.headline}
                  </div>
                ))}

                {href && (
                  <div className="pt-1">
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open source: ${host}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[rgba(1,148,168,0.15)] border border-[rgba(95,227,245,0.3)] text-[#5fe3f5] text-[10px] font-mono"
                    >
                      <span>Source: {host}</span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  </div>
                )}
              </li>
            );
          })}

          {/* Ghost Node for Mobile */}
          {showGhost && (
            <li
              data-testid="ghost-node-mobile"
              className="p-3.5 rounded-lg border-2 border-dashed border-[rgba(224,208,171,0.35)] bg-[rgba(4,18,40,0.35)] space-y-1.5 text-xs text-[#8fa2bd]"
            >
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#e0d0ab]">
                <span
                  className="w-1.5 h-1.5 rounded-full border border-[#e0d0ab]"
                  aria-hidden="true"
                />
                <span>Next Anticipated Stage ({RING_LABEL[ghostLane]})</span>
              </div>
              <p className="text-[11px] leading-relaxed italic text-[#e8e0cf]">
                {program.gap?.sentence}
              </p>
            </li>
          )}
        </ol>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. RIPPLES SECTION
          ───────────────────────────────────────────────────────────── */}
      {program.ripples && program.ripples.length > 0 && (
        <section className="p-4 rounded-lg bg-[rgba(4,18,40,0.6)] border border-[rgba(224,208,171,0.15)] space-y-3">
          <h4 className="text-xs font-mono uppercase tracking-wider text-[#e0d0ab]">
            Cross-Program Policy Ripples
          </h4>
          <div className="space-y-2">
            {program.ripples.map((rip, idx) => {
              const href = rip.evidence ? sourceHref(rip.evidence) : "";
              const host = rip.evidence
                ? sourceLabel(rip.evidence.source_url)
                : "";
              const isUpstream = rip.direction === "upstream";

              return (
                <div
                  key={idx}
                  className="p-2.5 rounded bg-[#031124] border border-[rgba(224,208,171,0.1)] text-xs space-y-1"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[#f4ecd8]">
                      {isUpstream
                        ? `Cites ${rip.other_name}`
                        : `Cited by ${rip.other_name}`}
                    </span>
                    {rip.anchor_kind === "learned" && rip.p !== null && (
                      <span className="text-[10px] font-mono text-[#5fe3f5] bg-[#0194a8]/10 px-1.5 py-0.5 rounded">
                        model link, p = {rip.p.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {rip.evidence?.quote && (
                    <blockquote className="text-[11px] text-[#8fa2bd] italic pl-2 border-l border-[rgba(224,208,171,0.2)]">
                      "{rip.evidence.quote}"
                    </blockquote>
                  )}

                  {href && (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open source: ${host}`}
                      className="inline-flex items-center gap-1 text-[10px] font-mono text-[#5fe3f5] hover:underline"
                    >
                      <span>{host}</span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

export default ProgramLineage;
