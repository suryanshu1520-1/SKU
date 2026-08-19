/**
 * server-lib/cron/ingest/syllabus/types.ts
 *
 * The Testability Graph — shared types for the syllabus keystone.
 *
 * This is the reservoir the ingestion pipe fills: a persistent graph where every
 * ingested story attaches to a syllabus node, and the SAME per-node testability
 * estimate drives (a) the relevance gate, (b) significance ranking, (c) the
 * per-aspirant Coverage Ledger, and (d) spaced repetition.
 *
 * Design notes (see docs/handoffs/innovation-session-superprompt.md session):
 *  - Testability is TWO axes: frequency (how often tested) AND drought (overdue
 *    relative to a node's own rhythm). See testability.ts.
 *  - Coverage is solved by hierarchical shrinkage over an evidence stack ranked
 *    by trust (Tier A..D). Only Tier A may judge the backtest.
 */

export type Paper = "GS1" | "GS2" | "GS3" | "GS4" | "PRELIMS" | "CSAT";

/**
 * Evidence provenance, ranked by trust:
 *   A = official UPSC PYQs (ground truth; the ONLY tier allowed in the backtest)
 *   B = internal 1,722-bank + open corpora (coverage-fill; noisier)
 *   C = coaching-compilation topic titles (contemporary salience; not questions)
 *   D = syllabus floor (the node exists in the official syllabus → nonzero prior)
 */
export type EvidenceTier = "A" | "B" | "C" | "D";

/** One historical testability signal attached to a node. */
export type Evidence = {
  nodeId: string;
  tier: EvidenceTier;
  /** Exam/publication year. Undefined only for Tier D (structural floor). */
  year?: number;
  paper?: Paper;
  marks?: number;
  /** Optional weight (e.g. a Mains 15-marker > a Prelims 2-marker). Default 1. */
  weight?: number;
};

/** A node in the syllabus graph — the reservoir's spine. */
export type SyllabusNode = {
  /** Stable, hierarchical, human-readable id, e.g. "GS2.POL.FEDERALISM". */
  id: string;
  paper: Paper;
  /** Root→leaf display path; also used to find the parent. */
  path: string[];
  /** Parent node id, or null for a top-level domain. */
  parent: string | null;
  /** Official syllabus phrasing + curated synonyms — the text we embed. */
  gloss: string;
  /** High-signal entities/acronyms that co-occur with this node. */
  entities: string[];
  /** L2-normalized embedding of the node text. Filled at load/build time. */
  embedding?: number[];
};

/** Per-node testability estimate + its honest provenance (the output object). */
export type NodeTestability = {
  nodeId: string;
  /** 0..1 final testability (frequency × drought, shrunk). Feeds significance + ledger. */
  score: number;
  /** 0..1 time-decayed, tier-weighted frequency (before drought + shrinkage). */
  frequency: number;
  /** yearsSinceLast ÷ meanInterval; >1 = overdue ("coiled spring"). 1 = neutral. */
  drought: number;
  /** Count of TIER-A appearances — the shrinkage denominator + confidence driver. */
  tierACount: number;
  /** Drives the Coverage instrument: how much we trust this estimate. */
  confidence: "low" | "medium" | "high";
};
