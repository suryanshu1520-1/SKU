/**
 * server-lib/cron/ingest/syllabus/backtest.ts
 *
 * The honesty gate: walk-forward validation of the testability model.
 *
 * A weight/knob is only allowed to ship if it BEATS a frequency-only baseline
 * here. This is how we "leverage more content aggressively without going
 * dishonest" (the user's ask): Tier A is the sole judge; Tiers B/C/D are
 * contestants that must earn recall.
 *
 * Metric — later_PYQ_recall@k: for each cutoff year Y, estimate testability using
 * ONLY evidence from before Y (no leakage), rank nodes, take the top-K, and
 * measure the fraction of nodes ACTUALLY tested in year Y (Tier A only) that
 * appear in the top-K. Average across cutoff years.
 *
 * Run: tsx server-lib/cron/ingest/syllabus/backtest.ts  (once Tier-A data exists)
 */

import { estimateTestability, rankByTestability, type TestabilityConfig } from "./testability.js";
import type { Evidence, SyllabusNode } from "./types.js";

export type BacktestResult = {
  k: number;
  /** Mean recall@k across all evaluated cutoff years. */
  recallAtK: number;
  perCutoff: { year: number; recall: number; hits: number; actual: number }[];
};

/** Nodes actually tested (Tier A) in exactly year Y. */
function actualNodesInYear(evidence: Evidence[], year: number): Set<string> {
  const s = new Set<string>();
  for (const e of evidence) {
    if (e.tier === "A" && e.year === year) s.add(e.nodeId);
  }
  return s;
}

/** Evidence usable for training as-of cutoff Y: dated items strictly before Y;
 *  Tier-D structural floor (no year) always allowed. No future leakage. */
function trainingEvidence(evidence: Evidence[], cutoff: number): Evidence[] {
  return evidence.filter((e) => e.year === undefined || e.year < cutoff);
}

export function laterPyqRecallAtK(
  nodes: SyllabusNode[],
  evidence: Evidence[],
  k: number,
  evalYears: number[],
  baseConfig: Partial<TestabilityConfig> = {}
): BacktestResult {
  const perCutoff: BacktestResult["perCutoff"] = [];

  for (const Y of evalYears) {
    const actual = actualNodesInYear(evidence, Y);
    if (actual.size === 0) continue; // nothing tested that year → skip

    const train = trainingEvidence(evidence, Y);
    const testability = estimateTestability(nodes, train, { ...baseConfig, now: Y });
    const topK = new Set(rankByTestability(testability).slice(0, k));

    let hits = 0;
    for (const nodeId of actual) if (topK.has(nodeId)) hits++;
    perCutoff.push({ year: Y, recall: hits / actual.size, hits, actual: actual.size });
  }

  const recallAtK = perCutoff.length
    ? perCutoff.reduce((s, c) => s + c.recall, 0) / perCutoff.length
    : 0;
  return { k, recallAtK, perCutoff };
}

/**
 * The decisive comparison: does the drought axis (and the extra evidence tiers)
 * actually beat plain frequency? If `full.recallAtK <= frequencyOnly.recallAtK`,
 * DO NOT ship the extra complexity.
 */
export function compareConfigs(
  nodes: SyllabusNode[],
  evidence: Evidence[],
  k: number,
  evalYears: number[]
): { frequencyOnly: BacktestResult; full: BacktestResult; droughtEarnsItsPlace: boolean } {
  const frequencyOnly = laterPyqRecallAtK(nodes, evidence, k, evalYears, {
    droughtWeight: 0, // disable the drought axis → pure decayed frequency
  });
  const full = laterPyqRecallAtK(nodes, evidence, k, evalYears, {});
  return {
    frequencyOnly,
    full,
    droughtEarnsItsPlace: full.recallAtK > frequencyOnly.recallAtK,
  };
}
