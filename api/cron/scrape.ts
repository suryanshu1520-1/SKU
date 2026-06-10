import type { CronConfig } from "./config.js";
import { getCronConfig } from "./config.js";
import { fetchAndParseRssFeed, extractArticleDescriptionFromUrl } from "./rss.js";
import { getLlama3Insight } from "./ai.js";
import { upsertCurrentAffairs } from "./db.js";
import { createClient } from "@supabase/supabase-js";

// ============================================================================
// CONSTANTS
// ============================================================================

// HARDCODED: reg=3 + lang=1 forces the ENGLISH release index. Do not derive
// this from config — Hindi/regional variants break downstream AI summarization.
const PIB_INDEX_URL = "https://pib.gov.in/AllRelease.aspx?reg=3&lang=1";

// STRICT batch ceiling. 3 deep-fetches + 3 AI calls fits inside Vercel's 10s
// serverless window. Promise.allSettled runs them concurrently, so wall-clock
// cost ≈ slowest single article, not the sum.
const PIB_BATCH_LIMIT = 3;

// Adjust if your Supabase table is named differently (must match db.ts upsert target)
const SUPABASE_TABLE = "current_affairs";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Lazy singleton — avoids creating the client at module load when env vars
// may not be present (e.g. during local type-checking)
let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

// ============================================================================
// SHARED HELPERS (reused by both PIB and RSS pipelines)
// ============================================================================

// Helper to safely extract strings from unpredictable XML-to-JSON parser outputs
function getStr(val: any): string {
  if (typeof val === "string") return val;
  if (!val) return "";
  if (typeof val === "object") {
    if (val._text) return String(val._text);
    if (val["#text"]) return String(val["#text"]);
    if (val._cdata) return String(val._cdata);
    if (val.content) return String(val.content);
    if (val.href) return String(val.href); // Handles <link href="...">
    if (val["$t"]) return String(val["$t"]); // Google News XML style
    if (val._value) return String(val._value);
    if (val.$value) return String(val.$value);
  }
  if (Array.isArray(val) && val.length > 0) return getStr(val[0]);
  return "";
}

// TIER 1: HARD EXCLUSION KEYWORD FILTER (Zero AI cost pre-filter)
const EXCLUDE_KEYWORDS = [
  "MURDER", "RAPE", "ACCIDENT", "ASSAULT", "ARRESTED", "DIED", "DEATH",
  "CREMATED", "CELEBRITY", "CINEMA", "FILM", "BOLLYWOOD", "CRIME",
  "AQUAPLANING", "OBITUARY", "OBIT", "FUNERAL", "VIP PASS", "CONCERT",
  "FESTIVAL", "TRAFFIC JAM", "ROAD CLOSURE", "LOCAL", "NEIGHBOURHOOD",
  "CELEBRATION", "WEDDING", "MARRIAGE", "DROWN", "SUICIDE", "THEFT",
  "ROBBERY", "KIDNAP", "MOLESTATION", "CORRUPTION CASE", "SCAM",
];

function isKeywordExcluded(title: string, description: string): string | null {
  const text = (title + " " + description).toUpperCase();
  for (const keyword of EXCLUDE_KEYWORDS) {
    if (text.includes(keyword)) return keyword;
  }
  return null;
}

// DYNAMIC SOURCE TAGGING
function resolveSourceTag(url: string): string {
  if (url.includes("pib.gov.in")) return "PIB";
  if (url.includes("livemint.com")) return "LIVEMINT";
  if (url.includes("economictimes.indiatimes")) return "ECONOMIC TIMES";
  if (url.includes("thehindu.com")) return "THE HINDU";
  return "RSS";
}

// DYNAMIC MINISTRY TAGGING
function resolveMinistryTag(title: string, description: string): string {
  const t = (title + " " + description).toUpperCase();
  if (t.includes("FINANCE") || t.includes("ECONOMY") || t.includes("DEFICIT") || t.includes("GOLD") || t.includes("BANK")) {
    return "MINISTRY OF FINANCE";
  }
  if (t.includes("COMMERCE") || t.includes("TRADE") || t.includes("EXPORT") || t.includes("OIL")) {
    return "MINISTRY OF COMMERCE AND INDUSTRY";
  }
  if (t.includes("EARTH SCIENCES") || t.includes("WEATHER") || t.includes("SOLAR") || t.includes("RENEWABLE")) {
    return "MINISTRY OF EARTH SCIENCES";
  }
  if (t.includes("CABINET") || t.includes("GOVT") || t.includes("GOVERNMENT")) {
    return "UNION CABINET";
  }
  return "GENERAL";
}

