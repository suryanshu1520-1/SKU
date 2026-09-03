/**
 * server-lib/cron/ingest/extract.ts
 *
 * The extraction layer the old pipeline never had. Two jobs:
 *   1. Fetch feeds/pages with got-scraping (clears the basic bot walls that
 *      raw fetch() tripped on — the real reason the scheduled path returned
 *      nothing) and parse RSS/Atom defensively.
 *   2. Pull the main article body out of a page via cheerio — per-source
 *      selectors first, a Readability-ish generic heuristic as fallback.
 *
 * Everything here returns "" / [] on failure rather than throwing, so a single
 * bad source never takes down a run.
 */

import { gotScraping } from "got-scraping";
import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";
import type { RawRef } from "./types.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const collapse = (s: string): string => s.replace(/\s+/g, " ").trim();

/** Fetch a URL's raw text via got-scraping. Returns null on any failure. */
export async function fetchText(
  url: string,
  timeoutMs = 20_000
): Promise<string | null> {
  try {
    const res = await gotScraping({
      url,
      headerGeneratorOptions: {
        browsers: [{ name: "chrome", minVersion: 118 }],
        devices: ["desktop"],
        locales: ["en-US", "en"],
        operatingSystems: ["windows", "linux"],
      },
      timeout: { request: timeoutMs },
      retry: { limit: 1 },
      throwHttpErrors: false,
      responseType: "text",
    });
    const body = res?.body;
    if (typeof body !== "string" || body.length < 50) return null;
    // A 4xx/5xx often returns an HTML error page — reject obvious ones.
    if (res.statusCode >= 400) {
      console.warn(`[ingest][http] ${url} -> HTTP ${res.statusCode}`);
      return null;
    }
    return body;
  } catch (err: any) {
    console.warn(`[ingest][http] fetch failed ${url}: ${err?.message ?? err}`);
    return null;
  }
}

// ============================================================
// RSS / Atom parsing (fast-xml-parser, defensive)
// ============================================================
function asText(val: any): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  if (Array.isArray(val)) return asText(val[0]);
  if (typeof val === "object") {
    return String(val["#text"] ?? val._text ?? val._cdata ?? val.content ?? "");
  }
  return "";
}

function linkFrom(item: any): string {
  const raw = item?.link;
  if (typeof raw === "string") return raw.trim();
  if (Array.isArray(raw)) {
    for (const l of raw) {
      if (typeof l === "string" && l.trim()) return l.trim();
      const href = l?.["@_href"];
      if (href) return String(href).trim();
    }
  }
  if (raw?.["@_href"]) return String(raw["@_href"]).trim();
  return asText(raw).trim() || asText(item?.guid).trim();
}

/** Parse RSS 2.0 or Atom XML into normalized refs. Never throws. */
export function parseFeed(xml: string): RawRef[] {
  if (!xml || xml.length < 80) return [];
  let parsed: any;
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      isArray: (name) => name === "item" || name === "entry",
    });
    parsed = parser.parse(xml.replace(/\0/g, ""));
  } catch (err: any) {
    console.warn(`[ingest][rss] parse failed: ${err?.message ?? err}`);
    return [];
  }

  const channel = parsed?.rss?.channel ?? parsed?.feed ?? parsed?.["rdf:RDF"];
  let items: any[] = channel?.item ?? channel?.entry ?? parsed?.["rdf:RDF"]?.item ?? [];
  if (!Array.isArray(items)) items = items ? [items] : [];

  const refs: RawRef[] = [];
  for (const item of items) {
    const title = collapse(asText(item?.title));
    const url = linkFrom(item);
    if (!title || !url) continue;
    const pubDate =
      asText(item?.pubDate) || asText(item?.published) || asText(item?.updated) || null;
    const body =
      asText(item?.["content:encoded"]) || asText(item?.description) || asText(item?.summary) || null;
    refs.push({ url, title, pubDate, body: body ? collapse(stripTags(body)) : null });
  }
  return refs;
}

/** Fetch + parse a feed URL. */
export async function fetchFeed(url: string, timeoutMs = 20_000): Promise<RawRef[]> {
  const xml = await fetchText(url, timeoutMs);
  if (!xml) return [];
  return parseFeed(xml);
}

// ============================================================
// Article body extraction (cheerio)
// ============================================================
function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, " ");
}

