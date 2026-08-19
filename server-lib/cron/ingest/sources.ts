/**
 * server-lib/cron/ingest/sources.ts
 *
 * The source registry — every adapter, ranked by EXTRACTABILITY (does it hand
 * over full English body text without a paywall/JS/bot-wall?), the axis that
 * actually governs a $0 scraper. All recipes here were verified live on
 * 2026-08-19; see docs/news-intelligence-architecture.md (Addendum).
 *
 *   PRIMARY spine : RBI, PRS            (English, full-text, no paywall)
 *   WORLD spine   : Wikipedia Current Events (pre-summarized, sourced), UN News
 *   BOLT-ON       : PIB                 (Hindi — translated at synthesis)
 *   WIRE (demoted): The Hindu / IE / Business Standard / LiveMint
 *                   (truncated + paywalled → mostly self-drop at the no-text gate)
 */

import * as cheerio from "cheerio";
import type { RawRef, SourceAdapter } from "./types.js";
import { fetchFeed, fetchText, extractFromUrl, collapse } from "./extract.js";

const cap = <T>(arr: T[], n: number): T[] => arr.slice(0, n);

/** Small stable hash for synthesizing unique URLs when a source lacks one. */
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// ============================================================
// Generic RSS adapter factory (wire + simple feed sources)
// ============================================================
function rssSource(opts: {
  id: string;
  label: string;
  feedUrl: string;
  tier: SourceAdapter["tier"];
  lang?: SourceAdapter["lang"];
  enabled?: boolean;
  selectors?: string[];
  minBodyChars?: number;
}): SourceAdapter {
  return {
    id: opts.id,
    label: opts.label,
    tier: opts.tier,
    lang: opts.lang ?? "en",
    enabled: opts.enabled ?? true,
    minBodyChars: opts.minBodyChars,
    discover: () => fetchFeed(opts.feedUrl),
    extract: async (ref) => {
      const body = await extractFromUrl(ref.url, opts.selectors ?? []);
      // Resilience: if the page fetch is thin but the feed carried full content
      // (content:encoded / long description), fall back to that.
      const best =
        body && body.length >= (opts.minBodyChars ?? 200)
          ? body
          : ref.body && ref.body.length > body.length
          ? ref.body
          : body;
      if (!best) return null;
      return { title: ref.title, body: best };
    },
  };
}

// ============================================================
// PIB (Hindi bolt-on) — verified selector; RSS carries only titles+PRID links
// ============================================================
const PIB: SourceAdapter = {
  id: "PIB",
  label: "Press Information Bureau",
  tier: "primary",
  lang: "hi",
  enabled: true,
  // Verified live: the legacy RssFeed.aspx?PingID=1 is a 404; RssMain works.
  // ModId=6&Regid=3 = all-India press releases; Lang=1 = Hindi (translated at synthesis).
  discover: () => fetchFeed("https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3"),
  extract: async (ref) => {
    // PIB's own container class carries a triple-'n' typo — verified live.
    const body = await extractFromUrl(ref.url, [
      ".innner-page-main-about-us-content-right-part",
      "#PdfDiv",
    ]);
    if (!body || body.length < 200) return null;
    return { title: ref.title, body };
  },
};

// ============================================================
// PRS Legislative Research — blog listing → article, content in `.top_content`
// ============================================================
const PRS: SourceAdapter = {
  id: "PRS",
  label: "PRS Legislative Research",
  tier: "primary",
  lang: "en",
  enabled: true,
  discover: async () => {
    const html = await fetchText("https://prsindia.org/theprsblog");
    if (!html) return [];
    const $ = cheerio.load(html);
    const seen = new Set<string>();
    const refs: RawRef[] = [];
    $('a[href*="/theprsblog/"]').each((_i, el) => {
      const href = $(el).attr("href") || "";
      const title = collapse($(el).text());
      if (title.length < 25) return;
      const url = href.startsWith("http") ? href : "https://prsindia.org" + href;
      if (seen.has(url)) return;
      seen.add(url);
      refs.push({ url, title });
    });
    return refs;
  },
  extract: async (ref) => {
    const body = await extractFromUrl(ref.url, [
      ".top_content",
      ".field--name-body",
      ".node__content",
    ]);
    if (!body || body.length < 250) return null;
    return { title: ref.title, body };
  },
};

