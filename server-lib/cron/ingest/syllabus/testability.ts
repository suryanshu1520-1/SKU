/**
 * server-lib/cron/ingest/syllabus/testability.ts
 *
 * The testability estimator — the keystone's core logic.
 *
 * Two axes, not one:
 *   frequency = time-decayed, tier-weighted share of past questions on a node
 *   drought   = yearsSinceLast ÷ the node's own mean testing interval
 *               (>1 = overdue; UPSC deliberately tests the under-drilled, so an
 *                overdue high-yield node is a "coiled spring", not noise)
 *
 * Coverage (sparse nodes) is solved by HIERARCHICAL SHRINKAGE: a node with thin
 * Tier-A evidence borrows strength from its parent domain's rate. The shrinkage
 * strength scales with how much Tier-A evidence the node actually has — the same
 * mechanism that stops drought from overfitting a node tested only twice.
 *
 * HONESTY GATE: tier weights, drought weight, half-life etc. are CONFIG. They are
 * only allowed to ship if they beat a frequency-only baseline on the walk-forward
 * backtest (backtest.ts). Nothing here is asserted; everything is validated.
 */

import { childrenOf } from "./nodes.js";
import type { EvidenceTier, Evidence, NodeTestability, SyllabusNode } from "./types.js";

export type TestabilityConfig = {
  /** Half-life (years) for time decay of frequency. Codex hypothesis: ~7. */
  halfLifeYears: number;
  /** "Current" year — the walk-forward cutoff in backtest; the real year in prod. */
  now: number;
  /** Trust weight per evidence tier. The backtest tunes these. */
  tierWeights: Record<EvidenceTier, number>;
  /** Bayesian shrinkage strength K: larger K → sparse nodes lean harder on parent. */
  shrinkageK: number;
  /** How hard "overdue" boosts the score. 0 => frequency-only baseline. */
  droughtWeight: number;
  /** Min Tier-A appearances before drought is trusted (else neutral drought = 1). */
  minAForDrought: number;
  /** Frequency exponent α (compresses the head so a few giant nodes don't swamp). */
  freqExponent: number;
};

export const DEFAULT_CONFIG: TestabilityConfig = {
  halfLifeYears: 7,
  now: new Date().getUTCFullYear(),
  tierWeights: { A: 1.0, B: 0.5, C: 0.3, D: 0.05 },
  shrinkageK: 5,
  droughtWeight: 0.6,
  minAForDrought: 3,
  freqExponent: 0.85,
};

/** exp-decay weight for an evidence year relative to `now`. */
function decay(year: number | undefined, now: number, halfLife: number): number {
  if (year === undefined) return 1; // Tier D floor has no date — flat contribution.
  const age = Math.max(0, now - year);
  return Math.pow(0.5, age / halfLife);
}

function confidenceOf(tierACount: number): NodeTestability["confidence"] {
  if (tierACount >= 8) return "high";
  if (tierACount >= 3) return "medium";
  return "low";
}

/**
 * Drought = yearsSinceLast ÷ meanInterval, from Tier-A years only.
 * Neutral (1) unless the node has >= minAForDrought Tier-A appearances, so a
 * sparsely-tested node can't manufacture a huge "overdue" boost from noise.
 */
function droughtOf(tierAYears: number[], now: number, minA: number): number {
  if (tierAYears.length < minA) return 1;
  const years = [...tierAYears].sort((a, b) => a - b);
  const span = years[years.length - 1] - years[0];
  const meanInterval = span > 0 ? span / (years.length - 1) : 1;
  const sinceLast = now - years[years.length - 1];
  const d = sinceLast / (meanInterval || 1);
  return Math.max(0, Math.min(3, d)); // clamp: no runaway boosts
}

/**
 * Estimate testability for every node. Pure function — no I/O, unit-testable.
 * Returns a Map keyed by nodeId.
 */
