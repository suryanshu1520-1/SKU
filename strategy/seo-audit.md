# SEO Audit — Tark 1.0

> Generated: 2026-08-18 · Lens: `marketing:seo-audit` · Scope note: no live URL and no connected SEO tooling (Ahrefs/Semrush) were available. Keyword volume/difficulty below are directional judgments grounded in a competitive web search, not tool-verified numbers. Technical findings come directly from the codebase and are exact, not estimated.

## Executive Summary

Tark's biggest SEO asset and its biggest SEO liability are the same thing: a daily AI-distilled current-affairs digest that is genuinely valuable content, generated automatically every day — and completely invisible to search engines. The site is a pure client-side-rendered Vite + React SPA ([`src/main.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/main.tsx), [`src/App.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/App.tsx) client-side state machine, no router) with a single static route, no per-article URLs, no sitemap, and the one asset worth ranking for is locked behind login. Meanwhile the exact queries this content could win — "today's current affairs UPSC," "PIB analysis UPSC" — are currently owned by Drishti IAS, Vision IAS, Insights on India, Vajiram & Ravi, and half a dozen others, all of whom publish this same category of content as public, date-stamped, indexed pages daily.

**Overall assessment: critical issues.** This isn't a "needs polish" situation — right now Google has almost nothing to index. Top three priorities, in order:
1. Make the daily digest publicly crawlable without breaking the login-gated product experience.
2. Add baseline technical scaffolding (sitemap, robots.txt, per-article routes, meta tags) — none of it exists today.
3. Turn the content pipeline that already runs every day ([`server-lib/cron/pipeline.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/pipeline.ts), see [`docs/ingestion-pipeline.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/ingestion-pipeline.md)) into a compounding public archive rather than a session-only feed.

## Keyword Opportunity Table

