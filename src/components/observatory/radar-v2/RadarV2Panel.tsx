/**
 * src/components/observatory/radar-v2/RadarV2Panel.tsx
 *
 * Main Radar API v2 panel component:
 * - Fetches /api/policy-radar/v2 with abort controller
 * - Handles honest states (loading, paused, unavailable, ok-empty, stale)
 * - Program list with URL deep-linking (?tab=ripple&program=<slug>)
 * - Renders ProgramLineage, BossMcq, and SignalsQuadrant
 * TASK_085Q
 */

import React, { useEffect, useState, useMemo } from "react";
import type { RadarV2, Program } from "../../../lib/policy-radar-v2-types.ts";
import { ProgramLineage } from "./ProgramLineage.tsx";
import { BossMcq } from "./BossMcq.tsx";
import { SignalsQuadrant } from "./SignalsQuadrant.tsx";

function formatRelativeTime(isoString?: string | null): string {
  if (!isoString) return "recently";
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMin = Math.floor(diffMs / (60 * 1000));
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return isoString;
  }
}

export function RadarV2Panel({ initialData }: { initialData?: RadarV2 | null }) {
  const [data, setData] = useState<RadarV2 | null>(initialData ?? null);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  // 1. Fetch Radar v2 payload
  useEffect(() => {
    if (initialData) {
      setData(initialData);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    fetch("/api/policy-radar/v2", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          throw new Error("HTTP error " + res.status);
        }
        return res.json();
      })
      .then((json: RadarV2) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.warn("[radar-v2] Failed to fetch payload:", err);
          setData({
            status: "unavailable",
            programs: [],
            node_signals: [],
            coverage: {
              events: 0,
              programs: 0,
              since: null,
              generated_at: new Date().toISOString(),
              last_event_at: null,
            },
            version: "v2",
          });
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [initialData]);

  // 2. Deep linking query param handling
  useEffect(() => {
    if (!data || !data.programs || data.programs.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const paramProgram = params.get("program") || params.get("chain");

    if (paramProgram) {
      const match = data.programs.find((p) => p.slug === paramProgram);
      if (match) {
        setSelectedSlug(match.slug);
        return;
      }
    }

    // Default to first program
    setSelectedSlug(data.programs[0].slug);
  }, [data]);

  const handleSelectProgram = (slug: string) => {
    setSelectedSlug(slug);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", "ripple");
      url.searchParams.set("program", slug);
      url.searchParams.delete("chain");
      window.history.replaceState({}, "", url.toString());
    } catch {
      // Ignored in non-browser envs
    }
  };

  const selectedProgram: Program | null = useMemo(() => {
    if (!data || !data.programs || data.programs.length === 0) return null;
    return (
      data.programs.find((p) => p.slug === selectedSlug) || data.programs[0]
    );
  }, [data, selectedSlug]);

  // ─── STATE 1: LOADING SKELETON ─────────────────────────────────────
  if (loading) {
    return (
      <div
        data-testid="radar-loading"
        className="space-y-4 p-6 rounded-xl bg-[rgba(4,18,40,0.5)] border border-[rgba(224,208,171,0.12)] animate-pulse"
      >
        <div className="h-4 w-48 rounded bg-[rgba(224,208,171,0.15)]" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
          <div className="space-y-3">
            <div className="h-10 rounded bg-[rgba(224,208,171,0.08)]" />
            <div className="h-10 rounded bg-[rgba(224,208,171,0.08)]" />
            <div className="h-10 rounded bg-[rgba(224,208,171,0.08)]" />
          </div>
          <div className="md:col-span-3 space-y-3">
            <div className="h-32 rounded bg-[rgba(224,208,171,0.08)]" />
            <div className="h-24 rounded bg-[rgba(224,208,171,0.08)]" />
          </div>
        </div>
      </div>
    );
  }

  // ─── STATE 2: PAUSED ───────────────────────────────────────────────
  if (data?.status === "paused") {
    return (
      <div
        data-testid="radar-paused"
        className="p-8 rounded-xl bg-[rgba(4,18,40,0.65)] border border-[rgba(224,208,171,0.2)] text-center space-y-3"
      >
        <div className="w-8 h-8 mx-auto rounded-full border border-amber-400/40 flex items-center justify-center text-amber-300 font-mono text-sm">
          !
        </div>
        <p className="text-sm font-medium text-[#f4ecd8] max-w-lg mx-auto">
          Policy Radar is being rebuilt on verified sources. It returns when it
          passes its accuracy checks.
        </p>
      </div>
    );
  }

  // ─── STATE 3: UNAVAILABLE ──────────────────────────────────────────
  if (data?.status === "unavailable") {
    return (
      <div
        data-testid="radar-unavailable"
        className="p-8 rounded-xl bg-[rgba(4,18,40,0.65)] border border-red-500/20 text-center space-y-3"
      >
        <div className="w-8 h-8 mx-auto rounded-full border border-red-400/40 flex items-center justify-center text-red-300 font-mono text-sm">
          ✕
        </div>
        <p className="text-sm font-medium text-[#f4ecd8] max-w-lg mx-auto">
          Policy Radar could not load. Nothing is shown rather than old data.
        </p>
      </div>
    );
  }

  // ─── STATE 4: OK WITH 0 PROGRAMS ───────────────────────────────────
  if (!data?.programs || data.programs.length === 0) {
    return (
      <div
        data-testid="radar-empty"
        className="p-8 rounded-xl bg-[rgba(4,18,40,0.65)] border border-[rgba(224,208,171,0.2)] text-center space-y-3"
      >
        <p className="text-sm font-medium text-[#8fa2bd]">
          No verified policy events yet.
        </p>
      </div>
    );
  }

  const cov = data.coverage;
  const isStale = data.status === "stale";

  return (
    <div data-testid="radar-v2-panel" className="space-y-6">
      {/* ─── STALE BANNER ─────────────────────────────────────────── */}
      {isStale && cov.last_event_at && (
        <div
          data-testid="radar-stale-banner"
          className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs font-mono flex items-center gap-2"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
          <span>
            Stale since {new Date(cov.last_event_at).toLocaleDateString()}
          </span>
        </div>
      )}

      {/* ─── COVERAGE LINE ────────────────────────────────────────── */}
      <div className="text-xs font-mono text-[#8fa2bd] flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(224,208,171,0.12)] pb-2.5">
        <span>
          Built from {cov.events} verified events across {cov.programs} programs
          since {cov.since ?? "earliest record"}. Updated{" "}
          {formatRelativeTime(cov.generated_at)}.
        </span>
        <span className="text-[10px] text-[#5fe3f5] uppercase tracking-wider">
          Radar v2 Verified
        </span>
      </div>

      {/* ─── MAIN CONTENT: PROGRAM LIST + DETAILS ─────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Program List (4 cols) */}
        <aside className="md:col-span-4 space-y-2">
          <h3 className="text-xs font-mono uppercase tracking-wider text-[#e0d0ab] pb-1">
            Tracked Programs ({data.programs.length})
          </h3>
          <div className="space-y-1.5 max-h-[640px] overflow-y-auto pr-1">
            {data.programs.map((prog) => {
              const isSelected = selectedProgram?.slug === prog.slug;
              const lastStep =
                prog.nodes && prog.nodes.length > 0
                  ? prog.nodes[prog.nodes.length - 1]
                  : null;

              return (
                <button
                  key={prog.slug}
                  type="button"
                  onClick={() => handleSelectProgram(prog.slug)}
                  className={`w-full text-left p-3 rounded-lg border text-xs transition-all cursor-pointer ${
                    isSelected
                      ? "border-[#5fe3f5] bg-[#0194a8]/15 shadow-sm"
                      : "border-[rgba(224,208,171,0.12)] bg-[#031124]/70 hover:bg-[#031124] hover:border-[rgba(224,208,171,0.25)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-[#f4ecd8] line-clamp-1">
                      {prog.name}
                    </span>
                    <span className="shrink-0 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[rgba(224,208,171,0.1)] text-[#e0d0ab]">
                      {prog.kind}
                    </span>
                  </div>
                  {lastStep && (
                    <div className="mt-1 text-[11px] font-mono text-[#8fa2bd]">
                      Last update: {lastStep.event_date}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Program Detail Area (8 cols) */}
        <main className="md:col-span-8 space-y-6 min-w-0">
          {selectedProgram && (
            <>
              {/* Program Header */}
              <div className="p-4 rounded-lg bg-[rgba(4,18,40,0.6)] border border-[rgba(224,208,171,0.18)] space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-serif font-normal text-[#f4ecd8]">
                    {selectedProgram.name}
                  </h2>
                  <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-[#0194a8]/20 text-[#5fe3f5] border border-[#5fe3f5]/30">
                    {selectedProgram.kind}
                  </span>
                </div>
                {selectedProgram.nodal && (
                  <div className="text-xs text-[#8fa2bd] font-mono">
                    Nodal Authority: {selectedProgram.nodal}
                  </div>
                )}
              </div>

              {/* Lineage Lanes */}
              <ProgramLineage program={selectedProgram} />

              {/* Boss MCQ (if present) */}
              {selectedProgram.boss_mcq && (
                <BossMcq mcq={selectedProgram.boss_mcq} />
              )}
            </>
          )}

          {/* Syllabus Node Signals Scatter Plot */}
          {data.node_signals && data.node_signals.length > 0 && (
            <SignalsQuadrant signals={data.node_signals} />
          )}
        </main>
      </div>
    </div>
  );
}

export default RadarV2Panel;
