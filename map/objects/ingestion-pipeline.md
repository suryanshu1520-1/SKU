---
type: object
status: verified 2026-08-18
universe: live
---

> **Correction (2026-08-19, post-P2):** The "four parallel `current_affairs` paths" described in §3 are **superseded** — P2 consolidated them into ONE module, [`server-lib/cron/ingest/`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/ingest) (`runIngest()`, three tiers: gather → cluster → synthesize). Relevance/testability now lives in the new [[syllabus-testability-graph]] subsystem. Read §3 below as historical, not current.

# Object: Ingestion Pipeline (`current_affairs`, `pib_digests`, RSS Scrapers, LLM Distillation)

## 1. What It Is
The automated data extraction and synthesis machinery that scrapes government releases and current affairs feeds, cleans HTML content, runs LLM analysis, and publishes structured digests. Two separate table targets exist under this one umbrella: `current_affairs` (four parallel ingestion paths, see below) and `pib_digests` (a distinct pipeline in `pib-aggregator.ts`, out of scope for this card — see [`docs/ingestion-pipeline.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/ingestion-pipeline.md) for the full breakdown).

## 2. Why This Shape
- **Asynchronous Execution**: RSS scraping and LLM generation take significant time; Vercel `waitUntil()` decouples heavy processing from HTTP request timeouts (`sync-feed.ts`, `scrape.ts`).
- **Fault-Tolerant Processing**: Individual item-level try/catch blocks ensure single feed corruptions do not crash a batch.
- **Reputation-Aware Backoff**: `source_reputation` + `update_source_reputation` RPC lets the manual sync path skip sources that have been failing, with exponential backoff — currently only wired into the `sync-feed.ts` / `internal/worker.ts` path, not the scheduled cron path.

## 3. Shape & Citations — Four Parallel `current_affairs` Paths
- **Path A (scheduled, most sophisticated)**: [`server-lib/cron/newsdata.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/newsdata.ts) → [`server-lib/cron/pipeline.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/pipeline.ts) (`runPolicyPipeline`). Triggered by Vercel Cron, once daily.
- **Path B (manual, reputation-aware)**: [`server-lib/sync-feed.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/sync-feed.ts) → [`server-lib/internal/worker.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/internal/worker.ts) + [`server-lib/internal/reputation.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/internal/reputation.ts). Triggered by the "Sync Feed" button in `CurrentAffairs.tsx`, 5-min per-user cooldown. Only path with a direct PIB RSS feed.
- **Path C (orphaned)**: [`server-lib/cron/scrape.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/scrape.ts). Registered as an Express route but not scheduled in `vercel.json` — appears dead in production.
- **Path D (independent schedule)**: [`scripts/run-scraper.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/scripts/run-scraper.ts) via `.github/workflows/scraper.yml`, 3×/day. Weakest quality logic of the four; likely source of the "Autonomously synced 3x daily" UI label.
- **Shared AI call**: [`server-lib/cron/ai.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/ai.ts) (`getLlama3Insight`) — used by all four paths, connects to the same Hugging Face Gradio Space as the separate PIB aggregator.
- **Separate PIB pipeline** (not part of the four paths above): [`server-lib/cron/pib-aggregator.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/pib-aggregator.ts) → `pib_digests`.

## 4. Connected To
- **Path A/B/C/D produce**: Rows in `current_affairs` (via [`server-lib/cron/db.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/db.ts) `upsertCurrentAffairs`, deduped on `url` only).
- **`pib-aggregator.ts` produces**: Rows in `pib_digests` (separate pipeline, not one of the four paths).
- **Triggered by**: Vercel Cron → `/api/cron/newsdata` (Path A, scheduled); `/api/sync-feed` (Path B, user-triggered); `/api/cron/scrape` (Path C, orphaned — not scheduled anywhere found); GitHub Actions (Path D, scheduled independently of Vercel).

## 5. If You Change This
- **Hits**: [`src/components/CurrentAffairs.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/CurrentAffairs.tsx) (reads `current_affairs`); whichever of the four paths you touch will have inconsistent behavior from the other three until they're consolidated (see [`docs/news-feed-quality-roadmap.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/news-feed-quality-roadmap.md)).
- **Does not hit**: Payment processing or Razorpay checkout (`server-lib/create-razorpay-order.ts`); the `pib_digests`/`pib-aggregator.ts` pipeline is independent of these four paths.

## 6. Surfaces
- **Written by**: Vercel Cron (Path A), the "Sync Feed" UI button (Path B), GitHub Actions (Path D).
- **Read by**: [`src/components/CurrentAffairs.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/CurrentAffairs.tsx).

## 7. See
- Source: [`server-lib/cron/pipeline.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/pipeline.ts), [`server-lib/internal/worker.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/internal/worker.ts)
- Doc: [`docs/ingestion-pipeline.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/ingestion-pipeline.md), [`docs/news-feed-quality-roadmap.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/news-feed-quality-roadmap.md)
