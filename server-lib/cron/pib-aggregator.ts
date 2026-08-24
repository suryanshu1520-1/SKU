/**
 * PIB Aggregator v3 - Production Policy Intelligence Engine
 *
 * Scrapes and synthesizes daily PIB and government policy digests from
 * verified public-domain sources (Lukmaan IAS primary, InsightsIAS defensive fallback,
 * and Official PIB English RSS as tertiary autonomous spine).
 *
 * Distills raw policy text via multi-provider LLM (Gemini primary → Groq fallback)
 * into a high-density, analytical "Policy Dossier" formatted with GS Paper tags,
 * structured quantitative Markdown tables, Prelims Trap Radars, and Mains 360° dimensions.
 *
 * Usage: npx tsx server-lib/cron/pib-aggregator.ts
 */

import { gotScraping } from "got-scraping";
import * as cheerio from "cheerio";
import { llmGenerate } from "../llm.js";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import dotenv from "dotenv";

dotenv.config();

// ============================================================
// CONFIGURATION
// ============================================================
const SCRAPE_TIMEOUT_MS = 15_000;
const MAX_ARTICLES = 5;
const LLM_INPUT_CHAR_LIMIT = 50_000;

const LUKMAAN_PIB_INDEX_URL = "https://blog.lukmaanias.com/category/pib-summary/";
const INSIGHTS_IAS_FALLBACK_URL = "https://www.insightsonindia.com/current-affairs/daily-current-affairs/";
const PIB_OFFICIAL_RSS_URL = "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=1";

// ============================================================
// EDITORIAL SYSTEM PROMPT (UPSC Policy Intelligence Engine)
// ============================================================
const EDITORIAL_SYSTEM_PROMPT = [
  "You are an elite Senior Public Policy Analyst and Director of UPSC Intelligence.",
  "Your task is to transform raw government press releases and coaching highlights into an authoritative, high-density 'Policy Intelligence Dossier'.",
  "",
  "STRUCTURE EACH TOPIC/POLICY WITH THE FOLLOWING BLUEPRINT:",
  "1. Header: '### [Initiative / Policy / Scheme Name]'",
  "2. GS Tag: '**Syllabus Mapping:** GS Paper [1/2/3/4] ([Key Syllabus Subtopics])'",
  "3. Mandate: Use a blockquote ('> ...') for the sovereign mandate, executive intent, or core statutory objective.",
  "4. Data Matrix: Create a clean Markdown table summarizing quantifiable facts (Outlays, Target Deadlines, Beneficiary Criteria, Nodal Ministry/Agency).",
  "5. Prelims Trap Radar: Add a bulleted section titled '**🎯 Prelims Trap Radar**' highlighting subtle distinctions UPSC frequently tests (e.g. Centrally Sponsored vs Central Sector, Constitutional vs Statutory vs Executive body, Mandatory vs Advisory provisions).",
  "6. Mains 360° Dimensions: Add concise bullet points under '**🏛️ Mains Analytical Dimensions**' covering socio-economic impact, federal dynamics, and administrative bottlenecks/way forward.",
  "",
  "EDITORIAL RULES:",
  "- Strip all coaching marketing, institute promotion, subscribe buttons, and commentary boilerplate.",
  "- Bold critical institutional entities, statutory acts, indices, and financial figures.",
  "- Never fabricate facts; extract strictly from the provided policy text.",
  "",
  "OUTPUT FORMAT REQUIREMENT:",
  "Return ONLY a valid JSON object with exactly three keys:",
  "  \"title\": A clean, high-signal editorial title (e.g. 'PIB Policy Dossier: Rural Economy Overhaul, Space Technology Mandates & Bio-Security').",
  "  \"date\": The extracted release date in ISO 8601 format (YYYY-MM-DD). If multiple, use the latest.",
  "  \"content\": The complete Markdown string formatted strictly according to the blueprint above.",
  "Do NOT wrap the response in markdown code blocks like ```json ... ```. Output raw JSON object only."
].join("\n");

// ============================================================
// SUPABASE CLIENT INITIALIZATION
// ============================================================
function getSupabaseClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? "https://ixngfxaerlkkcacrbdgc.supabase.co";
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!supabaseServiceRoleKey) {
    console.warn("[pib-aggregator] WARNING: SUPABASE_SERVICE_ROLE_KEY is empty. DB writes will fail.");
  }

  const options = {
    auth: {
      persistSession: false,
    },
    realtime: {
      transport: WebSocket,
      params: {
        eventsPerSecond: 10,
      },
    },
  };

  return createClient(supabaseUrl, supabaseServiceRoleKey, options);
}

