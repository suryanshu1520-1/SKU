# RSS Scraper + AI Pipeline (Cron) - TODO

- [ ] Create `api/cron/config.ts` for env/config validation (feeds, limits, timeouts, concurrency, endpoint URLs).
- [ ] Create `api/cron/logger.ts` for structured, consistent logging.
- [ ] Create `api/cron/supabase.ts` to initialize Supabase client once.
- [ ] Create `api/cron/rss.ts` to fetch RSS feeds (axios w/ hardened headers + timeout) and parse with `rss-parser`.
- [ ] Create `api/cron/article.ts` to extract best-effort article text/description (meta tags + snippet fallback).
- [ ] Create `api/cron/ai.ts` to call Llama 3.1 endpoint robustly (defensive parsing, retries).
- [ ] Create `api/cron/db.ts` to upsert into `current_affairs` with dedupe strategy on `url` and fail-soft error handling.
- [ ] Refactor `api/cron/scrape.ts` into orchestration:
  - never fail the whole cron for single item errors
  - structured response `{ status: "success" | "degraded", ...counters }`
  - per-feed/per-item try/catch
- [ ] Run `npm run lint` (and `tsc --noEmit`) to ensure TypeScript correctness.
