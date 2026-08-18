# Roadmap Synthesis — What Would Make Tark Complete

> Generated: 2026-08-18 · Synthesizes [`product-brainstorm.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/strategy/product-brainstorm.md), [`brand-review.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/strategy/brand-review.md), [`landing-page-copy.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/strategy/landing-page-copy.md), and [`seo-audit.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/strategy/seo-audit.md) into one prioritized view.

## The One-Paragraph Version

Tark's engineering is more disciplined than its go-to-market. The zero-trust grading, concurrency-safe checkout, and decoupled ingestion pipeline are genuinely well-built — but three things stand between this and feeling like a complete, indispensable daily driver: (1) the product is MCQ-only with no syllabus coverage map, so it can't yet answer the aspirant's real question — "am I actually going to pass?" — (2) the brand's sales page contradicts its own stated principle by using an unproven scarcity mechanic on a scam-fatigued audience, and (3) the single most valuable content asset in the product — the daily AI-distilled digest — is completely invisible to the search engines that this audience uses every single day.

## Cross-Cutting Pattern

Every review kept surfacing the same underlying idea from a different angle: **the content and data Tark already generates are worth more than what the current UI/architecture exposes them for.**

- The brainstorm found this in the *product*: the digest and the quiz engine are already built, they're just not cross-linked into a retrieval-practice loop.
- The brand review found this in the *sales page*: the scarcity is mechanically real, but the marketing doesn't prove it, so it gets none of the credibility it's actually owed.
- The SEO audit found this in *distribution*: the daily digest is exactly the content category the whole competitive niche ranks on, and it's locked behind login with zero public URLs.

None of these are "build something new" problems. They're "expose what already exists" problems — which makes them cheaper and lower-risk than they'd first appear.

## Prioritized Next Steps

**Do first (cheap, high-leverage, no new AI capability required):**
1. Tag the existing 1,722-question bank with a syllabus taxonomy + PYQ year (LLM-classification pass, spot-checked) — unlocks the Coverage Ledger idea and the syllabus-coverage SEO opportunity simultaneously.
2. Add `robots.txt` + `sitemap.xml` and set real meta tags on the existing static routes — near-zero effort, currently doesn't exist at all.
3. Rewrite the Landing hero and Manifesto proof points per [`landing-page-copy.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/strategy/landing-page-copy.md) — pure copy change, no engineering dependency.
4. Add a live "[X] of 500 seats remaining" counter pulled from the existing seat-reservation RPC — resolves the brand's biggest self-contradiction and is a small UI task against data that already exists.

**Plan this quarter (real scope, real payoff):**
5. Close the loop between Policy Tracker and Arena — inline self-test after each digest item, feeding a spaced-repetition "Revision Arena" from missed questions.
6. Ship public, permalinked daily digest pages (the core SEO fix) — requires a routing/rendering decision, the single biggest architecture call in this whole synthesis.
7. Replace the generic streak mechanic with an exam-countdown + pace indicator.

**Deliberately deferred, named so it isn't silently dropped:**
8. Mains answer-writing practice — the biggest real product gap, but also the biggest risk. Test appetite with a lightweight weekly prompt + AI feedback before committing to a full module.
9. Hindi-medium content track — would make the तर्क wordmark substantive rather than decorative, but is a genuine translation/generation pipeline, not a copy fix.
10. PWA/offline support — real gap for commute-based study, table-stakes infrastructure rather than a differentiator.

## What This Deliberately Does Not Cover

This synthesis is product/brand/growth strategy only. It does not re-litigate the engineering findings already on record in [`docs/codebase-assessment.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/codebase-assessment.md) (schema fragmentation, RLS/security advisor flags, dual-server route duplication) — those are real and should be tracked separately, but they're an engineering-hygiene concern, not a product-completeness one.
