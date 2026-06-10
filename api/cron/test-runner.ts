import dotenv from "dotenv";
import scrapeHandler from "./scrape.js";

function createMockRes() {
  const res: any = {};

  res.status = (code: number) => {
    console.log("[res.status]", code);
    return res;
  };

  res.json = (payload: any) => {
    console.log("[res.json]", JSON.stringify(payload, null, 2));
    return res;
  };

  res.end = () => {
    console.log("[res.end]");
    return res;
  };

  return res;
}

async function main() {
  // Ensure env vars are loaded for local runs
  dotenv.config();

  const req: any = {
    method: "GET",
    headers: {},
    body: undefined,
    query: {},
  };

  // These env vars are used by api/cron/config.ts
  // (we’re forcing a real RSS feed and limiting to 2 items for quick tests)
  process.env.FEEDS = "https://www.thehindu.com/news/national/feeder/default.rss";
  process.env.MAX_ITEMS_PER_FEED = "2";

  const res = createMockRes();

  console.log("[test-runner] Starting scrape handler with real feed (happy-path AI enabled)...");

  try {
    // Vercel-style handler signature: (req, res)
    await (scrapeHandler as any)(req, res);
  } catch (err) {
    console.error("[test-runner] Handler exception (unexpected):", err);
    throw err;
  }

  console.log("[test-runner] Done.");
}

main();
