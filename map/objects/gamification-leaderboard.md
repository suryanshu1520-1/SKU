---
type: object
status: verified 2026-08-18
universe: live
---

# Object: Gamification & Leaderboard (`leaderboard`, XP, Streaks)

## 1. What It Is
Candidate ranking, experience point (XP) computation, daily streak counters, percentile benchmarking, and historical leaderboard records.

## 2. Why This Shape
- **Competitive Integrity**: Daily scores are normalized against all candidate submissions. Unranked practice does not alter the leaderboard.
- **Dynamic Leaderboard Querying**: Leaderboard ranking is computed via Supabase views and SQL functions for low-latency client rendering.

## 3. Shape & Citations
- **Leaderboard Migration**: [`supabase/migrations/20260619000000_update_leaderboard_scoring.sql`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/supabase/migrations/20260619000000_update_leaderboard_scoring.sql)
- **RLS Fixes**: [`supabase/migrations/20260618000000_fix_leaderboard_rls.sql`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/supabase/migrations/20260618000000_fix_leaderboard_rls.sql)
- **Reset Worker**: [`server-lib/cron/reset-leaderboard.ts:L1-L40`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/reset-leaderboard.ts#L1-L40)

## 4. Connected To
- **Updated by**: [`server-lib/submit-quiz.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/submit-quiz.ts).
- **Displayed in**: [`src/components/Leaderboard.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Leaderboard.tsx).

## 5. If You Change This
- **Hits**: [`src/components/Leaderboard.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Leaderboard.tsx), [`server-lib/submit-quiz.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/submit-quiz.ts).
- **Does not hit**: News ingestion (`server-lib/cron/rss.ts`).

## 6. Surfaces
- **Written by**: Quiz submission and weekly reset cron.
- **Read by**: Leaderboard and Profile UI views.

## 7. See
- Source: [`src/components/Leaderboard.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Leaderboard.tsx)
- Doc: [`docs/database-schema.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/database-schema.md)