export function estimateTestability(
  nodes: SyllabusNode[],
  evidence: Evidence[],
  config: Partial<TestabilityConfig> = {}
): Map<string, NodeTestability> {
  const cfg: TestabilityConfig = { ...DEFAULT_CONFIG, ...config };

  // 1) Accumulate per-node raw frequency (tier-weighted, time-decayed) + Tier-A years.
  const rawFreq = new Map<string, number>();
  const tierAYears = new Map<string, number[]>();
  for (const n of nodes) {
    rawFreq.set(n.id, 0);
    tierAYears.set(n.id, []);
  }
  for (const e of evidence) {
    if (!rawFreq.has(e.nodeId)) continue; // ignore evidence for unknown nodes
    const w = (cfg.tierWeights[e.tier] ?? 0) * (e.weight ?? 1) * decay(e.year, cfg.now, cfg.halfLifeYears);
    rawFreq.set(e.nodeId, (rawFreq.get(e.nodeId) as number) + w);
    if (e.tier === "A" && e.year !== undefined) {
      (tierAYears.get(e.nodeId) as number[]).push(e.year);
    }
  }

  // 2) Normalize raw frequency to 0..1 (relative to the hottest node).
  let maxFreq = 0;
  for (const v of rawFreq.values()) if (v > maxFreq) maxFreq = v;
  const freqNorm = new Map<string, number>();
  for (const [id, v] of rawFreq) freqNorm.set(id, maxFreq > 0 ? v / maxFreq : 0);

  // 3) Parent means for shrinkage: a domain's rate = mean of its children's freqNorm.
  //    Top-level nodes (no parent) shrink toward the global mean.
  const globalMean = avg([...freqNorm.values()]);
  const parentMean = new Map<string, number>();
  for (const n of nodes) {
    if (n.parent === null) {
      const kids = childrenOf(n.id).map((c) => freqNorm.get(c.id) ?? 0);
      parentMean.set(n.id, kids.length ? avg(kids) : globalMean);
    }
  }

  // 4) Combine: shrink → apply exponent → drought boost → renormalize to 0..1.
  const shrunk = new Map<string, number>();
  for (const n of nodes) {
    const nA = (tierAYears.get(n.id) as number[]).length;
    const self = freqNorm.get(n.id) ?? 0;
    const anchor = n.parent !== null ? parentMean.get(n.parent) ?? globalMean : globalMean;
    // Bayesian shrinkage toward the parent/domain rate; strength = K.
    const s = (nA * self + cfg.shrinkageK * anchor) / (nA + cfg.shrinkageK);
    shrunk.set(n.id, Math.pow(s, cfg.freqExponent));
  }

  const scored = new Map<string, { score: number; frequency: number; drought: number; nA: number }>();
  let maxScore = 0;
  for (const n of nodes) {
    const nA = (tierAYears.get(n.id) as number[]).length;
    const base = shrunk.get(n.id) ?? 0;
    const drought = droughtOf(tierAYears.get(n.id) as number[], cfg.now, cfg.minAForDrought);
    const droughtMult = 1 + cfg.droughtWeight * Math.max(0, drought - 1);
    const score = base * droughtMult;
    if (score > maxScore) maxScore = score;
    scored.set(n.id, { score, frequency: freqNorm.get(n.id) ?? 0, drought, nA });
  }

  const out = new Map<string, NodeTestability>();
  for (const n of nodes) {
    const s = scored.get(n.id)!;
    out.set(n.id, {
      nodeId: n.id,
      score: maxScore > 0 ? s.score / maxScore : 0,
      frequency: s.frequency,
      drought: s.drought,
      tierACount: s.nA,
      confidence: confidenceOf(s.nA),
    });
  }
  return out;
}

/** Node ids ranked by testability, descending. */
export function rankByTestability(t: Map<string, NodeTestability>): string[] {
  return [...t.values()].sort((a, b) => b.score - a.score).map((x) => x.nodeId);
}

function avg(xs: number[]): number {
  if (!xs.length) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}
