/**
 * PIB Aggregator v2 - Production Pipeline
 *
 * Scrapes "Daily PIB Highlights" from Lukmaan IAS (primary), with
 * InsightsIAS as a defensive fallback. Passes raw text through
 * Llama 3.1 8B-Instruct to produce a JSON-structured, magazine-formatted
 * Markdown digest, then upserts the result into Supabase.
 *
 * Usage: npx tsx server-lib/cron/pib-aggregator.ts
 */

import { gotScraping } from "got-scraping";
import * as cheerio from "cheerio";
import { Client } from "@gradio/client";
import { createClient } from "@supabase/supabase-js";
import WebSocket from 'ws';
import dotenv from "dotenv";

dotenv.config();

// ============================================================
// CONFIGURATION
// ============================================================
const SCRAPE_TIMEOUT_MS = 10_000;
const MAX_ARTICLES = 5;
const LLM_INPUT_CHAR_LIMIT = 3000;

const LUKMAAN_PIB_INDEX_URL = "https://blog.lukmaanias.com/category/pib-summary/";
const INSIGHTS_IAS_FALLBACK_URL = "https://www.insightsonindia.com/current-affairs/daily-current-affairs/";

// ============================================================
// EDITORIAL SYSTEM PROMPT (JSON + Markdown Layout Engine)
// ============================================================
const EDITORIAL_SYSTEM_PROMPT = [
  "You are an elite public policy editor.",
  "Extract the policy facts from this raw text and format them into a high-signal 'Policy Magazine Digest'.",
  "Format distinct policies with H3 (###) headers.",
  "Use Markdown tables for numerical data and blockquotes (>) for mandates.",
  "Bold key entities.",
  "Strip all marketing fluff.",
  "CRITICAL: You must output ONLY a valid JSON object with exactly three keys:",
  "'title': A clean, professional title based on the text.",
  "'date': The exact date of the updates extracted from the text in ISO 8601 format (YYYY-MM-DD). If multiple dates, use the most recent one.",
  "'content': The heavily formatted Markdown string containing the digest.",
  "Do NOT wrap the JSON in markdown code fences. Output the raw JSON object only.",
].join(" ");

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
// SCRAPER: Fetch the latest PIB article URL from Lukmaan IAS
// ============================================================
async function fetchLukmaanArticleLinks(): Promise<{ title: string; url: string }[]> {
  console.log("[pib-aggregator] Fetching article index from Lukmaan IAS...");

  const response = await gotScraping({
    url: LUKMAAN_PIB_INDEX_URL,
    headerGeneratorOptions: { browsers: [{ name: "chrome" }] },
    timeout: { request: SCRAPE_TIMEOUT_MS },
  });

  const $ = cheerio.load(response.body);
  const articles: { title: string; url: string }[] = [];

  // Lukmaan IAS is a WordPress blog. Article links live inside
  // broad semantic containers. We target <a> tags with href patterns
  // matching their daily PIB highlight URL structure.
  $("a").each((_i, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();

    // Match the daily-pib-highlights URL slug pattern
    if (
      text.length > 10 &&
      href.includes("/daily-pib-highlights") &&
      !href.includes("#") &&
      !href.endsWith(".pdf")
    ) {
      const fullUrl = href.startsWith("http")
        ? href
        : "https://blog.lukmaanias.com" + (href.startsWith("/") ? href : "/" + href);

      // Deduplicate by URL
      if (!articles.some((a) => a.url === fullUrl)) {
        articles.push({ title: text, url: fullUrl });
      }
    }
  });

  const limited = articles.slice(0, MAX_ARTICLES);
  console.log(`[pib-aggregator] Lukmaan IAS: Found ${articles.length} PIB links, using first ${limited.length}`);
  return limited;
}