| Keyword | Est. Difficulty | Opportunity Score | Current Ranking | Intent | Recommended Content Type |
|---|---|---|---|---|---|
| [today's date] current affairs UPSC | High (incumbents rank daily) | Medium — high volume but entrenched competitors | Not ranking (no public page exists) | Informational | Daily public digest page, date-stamped URL |
| PIB analysis for UPSC | High | Medium-High — Drishti's "Weekly PIB Analysis" owns this; a *daily* cadence is a real differentiator | Not ranking | Informational | Daily/weekly PIB digest page |
| UPSC current affairs quiz | Medium | High — fewer incumbents combine news + quiz in one asset | Not ranking | Informational/Transactional | Public quiz-from-today's-news page |
| UPSC mock test negative marking | Medium | High — matches Arena's actual mechanic, underserved specific query | Not ranking | Transactional | Landing/feature page |
| free UPSC current affairs today | High | Medium — huge volume, huge competition, but any share matters | Not ranking | Informational | Daily digest, free-tier visible |
| UPSC current affairs [month] [year] compilation | High | Medium — every incumbent has a monthly PDF/page for this | Not ranking | Informational | Monthly archive/index page |
| ad-free UPSC test series | Low | Medium — low volume but near-zero competition, matches brand truthfully | Not ranking | Commercial | Landing page section |
| UPSC current affairs analysis with MCQ | Low-Medium | High — specific, underserved, matches the actual pipeline output | Not ranking | Informational | Digest article + inline quiz |
| UPSC prelims syllabus coverage tracker | Low | High — no major incumbent owns this term; ties to the Coverage Ledger idea in the brainstorm | Not ranking | Informational/Tool | Interactive tool/landing page |
| State PSC current affairs today | Medium | Medium — less crowded than UPSC-specific terms | Not ranking | Informational | Digest, state-tagged |
| how to read PIB for UPSC | Medium | Low-Medium — well-covered by Drishti's existing blog post | Not ranking | Informational | Guide/blog post |
| UPSC test series lifetime access | Low | Medium — matches Founders Club pricing model, near-zero direct competition on phrasing | Not ranking | Transactional | Pricing/landing page |
| best UPSC mock test app India | High | Low — extremely crowded, app-store-driven | Not ranking | Commercial | Not a near-term priority |
| UPSC current affairs Hindi medium | Medium | Medium — real demand, ties to the तर्क wordmark decision from the brand review | Not ranking | Informational | Hindi-language digest variant |
| daily PIB summary UPSC free | Medium-High | Medium — BYJU'S and Educrat IAS already rank here | Not ranking | Informational | Daily digest |

## On-Page Issues Table

| Page | Issue | Severity | Recommended Fix |
|---|---|---|---|
| Entire site | No indexable content exists outside a single static shell — every screen (Arena, Tracker, Autopsy, Leaderboard) is a client-side state change, not a URL | **Critical** | Introduce real routes (even a router for a handful of public pages) before anything else below matters |
| Entire site | No `sitemap.xml` or confirmed `robots.txt` | **Critical** | Add both; trivial effort, currently nothing for a crawler to discover |
| Landing page | No `<title>`/meta description strategy confirmed beyond the default Vite `index.html` template | **High** | Set unique title/meta per route once routes exist; use the meta title/description drafted in [`landing-page-copy.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/strategy/landing-page-copy.md) |
| Current Affairs digest | Highest-value content in the entire product is behind auth with no public URL at all | **Critical** | Single biggest missed opportunity — see Content Gap section |
| Entire site | No structured data (Article, FAQPage, Organization schema) | **Medium** | Add once public article pages exist — Article schema is what lets daily digest pages compete for "current affairs today" rich results |
| Entire site | No image alt text auditable — no blog imagery exists yet since there's no blog | **Low** | Applies once content pages are built |
| Landing page | Single H1 confirmed ("Tark 1.0 | तर्क 1.0") — technically fine, but the page has no other indexable heading content to target secondary keywords | **Medium** | Add the value-prop sections from the landing-copy draft as real, crawlable H2s |

## Content Gap Recommendations

| Topic/Keyword | Why It Matters | Format | Priority | Effort |
|---|---|---|---|---|
| Public daily current-affairs digest (one per day, permalinked) | Exact content category the entire competitive set ranks on; Tark already generates it daily via the existing ingestion pipeline — a distribution gap, not a content-creation gap | Server-rendered or pre-rendered article page per day | **High** | Moderate (mostly plumbing — the AI content already exists) |
| Monthly current-affairs compilation/archive index | Every major incumbent (Drishti, Vision IAS, Vajiram & Ravi) publishes this proven format | Archive/index page aggregating daily digests | Medium | Quick win once daily pages exist |
| "UPSC syllabus coverage" tool/page | No major incumbent owns this specific framing; connects directly to the Coverage Ledger idea from the brainstorm — a genuinely original, linkable asset instead of competing head-on in an oversaturated category | Interactive landing page/tool | **High** | Substantial (depends on the syllabus-tagging work from the brainstorm) |
| Hindi-medium digest variant | Real search demand, gives the तर्क wordmark actual substance instead of decoration (see brand review) | Parallel Hindi content track | Medium | Substantial (translation/generation pipeline) |
| PIB-specific weekly analysis page | Drishti's version ranks well; a *daily* version is a legitimate differentiation angle | Blog-style page | Medium | Quick win (subset of the daily digest work) |

## Technical SEO Checklist

| Check | Status | Details |
|---|---|---|
| HTTPS | Pass (assumed via Vercel default) | Not independently verified — no live URL provided |
| Mobile-friendliness | Likely Pass | Tailwind responsive classes confirmed throughout components |
| Crawlable routes | **Fail** | No router, single static shell, all content is client-state |
| XML sitemap | **Fail** | None found |
| robots.txt | **Fail (unconfirmed)** | None found in repo root |
| Meta tags per page | **Fail** | Single static `index.html`, no per-route meta strategy |
| Structured data | **Fail** | None present |
| Server-side rendering / prerendering | **Fail** | Pure client-rendered Vite SPA |
| Core Web Vitals signals | Likely Pass on LCP/CLS (minimal, lean bundle; sharp corners, no heavy imagery) | Not measured live |
| Canonical tags | **Fail (N/A)** | No multi-page structure yet to require them |

## Competitor Comparison Summary

| Dimension | Tark 1.0 | Drishti IAS | Insights on India | Winner |
|---|---|---|---|---|
| Public indexed content | ~0 pages | Thousands (daily + monthly archives) | Thousands (daily updates) | Competitors, decisively |
| Content freshness | Daily generation, zero public exposure | Daily | Daily (except Sunday) | Competitors |
| Technical SEO foundation | None (SPA, no sitemap/routes) | Mature, established | Mature, established | Competitors |
| Content generation cost | Automated (AI pipeline, near-zero marginal cost) | Manual editorial team | Manual editorial team | **Tark** — if shipped publicly, a real structural advantage |
| Differentiated format (news → self-test in one flow) | Exists in-product, not public | Not offered | Offers static+current quizzes separately | **Tark** — genuinely novel if surfaced publicly |

## Prioritized Action Plan

**Quick wins (do this week):**
- Add `robots.txt` and a placeholder `sitemap.xml` — near-zero effort, currently doesn't exist at all.
- Set a unique `<title>` and meta description on the existing static landing page using the copy in [`landing-page-copy.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/strategy/landing-page-copy.md).
- Decide and document what a "public" version of one digest article looks like — a product decision, not an engineering one, and the blocker for everything else.

**Strategic investments (plan for this quarter):**
- **Ship public, permalinked daily digest pages** (server-rendered or statically pre-rendered from the existing Supabase content) — high impact, since the content already exists and the entire competitive category runs on exactly this format. Dependency: a routing/rendering decision (Next.js-style migration, or a lightweight prerender step bolted onto the current Vite/Express stack).
- **Build the monthly archive index** — medium impact, quick win once daily pages exist.
- **Ship a public syllabus-coverage tool** — high impact, genuinely uncontested keyword space rather than competing head-on with entrenched IAS-coaching domains. Dependency: the syllabus/PYQ tagging work identified in the brainstorm.
- **Add Article + FAQPage structured data** once public pages exist — medium impact, unlocks rich results.

## Open Tension

Doing this well requires the site to stop being a pure gated SPA for at least a subset of pages. That's a real architecture decision, not a content tweak — worth scoping as its own project rather than something that falls out of the other three reviews.

## Sources

- [Daily Current Affairs & News Analysis for UPSC IAS Exam 2026](https://www.insightsonindia.com/current-affairs-upsc/)
- [Latest Current Affairs 2026, Daily News & Editorials PDF](https://www.drishtiias.com/current-affairs-news-analysis-editorials)
- [Current Affairs 2026 for UPSC Exam](https://vajiramandravi.com/current-affairs/)
- [Current Affairs | Vision IAS](https://visionias.in/current-affairs/)
- [Importance of PIB for UPSC: How & Where to Read PIB Effectively | Drishti IAS](https://www.drishtiias.com/blog/why-pib-is-important-for-upsc-preparation-how-to-read-and-where-to-read)
- [Daily PIB Summary for UPSC | Analysis, Schemes & Current Affairs](https://educratias.com/pib-summary-for-upsc/)
