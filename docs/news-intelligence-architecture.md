# Tark Daily Briefs — Intelligence Engine Architecture (Zero-Budget)

> 2026-08-19. The complete re-architecture of Daily Briefs from a coaching-digest scraper into a first-source intelligence engine — **built entirely on free tiers, no paid infrastructure**. Supersedes the interim audit in [[news-feed-quality-roadmap]]. Decisions locked with the owner; re-solved for a strict $0 budget (no Supabase Pro).

## The reframe
Stop aggregating coaching-site digests (derivative, brittle, downstream of the competition). Become a **first-source intelligence engine**: read the primary record, **cluster → rank by significance → synthesize once → deliver as a finite daily edition**. One place that tells a UPSC aspirant what actually mattered today — deduped, ranked, exam-tagged, and *completable*. Low-cortisol by construction (finite, not infinite), quality-first (primary sources + corroboration), resilient (no single dependency can kill it again).

## The zero-budget constraint (the design rule)
Every component must run on a free tier. This is not a limitation to apologize for — it *forces* the efficient design (dedup-before-LLM, top-K synthesis, small daily batches) that also makes the product better.

| Concern | Free-tier solution | Why it fits |
|---|---|---|
| Text generation | **Gemini free tier** (primary) + **Groq free tier** (fallback) — the multi-provider `llm.ts` | Daily batch of ~10 syntheses is far under free RPD limits |
| Embeddings / clustering | **Gemini free embedding model** (`text-embedding-004`) + **in-memory cosine** | ~40 items/day → pairwise cosine in JS is trivial; **pgvector/Supabase Pro NOT needed** — that's only for querying millions of vectors at scale |
| Database | **Supabase free tier** (500 MB) | Text stories + optional embeddings-as-`jsonb` are tiny at this volume |
| Scheduler | **GitHub Actions** (free minutes) — already runs 3×/day | Sidesteps the Vercel Hobby "cron once/day" cap entirely |
| Hosting/API | **Vercel Hobby** | Serves the app + on-demand sync; the heavy pipeline runs on GitHub Actions, not Vercel cron |

**Locked decisions (as re-solved for $0):**
1. **LLM layer:** multi-provider abstraction — Gemini primary + Groq fallback. *(Done — Phase 1.)*
2. **Clustering:** embeddings-based, but **at zero cost** — Gemini free embeddings + in-memory cosine clustering. Same semantic quality the owner wanted; **no pgvector, no Supabase Pro.** Embeddings optionally persisted as `jsonb` for related-stories/search later.
3. **Delivery:** **both** — a finite, significance-ranked **Daily Edition** as the default landing view, with the full searchable feed underneath.

## The pipeline (one path, five tiers)

```
Tier 0  FIRST-SOURCE LAYER
        PIB + ministry sub-feeds · PRS Legislative Research · RBI · SC/HC judgments · Gazette
        + wires (Hindu, Indian Express Explained, Business Standard, LiveMint)
        + world set (Reuters, AP, UN News, IMF, World Bank, WHO)   ← currently near-zero world coverage
        every source carries a reputation score (source_reputation, already built)
                              │
Tier 1  UNIFIED INGEST   ← collapses the 4 drifted pipelines into ONE
        reputation-aware backoff · got-scraping + cheerio · normalize → canonical RawItem
                              │
Tier 2  CLUSTER & DEDUP  ← the clutter-killer, at $0
        embed each item (Gemini free) · in-memory cosine · group near-dupes into one
        Story{sources[]} · authority-rank the sources within a story
                              │
Tier 3  SIGNIFICANCE SCORING  ← the low-stimulus lever
        cheap rule pre-filter → LLM scores each CLUSTER: UPSC-relevance + significance + syllabus node
        rank by SIGNIFICANCE, not recency
                              │
Tier 4  SYNTHESIZE       ← quality + cost
        top-K clusters only · once per cluster (not per source) · via multi-provider llm.ts
        structured output: honest bullets (no padding), prelims/mains pointers,
        syllabus tags, and auto-generated MCQs → feed the quiz (briefs↔arena cross-link)
                              │
Tier 5  DELIVER
        Daily Edition: finite, significance-ranked (~8–12 stories), fixed-time drop,
        reading-time budget, "done for today" close  +  full searchable feed underneath
```