// ============================================================
// SCRAPER: Fetch latest PIB article URLs from Lukmaan IAS
// ============================================================
async function fetchLukmaanArticleLinks(): Promise<{ title: string; url: string }[]> {
  console.log("[pib-aggregator] [1/3] Probing primary source: Lukmaan IAS PIB Index...");

  const response = await gotScraping({
    url: LUKMAAN_PIB_INDEX_URL,
    headerGeneratorOptions: { browsers: [{ name: "chrome" }] },
    timeout: { request: SCRAPE_TIMEOUT_MS },
  });

  const $ = cheerio.load(response.body);
  const articles: { title: string; url: string }[] = [];

  $("a").each((_i, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();

    if (
      text.length > 10 &&
      href.includes("/daily-pib-highlights") &&
      !href.includes("#") &&
      !href.endsWith(".pdf")
    ) {
      const fullUrl = href.startsWith("http")
        ? href
        : "https://blog.lukmaanias.com" + (href.startsWith("/") ? href : "/" + href);

      if (!articles.some((a) => a.url === fullUrl)) {
        articles.push({ title: text, url: fullUrl });
      }
    }
  });

  const limited = articles.slice(0, MAX_ARTICLES);
  console.log(`[pib-aggregator] Lukmaan IAS: Discovered ${articles.length} PIB archives, selecting ${limited.length}`);
  return limited;
}

// ============================================================
// FALLBACK SCRAPER: InsightsIAS Daily Current Affairs + PIB
// ============================================================
async function fetchInsightsIASArticleLinks(): Promise<{ title: string; url: string }[]> {
  console.log("[pib-aggregator] [2/3] Probing fallback source: InsightsIAS Current Affairs...");

  const response = await gotScraping({
    url: INSIGHTS_IAS_FALLBACK_URL,
    headerGeneratorOptions: { browsers: [{ name: "chrome" }] },
    timeout: { request: SCRAPE_TIMEOUT_MS },
  });

  const $ = cheerio.load(response.body);
  const articles: { title: string; url: string }[] = [];

  $("article a, main a, .entry-content a, .td-block-span a, h3 a, h2 a").each((_i, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();

    if (
      text.length > 10 &&
      href.includes("insightsonindia.com") &&
      (text.toLowerCase().includes("pib") || href.toLowerCase().includes("pib"))
    ) {
      if (!articles.some((a) => a.url === href)) {
        articles.push({ title: text, url: href });
      }
    }
  });

  if (articles.length === 0) {
    $("article a, main a, .entry-content a, h3 a, h2 a").each((_i, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().trim();

      if (
        text.length > 15 &&
        href.includes("insightsonindia.com") &&
        (text.toLowerCase().includes("daily") || text.toLowerCase().includes("current"))
      ) {
        if (!articles.some((a) => a.url === href)) {
          articles.push({ title: text, url: href });
        }
      }
    });
  }

  const limited = articles.slice(0, MAX_ARTICLES);
  console.log(`[pib-aggregator] InsightsIAS: Discovered ${articles.length} links, selecting ${limited.length}`);
  return limited;
}

// ============================================================
// TERTIARY FALLBACK: Official Direct PIB English RSS Feed
// ============================================================
async function fetchOfficialPibRssArticles(): Promise<{ title: string; url: string; body?: string }[]> {
  console.log("[pib-aggregator] [3/3] Probing autonomous spine: Official PIB English RSS...");

  try {
    const response = await gotScraping({
      url: PIB_OFFICIAL_RSS_URL,
      headerGeneratorOptions: { browsers: [{ name: "chrome" }] },
      timeout: { request: SCRAPE_TIMEOUT_MS },
    });

    const $ = cheerio.load(response.body, { xmlMode: true });
    const items: { title: string; url: string }[] = [];

    $("item").each((_i, el) => {
      const title = $(el).find("title").text().trim();
      const link = $(el).find("link").text().trim() || $(el).find("guid").text().trim();

      if (title && link && link.startsWith("http")) {
        items.push({ title, url: link });
      }
    });

    console.log(`[pib-aggregator] Official PIB RSS: Discovered ${items.length} releases`);
    return items.slice(0, MAX_ARTICLES);
  } catch (err: any) {
    console.warn(`[pib-aggregator] Official PIB RSS probe failed: ${err.message}`);
    return [];
  }
}