type ProcessOutcome = "processed" | "filtered";

/**
 * Full single-article pipeline: deep-fetch → keyword filter → AI distill → upsert.
 * Shared by PIB batch tasks and the RSS loop. Throws on hard errors so
 * Promise.allSettled can surface them per-article.
 */
async function processArticle(
  title: string,
  url: string,
  fallbackDesc: string,
  config: CronConfig
): Promise<ProcessOutcome> {
  // Deep-fetch full article text (Fail-Soft: synthesize from headline if empty)
  const rawDescription = await extractArticleDescriptionFromUrl(url, fallbackDesc, config);
  let extractedDescription = typeof rawDescription === "string" ? rawDescription : "";

  if (!extractedDescription || extractedDescription.length < 10) {
    extractedDescription = "Headline: " + title;
    console.warn("[cron][scrape] Using headline fallback for item", { url });
  }

  // Tier-1 keyword exclusion
  const matchedKeyword = isKeywordExcluded(title, extractedDescription);
  if (matchedKeyword) {
    console.warn("[cron][scrape] Tier-1 filtered (keyword match)", { keyword: matchedKeyword, title, url });
    return "filtered";
  }

  console.log("[cron][scrape] Sending to AI", { title, url });

  const aiInsight = await getLlama3Insight(extractedDescription, config);

  if (!aiInsight || !aiInsight.text) {
    console.warn("[cron][scrape] filtered: AI returned null (no insight)", { url });
    return "filtered";
  }

  // CLEAN BULLET POINT ARRAY MAPPING (defensive: verify string before .split)
  const insightText = typeof aiInsight.text === "string" ? aiInsight.text : "";
  const bulletsArray = insightText
    .split("\n")
    .map((line) => (typeof line === "string" ? line.replace(/^[-•*]\s*/, "").trim() : ""))
    .filter((line) => line.length > 0);

  // DATABASE PAYLOAD — matches db.ts signature and frontend contract
  await upsertCurrentAffairs({
    headline: title,
    url,
    source: resolveSourceTag(url),
    ministry: resolveMinistryTag(title, extractedDescription),
    summary: { bullets: bulletsArray },
  });

  return "processed";
}

// ============================================================================
// PIB PIPELINE (PRID anchor parsing — no CSS selectors)
// ============================================================================

interface PibLink {
  url: string;
  prid: number;
  headline: string;
}

/**
 * Regex-walks every <a> tag whose href contains "PRID=". Immune to PIB's
 * markup/class changes, unlike CSS selectors. Returns links de-duplicated by
 * PRID and sorted PRID-DESCENDING (highest PRID = newest release).
 */
