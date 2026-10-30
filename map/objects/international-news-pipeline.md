---
type: object
status: verified 2026-10-29
universe: live
---

# Object: International News Pipeline & Scoped Intelligence

## 1. What It Is
First-class International section within Tark Intelligence using shared published article stores (`current_affairs`) and existing UI shells, with private operational relations, fail-closed auth, deterministic India-posture verification (UPSC prelims trap guardrails), operative-salience context windowing, and advisory-locked publication.

## 2. Why This Shape
- **Bilateral Boilerplate Defense**: Multiple bilateral agreements signed in the same summit (e.g. Maritime Logistics vs Space Payload) share generic diplomatic text; the Hard Instrument Disjointness Gate enforces distinct story episodes.
- **UPSC Prelims Trap Guardrail**: Prevents conflating observer status or third-party press release commentary with state ratification or accession; demotes unevidenced accession claims to `non_party_commentator`.
- **Atomic Concurrency**: Concurrent workers serialize publication per episode bucket via `pg_advisory_xact_lock(hashtext(p_candidate_bucket_key))`.
- **Fast-Path Conditional Ingestion**: Honors `If-None-Match` and `If-Modified-Since` headers to bypass extraction compute on 304 Not Modified.
- **Domestic Isolation**: International and cross-border records are isolated from the domestic numeric Rebase v1 ledger and domestic policy DAG.

## 3. Shape & Citations
- **Source Policy Registry**: [`server-lib/news/source-policy.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/news/source-policy.ts) (admitted profiles, allowed hostnames, rights status, rollout lanes).
- **Episode Identity & Disjointness**: [`server-lib/news/identity.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/news/identity.ts) (`computeCandidateBucketKey`, `checkInstrumentDisjointness`).
- **Operative Salience Windowing**: [`server-lib/news/salience-window.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/news/salience-window.ts) (Head ~1,200 chars + Operative Clauses ~4,800 chars).
- **Evidence & Posture Verifier**: [`server-lib/news/evidence.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/news/evidence.ts) (`verifyIndiaPosture`, `validateDispatchEvidence`).
- **Atomic Publication**: [`server-lib/news/publication.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/news/publication.ts) calling `publish_news_dispatch_atomic` RPC.
- **Scoped Read & Router**: [`server-lib/news/read.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/news/read.ts) & [`server-lib/news/routes.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/news/routes.ts) (`/api/intelligence/feed`, `/api/intelligence/coverage`, `/api/intelligence/article/:id`).
- **Reserved SEO Routing**: [`server-lib/seo/routes.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/seo/routes.ts) & [`server-lib/seo/bot-renderer.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/seo/bot-renderer.ts) (`/intelligence/international`, `/news/international`).

## 4. Connected To
- **Produces**: Rows in `current_affairs` (with `coverage_scope` in `international` or `cross_border`, `content_version`, `story_id`, `source_published_at`).
- **Private Pipeline Stores**: `news_source_documents`, `news_document_versions`, `news_stories`, `news_dispatch_revisions`.
- **Surfaces**: [`src/components/CurrentAffairs.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/CurrentAffairs.tsx) (Category Tab `International`), [`src/components/VerticalNavRail.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/VerticalNavRail.tsx) (`Global` rail action), [`src/components/NewsSignalCard.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/NewsSignalCard.tsx) (scope badge and posture indicator), [`src/components/PolicyBrief.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/PolicyBrief.tsx).

## 5. If You Change This
- **Classification contract**: `src/lib/article-classification.ts` resolves subject and coverage from article text with evidence and review reasons. Feed cards, Daily Edition, briefs, API reads, ingestion and publication share it; historical stored scopes do not control public filtering. `src/lib/article-feed-selection.ts` applies classification before pagination. See `docs/article-classification.md` for the read-only audit and regression workflow.
- **Hits**: `/api/intelligence/feed`, `/intelligence/international` routing, `CurrentAffairs.tsx` filtering, and crawler hub SEO rendering.
- **Does not hit**: Numeric Rebase v1 (strictly firewalled from international content); Razorpay checkout.