// ============================================================
// SCRAPER: Extract article body using high-precision semantic containers
// ============================================================
async function scrapeArticleBody(url: string): Promise<string> {
  console.log(`[pib-aggregator] Scraping article document: ${url}`);

  try {
    const response = await gotScraping({
      url,
      headerGeneratorOptions: { browsers: [{ name: "chrome" }] },
      timeout: { request: SCRAPE_TIMEOUT_MS },
    });

    const $ = cheerio.load(response.body);

    // Strip noise and promotional boilerplate
    $(
      "script, style, nav, footer, header, .sidebar, .advertisement, " +
      ".social-share, .related-posts, .sharedaddy, .ssba, .comments-area, " +
      ".ez-toc-container, .ez-toc-widget-container, iframe, noscript"
    ).remove();

    // Semantic selectors matching Lukmaan, InsightsIAS, and official PIB ASP.NET containers
    const selectors = [
      ".innner-page-main-about-us-content-right-part", // Official PIB container
      ".elementor-widget-theme-post-content",
      ".entry-content",
      ".td-post-content",
      ".post-content",
      "article",
      "main",
    ];

    let contentContainer = null;
    for (const selector of selectors) {
      const container = $(selector);
      if (container.length > 0 && container.text().trim().length > 100) {
        contentContainer = container;
        break;
      }
    }

    if (!contentContainer || contentContainer.length === 0) {
      contentContainer = $("body");
    }

    const chunks: string[] = [];
    contentContainer.find("h1, h2, h3, h4, p, li, table").each((_i, el) => {
      const tag = el.tagName.toLowerCase();
      if (tag === "table") {
        const tableText = $(el).text().replace(/\s+/g, " ").trim();
        if (tableText.length > 20) chunks.push(tableText);
      } else {
        const text = $(el).text().replace(/\s+/g, " ").trim();
        if (text.length > 20) chunks.push(text);
      }
    });

    const contentText = chunks.join("\n\n");

    if (contentText.length < 100) {
      console.warn(`[pib-aggregator] Article body below threshold (${contentText.length} chars), skipping: ${url}`);
      return "";
    }

    console.log(`[pib-aggregator] Extracted ${contentText.length} clean characters from: ${url}`);
    return contentText;
  } catch (error: any) {
    console.error(`[pib-aggregator] Failed to scrape article body: ${error.message}`);
    return "";
  }
}

// ============================================================
// LLM: Multi-Strategy Distillation & Resilient Parser
// ============================================================
function clampText(input: string, maxChars: number): string {
  return input.length <= maxChars ? input : input.slice(0, maxChars);
}

export type DigestPayload = {
  title: string;
  date: string;
  content: string;
};

/**
 * Bulletproof Multi-Strategy Parser for LLM Distillation Outputs.
 * Handles:
 *  - Direct JSON parse
 *  - Code-fence stripped JSON
 *  - Triple-quote & unescaped newline normalization
 *  - Regex-based key & boundary extraction
 *  - Direct Markdown fallback
 */