## Why it's faster & cheaper (the "100×" math)
Dedup-*before*-LLM + synthesize-per-cluster + top-K-only + caching ⇒ tokens spent on ~10 stories/day instead of ~40 raw items, each once instead of 3× (three outlets, one story). Consolidating 4 codepaths removes drift. Multi-source spine + multi-provider LLM ⇒ no single dead dependency halts everything. Every stage sits inside free-tier limits by design.

## Phased implementation

| Phase                         | Deliverable                                                                                                                                                                                                                       | Status / gate                                                                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **P1 — Unblock + resilience** | `server-lib/llm.ts` multi-provider (Gemini→Groq, model-fallback, backoff, self-disabling providers); `ai.ts` + `pib-aggregator.ts` retrofitted off the dead Gradio Space; fabricated-bullet padding removed. Typechecks clean.    | ✅ **code shipped**. Runtime-test pending an LLM key in the run env (CI has `GEMINI_API_KEY`; add `GROQ_API_KEY` for fallback). |
| **P2 — Consolidate**          | Merge the 4 `current_affairs` paths into one unified ingest module; wire `source_reputation` into the scheduled path; add first-source (PRS ✅ partial, courts, Gazette) + world feeds; remove the dead `aiEndpointUrl` HF config. | No gate. Next up.                                                                                                              |
| **P3 — Cluster ($0)**         | Gemini free embeddings + in-memory cosine clustering → `Story{sources[]}`; authority ranking; story-level dedup; optional `jsonb` embedding persistence.                                                                          | No gate (free).                                                                                                                |
| **P4 — Rank & synthesize**    | Significance scoring; top-K synthesis per cluster; structured output incl. syllabus tags + MCQ generation.                                                                                                                        | P1 + P3.                                                                                                                       |
| **P5 — Deliver**              | Daily Edition view (finite, ranked, drop-time, completion state) on top of the existing feed; briefs↔arena cross-link.                                                                                                            | P4; UI coordinates with the design revamp.                                                                                     |

