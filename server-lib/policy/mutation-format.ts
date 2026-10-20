/**
 * server-lib/policy/mutation-format.ts
 *
 * Formats verified numeric fact mutations and builds deterministic AMENDS edges.
 * TASK_085M
 */

import { compareEv, type Ev } from "./lineage.ts";

export interface FormatChangeInput {
  metric: string;
  unit?: string;
  prevValueText?: string;
  curValueText?: string;
  prev?: string;
  cur?: string;
  prevQuote?: string;
  curQuote?: string;
  prevUrl?: string;
  curUrl?: string;
  effectiveAt?: string | null;
}

export interface FormattedMutation {
  headline: string;
  effectiveAt: string | null;
  sources: Array<{ quote: string; url: string }>;
}

/**
 * Pure formatter for fact changes:
 * { metric: "Outlay", prev: "₹19,744 crore", cur: "₹21,000 crore" }
 * -> headline: "Outlay: ₹19,744 crore → ₹21,000 crore"
 * Values are printed exactly as stored in value_text, never recomputed.
 */
export function formatChange(input: FormatChangeInput): FormattedMutation {
  const prev = input.prevValueText ?? input.prev ?? "";
  const cur = input.curValueText ?? input.cur ?? "";
  const headline = `${input.metric}: ${prev} → ${cur}`;
  const effectiveAt = input.effectiveAt ?? null;

  const sources: Array<{ quote: string; url: string }> = [];
  if (input.prevQuote || input.prevUrl) {
    sources.push({
      quote: input.prevQuote ?? "",
      url: input.prevUrl ?? "",
    });
  }
  if (input.curQuote || input.curUrl) {
    sources.push({
      quote: input.curQuote ?? "",
      url: input.curUrl ?? "",
    });
  }

  return {
    headline,
    effectiveAt,
    sources,
  };
}

export interface MutationRow {
  mutation_id?: string;
  id?: string;
  action: "learn" | "replace" | string;
  src_event?: string | null;
  dst_event?: string | null;
  [key: string]: any;
}

export interface MutationEdge {
  src_event: string;
  dst_event: string;
  edge_type: "AMENDS";
  anchor_kind: "fact_mutation";
  p: null;
  model_version: string;
}

export interface MutationConflict {
  mutation_id?: string;
  src_event: string;
  dst_event: string;
  reason: "mutation_order_conflict";
}

export interface BuildMutationEdgesResult {
  edges: MutationEdge[];
  conflicts: MutationConflict[];
}

/**
 * Pure edge builder for verified fact mutations.
 * Enforces:
 * 1. Only action='replace' mutations produce edges ('learn' is ignored)
 * 2. Both src_event and dst_event must exist in eventsById
 * 3. compareEv(src, dst) < 0 strictly (chronological order)
 * 4. If chronology is reversed, logs mutation_order_conflict and skips edge.
 */
export function buildMutationEdges(
  mutations: MutationRow[],
  eventsById: Map<string, Ev>,
  logConflict?: (conflict: MutationConflict) => void
): BuildMutationEdgesResult {
  const edges: MutationEdge[] = [];
  const conflicts: MutationConflict[] = [];

  for (const m of mutations) {
    if (m.action !== "replace") continue;
    if (!m.src_event || !m.dst_event) continue;
    if (m.src_event === m.dst_event) continue;

    const srcEv = eventsById.get(m.src_event);
    const dstEv = eventsById.get(m.dst_event);

    if (!srcEv || !dstEv) continue;

    if (compareEv(srcEv, dstEv) >= 0) {
      const conflict: MutationConflict = {
        mutation_id: m.mutation_id || m.id,
        src_event: m.src_event,
        dst_event: m.dst_event,
        reason: "mutation_order_conflict",
      };
      conflicts.push(conflict);
      if (logConflict) {
        logConflict(conflict);
      } else {
        console.warn(
          `[mutation-linkage] mutation_order_conflict for mutation ${conflict.mutation_id}: src_event (${srcEv.date}) not prior to dst_event (${dstEv.date}).`
        );
      }
      continue;
    }

    edges.push({
      src_event: m.src_event,
      dst_event: m.dst_event,
      edge_type: "AMENDS",
      anchor_kind: "fact_mutation",
      p: null,
      model_version: "mutation_v1",
    });
  }

  return { edges, conflicts };
}