function parseLlmDigest(raw: string, fallbackTitle: string): DigestPayload | null {
  let cleaned = raw.trim();

  // Strip code fences
  cleaned = cleaned.replace(/^```(?:json|markdown)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // Strategy 1: Direct JSON.parse
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed.title === "string" && typeof parsed.content === "string") {
      return {
        title: parsed.title.trim(),
        date: parsed.date ? String(parsed.date).trim() : new Date().toISOString().split("T")[0],
        content: parsed.content.trim(),
      };
    }
  } catch {
    // Continue to next strategy
  }

  // Strategy 2: Triple-quote & escape normalization
  const jsonBlock = cleaned.match(/\{[\s\S]*\}/);
  if (jsonBlock) {
    try {
      let normalized = jsonBlock[0]
        .replace(/"""\s*([\s\S]*?)\s*"""/g, (_m, inner) => {
          return JSON.stringify(inner);
        })
        .replace(/,\s*([\]}])/g, "$1");

      const parsed = JSON.parse(normalized);
      if (parsed && typeof parsed.title === "string" && typeof parsed.content === "string") {
        return {
          title: parsed.title.trim(),
          date: parsed.date ? String(parsed.date).trim() : new Date().toISOString().split("T")[0],
          content: parsed.content.trim(),
        };
      }
    } catch {
      // Continue to regex extraction
    }
  }

  // Strategy 3: Boundary Regex Extraction
  console.warn("[pib-aggregator] JSON parse failed, deploying boundary regex extractor...");
  const source = jsonBlock ? jsonBlock[0] : cleaned;

  const titleMatch = source.match(/"title"\s*:\s*"([^"]+)"/i);
  const dateMatch = source.match(/"date"\s*:\s*"([^"]+)"/i);
  const contentMatch = source.match(/"content"\s*:\s*"{1,3}([\s\S]*)/i);

  if (contentMatch) {
    let contentValue = contentMatch[1].trim();
    contentValue = contentValue
      .replace(/"""\s*\}?\s*$/, "")
      .replace(/"\s*\}?\s*$/, "")
      .replace(/\}\s*$/, "")
      .trim();

    return {
      title: titleMatch ? titleMatch[1].trim() : fallbackTitle,
      date: dateMatch ? dateMatch[1].trim() : new Date().toISOString().split("T")[0],
      content: contentValue,
    };
  }

  // Strategy 4: Raw Markdown Fallback (when LLM returns pure markdown dossier)
  if (cleaned.startsWith("#") || cleaned.includes("###") || cleaned.includes("GS Paper")) {
    console.log("[pib-aggregator] LLM returned direct high-yield Markdown dossier.");
    const dateMatchMd = cleaned.match(/\b(202[4-9]-\d{2}-\d{2})\b/);
    return {
      title: fallbackTitle,
      date: dateMatchMd ? dateMatchMd[1] : new Date().toISOString().split("T")[0],
      content: cleaned,
    };
  }

  console.error("[pib-aggregator] All parsing strategies exhausted. Raw output sample:");
  console.error(cleaned.substring(0, 400));
  return null;
}

async function distillPolicyDigest(rawText: string, articleTitle: string): Promise<DigestPayload | null> {
  console.log("[pib-aggregator] Routing policy synthesis to multi-provider LLM (Gemini 3.x → Groq)...");

  try {
    const result = await llmGenerate({
      system: EDITORIAL_SYSTEM_PROMPT,
      prompt: ["Raw policy disclosures to synthesize into UPSC Policy Dossier:", clampText(rawText, LLM_INPUT_CHAR_LIMIT)].join("\n\n"),
      temperature: 0.25,
      json: true,
      maxTokens: 8192,
    });

    if (!result || !result.text) {
      console.warn("[pib-aggregator] All configured LLM providers returned empty or unavailable.");
      return null;
    }

    console.log(`[pib-aggregator] Received synthesis from [${result.provider.toUpperCase()} / ${result.model}] (${result.text.length} chars)`);
    return parseLlmDigest(result.text, articleTitle);
  } catch (error: any) {
    console.error(`[pib-aggregator] Policy distillation failed: ${error?.message ?? String(error)}`);
    return null;
  }
}

// ============================================================
// DATABASE: Supabase Upsert & Idempotency Check
// ============================================================
async function upsertDigest(
  digest: DigestPayload,
  sourceUrl: string
): Promise<{ ok: boolean; errorMessage?: string }> {
  const supabase = getSupabaseClient();

  const formattedDate = digest.date.includes("T")
    ? digest.date.split("T")[0]
    : digest.date;

  const row = {
    title: digest.title,
    date: formattedDate,
    content: digest.content,
    url: sourceUrl,
    created_at: new Date().toISOString(),
  };

  console.log("[pib-aggregator] Upserting to Supabase pib_digests table...", {
    title: row.title.substring(0, 65) + "...",
    url: row.url,
    date: row.date,
    contentLength: row.content.length,
  });

  try {
    const { error } = await supabase
      .from("pib_digests")
      .upsert([row], { onConflict: "url" });

    if (error) {
      console.error(`[pib-aggregator] Supabase upsert rejected: code=${error.code} message=${error.message}`);
      return { ok: false, errorMessage: error.message };
    }

    console.log("[pib-aggregator] Supabase upsert verified successfully.");
    return { ok: true };
  } catch (e: any) {
    console.error(`[pib-aggregator] Supabase connection failure: ${e?.message ?? String(e)}`);
    return { ok: false, errorMessage: e?.message ?? String(e) };
  }
}

async function isArticleProcessed(url: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("pib_digests")
    .select("url")
    .eq("url", url)
    .single();

  if (error && error.code !== "PGRST116") {
    console.warn(`[pib-aggregator] DB lookup warning for ${url}: ${error.message}`);
    return false;
  }

  return !!data;
}

// ============================================================
// MAIN PIPELINE EXECUTION
// ============================================================
export async function runPibAggregatorPipeline(): Promise<{ processed: number; success: boolean }> {
  console.log("=".repeat(70));
  console.log("  TARK INTELLIGENCE ENGINE — PIB POLICY AGGREGATOR DAEMON");
  console.log("=".repeat(70));

  let articleLinks: { title: string; url: string }[] = [];

  // Step 1: Lukmaan IAS Primary Acquisition
  try {
    articleLinks = await fetchLukmaanArticleLinks();
  } catch (err: any) {
    console.warn(`[pib-aggregator] Primary acquisition error: ${err.message}`);
  }

  // Step 2: InsightsIAS Secondary Fallback
  if (articleLinks.length === 0) {
    try {
      articleLinks = await fetchInsightsIASArticleLinks();
    } catch (err: any) {
      console.warn(`[pib-aggregator] Secondary acquisition error: ${err.message}`);
    }
  }

  // Step 3: Official PIB English RSS Tertiary Fallback
  if (articleLinks.length === 0) {
    try {
      articleLinks = await fetchOfficialPibRssArticles();
    } catch (err: any) {
      console.error(`[pib-aggregator] Tertiary acquisition error: ${err.message}`);
    }
  }

  if (articleLinks.length === 0) {
    console.error("[pib-aggregator] FATAL: No policy links discovered from any provider.");
    return { processed: 0, success: false };
  }

  // Step 4: Idempotency Filter
  const unprocessedArticles: { title: string; url: string }[] = [];
  for (const item of articleLinks) {
    const alreadyDone = await isArticleProcessed(item.url);
    if (!alreadyDone) {
      unprocessedArticles.push(item);
    } else {
      console.log(`[pib-aggregator] Skipping already indexed release: ${item.url}`);
    }
  }

  if (unprocessedArticles.length === 0) {
    console.log("[pib-aggregator] All discovered releases are current and indexed. Pipeline complete.");
    return { processed: 0, success: true };
  }

  // Process the freshest unprocessed digest
  const targetArticles = unprocessedArticles.slice(0, 1);
  console.log(`[pib-aggregator] Ingesting latest unindexed edition: "${targetArticles[0].title}"`);

  let successCount = 0;

  for (const article of targetArticles) {
    const body = await scrapeArticleBody(article.url);
    if (!body) {
      console.warn(`[pib-aggregator] Skipping article with unresolvable body: ${article.url}`);
      continue;
    }

    const rawPayload = `[EDITION: ${article.title}]\n[SOURCE: ${article.url}]\n\n${body}`;
    const digest = await distillPolicyDigest(rawPayload, article.title);

    if (!digest) {
      console.error(`[pib-aggregator] Distillation returned null for: ${article.url}`);
      continue;
    }

    console.log("\n" + "-".repeat(70));
    console.log(`★ POLICY DOSSIER SYNTHESIZED: ${digest.title}`);
    console.log(`  Date: ${digest.date} | Length: ${digest.content.length} characters`);
    console.log("-".repeat(70));
    console.log(digest.content.substring(0, 450) + "\n... [truncated for terminal]");
    console.log("-".repeat(70) + "\n");

    const writeResult = await upsertDigest(digest, article.url);
    if (writeResult.ok) {
      successCount++;
    } else {
      console.error(`[pib-aggregator] Persistence failure: ${writeResult.errorMessage}`);
    }
  }

  return { processed: successCount, success: successCount > 0 };
}

// Direct execution entrypoint
if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, "/") || "")) {
  runPibAggregatorPipeline()
    .then((res) => {
      if (!res.success && res.processed === 0) {
        // If there were genuinely 0 new articles, exit 0
        process.exit(0);
      }
      process.exit(res.success ? 0 : 1);
    })
    .catch((err) => {
      console.error("[pib-aggregator] Uncaught pipeline exception:", err);
      process.exit(1);
    });
}
