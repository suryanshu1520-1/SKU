/**
 * server-lib/cron/pipeline.ts  —  DEPRECATED SHIM (P2 consolidation)
 *
 * The old 600-line regex-scraping pipeline (with the headline-only fallback
 * that fabricated stories) has been replaced by the unified ingest module in
 * ./ingest/. This shim keeps the historical `runPolicyPipeline()` export and
 * its response shape so existing callers (cron/newsdata.ts → /api/cron/newsdata)
 * work unchanged while delegating to the single real path.
 *
 * See docs/news-intelligence-architecture.md (Addendum, 2026-08-19).
 */

import { runIngest } from "./ingest/orchestrator.js";

export async function runPolicyPipeline(): Promise<{
  status: string;
  processed_count: number;
  filtered_count: number;
  duplicate_count: number;
  error_count: number;
  total_fetched: number;
  dropped_no_text: number;
  clustered_merged: number;
  cross_run_duplicates: number;
}> {
  // Vercel serverless (api/server maxDuration 30s) — keep a safe wall-clock budget.
  const r = await runIngest({ timeBudgetMs: 25_000, respectReputation: true });
  return {
    status: r.status,
    processed_count: r.processed,
    filtered_count: r.filtered,
    duplicate_count: r.duplicates,
    error_count: r.errors,
    total_fetched: r.total_discovered,
    dropped_no_text: r.dropped_no_text,
    clustered_merged: r.clustered_merged,
    cross_run_duplicates: r.cross_run_duplicates,
  };
}
