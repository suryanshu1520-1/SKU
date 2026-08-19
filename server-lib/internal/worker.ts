/**
 * server-lib/internal/worker.ts  —  on-demand per-source worker (Path B)
 *
 * Dispatched by sync-feed.ts (one call per eligible source) when a user clicks
 * "Sync Feed". Now a thin wrapper over the unified ingest module: it processes
 * exactly the requested source through the same single path everything else
 * uses. Source-health reporting to source_reputation happens inside runIngest.
 */

import { runIngest } from "../cron/ingest/orchestrator.js";
import { getSources } from "../cron/ingest/sources.js";

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  // Authenticate via internal worker secret.
  const workerSecret = process.env.INTERNAL_WORKER_SECRET || "";
  if (req.headers.authorization !== `Bearer ${workerSecret}`) {
    console.error("[worker] Auth failed");
    return res.status(403).json({ error: "Unauthorized" });
  }

  const sourceKey: string | undefined = req.query?.source;
  if (!sourceKey) {
    return res.status(400).json({ error: "Missing required query parameter: source" });
  }

  const normalized = sourceKey.toUpperCase();
  const matched = getSources([normalized]);
  if (matched.length === 0) {
    return res.status(400).json({
      error: `Unknown source: ${sourceKey}`,
      supported: getSources().map((s) => s.id),
    });
  }

  try {
    const result = await runIngest({
      sources: [normalized],
      maxItemsPerSource: 3,
      maxTotalItems: 3,
      timeBudgetMs: 25_000,
      respectReputation: false, // sync-feed already applied the backoff gate
    });

    return res.status(200).json({
      status: "success",
      source: normalized,
      processed: result.processed,
      dropped_no_text: result.dropped_no_text,
      filtered: result.filtered,
      duplicates: result.duplicates,
      total_discovered: result.total_discovered,
    });
  } catch (err: any) {
    console.error(`[worker] CRITICAL FAILURE for ${normalized}:`, err);
    return res.status(500).json({ error: "Scraping failed", details: err.message });
  }
}
