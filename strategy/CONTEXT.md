# Product & Growth Strategy Library — Tark 1.0

## Shelf Purpose

This directory holds non-technical strategic work: product brainstorms, brand/voice audits, marketing copy drafts, and SEO/growth analysis. It is the counterpart to [`docs/`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/CONTEXT.md) (engineering manuals) and [`map/`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/CLAUDE.md) (code system map) — those two answer "how does the system work and how do I change it safely," this one answers "what should the product become, and how do we talk about it."

## Catalog of Documents

| Document | Topic | Key References |
|---|---|---|
| [`roadmap-synthesis.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/strategy/roadmap-synthesis.md) | Cross-cutting synthesis of the four reviews below into one prioritized "what to do next" view | All four documents in this shelf |
| [`product-brainstorm.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/strategy/product-brainstorm.md) | What would make Tark feel indispensable to a serious UPSC aspirant without betraying the anti-noise brand | `src/components/Autopsy.tsx`, `map/objects/quiz-engine.md`, `map/objects/ingestion-pipeline.md` |
| [`brand-review.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/strategy/brand-review.md) | Brand voice/visual audit of the Landing and Manifesto pages against Tark's own stated "War on Noise" principles | `src/components/Landing.tsx`, `src/components/Manifesto.tsx` |
| [`landing-page-copy.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/strategy/landing-page-copy.md) | Re-drafted landing page hero, value props, proof section, and CTAs | `src/components/Landing.tsx` |
| [`seo-audit.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/strategy/seo-audit.md) | Technical SEO audit — why the product is currently invisible to search, and how to fix it | `src/App.tsx`, `server-lib/cron/pipeline.ts`, `docs/ingestion-pipeline.md` |

## Reading Guidelines

- Start with `roadmap-synthesis.md` for the short version — the other four are the full working notes behind it.
- These documents describe a *possible future state* of the product, not the current live system. Do not treat feature names or copy drafts here as implemented — cross-check against `map/objects/_index.md` and `src/` before assuming something described here exists in code.
- Originated from a single review pass on 2026-08-18, covering product-management brainstorming, brand review, landing-page copywriting, and SEO audit lenses in sequence.
