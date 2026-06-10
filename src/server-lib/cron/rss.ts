import type { CronConfig } from "./config.js";

export type RssItem = {
  title?: string | null;
  link?: string | null;
  pubDate?: string | null;
  contentSnippet?: string | null;
};

function buildAllOriginsUrl(url: string): string {
  const encoded = encodeURIComponent(url);
  return `https://api.allorigins.win/raw?url=${encoded}`;
}

async function httpFetchText(
  url: string,
  timeoutMs: number,
  headers: Record<string, string>
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    const resp = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    clearTimeout(t);

    if (!resp.ok) return null;
    const text = await resp.text();
    if (!text || typeof text !== "string") return null;
    return text;
  } catch {
    return null;
  }
}

function looksLikeXmlOrAtom(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes("<rss") ||
    t.includes("<feed") ||
    t.includes("<channel") ||
    t.includes("<item") ||
    t.includes("<entry")
  );
}

async function httpGetTextAllOrigins(
  url: string,
  timeoutMs: number,
  headers: Record<string, string>
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    const allOriginsUrl = buildAllOriginsUrl(url);
    const resp = await fetch(allOriginsUrl, {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    clearTimeout(t);

    if (!resp.ok) return null;

    const text = await resp.text();
    if (!text || typeof text !== "string") return null;

    if (!looksLikeXmlOrAtom(text)) return null;
    return text;
  } catch {
    return null;
  }
}

function extractMaybeTagValue(block: string, tagName: string): string {
  const re = new RegExp(
    `<${tagName}[^>]*>\\s*(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?\\s*<\\/${tagName}>`,
    "i"
  );
  const m = block.match(re);
  return (m?.[1] ?? "").trim();
}

function parseRssItems(xml: string): RssItem[] {
  if (!xml || xml.length < 100) return [];

  const items: RssItem[] = [];
  const rssItemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null = null;

  while ((match = rssItemRegex.exec(xml)) !== null && items.length < 50) {
    const block = match[1] ?? "";

    const title = extractMaybeTagValue(block, "title");
    const link = extractMaybeTagValue(block, "link");
    const description =
      extractMaybeTagValue(block, "description") ||
      extractMaybeTagValue(block, "content:encoded");
    const pubDate =
      extractMaybeTagValue(block, "pubDate") ||
      extractMaybeTagValue(block, "pubdate");

    if (title && link) {
      items.push({ title, link, pubDate, contentSnippet: description });
    }
  }

  const atomEntryRegex = /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi;
  while (items.length < 50 && (match = atomEntryRegex.exec(xml)) !== null) {
    const block = match[1] ?? "";

    const title = extractMaybeTagValue(block, "title");
    const hrefMatch = block.match(/<link[^>]*\bhref=(["'])(.*?)\1/i);
    const link = hrefMatch?.[2]?.trim() ?? "";
    const summary = extractMaybeTagValue(block, "summary");
    const content = extractMaybeTagValue(block, "content");
    const snippet = summary || content;
    const pubDate =
      extractMaybeTagValue(block, "published") ||
      extractMaybeTagValue(block, "updated");

    if (title && link) {
      items.push({ title, link, pubDate, contentSnippet: snippet });
    }
  }

  return items;
}

export async function fetchAndParseRssFeed(
  url: string,
  config: CronConfig
): Promise<RssItem[]> {
  const direct = await httpFetchText(url, config.timeoutMs, config.browserHeaders);

  let xml = direct && looksLikeXmlOrAtom(direct) ? direct : null;
  let source: "direct" | "allorigins" = xml ? "direct" : "allorigins";

  if (!xml) {
    xml = await httpGetTextAllOrigins(url, config.timeoutMs, config.browserHeaders);
  }

  console.log("[cron][rss] fetched feed", { url, source, xmlType: typeof xml, hasXml: Boolean(xml) });

  if (!xml) return [];

  const cleaned = xml.replace(/\u0000/g, "").trim();
  return parseRssItems(cleaned);
}

function decodeHtmlEntities(input: string): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/'/g, "'");
}

function stripHtmlTags(input: string): string {
  if (typeof input !== "string") return "";
  return input.replace(/<[^>]*>/g, "");
}

function sanitizeDescription(s: string): string {
  if (typeof s !== "string") return "";
  const decoded = decodeHtmlEntities(s);
  const noTags = stripHtmlTags(decoded);
  return noTags.replace(/\s+/g, " ").trim();
}

export async function extractArticleDescriptionFromUrl(
  url: string,
  rssSnippet: any,
  config: CronConfig
): Promise<string> {
  
  let fallbackStr = "";
  if (typeof rssSnippet === "string") {
    fallbackStr = rssSnippet;
  } else if (rssSnippet && typeof rssSnippet === "object") {
    fallbackStr = rssSnippet._cdata || rssSnippet._text || rssSnippet["#text"] || rssSnippet.content || "";
  }
  fallbackStr = String(fallbackStr).trim();

  console.log("[cron][rss] extract description start", {
    url,
    rssSnippetLen: fallbackStr.length,
  });

  const htmlString = await httpGetTextAllOrigins(url, config.timeoutMs, config.browserHeaders);

  if (typeof htmlString === "string" && htmlString.length > 50) {
    const ogMatch = htmlString.match(/<meta[^>]*property=(["']?)og:description\1[^>]*content=(["'])([\s\S]*?)\2[^>]*>/i);
    const metaMatch = htmlString.match(/<meta[^>]*name=(["']?)description\1[^>]*content=(["'])([\s\S]*?)\2[^>]*>/i);

    let extracted = ogMatch?.[3] || metaMatch?.[3];

    if (!extracted) {
      const pMatches = htmlString.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
      if (pMatches && pMatches.length > 0) {
        extracted = pMatches.slice(0, 3).join(" ");
      }
    }

    if (extracted && typeof extracted === "string") {
      const cleanText = sanitizeDescription(extracted);
      if (cleanText.length > 50) return cleanText;
    }
  }

  if (fallbackStr && fallbackStr.length > 0) {
    return sanitizeDescription(fallbackStr);
  }

  return "";
}