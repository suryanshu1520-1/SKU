  # Subsystem Wiring Map — Frontend ↔ Backend ↔ Supabase Database

This document provides a forensic, component-by-component mapping showing exactly how each frontend interface connects to its corresponding backend server routes, business logic libraries, and Supabase database entities.

---

## 1. Subsystem Architecture Matrix

```
┌────────────────────────┬───────────────────────────────┬───────────────────────────────┬───────────────────────────────┐
│ Feature / Subsystem    │ Frontend UI Components        │ Backend API & Handlers        │ Database Tables, Views & RPCs │
├────────────────────────┼───────────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ 1. Auth & Profiles     │ `src/components/Login.tsx`    │ `POST /api/auth/register`     │ `auth.users`                  │
│                        │ `src/components/Profile.tsx`  │ `GET /api/user-limits`        │ `public.user_profiles`        │
│                        │ `src/components/PasswordReset`│ `supabase.auth.*`             │ `public.saved_insights`       │
│                        │ `src/App.tsx`                 │ `server-lib/user-limits.ts`   │ `public.saved_articles`       │
├────────────────────────┼───────────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ 2. Timed Test Arena    │ `src/components/Arena.tsx`    │ `GET /api/questions`          │ `public.static_questions`     │
│                        │ `src/components/InfoTooltip`  │ `POST /api/submit-quiz`       │ `public.quiz_sessions`        │
│                        │                               │ `POST /api/explanation`       │ `public.question_attempts`    │
│                        │                               │ `server-lib/submit-quiz.ts`   │ `public.user_profiles`        │
├────────────────────────┼───────────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ 3. Autopsy Diagnostics │ `src/components/Autopsy.tsx`  │ `POST /api/insights`          │ `public.static_questions`     │
│                        │                               │ `POST /api/bookmark`          │ `public.saved_insights`       │
│                        │                               │ `server-lib/insights.ts`      │ `public.quiz_sessions`        │
│                        │                               │ `server-lib/bookmark.ts`      │ `public.question_attempts`    │
├────────────────────────┼───────────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ 4. Practice / Unranked │ `src/components/Arena.tsx`    │ `POST /api/training-questions`│ `public.static_questions`     │
│                        │ (Mode: 'training')            │ `POST /api/submit-quiz`       │ `public.training_sessions`    │
│                        │                               │ `training-questions.ts`       │                               │
├────────────────────────┼───────────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ 5. Current Affairs     │ `src/components/CurrentAffairs`│ `POST /api/sync-feed`        │ `public.current_affairs`      │
│    & PIB Intelligence  │ `src/components/Manifesto.tsx`│ `POST /api/cron/scrape`       │ `public.pib_digests`          │
│                        │                               │ `server-lib/cron/pipeline.ts` │ `public.source_reputation`    │
│                        │                               │ `server-lib/cron/rss.ts`      │ `public.saved_articles`       │
├────────────────────────┼───────────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ 6. Leaderboard & Stats │ `src/components/Leaderboard`  │ Direct Supabase Query         │ `public.public_leaderboard`   │
│                        │ `src/components/PublicProfile`│ `POST /api/cron/reset-leader` │ `public.user_profiles`        │
│                        │                               │ `reset-leaderboard.ts`        │ `public.quiz_sessions`        │
├────────────────────────┼───────────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ 7. Monetization &      │ `src/components/Profile.tsx`  │ `POST /api/create-razorpay...`│ `public.pending_orders`       │
│    Seat Locks          │ (Upgrade Membership Modal)    │ `POST /api/verify-payment`    │ `public.user_profiles`        │
│                        │                               │ `create-razorpay-order.ts`    │ RPC: `reserve_premium_seat..` │
│                        │                               │ `verify-payment.ts`           │ RPC: `upgrade_to_premium`     │
└────────────────────────┴───────────────────────────────┴───────────────────────────────┴───────────────────────────────┘
```

---

## 2. Deep-Dive Subsystem Tracing

### Subsystem 1: Authentication, Profiles & User Quotas
- **Frontend Interaction**:
  - `src/components/Login.tsx`: Authenticates via Supabase Email/Password or triggers Admin Registration.
  - `src/components/Profile.tsx`: Loads candidate profile, historical test records, saved bookmarks, and privacy settings (`is_public`).
