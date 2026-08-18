# Effects Shelf Contract — Change-Impact Index

Before modifying any source code in Tark 1.0, look up the target component below to identify which cards to open and understand the ripple effects.

---

## Change-Impact Matrix

| If You Are Modifying | Open These Object Cards | Open These Process Cards | Primary Ripple Effects |
|---|---|---|---|
| **Quiz Question Schema or Format** | [`quiz-engine.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/objects/quiz-engine.md), [`arena-ui.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/objects/arena-ui.md) | [`quiz-submission-scoring.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/processes/quiz-submission-scoring.md), [`unranked-training-practice.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/processes/unranked-training-practice.md) | **Hits**: `src/types.ts`, `src/components/Arena.tsx`, `src/components/Autopsy.tsx`, `server-lib/submit-quiz.ts`<br>**Does Not Hit**: Payment order creation or RSS ingestion |
| **Quiz Scoring Logic (+2 / -0.66, XP, Streaks)** | [`quiz-engine.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/objects/quiz-engine.md), [`gamification-leaderboard.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/objects/gamification-leaderboard.md) | [`quiz-submission-scoring.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/processes/quiz-submission-scoring.md) | **Hits**: `server-lib/submit-quiz.ts`, `src/components/Leaderboard.tsx`<br>**Does Not Hit**: Newsfeed or subscription orders |
| **RSS Scraping or Newsfeed UI** | [`ingestion-pipeline.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/objects/ingestion-pipeline.md) | [`daily-pib-ingestion.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/processes/daily-pib-ingestion.md) | **Hits**: `server-lib/cron/`, `src/components/CurrentAffairs.tsx`, `supabase/migrations/*pib_digests*.sql`<br>**Does Not Hit**: Test arena or payment gateway |
| **Razorpay Checkout or Seat Locks** | [`subscription-and-orders.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/objects/subscription-and-orders.md), [`user-and-auth.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/objects/user-and-auth.md) | [`checkout-seat-reservation.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/processes/checkout-seat-reservation.md) | **Hits**: `server-lib/create-razorpay-order.ts`, `server-lib/verify-payment.ts`, `src/components/Profile.tsx`, `supabase/migrations/*pending_orders*.sql`<br>**Does Not Hit**: Scrapers or quiz question pools |
| **User Quotas or Daily Limits** | [`user-and-auth.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/objects/user-and-auth.md) | [`quiz-submission-scoring.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/processes/quiz-submission-scoring.md) | **Hits**: `server-lib/user-limits.ts`, `src/components/Arena.tsx`, `src/components/Profile.tsx`<br>**Does Not Hit**: Database migration files for RSS digests |
