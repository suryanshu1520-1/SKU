# System Map — Tark 1.0 (SKU)

Walkable edit graph for Tark 1.0. Before editing code, open the relevant object or process card to see what else moves.

## Shelf Catalog

| Shelf | Purpose | Index |
|---|---|---|
| [`objects/`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/objects/CONTEXT.md) | Domain nouns: data structures, state models, database tables | [`objects/_index.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/objects/_index.md) |
| [`processes/`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/processes/CONTEXT.md) | System verbs: workflows, cron runs, user transaction flows | [`processes/_index.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/processes/_index.md) |
| [`effects/`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/effects/CONTEXT.md) | Change-impact index: "If you change X, open these cards" | [`effects/CONTEXT.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map/effects/CONTEXT.md) |

## Name Collisions & Disambiguation

- **Quiz Session** vs. **Training Session**:
  - `quiz_sessions` = Competitive ranked daily attempt with strict grading, streak updates, and leaderboard scoring (`server-lib/submit-quiz.ts`).
  - `training_sessions` = Unranked practice attempt without affecting leaderboard percentiles or streaks (`server-lib/training-questions.ts`).
- **PIB Digest** vs. **Question**:
  - `pib_digests` = Synthesized daily news article in markdown (`supabase/migrations/20260616220000_create_pib_digests.sql`).
  - `questions` = UPSC MCQ extracted from current affairs or created manually (`supabase/migrations/20260608040907_user_foundation.sql`).
