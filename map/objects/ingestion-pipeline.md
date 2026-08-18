---
type: object
status: verified 2026-08-18
universe: live
---

# Object: Ingestion Pipeline (`pib_digests`, RSS Scrapers, LLM Distillation)

## 1. What It Is
The automated data extraction and synthesis machinery that scrapes government releases and current affairs feeds, cleans HTML content, runs LLM analysis, and publishes structured digests and MCQs.

## 2. Why This Shape
- **Asynchronous Execution**: RSS scraping and LLM generation take significant time; Vercel `waitUntil()` decouples heavy processing from HTTP request timeouts.
- **Fault-Tolerant Processing**: Individual item-level try/catch blocks ensure single feed corruptions do not crash the daily ingestion batch.

## 3. Shape & Citations
- **PIB Digest Model**: [`supabase/migrations/20260616220000_create_pib_digests.sql`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/supabase/migrations/20260616220000_create_pib_digests.sql)
- **Pipeline Runner**: [`server-lib/cron/pipeline.ts:L1-L100`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/pipeline.ts#L1-L100)
- **PIB Aggregator**: [`server-lib/cron/pib-aggregator.ts:L1-L80`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/pib-aggregator.ts#L1-L80)
- **AI Distillation**: [`server-lib/cron/ai.ts:L1-L60`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/ai.ts#L1-L60)

## 4. Connected To
- **Produces**: Rows in `pib_digests` and `questions`.
- **Triggered by**: `/api/cron/scrape` via `CRON_SECRET`.

## 5. If You Change This
- **Hits**: [`server-lib/cron/pipeline.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/pipeline.ts), [`src/components/CurrentAffairs.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/CurrentAffairs.tsx).
- **Does not hit**: Payment processing or Razorpay checkout (`server-lib/create-razorpay-order.ts`).

## 6. Surfaces
- **Written by**: Background cron tasks in `server-lib/cron/`.
- **Read by**: [`src/components/CurrentAffairs.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/CurrentAffairs.tsx).

## 7. See
- Source: [`server-lib/cron/pipeline.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/pipeline.ts)
- Doc: [`docs/ingestion-pipeline.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/ingestion-pipeline.md)