## Owner actions required (all free)
- **`GROQ_API_KEY`** (free tier) → Vercel + GitHub secrets, to activate fallback resilience.
- Confirm **`GEMINI_API_KEY`** is in the **Vercel runtime** too (currently only confirmed as a GitHub Actions secret) — needed if any LLM work runs on Vercel; the GitHub-Actions pipeline already has it.
- **No Supabase Pro. No paid vector DB. No paid anything.** (Prior plan's pgvector requirement is retired — replaced by free Gemini embeddings + in-memory cosine.)

## Guardrails
- Keep the PIB reader's scoped tokens / `light-theme` intact.
- Preserve the `current_affairs` frontend contract (`{ headline, url, source, ministry, summary:{bullets[]} }`) until P5 migrates the schema deliberately.
- Quality-first: never publish a fabricated/padded bullet; one honest bullet beats three where one is fake.
- Stay inside free-tier rate limits: batch embeddings, cap synthesis at top-K, cache aggressively, dedup before spending any tokens.

---

## Addendum — Source Acquisition, Live-Verified (2026-08-19)

> Correction to the plan above: Tier 0 was ranked by *prestige*. The axis that actually governs a $0 scraper is **extractability** — does the source hand over full English body text without a paywall, JS render, or bot wall? Re-ranked on that axis, the source list inverts. All findings below were verified live against the real endpoints on 2026-08-19 (got-scraping + cheerio), not assumed.

### The PIB reality (why it can't be the backbone)
The extraction *mechanics* are trivial — `got-scraping` + PIB's bespoke container `.innner-page-main-about-us-content-right-part` (their own typo, triple-`n`) returns 2,000–3,800 chars of clean text, 200 OK, no JS, no bot wall. Signal is fine too (~1/20 ceremonial). **But PIB serves Hindi and has no working English feed:**
- RSS `<description>` is empty → a second per-item page fetch is *always* required.
- `Lang=2` (English) returns the byte-identical **Hindi** feed as `Lang=1`; `Regid=0` (all, English) returns **0 items**; even `PressReleasePage.aspx?PRID=` renders Hindi. PIB files each language as a *separate PRID* with no reliable English selector.

**Decision (owner-approved):** **Path 2 spine + Path 1 bolt-on.** Do not stake the product on a feed that can't reliably hand over English. PIB is demoted to a *supplementary* source, ingested in Hindi and translated during synthesis (Gemini handles Hindi→English well), never the backbone.

### The verified spine (Path 2 — the backbone)
| Source | Working recipe (verified 2026-08-19) | Notes |
|---|---|---|
| **RBI** | `https://www.rbi.org.in/pressreleases_rss.xml` (RSS 2.0, English, 10 items) | ⚠️ **Live bug**: `pipeline.ts` uses `rss/PRs.xml` → **404**, so RBI currently contributes nothing. `website.rbi.org.in` returns **418** (bot wall) — stay on `www.` |
| **PRS Legislative Research** | listing → article page, content in **`.top_content`** (~11k chars, English) | `.field--name-body`/`article` are empty — `.top_content` is the container. Trim residual nav chrome; filter the blog for policy/bill posts (it mixes in obituaries etc.) |
| **Wikipedia Current Events** | API `action=parse&page=Portal:Current_events` → parse `<li>` (201 events, English, source-cited e.g. "(Al Jazeera)") | Great GS2/GS3 world spine. Same-day page lags ~1 day → use the main portal (last ~7 days). Dedupe nested `<li>` parent/child; strip the maintenance-note first item |

### Revised acquisition rules (supersede the generic scraper)
1. **Per-source targeted extractors**, not generic regex. A small registry: domain → fetch strategy + content selector. Retire the `<main>`/`<article>` regex in `scrapeArticleContent()`.
2. **No-text-no-story gate.** If extracted body < ~400 chars, **drop the item** — never synthesize from a headline. Delete the headline-only fallback (`pipeline.ts` ~L518–560); it fabricates whole stories behind real headlines and is the true source of the credibility problem.
3. **Extraction-success-rate feeds `source_reputation`.** A source that yields usable text rarely auto-demotes — the honest, self-healing version of source curation.
4. **`got-scraping` everywhere** (not raw `fetch`) — it clears the basic bot walls that `fetch` trips on. Already a dependency; used in the manual path but not the scheduled one.

### Mainstream news RSS — demoted to headline-pointers
The Hindu / Indian Express / Business Standard / LiveMint RSS are truncated and increasingly paywalled; treat as headline/link signals for clustering, **not** body-text sources.

---

## P2 — Built & Verified (2026-08-19)

The unified ingest module is **implemented, typechecks clean, and is proven end-to-end via a live dry run** (no DB writes). It consolidates the four drifted paths into one.

### New module: `server-lib/cron/ingest/`
- `types.ts` — `SourceAdapter`, `RawRef`, `IngestOptions`, `IngestResult`.
- `extract.ts` — got-scraping fetch + defensive RSS/Atom parse + cheerio body extraction (per-source selectors → generic Readability-ish fallback).
- `classify.ts` — the **single** classifier (ministry / exclusion / policy-confidence), replacing four divergent copies.
- `synthesize.ts` — language-aware LLM distillation (English in-place; **Hindi→English for PIB**). Honest bullets, never padded; returns null on non-relevance.
- `sources.ts` — the registry (RBI, PRS, PIB, Wikipedia enabled; UN News disabled — unreachable; The Hindu / IE / Business Standard / LiveMint as demoted wires).
- `orchestrator.ts` — `runIngest()`: reputation-aware loop, early dedup, **no-text-no-story gate (400 chars)**, per-source `source_reputation` reporting, time-budgeted.

### Entrypoints rewired to the one path
`pipeline.ts` (→ deprecated shim), `cron/scrape.ts`, `internal/worker.ts`, `scripts/run-scraper.ts`. `sync-feed.ts` now derives its dispatch list from the registry so it can't drift again.

### Bugs found & fixed while building (all verified live)
1. **RBI feed 404** — `rss/PRs.xml` was dead; corrected to `pressreleases_rss.xml`. RBI had been contributing nothing.
2. **PIB feed 404** — legacy `RssFeed.aspx?PingID=1` is dead; corrected to `RssMain.aspx?ModId=6&Lang=1&Regid=3`.
3. **GitHub Actions had no LLM keys** — `scraper.yml` passed only `SUPABASE_*` + dead `HF_*`, so the 3×/day autonomous path could never synthesize and dropped everything. Added `GEMINI_API_KEY` + `GROQ_API_KEY`; removed the unused Playwright install.
4. **Groq model names 404** — `llama-3.3-70b-versatile` / `llama-3.1-8b-instant` are `model_not_found` on current accounts; default chain updated to `openai/gpt-oss-120b,openai/gpt-oss-20b`.
5. **ASP.NET `<form>` stripping** — the generic extractor removed `<form>`, which zeroed PIB/.gov.in pages (they wrap the whole body in one form). Removed from the noise list.

### Dry-run evidence
RBI → exact auction figures; PRS → accurate discom-loss bullets, obituary self-filtered; **PIB Hindi press release → clean English bullets, ceremonial tribute self-filtered**; Wikipedia → sourced world bullets; wires → non-policy self-filtered, policy items distilled. No fabrication — every bullet grounded in extracted text.

### Owner actions
- Add `GEMINI_API_KEY` + `GROQ_API_KEY` to **GitHub Actions secrets** (Vercel already has Gemini) — the autonomous path is inert without them.
- **Rotate the Groq key** shared during development.
- Pre-existing security debt (separate from P2): the Supabase `service_role` key is hardcoded as a fallback in `sync-feed.ts` and committed — should be removed and rotated.

### Not in this phase (next up)
P3 clustering (Gemini embeddings + in-memory cosine → `Story{sources[]}`) and P4 significance ranking / MCQ generation. The unified ingest is the foundation they build on. Minor follow-ups: tighten the PRS `.top_content` selector (currently includes some template chrome), find a reachable UN News feed.

---

## P3 — Clustering ($0) — Built & Verified (2026-08-19)

Tier 2 is implemented, typechecks clean, and the clustering + authority ranking is proven by a deterministic offline test. The `current_affairs` frontend contract is untouched (schema migration stays P5).

### What it does
The orchestrator now runs in three tiers:
- **Tier 1 GATHER** — discover → url-dedup → extract → no-text gate → `Candidate[]` (across all sources, before any synthesis).
- **Tier 2 CLUSTER** — embed each candidate, greedy in-memory cosine single-linkage → `Story{sources[]}`; the highest-authority source anchors each cluster and becomes the lead. Then **cross-run dedup**: each story's centroid is compared against the last 36 h of stored stories and dropped if it's a semantic repeat.
- **Tier 3 SYNTHESIZE** — synthesize **once per story** from the lead's body (not once per source), then upsert the lead.

### New modules
- `ingest/embeddings.ts` — **pluggable embedder**: Gemini `text-embedding-004` (free, semantic, threshold 0.82) when `GEMINI_API_KEY` is set; a local hashed bag-of-words embedder (offline, $0, threshold 0.62) otherwise. Clustering never depends on an API and never blocks ingest.
- `ingest/cluster.ts` — `clusterCandidates` (greedy centroid), `makeStory` (authority-ranked), `storyCentroid` (cross-run dedup), plus the source `AUTHORITY` map (PIB 100 > RBI 96 > PRS 92 > Wikipedia 60 > wires).

### Metrics added to `IngestResult` / the `/api/cron/newsdata` response
`clustered_merged`, `cross_run_duplicates`, `embed_mode`.

### Proof (offline local embedder)
Three outlets covering one Cabinet PM-KISAN decision collapsed to a single story with `sources=[PIB, THE HINDU, LIVEMINT]`, **PIB selected as lead**; an unrelated RBI repo-rate item and a UN Security Council item stayed as separate stories. All assertions passed.

### Design note (why no schema change here)
Per the guardrail, P3 keeps the `{headline, url, source, ministry, summary:{bullets}}` contract. So the *stored* row is the lead only — the full `sources[]` array and persisted embeddings (for related-stories / search) land in the **P5** migration. P3's user-visible win today: fewer duplicate cards and the most authoritative version winning.

### Next
P4 — significance scoring (rank stories by authority + syllabus signal, surface the important ones first) and auto-MCQ generation feeding the quiz arena. P5 — Daily Edition delivery + the schema migration that persists `sources[]` / embeddings and exposes multi-source stories on the cards.

---

## P5 — Delivery (Daily Edition) — Frontend Built (2026-08-19)

The **P5 frontend** is implemented and typechecks clean (isolated src-scoped tsc; only a pre-existing unrelated `Profile.tsx` cast error remains). The **P4 backend + P5 persistence** (significance scoring, structured synthesis with syllabus tags + prelims/mains, auto-MCQ generation, the `current_affairs_mcqs` table/migration) was delegated to **Antigravity** via `docs/handoffs/p4-p5-backend-antigravity.md` and is in progress against the shared `summary` jsonb contract.

### New component: `src/components/DailyEdition.tsx`
A finite, significance-ranked **front page** rendered above the feed in `CurrentAffairs.tsx` (inserted between the error banner and the loading skeleton — filter-independent).
- **Finite & completable** (low-cortisol): top ≤10 stories by `summary.significance`, reading-time estimate, per-story "mark read" with a progress bar and a **"You're caught up on today's affairs"** completion close. Read-state persists per day in `localStorage`.
- **Multi-source corroboration badge** — when `cluster_size > 1`, an emerald "+N sources" chip surfaces the P3 clustering win (the authoritative version leads, co-sources are credited).
- **Syllabus tags** + **Prelims/Mains pointers** rendered from the extended summary.
- **Significance rail** — a per-story vertical meter + rank number.
- **Briefs↔Arena cross-link** — a "Test Today" button loads `current_affairs_mcqs` for the edition and runs a self-contained practice quiz (question → reveal correct + explanation → score). The ranked Arena stays the server-authoritative scorer; this is practice.
- **Graceful self-hide** — renders nothing until the backend writes `summary.significance`, so it never shows a broken shell pre-P4.

Matches the design system exactly (accent `#e0d0ab`, serif headlines / sans body / mono numerals, zinc gradient `rounded-sm` cards, motion/react, lucide icons).

### Status: Complete (2026-08-19)
1. ✅ `supabase/migrations/20260619000003_current_affairs_mcqs.sql` applied to Supabase database (RLS enabled, policies active).
2. ✅ Ingestion backend implemented in `server-lib/cron/ingest/` (`significance.ts`, `synthesize.ts`, `mcq.ts`, `mcq-db.ts`, `orchestrator.ts`).
3. ✅ Full contract support for `summary.significance`, `summary.tags`, `summary.prelims`, `summary.mains`, `summary.sources`, `summary.cluster_size`, `summary.edition_date`, and `summary.has_quiz`.
4. ✅ Typecheck verified cleanly with `npm run lint`.
