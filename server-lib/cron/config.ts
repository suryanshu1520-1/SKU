export type CronConfig = {
  feeds: string[];
  maxItemsPerFeed: number;
  aiEndpointUrl: string;

  supabaseUrl: string;
  supabaseServiceRoleKey: string;

  timeoutMs: number;
  maxConcurrency: number;

  browserHeaders: Record<string, string>;
};

function getEnv(): Record<string, string | undefined> {
  // Avoid relying on Node `process` types under non-node tsconfigs.
  const p = (globalThis as any)?.process;
  return (p && p.env) ? (p.env as Record<string, string | undefined>) : {};
}

function env(name: string): string | undefined {
  const e = getEnv();
  return e[name];
}

function splitList(v: string | undefined): string[] {
  if (!v) return [];
  return v
    .split(/[\n,]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getCronConfig(): CronConfig {
  // 1. Fetch from Environment Variables first
  let feeds = splitList(env("FEEDS") || env("RSS_FEEDS") || "");

  // 2. If the array is empty, force the fallback URLs
  if (feeds.length === 0) {
    feeds = [
      "https://economictimes.indiatimes.com/news/economy/policy/rssfeeds/2142142220.cms",
      "https://www.livemint.com/rss/economy",
      "https://www.thehindu.com/news/national/feeder/default.rss"
    ];
  }

  const maxItemsPerFeed = Math.max(
    1,
    Number(env("MAX_ITEMS_PER_FEED") ?? 5)
  );

  const timeoutMs = Math.max(1_000, Number(env("TIMEOUT_MS") ?? 15_000));
  const maxConcurrency = Math.max(
    1,
    Number(env("MAX_CONCURRENCY") ?? 3)
  );

  const aiEndpointUrl =
    env("AI_ENDPOINT_URL") ??
    "https://sku1-meta-llama-llama-3-1-8b-instruct.hf.space/run/chat_fn";

  const supabaseUrl =
    env("SUPABASE_URL") ??
    "https://ixngfxaerlkkcacrbdgc.supabase.co";

  const supabaseServiceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  return {
    feeds,
    maxItemsPerFeed,
    aiEndpointUrl,
    supabaseUrl,
    supabaseServiceRoleKey,
    timeoutMs,
    maxConcurrency,
    browserHeaders: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  };
}
