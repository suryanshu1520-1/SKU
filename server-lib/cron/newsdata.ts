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

  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    console.error("[newsdata] CRON_SECRET is not configured on the server");
    if (res) return res.status(500).json({ error: "Server misconfiguration: CRON_SECRET not configured" });
    throw new Error("Server misconfiguration: CRON_SECRET not configured");
  }

  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (token !== cronSecret) {
    console.warn("[newsdata] Unauthorized attempt rejected");
    if (res) return res.status(401).json({ error: "Unauthorized" });
    throw new Error("Unauthorized");
  }

  try {
    console.log("[newsdata] Triggering unified pipeline...");
    const result = await runPolicyPipeline();
    console.log("[newsdata] Pipeline complete", result);

    if (result.processed_count > 0) {
      // Fire-and-forget notification to IndexNow (Bing & Copilot)
      import("../seo/indexnow.js")
        .then(({ submitToIndexNow }) => {
          submitToIndexNow([
            "https://www.tark.live/intelligence",
            "https://www.tark.live/daily-edition",
            "https://www.tark.live/sitemap-news.xml"
          ]).catch(() => {});
        })
        .catch(() => {});
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("[newsdata] Pipeline failed:", error);
    return res.status(500).json({ error: error.message || "Pipeline failed" });
  }
}
