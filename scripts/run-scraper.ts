/**
 * scripts/run-scraper.ts  —  GitHub Actions daemon (3×/day)
 *
 * Now a thin driver over the unified ingest module. GitHub Actions has no
 * 30s serverless cap, so it runs with a generous budget and higher caps — this
 * is the autonomous path that actually fills the feed.
 *
 * NOTE: this path silently ingested NOTHING for a long time because the LLM
 * keys were never passed to the workflow env — getLlama3Insight had no provider
 * and every item was dropped. The workflow now exports GEMINI_API_KEY /
 * GROQ_API_KEY; runIngest() also warns loudly if neither is present.
 */

import { runIngest } from "../server-lib/cron/ingest/orchestrator.js";

async function run() {
  console.log("=".repeat(60));
  console.log("[scraper-daemon] Unified ingest run");
  console.log("=".repeat(60));

  const result = await runIngest({
    timeBudgetMs: 8 * 60_000, // generous — GH Actions allows up to 360 min
    maxItemsPerSource: 12,
    maxTotalItems: 60,
    respectReputation: true,
  });

  console.log("[scraper-daemon] Result:", JSON.stringify(result, null, 2));

  // Force exit so any dangling keep-alive sockets don't hang the runner.
  process.exit(0);
}

run().catch((err) => {
  console.error("[scraper-daemon] Fatal error:", err);
  process.exit(1);
});