const NOISE_SELECTORS = [
  // NOTE: never strip <form> — ASP.NET sites (PIB, many .gov.in) wrap the
  // ENTIRE page body in a single <form runat="server">, so removing it deletes
  // all content. Verified live: stripping <form> zeroed PIB extraction.
  "script", "style", "noscript", "nav", "header", "footer", "aside",
  "iframe", "svg", "img", "video", "audio",
  ".sidebar", ".advertisement", ".ads", ".ad-banner", ".social-share",
  ".share", ".related-articles", ".related-posts", ".newsletter",
  ".cookie-banner", "#comments", ".comments", ".menu", "#menu",
  '[class*="banner"]', '[class*="promo"]', '[class*="widget"]',
].join(", ");

/**
 * Extract clean body text from a page.
 * @param html   raw HTML
 * @param preferred  source-specific selectors to try first (highest signal)
 */
export function extractBody(html: string, preferred: string[] = []): string {
  let $: cheerio.CheerioAPI;
  try {
    $ = cheerio.load(html);
  } catch {
    return "";
  }
  $(NOISE_SELECTORS).remove();

  // 1. Source-specific selectors win — these are hand-verified per source.
  for (const sel of preferred) {
    const t = collapse($(sel).text());
    if (t.length > 120) return t;
  }

  // 2. Generic semantic containers.
  for (const sel of ["article", "main", ".content-area", "#content", ".entry-content"]) {
    const t = collapse($(sel).text());
    if (t.length > 200) return t;
  }

  // 3. Readability-ish fallback: concatenate substantial <p>/<li> text.
  const chunks: string[] = [];
  $("p, li").each((_i, el) => {
    const t = collapse($(el).text());
    if (t.length > 40) chunks.push(t);
  });
  const joined = chunks.join(" ");
  if (joined.length > 200) return joined;

  // 4. Last resort: biggest single <div> by text length.
  let best = "";
  $("div").each((_i, el) => {
    const t = collapse($(el).text());
    if (t.length > best.length) best = t;
  });
  return best;
}

// ============================================================
// Firecrawl structured-extraction fallback
// ============================================================
const FIRECRAWL_BODY_FLOOR = 200;
const FIRECRAWL_TIMEOUT_MS = 15_000;

/**
 * Last-resort fallback: call Firecrawl's /scrape endpoint with clean markdown
 * extraction (`onlyMainContent: true` + `onlyCleanContent: true`).
 *
 * Why onlyCleanContent?
 * Benchmark verified (2026-09-03): Raw onlyMainContent leaks paywall modals on
 * Indian media sites (The Hindu, Indian Express) because subscription gates sit
 * inside <article>/<main>. Enabling onlyCleanContent uses Firecrawl's LLM cleaning
 * pass to eliminate paywall/subscription overlays, ads, and cookie notices while
 * preserving the real article text, headings, and structure.
 *
 * Returns "" on any failure — missing key, timeout, bad response, etc.
 * Never throws.
 */
async function firecrawlFallback(url: string): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return "";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FIRECRAWL_TIMEOUT_MS);

  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
        onlyCleanContent: true,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn(`[ingest][firecrawl] ${url} -> HTTP ${res.status}`);
      return "";
    }

    const payload: any = await res.json();
    const extracted = payload?.data?.markdown;
    if (typeof extracted === "string" && extracted.length > 0) {
      console.log(`[ingest][firecrawl] recovered ${extracted.length} chars (clean markdown) for ${url}`);
      return collapse(extracted);
    }
    return "";
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.warn(`[ingest][firecrawl] timeout after ${FIRECRAWL_TIMEOUT_MS}ms: ${url}`);
    } else {
      console.warn(`[ingest][firecrawl] failed ${url}: ${err?.message ?? err}`);
    }
    return "";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch a page and extract its body in one call.
 *
 * If the got-scraping + cheerio path returns text below the ~200-char floor
 * that every call site already enforces, and a FIRECRAWL_API_KEY is available,
 * a Firecrawl structured-extraction fallback fires. This can only ever recover
 * an item that would otherwise be silently dropped — it cannot regress a
 * currently-working path.
 */
export async function extractFromUrl(
  url: string,
  preferred: string[] = [],
  timeoutMs = 10_000
): Promise<string> {
  const html = await fetchText(url, timeoutMs);
  const body = html ? extractBody(html, preferred) : "";

  // Primary path returned enough text — use it directly.
  if (body.length >= FIRECRAWL_BODY_FLOOR) return body;

  // Firecrawl fallback: only fires when primary extraction is thin/empty.
  const fallback = await firecrawlFallback(url);
  if (fallback.length >= FIRECRAWL_BODY_FLOOR) return fallback;

  // Both paths thin — return whatever we got (may be empty string).
  return body;
}

export { collapse, stripTags };
