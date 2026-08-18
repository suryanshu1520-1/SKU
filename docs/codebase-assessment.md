# Forensic Codebase Assessment & Architectural Evaluation — Tark 1.0

## 1. Executive Summary & Product Mission

**Tark 1.0** is an analytical, high-stakes competitive examination testing arena and AI-driven current affairs intelligence platform. It is engineered specifically for civil services aspirants (UPSC CSE, State PSCs) who require high-speed cognitive calibration, strict negative-marking exam simulation, and automated daily synthesis of government press releases (PIB) and news gazettes.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Tark 1.0 Ecosystem                            │
├────────────────────────────────┬────────────────────────────────────────┤
│     Daily Ingestion Engine     │         Analytical Test Arena          │
│  - Continuous PIB/News scrape  │  - High-speed timed quiz simulation    │
│  - Cheerio HTML sanitization   │  - Zero-trust server-side grading      │
│  - LLM synthesis & MCQ extract │  - Post-exam diagnostic autopsy        │
├────────────────────────────────┴────────────────────────────────────────┤
│                          Platform Backbone                              │
│  - Atomic 15-minute seat reservation locking before Razorpay checkout   │
│  - Gamified global leaderboard, streaks, and XP percentiles             │
│  - Supabase PostgreSQL with Row Level Security (RLS)                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. What the Platform Wishes to Do vs. What It Delivers Well

### A. What It Delivers Exceptionally Well (Strengths)

1. **Distraction-Free, Sterile Aesthetic**:
   - The UI adheres to a high-contrast, minimalist design language (Tailwind v4, Lucide React, Framer Motion) tailored for intense analytical focus without gamified visual noise.
2. **Client-Side State Resilience ("Autopsy Amnesia Prevention")**:
   - Test progress and autopsy review data are cached in `localStorage` (`tark_arena_session`, `tark_active_session`). Navigating between tabs, closing modals, or accidental page reloads preserves the candidate's active test state.
3. **Server-Side Evaluation Integrity**:
   - Zero-trust security model: the client never receives the `correct_index` or full explanations before quiz completion. Scoring (+2 marks for correct, -0.66 penalty for incorrect, streak increments, and XP awards) is computed strictly on the backend ([`server-lib/submit-quiz.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/submit-quiz.ts)) using secure Supabase Bearer token authentication.
4. **Decoupled Ingestion & Distillation Pipeline**:
   - The automated scraper pipeline ([`server-lib/cron/pipeline.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/pipeline.ts)) decouples heavy scraping and LLM generation from standard web requests. Item-level try/catch blocks prevent a single malformed RSS item from aborting the daily batch.
5. **Concurrency-Safe Monetization**:
   - The checkout pipeline uses a two-phase lock ([`server-lib/create-razorpay-order.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/create-razorpay-order.ts) + `reserve_premium_seat_if_available` RPC) that locks a seat for 15 minutes before creating the Razorpay order, preventing the "501st-member race condition" where limited seats are oversold.

---

## 3. What Could Have Been Done Better (Critique & Technical Debt)

A live audit of the codebase and Supabase database (`ixngfxaerlkkcacrbdgc`) reveals several architectural, security, and performance gaps:

### A. Database Schema Fragmentation & Legacy Duplications

The live database currently holds duplicate and overlapping tables from multiple iterations:

| Entity Domain | Active / Populated Table | Legacy / Duplicate Table | Impact & Technical Debt |
|---|---|---|---|
| **User Profiles** | `user_profiles` (18 active rows) | `profiles` (0 rows) | Early migrations created `profiles`; later code created `user_profiles`. Confusion in SQL queries and docs. |
| **Questions** | `static_questions` (1,722 active rows) | `questions` (0 rows) | Backend endpoints query `static_questions` while early migration scripts declared `questions`. |
| **Current Affairs** | `current_affairs` (800 active rows) | `pib_digests` (15 rows), `news_bulletins` (0 rows) | News feed reads from `current_affairs` while new scraper pipeline targets `pib_digests`. |
| **User Attempts** | `question_attempts` (721 active rows), `quiz_sessions` (29 rows) | `user_attempts` (0 rows), `arena_sessions` (0 rows) | Granular attempts stored in `question_attempts`; legacy session tables remain as ghost schemas. |

### B. Supabase Security Advisor Flags (Audit Findings)

1. **`SECURITY DEFINER` View Privilege Escalation**:
   - The view `public.public_leaderboard` is defined with `SECURITY DEFINER`, enforcing view creator permissions rather than querying user permissions.
2. **Mutable `search_path` Vulnerabilities**:
   - Several database functions (`reserve_premium_seat_if_available`, `clear_expired_pending_orders`, `generate_daily_arena_quiz`, `consume_insight_token`, `increment_vanguard_count`, `update_source_reputation`, `fetch_active_tier_pricing`) have role-mutable `search_path`. A malicious user creating objects in public could hijack function execution.
3. **Over-Exposed RPC Functions to `anon` Role**:
   - Functions like `consume_insight_token(uuid)`, `upgrade_to_premium(uuid)`, `process_weekly_leaderboard()`, and `evaluate_quiz_cp()` are callable by the unauthenticated `anon` role via Supabase REST RPC endpoints.

### C. Performance & Query Optimization Gaps

1. **RLS Sub-Query Re-Evaluation (`auth_rls_initplan`)**:
   - RLS policies on `user_profiles`, `saved_articles`, `saved_insights`, `quiz_sessions`, `training_sessions`, and `pending_orders` call `auth.uid()` directly instead of `(select auth.uid())`. This causes PostgreSQL to re-evaluate the function on every single row rather than creating a cached execution plan.
2. **Duplicate Permissive Policies**:
   - `public.current_affairs`, `public.saved_insights`, and `public.static_questions` have multiple redundant permissive policies for `anon` and `authenticated` roles, doubling the evaluation overhead on SELECT queries.
3. **Unindexed Foreign Keys**:
   - `pending_orders.user_id`, `saved_articles.article_id`, and `user_attempts.question_id` lack covering indexes, leading to sequential scans during cascade operations.

### D. Architectural Inconsistencies (Express vs. Serverless)

- **Dual-Server Route Duplication**:
  - `server.ts` implements inline Express handlers for `/api/questions`, `/api/auth/register`, `/api/insights`, `/api/explanation`, while other routes delegate to `server-lib/*`.
  - In Vercel serverless deployment (`api/server.ts`), request routing must be synchronized so that Express development mirrors serverless execution.

---

## 4. Strategic Engineering Roadmap

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Recommended Action Plan                         │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Schema Consolidation:                                               │
│    - Standardize on `user_profiles`, `static_questions`,               │
│      `current_affairs`, and `quiz_sessions`. Deprecate ghost tables.   │
│                                                                        │
│ 2. Security Hardening:                                                 │
│    - Set `SET search_path = public, pg_temp;` on all RPC functions.    │
│    - Revoke `EXECUTE` on sensitive RPCs from the `anon` role.          │
│    - Convert `public_leaderboard` view to `SECURITY INVOKER`.          │
│                                                                        │
│ 3. Query & RLS Optimization:                                           │
│    - Wrap all RLS `auth.uid()` references with `(select auth.uid())`.  │
│    - Add covering indexes on all foreign key columns.                  │
│    - Deduplicate multiple permissive RLS policies.                     │
│                                                                        │
│ 4. Unified Backend Dispatcher:                                         │
│    - Ensure all routes in `server.ts` delegate directly to             │
│      standalone modular handlers in `server-lib/`.                     │
└────────────────────────────────────────────────────────────────────────┘
```
