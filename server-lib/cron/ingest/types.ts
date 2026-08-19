/**
 * server-lib/cron/ingest/types.ts
 *
 * Shared types for the UNIFIED ingestion module (P2 consolidation).
 *
 * This module replaces the four drifted current_affairs codepaths
 * (pipeline.ts / scrape.ts / internal/worker.ts / scripts/run-scraper.ts)
 * with a single, source-adapter-driven pipeline. See
 * docs/news-intelligence-architecture.md (Addendum, 2026-08-19) for the
 * live-verified source strategy this implements.
 */

/** Language a source publishes in. Hindi sources are translated at synthesis. */
export type SourceLang = "en" | "hi";

/**
 * Extractability tier — the axis that actually governs a $0 scraper:
 *  - "primary": first-source, full-text, no paywall (RBI, PRS, PIB)
 *  - "world":   international spine (Wikipedia Current Events)
 *  - "wire":    mainstream news RSS — truncated/paywalled, headline-pointers
 */
export type SourceTier = "primary" | "world" | "wire";

/** A discovered candidate item, before body extraction. */
export type RawRef = {
  /** Canonical, unique URL — the dedup key and the stored `url`. */
  url: string;
  title: string;
  pubDate?: string | null;
  /**
   * Pre-extracted body, when the discover step already has the full text
   * (e.g. Wikipedia Current Events, where each event line IS the story).
   */
  body?: string | null;
  /** Optional ministry hint the source already knows (e.g. PIB header). */
  ministryHint?: string | null;
};

/** Full body text for one item, after extraction. */
export type Extracted = {
  title: string;
  body: string;
};

/** A source adapter: how to discover items and extract their bodies. */
export type SourceAdapter = {
  /** Stable id — used as the stored `source` tag AND the reputation id. */
  id: string;
  label: string;
  tier: SourceTier;
  lang: SourceLang;
  enabled: boolean;
  /**
   * Items whose body is already a complete, sourced summary (Wikipedia).
   * These bypass LLM synthesis and the no-text gate — the line is the bullet.
   */
  preSummarized?: boolean;
  /** Per-source override of the no-text-no-story threshold (chars). */
  minBodyChars?: number;
  /** List candidate items (headlines + urls, optionally pre-extracted body). */
  discover: () => Promise<RawRef[]>;
  /** Fetch + extract full body for one ref. Return null when unusable. */
  extract: (ref: RawRef) => Promise<Extracted | null>;
};

/**
 * A fully-extracted item awaiting clustering + synthesis (Tier 1 output).
 * The orchestrator gathers these across all sources before Tier 2 clusters them.
 */
export type Candidate = {
  source: string;
  tier: SourceTier;
  lang: SourceLang;
  url: string;
  headline: string;
  body: string;
  ministryHint?: string | null;
  preSummarized?: boolean;
  /** Ready-made bullets for pre-summarized sources (Wikipedia). */
  bullets?: string[];
};

/**
 * A cluster of candidates that all cover the SAME underlying story
 * (Tier 2 output). `lead` is the authority-ranked representative.
 */
export type Story = {
  lead: Candidate;
  members: Candidate[];
  /** Distinct source ids in the cluster, authority-ordered. */
  sources: string[];
};

export type IngestOptions = {
  /** Restrict to this subset of adapter ids (default: all enabled). */
  sources?: string[];
  /** Cap items discovered per source (default 8). */
  maxItemsPerSource?: number;
  /** Cap items ingested across the whole run (default 24). */
  maxTotalItems?: number;
  /** Soft wall-clock deadline in ms (default 50_000 — Vercel-safe). */
  timeBudgetMs?: number;
  /** Consult source_reputation exponential backoff before hitting a source. */
  respectReputation?: boolean;
  /** No-text-no-story gate: drop items whose body is shorter than this. */
  minBodyChars?: number;
};

export type SourceStat = {
  discovered: number;
  processed: number;
  dropped: number;
};

export type IngestResult = {
  status: "success" | "degraded" | "warning";
  processed: number;
  dropped_no_text: number;
  filtered: number;
  duplicates: number;
  /** Near-duplicate candidates merged into a lead story (Tier 2). */
  clustered_merged: number;
  /** Candidates dropped as semantic dupes of a recently-stored story. */
  cross_run_duplicates: number;
  errors: number;
  total_discovered: number;
  by_source: Record<string, SourceStat>;
  /** Which embedding mode Tier 2 used this run. */
  embed_mode?: "gemini" | "local";
};
