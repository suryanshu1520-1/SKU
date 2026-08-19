/**
 * server-lib/cron/scrape.ts  —  /api/cron/scrape (CRON_SECRET-guarded)
 *
 * Legacy route, retained for compatibility. Now delegates to the unified
 * ingest module instead of maintaining its own RSS+regex copy.
 */

import { runIngest } from "./ingest/orchestrator.js";

export default async function handler(req: any, res: any) {
  const authHeader = req.headers["authorization"] || "";
  if (
    !authHeader.includes(`Bearer ${process.env.CRON_SECRET}`) &&
    req.query?.cron_secret !== process.env.CRON_SECRET
  ) {
    if (res) return res.status(401).json({ error: "Unauthorized" });
    throw new Error("Unauthorized");
  }

  const result = await runIngest({ timeBudgetMs: 25_000, respectReputation: true });

  if (res) return res.status(200).json(result);
  return result;
}
