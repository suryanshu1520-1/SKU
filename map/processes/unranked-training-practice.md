---
type: process
status: verified 2026-08-18
universe: live
---

# Process: Unranked Training Practice

## 1. Summary
Allows candidates to practice question banks in an unranked environment without time pressure or penalty impact on their global leaderboard standing.

## 2. Movement
1. **Request Questions**: Client fetches practice items via `POST /api/training-questions`.
2. **Practice Arena**: Candidate solves questions in Arena with `isRanked = false`.
3. **Submit Answers**: Client posts answers with `isRanked: false` to `/api/submit-quiz`.
4. **Persist Practice Session**: Grader writes session record into `training_sessions` (leaving `quiz_sessions`, streak, and leaderboard rank unchanged).
5. **Autopsy**: Client views autopsy analysis.

## 3. Objects Touched
- **Consumes**: [`map/objects/quiz-engine.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/objects/quiz-engine.md).
- **Produces**: Rows in `training_sessions`.

## 4. If You Change This
- **Hits**: [`server-lib/training-questions.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/training-questions.ts), [`server-lib/submit-quiz.ts`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/submit-quiz.ts), [`src/components/Arena.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/Arena.tsx).
- **Does not hit**: Global leaderboard ranking or daily streak tracking.
