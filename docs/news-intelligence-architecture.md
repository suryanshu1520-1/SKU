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
