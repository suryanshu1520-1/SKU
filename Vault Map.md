---
tags:
  - hub
  - vault-map
  - tark-1.0
  - icm-workspace
---

# 🗺️ Tark 1.0 — Vault Map & Knowledge Graph

Welcome to the **Tark 1.0 (SKU)** Obsidian Knowledge Hub. This vault is organized according to the **Interpretable Context Methodology (ICM)**.

```
                     ┌──────────────────┐
                     │   [[Vault Map]]   │
                     └─────────┬────────┘
             ┌─────────────────┼─────────────────┐
             ▼                 ▼                 ▼
      ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
      │  [[CLAUDE]]  │   │  [[docs/    │   │  [[map/     │
      │  [[AGENTS]]  │   │  CONTEXT]]  │   │  CLAUDE]]   │
      └─────────────┘   └──────┬──────┘   └──────┬──────┘
                               │                 │
             ┌─────────────────┼─────────────────┘
             ▼                 ▼
   Technical Reference      Strategy & Growth          System Edit Graph
   - [[docs/codebase-..]]   - [[strategy/roadmap-..]]  - [[map/objects/_index]]
   - [[docs/subsystem-..]]  - [[strategy/product-..]]  - [[map/processes/_index]]
   - [[docs/security-..]]   - [[strategy/brand-..]]    - [[map/effects/CONTEXT]]
   - [[docs/design-system]] - [[strategy/landing-..]]
   - [[docs/architecture]]  - [[strategy/seo-audit]]
   - [[docs/database-..]]
```

---

## 🧭 Root Portals & Operational Catalogs

- **[[CLAUDE]]** & **[[AGENTS]]**: Root routing catalogs, quick shell commands, and operational invariants.
- **[[CONTEXT]]**: Master workspace contract outlining architectural tiers and system boundaries.
- **[[README]]**: High-level repository overview and quickstart guide.

---

## 📚 Technical Reference Manuals & Audits (`docs/`)

- **[[docs/design-system|Design System & Motion Graphics]]**: Antigravity spatial visual system, 3D tilt physics, particle constellation canvas, and typography tokens.
- **[[docs/codebase-assessment|Forensic Codebase Assessment]]**: Core mission, strengths, architectural critique, and database schema hygiene.
- **[[docs/subsystem-wiring-map|Subsystem Wiring Map]]**: Comprehensive mapping connecting frontend components directly to backend handlers and Supabase database entities.
- **[[docs/security-and-performance-audit|Security & Performance Audit]]**: Live Supabase advisor findings, RLS optimizations (`auth_rls_initplan`), and production SQL remediations.
- **[[docs/architecture|System Architecture]]**: Full tier breakdown (Vite/React 19, Express/Vercel serverless, Supabase Postgres).
- **[[docs/database-schema|Database Schema & Models]]**: PostgreSQL tables, RLS security policies, and migration history.
- **[[docs/api-reference|API Reference]]**: Endpoints for quiz submission, Razorpay checkout, insights, and background cron workers.
- **[[docs/ingestion-pipeline|Ingestion & Distillation Pipeline]]**: Automated RSS scraping, Cheerio sanitization, and LLM synthesis.
- **[[docs/monetization-tiers|Monetization & Concurrency Controls]]**: Freemium quotas, Razorpay payments, and 15-minute seat locking.

---

## 📈 Product, Brand & Growth Strategy (`strategy/`)

- **[[strategy/roadmap-synthesis|Roadmap Synthesis]]**: Prioritized cross-cutting roadmap synthesizing brand, copy, SEO, and product strategy.
- **[[strategy/product-brainstorm|Product Brainstorm]]**: Deep-dive into features making Tark indispensable (Syllabus Coverage Ledger, Spaced Repetition).
- **[[strategy/brand-review|Brand & Voice Review]]**: The "War on Noise" philosophy, eliminating game badges, and honest scarcity positioning.
- **[[strategy/landing-page-copy|Landing Page Copy Draft]]**: Revised high-conversion copy for hero, value props, proof sections, and CTAs.
- **[[strategy/seo-audit|Technical SEO & Distribution Audit]]**: Crawlability fixes, schema markup, and public digest permalinks.

---

## 🗺️ System Map (`map/` — Edit Graph)

The System Map allows agents and humans to audit domain nouns, system movements, and change ripple effects.

### Domain Nouns (`objects/`)
- **[[map/objects/quiz-engine|Quiz Engine]]**: Question models (`static_questions`), session storage (`quiz_sessions`), server-side grading.
- **[[map/objects/ingestion-pipeline|Ingestion Pipeline]]**: RSS scrapers, news parsers, AI digest models (`current_affairs`, `pib_digests`).
- **[[map/objects/user-and-auth|User & Auth]]**: Profiles (`user_profiles`), Bearer token auth, bookmarks, daily quotas.
- **[[map/objects/subscription-and-orders|Subscription & Orders]]**: Razorpay checkout, 15-min seat reservation locks (`pending_orders`).
- **[[map/objects/gamification-leaderboard|Gamification & Leaderboard]]**: Leaderboard views (`public_leaderboard`), XP points, streaks, percentiles.
- **[[map/objects/arena-ui|Arena UI]]**: Test-taking arena, question palette, autopsy review dashboard.

### System Verbs (`processes/`)
- **[[map/processes/quiz-submission-scoring|Quiz Submission & Scoring]]**: Step-by-step grading and streak update flow.
- **[[map/processes/daily-pib-ingestion|Daily PIB & News Ingestion]]**: Cron-triggered RSS fetching and AI synthesis.
- **[[map/processes/checkout-seat-reservation|Checkout & Seat Reservation]]**: Atomic seat reservation and payment verification.
- **[[map/processes/unranked-training-practice|Unranked Training Practice]]**: Practice quiz flow isolated from competitive stats.

### Impact Matrix (`effects/`)
- **[[map/effects/CONTEXT|Change-Impact Matrix]]**: Matrix defining which cards to open and what a change hits vs. does not hit.

---

## 🏷️ Tag Taxonomies

- `#hub` — Root portals and orientation indexes.
- `#docs` — Technical architecture, assessments, and reference manuals.
- `#strategy` — Non-technical product, brand, growth, and SEO strategy.
- `#map/objects` — Verified domain nouns and data structures.
- `#map/processes` — Verified system workflows and transactional movements.
- `#map/effects` — Change-impact and ripple matrices.
- `#system` — Root contracts and setup configuration.