// ============================================================
// Wikipedia Current Events Portal — pre-summarized, sourced world spine
// ============================================================
const WORLD_SIGNAL =
  /\b(india|united nations|\bun\b|unesco|unhrc|security council|treaty|summit|g20|g7|brics|election|parliament|economy|gdp|inflation|central bank|imf|world bank|\bwho\b|climate|court|supreme|war|ceasefire|sanction|tariff|trade|agreement|nuclear|missile|coup|president|prime minister|foreign|diplomat|border|refugee)\b/i;

const WIKIPEDIA: SourceAdapter = {
  id: "WIKIPEDIA",
  label: "Wikipedia Current Events",
  tier: "world",
  lang: "en",
  enabled: true,
  preSummarized: true,
  discover: async () => {
    const raw = await fetchText(
      "https://en.wikipedia.org/w/api.php?action=parse&page=Portal:Current_events&format=json&prop=text&formatversion=2"
    );
    if (!raw) return [];
    let html = "";
    try {
      html = JSON.parse(raw)?.parse?.text ?? "";
    } catch {
      return [];
    }
    if (!html) return [];
    const $ = cheerio.load(html);
    const seen = new Set<string>();
    const refs: RawRef[] = [];

    // Leaf <li> (no nested list) are the individual, sourced events.
    $("li").each((_i, el) => {
      const node = $(el);
      if (node.find("ul, li").length > 0) return; // skip category/parent nodes
      const text = collapse(node.text());
      if (text.length < 45) return;
      if (/this portal'?s subpages/i.test(text)) return; // maintenance note
      if (!WORLD_SIGNAL.test(text)) return; // keep the world spine high-signal

      // Prefer the event's own external source link as a real, unique URL.
      let url = "";
      node.find('a[href^="http"]').each((_j, a) => {
        const href = $(a).attr("href") || "";
        if (!/wikipedia\.org|wikimedia\.org/.test(href) && !url) url = href;
      });
      if (!url) url = `https://en.wikipedia.org/wiki/Portal:Current_events#${hash(text)}`;
      if (seen.has(url)) return;
      seen.add(url);

      const title = text.length > 110 ? text.slice(0, 107).replace(/\s+\S*$/, "") + "…" : text;
      refs.push({ url, title, body: text, ministryHint: "International Affairs" });
    });
    return refs;
  },
  // Pre-summarized: body already carried on the ref.
  extract: async (ref) => (ref.body ? { title: ref.title, body: ref.body } : null),
};

// ============================================================
// The registry
// ============================================================
export const SOURCES: SourceAdapter[] = [
  // --- Primary spine ---
  rssSource({
    id: "RBI",
    label: "Reserve Bank of India",
    // ⚠ verified live: the old `rss/PRs.xml` is a 404; this is the working feed.
    feedUrl: "https://www.rbi.org.in/pressreleases_rss.xml",
    tier: "primary",
  }),
  PRS,
  PIB,
  // --- World spine ---
  WIKIPEDIA,
  rssSource({
    id: "UN NEWS",
    label: "UN News",
    feedUrl: "https://news.un.org/feed/subscribe/en/news/all/rss.xml",
    tier: "world",
    // Disabled: news.un.org is unreachable/blocked from our runners (verified
    // 2026-08-19 — all feed variants time out). Wikipedia Current Events covers
    // the world spine. Re-enable once a reachable feed URL is confirmed.
    enabled: false,
  }),
  // --- Wire (demoted to headline-pointers; mostly self-drop at the gate) ---
  rssSource({
    id: "INDIAN EXPRESS",
    label: "Indian Express Explained",
    feedUrl: "https://indianexpress.com/section/explained/feed/",
    tier: "wire",
  }),
  rssSource({
    id: "THE HINDU",
    label: "The Hindu",
    feedUrl: "https://www.thehindu.com/news/national/feeder/default.rss",
    tier: "wire",
  }),
  rssSource({
    id: "BUSINESS STANDARD",
    label: "Business Standard Economy & Policy",
    feedUrl: "https://www.business-standard.com/rss/economy-policy-103.rss",
    tier: "wire",
  }),
  rssSource({
    id: "LIVEMINT",
    label: "LiveMint Economy",
    feedUrl: "https://www.livemint.com/rss/economy",
    tier: "wire",
  }),
];

export function getSources(ids?: string[]): SourceAdapter[] {
  const enabled = SOURCES.filter((s) => s.enabled);
  if (!ids || ids.length === 0) return enabled;
  const want = new Set(ids.map((s) => s.toUpperCase()));
  return SOURCES.filter((s) => want.has(s.id.toUpperCase()));
}

export { cap };
