---
tags:
  - docs
  - ingestion
  - firecrawl
---

# Firecrawl → Ingestion Pipeline Integration

Quick-reference for where Firecrawl (scrape/crawl/map/monitor API + MCP server) actually fits into Tark's real ingestion code — not a generic tool pitch. Grounded in a direct code audit, 2026-09-03.

## Two separate things named "Firecrawl" here

1. **MCP server** (`firecrawl` in Claude Code's user-scope config; `firecrawl-mcp` in both Antigravity agent configs — the native `agentica` agent and the bundled Cline extension). A **dev-time tool**: lets me or Antigravity's agent fetch/scrape a page live during a session — debug a selector, pull today's PIB release to look at while working, crawl a competitor for `strategy/`. Nothing in the running product calls this.
2. **Firecrawl REST API / `@mendable/firecrawl-js` SDK** (verified on npm, v4.38.0) — what you'd call from `server-lib/` at runtime to actually change pipeline behavior. Needs its own `FIRECRAWL_API_KEY` in **Vercel's env vars** — a different secret/step from today's MCP setup. This doc is mainly about this second thing.

## What's actually broken today (the part Firecrawl can move)

See [[map/objects/ingestion-pipeline.md|Ingestion Pipeline object card]] for the full shape — its correction note is current; `docs/ingestion-pipeline.md`'s body has drifted, don't trust it over the object card.

- **Wire sources self-drop on paywall/truncation.** `orchestrator.ts:167-173`'s no-text gate silently drops The Hindu, Indian Express, Business Standard, and LiveMint candidates when `got-scraping` + the cheerio cascade in [`extract.ts:26-56,151-188`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/ingest/extract.ts) can't get full text.
- **PIB's own waterfall is backwards.** [`pib-aggregator.ts:92-284`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/pib-aggregator.ts) tries two third-party re-publishers (Lukmaan IAS, then InsightsIAS) *before* the official PIB RSS — because scraping PIB directly is unreliable enough that it scrapes scrapes of PIB instead.
- **The PIB selector is fragile by construction.** [`sources.ts:89-91`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/ingest/sources.ts) hardcodes `.innner-page-main-about-us-content-right-part` — a documented *upstream typo* in PIB's own HTML. If PIB ever fixes their typo, this selector breaks.
- **PIB's RSS only carries title + PRID**, forcing a second per-article fetch through that same fragile selector.
- **No headless browser anywhere** — deliberately removed (`.github/workflows/scraper.yml:26-27`: *"No browser needed... Playwright install removed"*). Any source needing real JS rendering is currently just unreachable.
- **PDF ingestion is vision-OCR, not text extraction.** `acquire-raw-sources.ts`'s UPSC portal PDF archive goes PDF → per-page PNG (Python) → Groq/Gemini vision OCR. `pdf-parse`/`pdfjs-dist` are installed but have zero import sites. Expensive and slow for what are mostly text-layer government PDFs, not scans.
- **Hand-rolled crawl bounds.** `acquire-raw-sources.ts` manually bounds a crawl of mrunal.org + selfstudyhistory.com; the PRS adapter (`sources.ts:112-149`) hand-scrapes a blog listing page for pagination.

## Where to actually put Firecrawl (smallest blast radius first)

### 1. Fallback inside the no-text gate — start here
When `extract.ts`'s got-scraping+cheerio path returns empty (the same condition `orchestrator.ts:167-173` uses to drop a candidate), call Firecrawl `/scrape` on the URL as a last resort before dropping it. Bounded and cheap — only fires on requests that are *already failing* — and doesn't touch the free path that already works for RBI, most of PRS, etc. Directly targets the documented self-drop of major wire sources.

### 2. Flip the PIB waterfall
In `pib-aggregator.ts`, try Firecrawl `/scrape` against the **official PIB page** as tier 1, keep Lukmaan IAS / InsightsIAS as tiers 2–3 (fallbacks, not primaries). Fixes the "scraping scrapes of the real source" ordering in a single file, and removes the dependency on the typo'd selector for this path.

### 3. PDFs: text-first, OCR-fallback
Before the PNG+vision-OCR pipeline in `acquire-raw-sources.ts`, try Firecrawl `/scrape` on the PDF URL directly — it extracts text-layer PDFs natively. Fall back to the existing OCR path only when Firecrawl returns empty/garbled output (i.e. it's a genuine scanned image, not a text PDF). Likely cuts cost and latency for most official notifications.

### 4. Replace hand-rolled crawl/pagination
`/map` for fast URL discovery, `/crawl` for bulk extraction — candidates: the bounded mrunal.org/selfstudyhistory.com crawl in `acquire-raw-sources.ts`, and the PRS blog-listing scrape in `sources.ts:112-149`.

### 5. Bigger lift, not day-one: `/monitor` instead of polling
Four separate trigger mechanisms exist today (Vercel cron, GitHub Actions ×2, user-click) partly because irregular-cadence sources (PIB, RBI) get polled on a fixed schedule instead of triggered when something actually publishes. Firecrawl `/monitor` watches a page/site and fires a webhook — optionally AI-judged against a plain-language goal ("only a genuinely new press release, not a layout tweak") — which could call `/api/internal/worker` (already takes a `source` param, already has its own `INTERNAL_WORKER_SECRET`). Worth its own contract before touching; not a drop-in like 1–4.

## What NOT to do

Don't replace `got-scraping` + cheerio wholesale. It's free, already tuned, and works fine for sources not listed above. Firecrawl is a metered API — spend it on the paths that are *actually* broken, not as a blanket rewrite.

## Setup checklist for wiring this into product code

Separate from today's MCP setup (dev-tool only, see above):

1. `npm install @mendable/firecrawl-js` (verified on npm, v4.38.0) — or skip the dependency and call the REST API directly (`https://api.firecrawl.dev/v2/scrape`, header `Authorization: Bearer <key>`).
2. Add `FIRECRAWL_API_KEY` to **Vercel's project env vars** (Production + Preview) — never the repo. This is a separate key/step from the Claude Code and Antigravity MCP setup done earlier today; rotate it independently.
3. Land the call inside `extract.ts` (§1) or `pib-aggregator.ts` (§2) as a fallback branch, not a replacement — keep the existing free path as the first attempt everywhere it currently works.
4. Measure before/after using what already exists: `news_ingest_runs` / `news_ingest_decisions` (`20260819182818_ingest_accountability.sql`) already logs per-source accept/reject decisions. That's the before/after signal for whether a Firecrawl fallback actually recovers previously-dropped Hindu/IE/BS/LiveMint candidates — check the ledger, don't ship this on vibes.

## See also

- [[map/objects/ingestion-pipeline.md|Ingestion Pipeline object card]] — corrected source of truth for pipeline shape
- [[docs/news-feed-quality-roadmap|News Feed Quality Roadmap]]

This repo is public and auto-deploys; the Firecrawl API key used for the MCP setup earlier today lives only in `~/.claude.json` (user scope) and the two Antigravity `globalStorage` JSON files — never in this repo. A separate key for product code goes in Vercel env vars only (see checklist above).
