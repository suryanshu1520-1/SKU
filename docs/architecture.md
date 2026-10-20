# System Architecture — Tark 1.0

## 1. High-Level Architecture

Tark 1.0 is organized into three primary tiers:

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                           │
│  React 19, TypeScript, Vite, Tailwind v4, Lucide React       │
│  State: React Context + localStorage persistence             │
│  Navigation: Tab-based Router (Landing, Arena, Autopsy,      │
│              Current Affairs, Leaderboard, Profile, Login)  │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / Bearer Auth
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Server Layer                           │
│  Express.js (Dev / Custom Node) & Vercel Serverless (API)   │
│  Security: fetchWithAuth, getUser() token validation,       │
│            CRON_SECRET authorization                         │
│  Services: Quiz Validation, Seat Reservation, RSS Scrapers  │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQL & RPC (Service Role)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                             │
│  Supabase PostgreSQL with Row Level Security (RLS)          │
│  Tables: profiles, questions, quiz_sessions, pib_digests,   │
│          pending_orders, training_sessions, bookmarks       │
└─────────────────────────────────────────────────────────────┘
```

## 2. Key Components & Responsibilities

### Frontend (`src/`)
- **[`App.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/App.tsx)**: Root controller managing authentication state, active tab navigation, session persistence, and modal overlays.
- **[`Arena.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Arena.tsx)**: High-speed timed quiz environment with keyboard shortcuts, timer countdown, question matrix, and instant submission.
- **[`Autopsy.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Autopsy.tsx)**: In-depth post-exam diagnostic review highlighting correct/incorrect answers, AI explanations, and performance scorecards.
- **[`CurrentAffairs.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/CurrentAffairs.tsx)**: Filterable feed of synthesized daily news and PIB press releases, categorized by ministry and topic, with batch-resolved policy lineage chips.
- **[`Observatory.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Observatory.tsx)** & **[`radar-v2/RadarV2Panel.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/observatory/radar-v2/RadarV2Panel.tsx)**: Policy Radar Lineage Engine interface with lane stages, Kaplan–Meier lifecycle gaps, mutation diffs, surging syllabus nodes, and verified Boss MCQs.
- **[`Leaderboard.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Leaderboard.tsx)**: Global rankings, user percentiles, XP metrics, and streak status.
- **[`Profile.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Profile.tsx)**: User account details, membership tier status, bookmarks archive, and upgrade triggers.

### Backend (`server-lib/` & `api/`)
- **[`submit-quiz.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/submit-quiz.ts)**: Server-side quiz grading engine. Computes raw scores, positive/negative marks (+2 / -0.66), streak bonuses, and records results into `quiz_sessions` or `training_sessions`.
- **[`create-razorpay-order.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/create-razorpay-order.ts)**: Creates Razorpay orders after invoking `reserve_premium_seat_if_available` to prevent overselling limited membership slots.
- **[`verify-payment.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/verify-payment.ts)**: Verifies cryptographic payment signatures, upgrades user profile tier to `pro`, and clears pending lock.
- **[`cron/pipeline.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/pipeline.ts)**: Orchestrates scheduled scraping of PIB RSS feeds, cleans articles with Cheerio/Turndown, and calls LLMs for synthesis.
- **[`policy-radar-v2.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/policy-radar-v2.ts)**: Radar API v2 serving verified program lineages, batched feed lineage chips, authority taxonomy, and server-side Boss MCQ checking.
- **Cron Workers (`server-lib/cron/`)**: Dedicated background workers for event extraction (`synthesize.ts`), deterministic lineage building (`policy-lineage-worker.ts`), lifecycle gap detection (`policy-gap-worker.ts`), empirical Bayesian node surge (`node-signal-worker.ts`), and Boss MCQ generation (`boss-mcq-worker.ts`).

### Database (`supabase/`)
- **Row Level Security (RLS)**: Enforces that users can only read/write their own profiles, bookmarks, and private sessions.
- **RPC Functions**: Atomic operations for seat reservations (`reserve_premium_seat_if_available`), scoring calculations, quota tracking, and program edge maintenance (`replace_program_edges`).
- **Policy Radar Tables**: Schema definitions for canonical authorities (`authority_registry`), programs (`policy_programs`), immutable event ledger (`policy_events`), graph edges (`policy_program_edges`), Kaplan–Meier gap records (`policy_program_gaps`), node signals (`policy_node_signals`), Boss MCQs (`policy_boss_mcqs`), and daily evaluation runs (`radar_eval_runs`).

