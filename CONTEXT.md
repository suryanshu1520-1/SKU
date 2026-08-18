# Workspace Contract — Tark 1.0

## System Identity & Purpose

**Tark 1.0** is an analytical competitive exam testing arena and automated current affairs intelligence platform designed for high-stakes examinations (such as UPSC CSE, State PSCs). It blends high-speed quiz simulation with AI-distilled daily news and PIB analyses.

## Architectural Layers

```
[ Frontend: React 19 + Tailwind v4 + Framer Motion (src/) ]
                           │  HTTP / Bearer Auth
                           ▼
[ Backend API: Express.js (Local) / Vercel Serverless Functions (server-lib/, api/) ]
        │                                  │
        │ Ingestion & Distillation         │ SQL / RPC / RLS
        ▼                                  ▼
[ AI Models (Gemini / Llama 3) ]   [ Supabase PostgreSQL Backend (supabase/) ]
```

## Folder Contracts & Structure

- **`src/`** (`Product`): Frontend application components, state containers, styles, and UI views.
- **`server-lib/`** (`Product`): Core backend business logic, payment processors, quiz evaluation, user quotas, and cron handlers.
- **`api/`** (`Product`): Vercel serverless entry points routing requests into `server-lib/`.
- **`supabase/`** (`Product / Factory`): PostgreSQL migrations, RLS policies, table definitions, and database seeds.
- **`scripts/`** (`Factory`): Ingestion testing harnesses, standalone scrapers, and admin utilities.
- **`docs/`** (`Catalog / Factory`): Developer technical manuals, database schemas, and architectural reference documents.
- **`map/`** (`Catalog / System Map`): ICM System Map containing verified noun cards (`objects/`), verb workflows (`processes/`), and change-impact matrix (`effects/`).
- **`strategy/`** (`Catalog / Product`): Non-technical product brainstorms, brand/voice audits, marketing copy drafts, and SEO/growth analysis — the go-to-market counterpart to `docs/` and `map/`.
- **`.obsidian/`** (`Configuration`): Obsidian vault configuration, graph filters, and visualization settings.

## System Invariants & Human Gates

1. **Deterministic Quiz Grading**: Client submits selected answers only. Correct answer validation, scoring, penalty calculation, XP assignment, and streak tracking happen exclusively on the server (`server-lib/submit-quiz.ts`).
2. **Quota & Tier Enforcement**: Freemium users are limited to daily quiz attempts and limited bookmarks. Pro tier validation is checked at the database/backend level (`server-lib/user-limits.ts`).
3. **Double-Spend & Concurrency Protection**: Premium seat checkouts lock inventory for 15 minutes in `pending_orders` before initializing Razorpay order (`server-lib/create-razorpay-order.ts`).
4. **Resilient AI Ingestion**: News scraping handles item-level failures gracefully without aborting batches, and AI distillation runs via asynchronous background processing (`server-lib/cron/pipeline.ts`).