function extractPridLinks(html: string): PibLink[] {
  const links: PibLink[] = [];
  const seenPrids = new Set<number>();
  const anchorRegex = /<a\b[^>]*href\s*=\s*["']([^"']*PRID=(\d+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;
  while ((match = anchorRegex.exec(html)) !== null) {
    const prid = parseInt(match[2], 10);
    if (!Number.isFinite(prid) || seenPrids.has(prid)) continue;
    seenPrids.add(prid);

    // Normalize href → absolute URL
    let href = match[1].replace(/&amp;/g, "&").trim();
    if (href.startsWith("//")) href = "https:" + href;
    else if (href.startsWith("/")) href = "https://pib.gov.in" + href;
    else if (!href.startsWith("http")) href = "https://pib.gov.in/" + href;

    // Anchor inner text → plain-text headline
    const headline = match[3]
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ")
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();

    if (!headline) continue; // skip icon/image-only anchors

    links.push({ url: href, prid, headline });
  }

  // Newest first: PRID is a monotonically increasing release ID
  return links.sort((a, b) => b.prid - a.prid);
}

/**
 * Single round-trip dedup: pull only the candidate URLs that already exist,
 * then filter locally. Fail-open on DB errors — upsert is idempotent anyway.
 */
async function filterOutExistingUrls(candidates: PibLink[]): Promise<PibLink[]> {
  if (candidates.length === 0) return [];

  const { data, error } = await getSupabase()
    .from(SUPABASE_TABLE)
    .select("url")
    .in("url", candidates.map((c) => c.url));

  if (error) {
    console.error("[cron][scrape][pib] dedup query failed (fail-open)", error.message);
    return candidates;
  }

  const existing = new Set((data ?? []).map((row: any) => row.url));
  return candidates.filter((c) => !existing.has(c.url));
}

interface PipelineStats {
  processedCount: number;
  filteredCount: number;
  duplicateCount: number;
  errorCount: number;
}

async function runPibPipeline(config: CronConfig): Promise<PipelineStats> {
  const stats: PipelineStats = { processedCount: 0, filteredCount: 0, duplicateCount: 0, errorCount: 0 };

  // 1. Fetch the English release index (hard 8s abort guard)
  let html = "";
  try {
    const response = await fetch(PIB_INDEX_URL, {
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html" },
      signal: AbortSignal.timeout(Math.min(config.timeoutMs ?? 8000, 8000)),
    });
    if (!response.ok) throw new Error(`PIB index returned HTTP ${response.status}`);
    html = await response.text();
  } catch (e: any) {
    console.error("[cron][scrape][pib] index fetch failed", e.message);
    stats.errorCount++;
    return stats;
  }

  // 2. Extract PRID anchors, sorted newest-first by PRID
  const allLinks = extractPridLinks(html);
  console.log("[cron][scrape][pib] PRID links extracted", { count: allLinks.length });

  // 3. Remove URLs already in Supabase BEFORE spending any fetch/AI budget
  const freshLinks = await filterOutExistingUrls(allLinks);
  stats.duplicateCount = allLinks.length - freshLinks.length;

  // 4. STRICT batch cap — only the 3 newest unseen releases per run.
  //    Older backlog items are picked up naturally on subsequent cron ticks.
  const batch = freshLinks.slice(0, PIB_BATCH_LIMIT);
  console.log("[cron][scrape][pib] batch selected", {
    fresh: freshLinks.length,
    duplicates: stats.duplicateCount,
    batchSize: batch.length,
    prids: batch.map((b) => b.prid),
  });

  if (batch.length === 0) return stats;

  // 5. Concurrent processing — wall-clock ≈ slowest article, and one bad
  //    article can never crash the whole function.
  const results = await Promise.allSettled(
    batch.map((link) => processArticle(link.headline, link.url, "", config))
  );

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      result.value === "processed" ? stats.processedCount++ : stats.filteredCount++;
    } else {
      console.error("[cron][scrape][pib] article task failed", {
        url: batch[i].url,
        reason: result.reason?.message ?? String(result.reason),
      });
      stats.errorCount++;
    }
  });

  return stats;
}

// ============================================================================
// RSS PIPELINE (existing feeds loop, now delegating to shared processArticle)
// ============================================================================

async function runRssPipeline(config: CronConfig): Promise<PipelineStats> {
  const stats: PipelineStats = { processedCount: 0, filteredCount: 0, duplicateCount: 0, errorCount: 0 };

  for (const feedUrl of config.feeds ?? []) {
    try {
      console.log("[cron][scrape] fetching feed", { feedUrl });

      const items = (await fetchAndParseRssFeed(feedUrl, config)) || [];
      console.log("[cron][scrape] feed parsed", { feedUrl, itemsCount: items.length });

      const toProcess = items.slice(0, config.maxItemsPerFeed);

      for (const item of toProcess) {
        const itemUrl = getStr(item.link);
        const itemTitle = getStr(item.title);
        const fallbackDesc = getStr(item.contentSnippet);

        if (!itemUrl || !itemTitle) continue;

        try {
          const outcome = await processArticle(itemTitle, itemUrl, fallbackDesc, config);
          outcome === "processed" ? stats.processedCount++ : stats.filteredCount++;
        } catch (e: any) {
          console.error("[cron][scrape] item failed", { itemUrl, error: e.message });
          stats.errorCount++;
        }
      }
    } catch (e: any) {
      console.error("[cron][scrape] Error processing feed", feedUrl, e.message);
      stats.errorCount++;
    }
  }

  return stats;
}

// ============================================================================
// HANDLER
// ============================================================================

export default async function handler(req: any, res: any) {
  const config: CronConfig = getCronConfig();

  console.log("[cron][scrape] starting", {
    feedsCount: config.feeds?.length ?? 0,
    maxItemsPerFeed: config.maxItemsPerFeed,
    timeoutMs: config.timeoutMs,
    pibBatchLimit: PIB_BATCH_LIMIT,
  });

  // PIB first (time-boxed, max 3 concurrent articles), then RSS feeds
  const pibStats = await runPibPipeline(config);
  const rssStats = await runRssPipeline(config);

  const summary = {
    status: "success" as const,
    processedCount: pibStats.processedCount + rssStats.processedCount,
    filteredCount: pibStats.filteredCount + rssStats.filteredCount,
    duplicateCount: pibStats.duplicateCount + rssStats.duplicateCount,
    errorCount: pibStats.errorCount + rssStats.errorCount,
    pib: pibStats,
    rss: rssStats,
  };

  console.log("[cron][scrape] finished", summary);

  if (res) {
    return res.status(200).json(summary);
  }
  return summary;
}
