---
type: process
status: verified 2026-08-18
universe: live
---

# Process: Daily PIB & News Ingestion

## 1. Summary
Automated cron execution that crawls government RSS feeds, strips HTML clutter, runs LLM analysis (Gemini / Llama 3) to generate markdown digests, and persists records into `pib_digests` and `questions`.

## 2. Movement
1. **Trigger**: Vercel Cron hits `/api/cron/scrape` with `CRON_SECRET`.
2. **Fetch Feeds**: [`server-lib/cron/rss.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/rss.ts) fetches RSS XML feeds.
3. **Parse & Clean**: Cheerio & Turndown sanitize article bodies.
4. **LLM Distillation**: [`server-lib/cron/ai.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/ai.ts) invokes Gemini API to produce analytical synthesis and extract MCQs.
5. **Database Upsert**: [`server-lib/cron/db.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/db.ts) inserts records into `pib_digests` and `questions`.

## 3. Objects Touched
- **Consumes**: Government RSS feeds, Gemini LLM API.
- **Produces**: [`map/objects/ingestion-pipeline.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/objects/ingestion-pipeline.md), [`map/objects/quiz-engine.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/objects/quiz-engine.md).

## 4. If You Change This
- **Hits**: [`server-lib/cron/pipeline.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/pipeline.ts), [`src/components/CurrentAffairs.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/CurrentAffairs.tsx).
- **Does not hit**: Razorpay payment flow or user auth.
