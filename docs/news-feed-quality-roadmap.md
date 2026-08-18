# News Feed Quality Roadmap — Making Current Affairs Exceptional

> Generated: 2026-08-18. Companion to the rewritten [`ingestion-pipeline.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/ingestion-pipeline.md) — read that first for how the system actually works today. This document proposes how to make it excellent, while keeping the existing [`CurrentAffairs.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/CurrentAffairs.tsx) presentation (ministry/source-tagged cards, 3-bullet summaries, filters, bookmarking) unchanged. Scope is the `current_affairs` feed only — the PIB aggregator (`pib-aggregator.ts` → `pib_digests`) is explicitly out of scope per direction.

## The Core Finding

The biggest problem isn't source quality — it's that **four independent pipelines have quietly drifted into four different quality bars**, and the best one (`pipeline.ts`, Path A) runs least often, while the weakest one (`scripts/run-scraper.ts`, Path D) is what the UI's "Autonomously synced 3x daily" badge actually describes. The single most authoritative source available — PIB's own feed — is wired up correctly, but only fires when a user manually clicks "Sync Feed." Before adding new sources or smarter filtering, the highest-leverage fix is architectural: stop running four different versions of the same job.

## Prerequisite

`getLlama3Insight()` (`server-lib/cron/ai.ts`) depends on the same Hugging Face Gradio Space used by the PIB aggregator. If that Space is down (as diagnosed separately — exhausted HF Inference Providers credits), **all four `current_affairs` paths silently produce nothing**, regardless of any improvement below. Confirm that's resolved before judging whether these changes are working.

## Recommendations, in Priority Order

### 1. Consolidate to one pipeline
Retire Paths B, C, and D's independent scraping/tagging/filtering logic in favor of Path A's (`pipeline.ts`) — it already has the best relevance scoring, the best ministry classifier, and the best article-extraction. Keep Path B's *dispatch mechanism* (on-demand, reputation-aware) but have it call into the same shared pipeline functions Path A uses, rather than maintaining a second copy of the ministry tagger and exclusion list. This alone fixes the "which quality bar did this card get" inconsistency without touching the UI.

### 2. Make PIB part of the autonomous path, not just the manual one
Path A's 6-feed list has no direct government feed at all. Add PIB's RSS feed (`https://pib.gov.in/RssFeed.aspx?PingID=1`, already known-good since Path B uses it successfully) directly into the scheduled pipeline. This is the single highest-value source available and currently depends on a user remembering to click a button.

### 3. Wire `source_reputation` into the scheduled path
The adaptive exponential-backoff system is well-built and currently idle for the pipeline that runs autonomously. Have Path A report success/failure per source and consult reputation before hitting a source, exactly as Path B already does. This is what will let the system route around a source that starts failing (e.g. a feed URL changes, a site adds bot-blocking) without a human noticing.

### 4. Expand source coverage — India administrative sources beyond financial press
Current sources are almost entirely business/economy desks of mainstream outlets. For "the best kind of administrative and political news," consider adding: PRS Legislative Research (bill tracking, exceptional signal-to-noise for Parliament activity), Supreme Court/High Court judgment feeds, the Gazette of India, and PIB's ministry-specific sub-feeds (not just the general one) so ministry tagging can eventually be *sourced* rather than *inferred* from keywords.

### 5. Add genuine world/international coverage
Every current source is India-only. For UPSC's International Relations and global-affairs coverage (GS Paper II/III), add a small set of high-signal global sources: Reuters World, AP News (World/Politics), UN News, and multilateral-institution feeds (World Bank, IMF, WHO) where relevant to Indian foreign policy and global economy topics. Keep the same relevance-filtering discipline — a rule-based pre-filter tuned to "does this matter for India's foreign policy / global economy," not a firehose of all world news.

### 6. Story-level deduplication, not just URL-level
Three outlets covering the same PIB release currently produce three near-identical cards. A cheap first pass: dedupe on normalized headline similarity (fuzzy match) before the AI call, keeping the most authoritative source (prefer PIB > wire coverage > single-outlet reporting) rather than whichever URL happened to be upserted first. A semantic/embedding-based clustering pass is the more thorough version of this but is new infrastructure — no vector/embedding tooling exists in this codebase today, so treat it as a later-stage investment, not a first step.

### 7. Fix the fabricated-bullet padding
`normalizeToThreeBullets()` in `ai.ts` currently invents a filler line ("Additional context pending.") when the model returns fewer than 3 real points. Better: publish 1–2 honest bullets rather than 3 bullets where one is fake. This is a small, contained fix with real trust implications if a user notices the placeholder text.

### 8. Rank by significance, not just recency
Nothing today distinguishes a routine circular from a major policy announcement — the feed is purely reverse-chronological. Once relevance filtering and deduplication are solid, a lightweight significance score (e.g. weighted by source authority + keyword density already computed by the confidence scorer) could let "the best kind" of news actually surface first, without changing the card-grid presentation.

## What This Deliberately Does Not Include

Any change to the `pib_digests` / PIB aggregator pipeline, per direction — that is being handled as a separate, already-diagnosed issue (dead Hugging Face Space). It also does not propose new frontend UI — [`CurrentAffairs.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/CurrentAffairs.tsx) stays as-is; every recommendation here is upstream of what the user sees.