// ============================================================
// FALLBACK SCRAPER: InsightsIAS Daily Current Affairs + PIB
// ============================================================
async function fetchInsightsIASArticleLinks(): Promise<{ title: string; url: string }[]> {
  console.log("[pib-aggregator] FALLBACK: Fetching from InsightsIAS...");

  const response = await gotScraping({
    url: INSIGHTS_IAS_FALLBACK_URL,
    headerGeneratorOptions: { browsers: [{ name: "chrome" }] },
    timeout: { request: SCRAPE_TIMEOUT_MS },
  });

  const $ = cheerio.load(response.body);
  const articles: { title: string; url: string }[] = [];

  // InsightsIAS is also WordPress. Use broad semantic extraction.
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

  // If no PIB-specific links, grab whatever daily current affairs links exist
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
  console.log(`[pib-aggregator] InsightsIAS: Found ${articles.length} links, using first ${limited.length}`);
  return limited;
}

// ============================================================
// SCRAPER: Extract article body using broad semantic selectors
// ============================================================
async function scrapeArticleBody(url: string): Promise<string> {
  console.log(`[pib-aggregator] Scraping article body: ${url}`);

  try {
    const response = await gotScraping({
      url,
      headerGeneratorOptions: { browsers: [{ name: "chrome" }] },
      timeout: { request: SCRAPE_TIMEOUT_MS },
    });

    const $ = cheerio.load(response.body);

    // Strip noise elements before extracting text
    $("script, style, nav, footer, header, .sidebar, .advertisement, .social-share, .related-posts, .sharedaddy, .ssba, .comments-area, .ez-toc-container, .ez-toc-widget-container").remove();

    let contentText = "";

    // Broad semantic selectors for the main article wrapper
    const selectors = [
      ".entry-content",
      ".td-post-content",
      ".post-content",
      "article",
      "main",
    ];

    let contentContainer = null;
    for (const selector of selectors) {
      const container = $(selector);
      if (container.length > 0) {
        contentContainer = container;
        break;
      }
    }

    if (!contentContainer || contentContainer.length === 0) {
      contentContainer = $("body");
    }

    // Extract text specifically from content-bearing tags to avoid truncation and squashing
    const chunks: string[] = [];
    contentContainer.find("h1, h2, h3, h4, p, li").each((_i, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (text.length > 20) {
        chunks.push(text);
      }
    });

    contentText = chunks.join("\n\n");

    if (contentText.length < 50) {
      console.warn(`[pib-aggregator] Article body too short (${contentText.length} chars), skipping: ${url}`);
      return "";
    }

    console.log(`[pib-aggregator] Extracted ${contentText.length} chars from: ${url}`);
    return contentText;
  } catch (error: any) {
    console.error(`[pib-aggregator] Failed to scrape article body: ${error.message}`);
    return "";
  }
}

// ============================================================
// LLM: Pass raw text through Llama 3.1 editorial engine
// ============================================================
function clampText(input: string, maxChars: number): string {
  return input.length <= maxChars ? input : input.slice(0, maxChars);
}

// Parsed structure from the LLM JSON response
type DigestPayload = {
  title: string;
  date: string;
  content: string;
};

/**
 * Safely parse the LLM response as JSON.
 * Handles common LLM quirks:
 *  - Markdown code fences (```json ... ```)
 *  - Python-style triple-quoted strings (""" ... """)
 *  - Unescaped newlines inside string values
 *  - Trailing commas before closing braces
 *  - Falls back to regex-based key extraction when JSON.parse fails entirely
 */
