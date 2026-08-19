import { runPolicyPipeline } from "./pipeline.js";

// ============================================================
// PURE HTTP WRAPPER
// Thin entry point for the frontend "Sync Policy Feed" button.
// Delegates all logic to the unified runPolicyPipeline().
// ============================================================
export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = req.headers["authorization"] || "";
  if (
    !authHeader.includes(`Bearer ${process.env.CRON_SECRET}`) &&
    req.query?.cron_secret !== process.env.CRON_SECRET
  ) {
    if (res) return res.status(401).json({ error: "Unauthorized" });
    throw new Error("Unauthorized");
  }

  try {
    console.log("[newsdata] Triggering unified pipeline...");
    const result = await runPolicyPipeline();
    console.log("[newsdata] Pipeline complete", result);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("[newsdata] Pipeline failed:", error);
    return res.status(500).json({ error: error.message || "Pipeline failed" });
  }
}