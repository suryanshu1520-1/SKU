/**
 * server-lib/cron/ingest/cluster.ts
 *
 * Tier 2 — cluster near-duplicate coverage into one Story{sources[]} and pick
 * the authority-ranked lead. Pure functions over vectors + candidates so they
 * can be unit-tested without any network (see the local embedder).
 *
 * Algorithm: greedy single-pass centroid clustering. Candidates are visited in
 * descending authority so the most authoritative source anchors each cluster.
 * O(n·k) — trivial at ~40 items/day.
 */

import { cosine } from "./embeddings.js";
import type { Candidate, Story } from "./types.js";

// ------------------------------------------------------------
// Source authority (who wins when the same story is covered by several)
// ------------------------------------------------------------
const AUTHORITY: Record<string, number> = {
  PIB: 100,
  RBI: 96,
  PRS: 92,
  WIKIPEDIA: 60,
  "UN NEWS": 58,
  "INDIAN EXPRESS": 45,
  "THE HINDU": 44,
  "BUSINESS STANDARD": 40,
  LIVEMINT: 39,
};

export function authorityOf(c: Candidate): number {
  if (AUTHORITY[c.source] != null) return AUTHORITY[c.source];
  if (c.tier === "primary") return 80;
  if (c.tier === "world") return 55;
  return 35;
}

/** Text used to embed a candidate for similarity. Headline dominates. */
export function embedText(c: Candidate): string {
  return `${c.headline}. ${c.body.slice(0, 280)}`;
}

function centroid(vectors: number[][], idx: number[]): number[] {
  const dim = vectors[idx[0]].length;
  const c = new Array<number>(dim).fill(0);
  for (const i of idx) {
    const v = vectors[i];
    for (let d = 0; d < dim; d++) c[d] += v[d];
  }
  // Renormalize to unit length so cosine == dot product downstream.
  let n = 0;
  for (const x of c) n += x * x;
  n = Math.sqrt(n) || 1;
  return c.map((x) => x / n);
}

/**
 * Group candidate indices into clusters. Returns arrays of member indices,
 * each ordered so the highest-authority member is first.
 */
export function clusterCandidates(
  cands: Candidate[],
  vectors: number[][],
  threshold: number
): number[][] {
  // Visit in descending authority → the anchor of each cluster is its lead.
  const order = cands.map((_, i) => i).sort((a, b) => authorityOf(cands[b]) - authorityOf(cands[a]));

  const clusters: { members: number[]; centroid: number[] }[] = [];
  for (const i of order) {
    let best = -1;
    let bestSim = threshold;
    for (let c = 0; c < clusters.length; c++) {
      const sim = cosine(vectors[i], clusters[c].centroid);
      if (sim >= bestSim) {
        bestSim = sim;
        best = c;
      }
    }
    if (best === -1) {
      clusters.push({ members: [i], centroid: vectors[i] });
    } else {
      clusters[best].members.push(i);
      clusters[best].centroid = centroid(vectors, clusters[best].members);
    }
  }
  return clusters.map((c) => c.members);
}

/** Build a Story from a group of member indices (authority-ranked). */
export function makeStory(cands: Candidate[], memberIdx: number[]): Story {
  const members = memberIdx
    .map((i) => cands[i])
    .sort((a, b) => authorityOf(b) - authorityOf(a));
  const sources = Array.from(new Set(members.map((m) => m.source)));
  return { lead: members[0], members, sources };
}

/** The centroid of a story's members — used for cross-run dedup. */
export function storyCentroid(
  story: Story,
  cands: Candidate[],
  vectors: number[][]
): number[] {
  const idx = story.members
    .map((m) => cands.indexOf(m))
    .filter((i) => i >= 0);
  return centroid(vectors, idx.length ? idx : [0]);
}
