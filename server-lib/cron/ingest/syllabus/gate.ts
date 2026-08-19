/**
 * server-lib/cron/ingest/syllabus/gate.ts
 *
 * The relevance gate — Tier 2, BEFORE any synthesis token is spent.
 *
 * Each item is embedded once (Gemini SEMANTIC_SIMILARITY) and cosine-matched
 * against the static node matrix in memory. No node match above threshold => the
 * item is non-syllabus noise (petty crime, ceremony, sports) and is dropped
 * pre-LLM. THIS is the lever that makes cost scale with edition size, not
 * ingestion volume.
 *
 * Safety valve (taxonomy-bias): an item that FAILS the gate but comes from a
 * high-authority primary source is NOT silently dropped — it escalates to the
 * `unmapped_high_authority` review lane and becomes a candidate for a new node.
 * (Codex's fix for "the taxonomy rejects a genuinely novel testable theme".)
 */

import { cosine } from "../embeddings.js";
import type { SyllabusNode } from "./types.js";

export type GateMatch = { nodeId: string; sim: number };

export type GateResult = {
  /** True if the item matched at least one node above threshold. */
  passed: boolean;
  /** Best cosine to any node (0 if none). */
  topSim: number;
  /** Top-k matches above threshold, descending — become the item's syllabus tags. */
  matches: GateMatch[];
};

export type GateConfig = {
  /**
   * Min cosine to ANY node to pass. CALIBRATE empirically against a labelled
   * relevant/noise set — this default is a placeholder, not a tuned value.
   */
  threshold: number;
  /** How many node tags to return for a passing item. */
  topK: number;
};

export const DEFAULT_GATE: GateConfig = { threshold: 0.5, topK: 3 };

/**
 * Run the gate for one already-embedded item.
 * Only nodes with a populated embedding participate (call embedNodes() first).
 */
export function relevanceGate(
  itemVec: number[],
  nodes: SyllabusNode[],
  cfg: GateConfig = DEFAULT_GATE
): GateResult {
  const matches: GateMatch[] = [];
  for (const n of nodes) {
    if (!n.embedding) continue;
    const sim = cosine(itemVec, n.embedding);
    if (sim >= cfg.threshold) matches.push({ nodeId: n.id, sim });
  }
  matches.sort((a, b) => b.sim - a.sim);
  return {
    passed: matches.length > 0,
    topSim: matches.length ? matches[0].sim : 0,
    matches: matches.slice(0, cfg.topK),
  };
}

/**
 * Should a gate-failing item still surface (as a candidate new node) because it
 * comes from a trusted primary source? Keeps the graph honest and growing.
 * `authority` is authorityOf(candidate) from cluster.ts (PIB 100, RBI 96, ...).
 */
export function shouldEscalateUnmapped(
  result: GateResult,
  authority: number,
  minAuthority = 90
): boolean {
  return !result.passed && authority >= minAuthority;
}
