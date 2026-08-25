---
type: process
status: verified 2026-08-18
universe: live
---

# Process: Quiz Submission & Scoring

## 1. Summary
Evaluates candidate answers submitted from the test arena, calculates competitive score (+2 for correct, -0.66 for wrong), increments user XP and daily streak, records session into `quiz_sessions`, and returns the autopsy review data.

## 2. Movement
1. **Submit**: [`src/components/Arena.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Arena.tsx) sends `POST /api/submit-quiz` with Bearer token.
2. **Authenticate**: [`server-lib/submit-quiz.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/submit-quiz.ts) calls `supabase.auth.getUser()`.
3. **Fetch Answer Key**: Backend pulls `correct_option` directly from database `static_questions` / `pyq_prelims` tables.
4. **Compute Scores**: Computes total marks, positive/negative marks, and accuracy percentage.
5. **Update Profile**: Updates `user_profiles.contender_points` (via DB trigger `evaluate_quiz_cp()`) and increments vanguard session quota.
6. **Persist Session**: Inserts row into `quiz_sessions` (or `training_sessions` if unranked).
7. **Render Autopsy**: Client transitions to [`src/components/Autopsy.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Autopsy.tsx).

## 3. Objects Touched
- **Consumes**: [`map/objects/quiz-engine.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/objects/quiz-engine.md), [`map/objects/user-and-auth.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/objects/user-and-auth.md).
- **Produces**: [`map/objects/gamification-leaderboard.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/objects/gamification-leaderboard.md).

## 4. If You Change This
- **Hits**: [`server-lib/submit-quiz.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/submit-quiz.ts), [`src/components/Arena.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Arena.tsx), [`src/components/Autopsy.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Autopsy.tsx).
- **Does not hit**: News scraper pipeline.
