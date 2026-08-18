---
type: object
status: verified 2026-08-18
universe: live
---

# Object: Quiz Engine (`questions`, `quiz_sessions`, `training_sessions`)

## 1. What It Is
The core testing and evaluation engine responsible for delivering daily UPSC question sets, validating candidate answers server-side, scoring performance (+2 for correct, -0.66 for incorrect), and storing session outcomes.

## 2. Why This Shape
- **Zero Client Trust**: Correct answer indices and comprehensive explanations are never sent to the client during the active quiz to prevent inspect-element cheating.
- **Ranked vs Unranked Isolation**: Competitive daily quizzes record into `quiz_sessions` (impacting global leaderboard and streak), whereas unranked practice quizzes record into `training_sessions` without contaminating metrics.

## 3. Shape & Citations
- **Question Schema**: [`src/types.ts:L1-L20`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/types.ts#L1-L20), [`supabase/migrations/20260608040907_user_foundation.sql`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/supabase/migrations/20260608040907_user_foundation.sql)
- **Evaluation Logic**: [`server-lib/submit-quiz.ts:L15-L85`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/submit-quiz.ts#L15-L85)
- **Practice Question Pool**: [`server-lib/training-questions.ts:L1-L50`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/training-questions.ts#L1-L50)

## 4. Connected To
- **Owns**: Answer validations, explanation generation, score breakdowns.
- **Owned by**: `profiles` (foreign key `user_id`).
- **Feeds**: `gamification-leaderboard` (updates XP and streaks).

## 5. If You Change This
- **Hits**: [`server-lib/submit-quiz.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/submit-quiz.ts), [`src/components/Arena.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Arena.tsx), [`src/components/Autopsy.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Autopsy.tsx).
- **Does not hit**: [`server-lib/cron/rss.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/rss.ts) (feed scraping is decoupled from quiz submission).

## 6. Surfaces
- **Written by**: [`server-lib/submit-quiz.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/submit-quiz.ts), `cron/pipeline.ts`.
- **Read by**: [`src/components/Arena.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Arena.tsx), [`src/components/Autopsy.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Autopsy.tsx).

## 7. See
- Source: [`server-lib/submit-quiz.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/submit-quiz.ts)
- Doc: [`docs/database-schema.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/database-schema.md)