function parseLlmJson(raw: string): DigestPayload | null {
  let cleaned = raw.trim();

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  cleaned = cleaned.trim();

  // Normalize triple-quoted strings: replace """ with " and escape inner content
  // LLMs sometimes output Python-style triple quotes for multiline strings
  function normalizeTripleQuotes(input: string): string {
    // Match patterns like: "key": """value""" or "key": """value\n...\n"""
    return input.replace(
      /"""\s*([\s\S]*?)\s*"""/g,
      (_match, innerContent) => {
        // Escape the inner content for valid JSON
        const escaped = innerContent
          .replace(/\\/g, "\\\\")
          .replace(/"/g, '\\"')
          .replace(/\n/g, "\\n")
          .replace(/\r/g, "\\r")
          .replace(/\t/g, "\\t");
        return '"' + escaped + '"';
      }
    );
  }

  // Strip trailing commas before closing braces/brackets
  function stripTrailingCommas(input: string): string {
    return input.replace(/,\s*([\]}])/g, "$1");
  }

  // Attempt 1: Direct JSON parse
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed.title === "string" && typeof parsed.content === "string") {
      return {
        title: parsed.title,
        date: parsed.date || new Date().toISOString().split("T")[0],
        content: parsed.content,
      };
    }
  } catch {
    // Direct parse failed, continue to normalization
  }

  // Attempt 2: Normalize triple quotes and retry
  const jsonBlock = cleaned.match(/\{[\s\S]*\}/);
  if (jsonBlock) {
    const normalized = stripTrailingCommas(normalizeTripleQuotes(jsonBlock[0]));
    try {
      const parsed = JSON.parse(normalized);
      if (parsed && typeof parsed.title === "string" && typeof parsed.content === "string") {
        return {
          title: parsed.title,
          date: parsed.date || new Date().toISOString().split("T")[0],
          content: parsed.content,
        };
      }
    } catch {
      // Normalized parse also failed
    }
  }

  // Attempt 3: Manual regex extraction as last resort
  // This handles cases where the JSON is structurally broken but keys are present
  console.warn("[pib-aggregator] JSON.parse failed. Attempting manual key extraction...");
  const source = jsonBlock ? jsonBlock[0] : cleaned;

  const titleMatch = source.match(/"title"\s*:\s*"([^"]+)"/);
  const dateMatch = source.match(/"date"\s*:\s*"([^"]+)"/);

  // For content, grab everything between "content": and the end of the object
  // This handles multi-line content with triple quotes or unescaped newlines
  const contentMatch = source.match(/"content"\s*:\s*"{0,3}\s*([\s\S]*)/);

  if (titleMatch && contentMatch) {
    let contentValue = contentMatch[1].trim();
    // Strip trailing """, closing braces, and trailing quotes
    contentValue = contentValue
      .replace(/"""\s*\}?\s*$/, "")
      .replace(/"\s*\}?\s*$/, "")
      .replace(/\}\s*$/, "")
      .trim();

    console.log("[pib-aggregator] Manual extraction succeeded.");
    return {
      title: titleMatch[1],
      date: dateMatch ? dateMatch[1] : new Date().toISOString().split("T")[0],
      content: contentValue,
    };
  }

  console.error("[pib-aggregator] All JSON parsing strategies failed. Raw output:");
  console.error(cleaned.substring(0, 500));
  return null;
}

async function transformWithLlama(rawText: string): Promise<DigestPayload | null> {
  console.log("[pib-aggregator] Connecting to Llama 3.1 8B-Instruct Gradio space...");

  const promptPayload = [
    EDITORIAL_SYSTEM_PROMPT,
    "",
    "Raw policy text to transform:",
    clampText(rawText, LLM_INPUT_CHAR_LIMIT),
  ].join("\n");

  try {
    const hfToken = process.env.HF_ACCESS_TOKEN || "";
    const client = await Client.connect(
      "SKU1/meta-llama-Llama-3.1-8B-Instruct",
      hfToken ? ({ hf_token: hfToken } as any) : undefined
    );

    console.log("[pib-aggregator] Sending text to Llama 3.1 for editorial formatting...");

    const result = await client.predict("/chat_fn", {
      message: promptPayload,
    });

    const aiResult = (result as any).data?.[0];

    if (!aiResult) {
      console.warn("[pib-aggregator] Gradio returned empty result");
      return null;
    }

    const outputText = typeof aiResult === "string" ? aiResult : JSON.stringify(aiResult);
    console.log(`[pib-aggregator] LLM returned ${outputText.length} chars`);

    return parseLlmJson(outputText);
  } catch (error: any) {
    console.error(`[pib-aggregator] Llama 3.1 connection failed: ${error.message}`);
    return null;
  }
}

// ============================================================
// DATABASE: Upsert the digest into Supabase
// ============================================================
async function upsertDigest(
  digest: DigestPayload,
  sourceUrl: string
): Promise<{ ok: boolean; errorMessage?: string }> {
  const supabase = getSupabaseClient();

  // Build a stable, unique URL for the PIB digest entry
  // This prevents duplicates when the same date's digest is re-processed
  const digestUrl = `pib-digest://${digest.date}`;

  const row = {
    source: "PIB_Digest",
    headline: digest.title,
    summary: { bullets: [digest.content] },
    url: digestUrl,
    ministry: "Press Information Bureau",
    published_at: digest.date.includes("T") ? digest.date : digest.date + "T00:00:00.000Z",
    created_at: new Date().toISOString(),
  };

  console.log("[pib-aggregator] Upserting to Supabase...", {
    headline: row.headline.substring(0, 60),
    source: row.source,
    url: row.url,
    published_at: row.published_at,
  });

  try {
    const { error } = await supabase
      .from("current_affairs")
      .upsert([row], { onConflict: "url" });

    if (error) {
      console.error(`[pib-aggregator] Supabase upsert rejected: code=${error.code} message=${error.message} details=${error.details}`);
      return { ok: false, errorMessage: error.message };
    }

    console.log("[pib-aggregator] Supabase upsert successful");
    return { ok: true };
  } catch (e: any) {
    console.error(`[pib-aggregator] Supabase connection error: ${e?.message ?? String(e)}`);
    return { ok: false, errorMessage: e?.message ?? String(e) };
  }
}

// ============================================================
// MAIN EXECUTION
// ============================================================
async function main() {
  console.log("=".repeat(60));
  console.log("[pib-aggregator] PIB Aggregator v2 - Production Run");
  console.log("=".repeat(60));

  // Step 1: Fetch article links (Lukmaan IAS primary, InsightsIAS fallback)
  let articleLinks: { title: string; url: string }[] = [];

  try {
    articleLinks = await fetchLukmaanArticleLinks();
    if (articleLinks.length > 0) {
      console.log("[pib-aggregator] Primary source (Lukmaan IAS) succeeded.");
    }
  } catch (error: any) {
    console.warn(`[pib-aggregator] Primary source (Lukmaan IAS) failed: ${error.message}`);
  }

  // Fallback to InsightsIAS if primary source yielded nothing
  if (articleLinks.length === 0) {
    console.log("[pib-aggregator] Triggering fallback to InsightsIAS...");
    try {
      articleLinks = await fetchInsightsIASArticleLinks();
    } catch (error: any) {
      console.error(`[pib-aggregator] Fallback source (InsightsIAS) also failed: ${error.message}`);
    }
  }

  if (articleLinks.length === 0) {
    console.error("[pib-aggregator] No article links found from any source. Exiting.");
    process.exit(1);
  }

  // Step 2: Scrape full article bodies
  const rawTexts: string[] = [];

  for (const article of articleLinks) {
    const body = await scrapeArticleBody(article.url);
    if (body) {
      rawTexts.push(`[${article.title}]\n${body}`);
    }
    // Polite delay between requests
    await new Promise((r) => setTimeout(r, 1500));
  }

  if (rawTexts.length === 0) {
    console.error("[pib-aggregator] No article bodies extracted. Exiting.");
    process.exit(1);
  }

  console.log(`[pib-aggregator] Successfully scraped ${rawTexts.length} articles`);

  // Step 3: Concatenate and send to Llama 3.1
  const combinedRawText = rawTexts.join("\n\n---\n\n");
  const digest = await transformWithLlama(combinedRawText);

  if (!digest) {
    console.error("[pib-aggregator] LLM transformation failed or JSON parsing failed. Exiting.");
    process.exit(1);
  }

  // Log the parsed digest for review
  console.log("\n" + "=".repeat(60));
  console.log("PARSED DIGEST:");
  console.log("=".repeat(60));
  console.log(`Title: ${digest.title}`);
  console.log(`Date:  ${digest.date}`);
  console.log(`Content length: ${digest.content.length} chars`);
  console.log("=".repeat(60));
  console.log(digest.content);
  console.log("=".repeat(60));

  // Step 4: Upsert to Supabase
  const result = await upsertDigest(digest, articleLinks[0]?.url || "");

  if (!result.ok) {
    console.error(`[pib-aggregator] Database write failed: ${result.errorMessage}`);
    process.exit(1);
  }

  console.log("\n[pib-aggregator] Pipeline complete. Digest inserted into Supabase with source='PIB_Digest'.");
}

// Run when executed directly
main().catch((err) => {
  console.error("[pib-aggregator] Fatal error:", err);
  process.exit(1);
});
