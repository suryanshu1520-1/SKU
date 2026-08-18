# Ingestion & Distillation Pipeline — Tark 1.0

> Rewritten 2026-08-18 after a direct code audit. The previous version of this document described a single, unified pipeline feeding both `pib_digests` and a `questions` table. That is not what the live code does — there are **four independent, overlapping ingestion paths** writing into `current_affairs`, plus a separate PIB-specific pipeline (see [`map/objects/ingestion-pipeline.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/objects/ingestion-pipeline.md) for the PIB→`pib_digests` path, which this document does not cover). This version documents what actually runs.

## 1. The Four Parallel `current_affairs` Pipelines

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Path A — Autonomous, scheduled (the "real" cron)                          │
│  Vercel Cron (vercel.json, 1×/day @ 00:00 UTC)                             │
│    → /api/cron/newsdata (server-lib/cron/newsdata.ts)                      │
│    → runPolicyPipeline() (server-lib/cron/pipeline.ts)                     │
│    6 hardcoded feeds, confidence scoring, deterministic ministry tagging,  │
│    dedup-before-AI-call, real article-body scraping. Most sophisticated.  │
│    Does NOT touch source_reputation.                                       │
├────────────────────────────────────────────────────────────────────────────┤
│  Path B — Manual, user-triggered ("Sync Feed" button)                      │
│  CurrentAffairs.tsx → POST /api/sync-feed (server-lib/sync-feed.ts)        │
│    → reads source_reputation, applies exponential backoff per source      │
│    → dispatches GET /api/internal/worker?source=X for each healthy source │
│    → server-lib/internal/worker.ts fetches ONE named source directly      │
│    7 feeds INCLUDING PIB's own RSS feed (pib.gov.in/RssFeed.aspx).        │
│    Only runs when a logged-in user clicks the button; 5-min cooldown.     │
│    The only path that both reads AND writes source_reputation.            │
├────────────────────────────────────────────────────────────────────────────┤
│  Path C — Orphaned Express route                                          │
│  GET/POST /api/cron/scrape (server-lib/cron/scrape.ts)                    │
│    Registered in server.ts / api/server.ts but NOT scheduled anywhere in  │
│    vercel.json. Uses config.ts's 3-feed default list. No confidence       │
│    filter, no reputation tracking, no PIB feed. Appears dead in production.│
├────────────────────────────────────────────────────────────────────────────┤
│  Path D — GitHub Actions cron (scripts/run-scraper.ts)                    │
│  .github/workflows/scraper.yml, 3×/day (2:30, 10:30, 16:30 UTC)           │
│    Independent scheduling, independent of Vercel entirely. Uses the same  │
│    3-feed config.ts default list, Turndown-based extraction, no           │
│    confidence filter, no reputation tracking, no PIB feed.                │
│    This is very likely the source of the "Autonomously synced 3x daily"   │
│    label shown in the CurrentAffairs.tsx UI — but it runs the WEAKEST     │
│    quality logic of the four paths.                                       │
└────────────────────────────────────────────────────────────────────────────┘
```

All four paths write to the same `current_affairs` table via `upsertCurrentAffairs()` ([`server-lib/cron/db.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/db.ts)), deduped only by exact `url` match (`onConflict: 'url'`). None of the four paths are aware of the others running.

## 2. Shared Dependency: `getLlama3Insight` (`server-lib/cron/ai.ts`)

Paths A, B, C, and D (all `current_affairs` paths) call the same `getLlama3Insight()` function, which connects to a Hugging Face Gradio Space (`SKU1/meta-llama-Llama-3.1-8B-Instruct`) via `@gradio/client`. **This Space is a separate concern from the PIB aggregator** (`pib-aggregator.ts`), but uses the identical underlying Space — so an outage there (e.g. exhausted HF Inference Providers credits) silently breaks all four of these paths at once, not just PIB ingestion.

`getLlama3Insight` forces its output into exactly 3 bullet lines via `normalizeToThreeBullets()`. If the model returns fewer than 3 substantive points, the normalizer currently **pads the array with a literal placeholder string** ("Additional context pending.") to force the count — meaning a real user can see a fabricated, empty third bullet on a published card.

## 3. Source Quality & Coverage — Current State

- **Geographic/topical scope**: 100% India-focused, and entirely mainstream financial/business press (Economic Times, LiveMint, The Hindu, Indian Express, Business Standard) plus RBI. **No international/world sources exist anywhere across all four paths.**
- **Direct government sources**: only Path B (`internal/worker.ts`) fetches PIB's own RSS feed directly. Paths A, C, and D never touch a primary-source government feed — they rely entirely on how mainstream outlets choose to cover government activity. Since Path B only runs on-demand when a user clicks "Sync Feed," **the single most authoritative source in the entire system is the least reliably ingested one.**
- **Ministry/entity tagging**: three different implementations exist, of varying quality — a crude 4-bucket keyword classifier (Paths B/C/D, near-identical copies) and a genuinely sophisticated deterministic classifier with a 40+ entity canonical list and alias matching (Path A, `extractMinistryDeterministic` in `pipeline.ts`). Which one a given article gets depends entirely on which path happened to ingest it.
- **Relevance filtering**: a shared hard-exclusion keyword blocklist (crime/celebrity/entertainment terms) runs everywhere. A second layer — a rule-based "confidence scorer" requiring ≥50% keyword-density before an article is considered policy-relevant — exists **only in Path A** (`isPolicyRelevant()` in `pipeline.ts`). Paths B, C, and D have no relevance gate beyond the blocklist, so they will happily ingest anything that isn't explicitly excluded.
- **Deduplication**: exact-URL only. The same government announcement covered by three different outlets produces three near-identical cards in the feed; there is no story-level clustering.
- **Reputation-aware source health**: a genuinely well-built adaptive backoff system exists (`source_reputation` table + `update_source_reputation` RPC, exponential backoff capped at 24h) — but it is **only wired into Path B**. Paths A, C, and D never report success/failure to it and never consult it before hitting a source.

## 4. Execution & Scheduling

- **Vercel Cron** (`vercel.json`): `/api/cron/newsdata` once daily at 00:00 UTC → Path A.
- **GitHub Actions** (`.github/workflows/scraper.yml`): `scripts/run-scraper.ts` three times daily → Path D.
- **User-triggered**: `/api/sync-feed` → Path B, 5-minute per-user cooldown.
- **Manual/orphaned**: `/api/cron/scrape` → Path C, reachable but not scheduled by anything found in this repo.

Note: Vercel's Hobby tier caps cron jobs to once-daily execution — this is very likely why Path A (the highest-quality path) only runs once a day while the GitHub Actions path (weaker quality) runs three times daily on its own independent schedule.