- **Backend Flow**:
  - `POST /api/auth/register` in [`server.ts:L176`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server.ts#L176): Creates user via `supabaseServer.auth.admin.createUser()` with `email_confirm: true`.
  - `GET /api/user-limits` in [`server-lib/user-limits.ts:L1-L50`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/user-limits.ts#L1-L50): Checks user membership tier (`'free'` vs `'pro'`) and returns remaining daily quiz attempts and bookmark limits.
- **Database Schema**:
  - `auth.users` ──(1:1)──> `public.user_profiles` (`id`, `name`, `membership_tier`, `vanguard_count`, `insight_tokens`, `trophy_count`, `contender_points`, `is_public`).

---

### Subsystem 2: Competitive Test Arena & Server-Side Grading
- **Frontend Interaction**:
  - `src/components/Arena.tsx`: Renders 10-question timed exam environment with countdown timer, keyboard shortcuts (A/B/C/D), question navigation matrix, and instant submission barrier.
- **Backend Flow**:
  - `GET /api/questions` in [`server.ts:L157`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server.ts#L157): Retrieves up to 500 questions from `public.static_questions`.
  - `POST /api/submit-quiz` in [`server-lib/submit-quiz.ts:L54-L279`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/submit-quiz.ts#L54-L279):
    1. Validates `Authorization: Bearer <token>` via `supabase.auth.getUser()`.
    2. Fetches `correct_option` directly from `public.static_questions`.
    3. Calculates positive score (+2), negative penalty (-0.66), and accuracy.
    4. Inserts session into `public.quiz_sessions` and individual attempts into `public.question_attempts`.
    5. Increments `user_profiles.contender_points` and `user_profiles.trophy_count`.
- **Database Schema**:
  - `public.static_questions` (`id`, `question`, `options`, `correct_option`, `subject_category`, `conceptual_explanation`, `ai_insights`).
  - `public.quiz_sessions` (`id`, `user_id`, `score`, `total_questions`, `correct_count`, `incorrect_count`, `created_at`).
  - `public.question_attempts` (`id`, `session_id`, `user_id`, `question_id`, `selected_option`, `is_correct`, `time_spent_seconds`).

---

### Subsystem 3: Autopsy Screen & AI Diagnostics
- **Frontend Interaction**:
  - `src/components/Autopsy.tsx`: Detailed breakdown of missed questions, time spent per subject, and AI diagnostic tutoring.
- **Backend Flow**:
  - `POST /api/insights` in [`server-lib/insights.ts:L71-L143`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/insights.ts#L71-L143): Calls Google Gemini API (`gemini-3.5-flash` / `gemini-3.1-flash-lite`) with exponential backoff to synthesize 3 targeted study recommendations based on performance data.
  - `POST /api/explanation` in [`server.ts:L254-L360`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server.ts#L254-L360): Fetches cached explanation from `static_questions` or dynamically invokes Gemini.
- **Database Schema**:
  - `public.saved_insights` (`id`, `user_id`, `question_id`, `created_at`).

---

### Subsystem 4: Current Affairs & Automated News Ingestion
- **Frontend Interaction**:
  - `src/components/CurrentAffairs.tsx`: Filterable news feed by Ministry, Source, and Date with bookmarking and PIB Digest modal reader.
- **Backend Flow**:
  - `POST /api/cron/scrape` in [`server-lib/cron/scrape.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/scrape.ts): Validates `CRON_SECRET` and delegates to `server-lib/cron/pipeline.ts`.
  - `server-lib/cron/pipeline.ts`: Fetches RSS via `rss-parser` / `got-scraping`, sanitizes HTML via `cheerio` and `turndown`, calls LLM for markdown synthesis, and upserts into Supabase.
- **Database Schema**:
  - `public.current_affairs` (`id`, `source`, `ministry`, `headline`, `url`, `summary`, `created_at`).
  - `public.pib_digests` (`id`, `title`, `date`, `summary`, `markdown_content`, `tags`, `source_urls`).
  - `public.source_reputation` (`id`, `source_name`, `reliability_score`, `total_articles_ingested`).

---

### Subsystem 5: Leaderboard & Candidate Benchmarking
- **Frontend Interaction**:
  - `src/components/Leaderboard.tsx`: Displays top candidates, Contender Points, Trophy counts, and podium styling.
  - `src/components/PublicProfile.tsx`: Renders public dossier for candidates with `is_public = true`.
- **Backend Flow**:
  - Direct client query to Supabase view `public_leaderboard`.
  - `POST /api/cron/reset-leaderboard` in [`server-lib/cron/reset-leaderboard.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/reset-leaderboard.ts): Scheduled weekly archive of competitive scores.
- **Database Schema**:
  - `public.public_leaderboard` (View joining `user_profiles` and `quiz_sessions` where `is_public = true`).

---

### Subsystem 6: Monetization & Concurrency-Safe Seat Reservations
- **Frontend Interaction**:
  - `src/components/Profile.tsx`: "Upgrade to Pro" triggers Razorpay checkout modal.
- **Backend Flow**:
  - `POST /api/create-razorpay-order` in [`server-lib/create-razorpay-order.ts:L1-L90`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/create-razorpay-order.ts#L1-L90):
    1. Invokes Supabase RPC `reserve_premium_seat_if_available(userId, orderId)`.
    2. Inserts row into `public.pending_orders` with 15-minute expiration lock.
    3. Creates Razorpay Order instance with specified amount (Paise).
  - `POST /api/verify-payment` in [`server-lib/verify-payment.ts:L21-L123`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/verify-payment.ts#L21-L123):
    1. Verifies HMAC-SHA256 signature using `RAZORPAY_KEY_SECRET`.
    2. Invokes Supabase RPC `upgrade_to_premium(userId)`.
    3. Deletes seat lock row from `public.pending_orders`.
- **Database Schema**:
  - `public.pending_orders` (`id`, `user_id`, `razorpay_order_id`, `amount`, `status`, `expires_at`, `created_at`).
  - `public.user_profiles` (`membership_tier = 'pro'`).
