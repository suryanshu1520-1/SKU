/**
 * server-lib/cron/scrape.ts  —  /api/cron/scrape (CRON_SECRET-guarded)
 *
 * Legacy route, retained for compatibility. Now delegates to the unified
 * ingest module instead of maintaining its own RSS+regex copy.
 */

import { runIngest } from "./ingest/orchestrator.js";

export default async function handler(req: any, res: any) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    console.error("[scrape] CRON_SECRET is not configured on the server");
    if (res) return res.status(500).json({ error: "Server misconfiguration: CRON_SECRET not configured" });
    throw new Error("Server misconfiguration: CRON_SECRET not configured");
  }

  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (token !== cronSecret) {
    console.warn("[scrape] Unauthorized attempt rejected");
    if (res) return res.status(401).json({ error: "Unauthorized" });
    throw new Error("Unauthorized");
  }

  const result = await runIngest({ timeBudgetMs: 25_000, respectReputation: true });

  if (res) return res.status(200).json(result);
  return result;
}
