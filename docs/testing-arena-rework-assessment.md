---
tags:
  - docs
  - arena-ui
  - research
status: "resolved & verified 2026-08-26"
---

# Testing Arena — Current State Assessment & Remediation Record

> [!NOTE]
> **Remediation Status (2026-08-26):** All 4 Critical Security vulnerabilities, the 2 user-facing factual bugs (Leaderboard +15 CP bonus and Autopsy percentile banner), the dead unauthenticated `/inline` routes in `api/server.ts`, and the stale `map/` object references have been remediated and verified. Migration `supabase/migrations/20260826000001_arena_security_hardening.sql` provides authoritative schema-level RLS lockdown.

Unbiased read of the Arena/Autopsy/Leaderboard system as it actually exists today, ahead of a rework. Synthesized from three independent audits: existing vault documentation (`map/` cards + prior `docs/` critiques), a direct read of the live frontend (`src/components/Arena.tsx`, `Autopsy.tsx`, `Leaderboard.tsx`, `App.tsx`, `PublicProfile.tsx`), and a direct read of the live backend (`server-lib/`, `api/server.ts`, `supabase/migrations/`) cross-checked against real Supabase row counts. Not a re-statement of what those sources claim — everything below was verified against the actual code, and disagreements between docs and code are called out explicitly.

**Verdict up front:** the core scoring loop is genuinely well-built — real server-side grading, a coherent ranked/unranked split, correct navigation wiring. But there are live, production security gaps that let the "zero-trust" claim be bypassed entirely through doors other than the one that's actually locked, plus a large pile of ordinary architectural debt and a couple of small, checkable user-facing factual bugs. The security items are not part of "the rework" — they're a separate, more urgent fix.

---

## 🔴 Critical — live in production right now, fix independent of any rework timeline

**1. RLS policies let anyone bypass server-side grading entirely, using only the public anon key.**
`quiz_sessions`'s INSERT policy and `question_attempts`'s ALL-operations policy are `WITH CHECK (true)` / `USING (true)` for both `anon` and `authenticated` (`supabase/migrations/20260608040907_user_foundation.sql:90-95, 126-131`). The Supabase anon key is public by design (already hardcoded as a literal fallback in `server-lib/training-questions.ts:23`). This means anyone can call `supabase.from('quiz_sessions').insert(...)` directly from a browser console with an arbitrary `user_id`, `correct_count`, and `percentile` — no server code involved, no auth bypass technique needed. The DB trigger that pays out leaderboard points (`evaluate_quiz_cp()`) fires on whatever numbers are supplied. `question_attempts` rows can also be edited or deleted for any user, not just inserted. Notably, the newer `training_sessions` table *does* have correct `auth.uid() = user_id` scoping (`20260619000001_training_sessions.sql:25-31`) — that fix was never back-ported to the two tables that actually feed the ranked leaderboard.

**2. A fully unauthenticated duplicate of quiz submission is live and mounted.**
`api/server.ts:161-320` defines `POST /api/submit-quiz/inline` — a hand-copied duplicate of the real handler, but with zero auth check. It takes `userId` directly from the request body (not a verified token) and uses it to insert `quiz_sessions` rows and call `increment_vanguard_count`. The frontend never calls it, but it's still `app.post`-mounted with no global auth middleware in front of it. Sibling dead-but-mounted duplicates exist for `/api/questions/inline`, `/api/insights/inline`, `/api/explanation/inline`, `/api/auth/register/inline` — read like an earlier prototype that was superseded by `server-lib/*.ts` and never actually removed.

**3. The question endpoints leak answer keys to the client before the user answers, and have no auth check.**
`GET /api/questions` and `GET /api/training-questions` do `.select('*')` on `static_questions` with no authentication at all (`server-lib/questions.ts:42`, `server-lib/training-questions.ts:79`), and `correct_option` comes back in the raw response. The UI only visually hides the answer until the question is locked — the real answer is sitting in React state and in the network tab from the moment the quiz loads. This directly contradicts the app's own displayed claim of "zero-trust server evaluation" (`Arena.tsx:894`).

**4. Arena's own access quotas (free-tier cap, premium gate) are enforced only in the client.**
`server-lib/submit-quiz.ts` never checks `membership_tier` or `vanguard_sessions_used` before accepting a ranked submission — it inserts unconditionally, then increments usage after the fact via `increment_vanguard_count`, an RPC that is a bare uncapped `+1` also grantable to `anon` (`supabase/archive-migrations/supabase_freemium_migration.sql:20-36`). `training-questions.ts` has no auth/membership check at all. A scripted client can submit unlimited ranked tests on a free account, or burn another user's quota by calling the RPC directly with their ID.

**Why these four matter together, not just individually:** items 1 and 3 mean an attacker doesn't even need to find the exploit in #2 — they can read answers before playing (#3) or write arbitrary results after (#1) using nothing but the public anon key any browser already has. #2 is a second, independent way into the same hole. #4 means the business logic gating free vs. paid usage has no enforcement at all server-side. This is a coherent single problem — "the server-side authority the app is built around isn't actually the only way in" — not four unrelated bugs.

---

## 🟡 Real architectural debt — informs the rework, not urgent-security

- **`arena_sessions` and `user_attempts` are dead tables.** Zero code references anywhere in `server-lib/`, `api/`, `src/`, or `supabase/migrations/`; confirmed 0 live rows independently by `docs/codebase-assessment.md`. Safe to drop after a real verification pass, not a hidden intentional split.
- **A live, undocumented FK gap.** `question_attempts.session_id` has a hard FK to `quiz_sessions.id` only (`20260608040907_user_foundation.sql:111`). But `submit-quiz.ts` writes `question_attempts` rows keyed to `training_sessions` UUIDs on the unranked path too, and the code comment at `submit-quiz.ts:242-243` admits this isn't actually linked by FK. As written, every unranked submission's attempt-log insert should throw a `23503` constraint violation. Either it's silently failing in production, or the live DB has a manual patch that was never captured in a migration — see next finding.
- **The `supabase/migrations/` folder is not a complete record of the live schema.** `arena_sessions`, `user_attempts`, and — more importantly — `increment_vanguard_count` (actively called by live code) don't exist in the tracked migrations at all; the vanguard RPC's only definition is in `supabase/archive-migrations/`. CLAUDE.md names `supabase/` as the authoritative source for schema — that claim doesn't currently hold. Any future audit or codegen trusting only the migrations folder will silently miss real, live objects. Worth fixing before it causes a worse incident than this one.
- **`Arena.tsx` is a 1,549-line monolith** doing the job of at least four components: mode-select, Training Ground setup, quiz-taking, and session-cache management (three separate `localStorage` caches). It's the largest file in `src/` by a wide margin.
- **Four overlapping state maps track one answer** (`userAnswers`, `pendingAnswersMap`, `lockedMap`, `timeouts` — `Arena.tsx:196-204`). Reconciled correctly today via a rescue path in `handleNext`, but there's no single source of truth for "what did the user answer," and correctness depends on that rescue path running before every code path that can end a question.
- **Magic numbers instead of config**, repeated at multiple call sites each: the 20s timer (3+ places), ranked test length of 25 (2+ places plus copy text), Training Ground lengths (a separate hardcoded array).
- **Three independent client-side Supabase read paths for one concept.** `Leaderboard.tsx`, `PublicProfile.tsx`, and `Profile.tsx` each query Postgres directly via RLS for "show someone's arena history," while every Arena network call (questions, submit, insights, explanation) goes through the `server-lib` Express layer. Neither approach is wrong alone, but the mix looks accidental rather than a deliberate choice, and should be decided one way before the rework rather than carried forward by default.
- **CP (leaderboard points) math is reimplemented in three places with no single source of truth**: the authoritative DB trigger `evaluate_quiz_cp()`, a duplicate client-side calculation in `Autopsy.tsx:67-83`, and decorative "+2.00 Marks / -0.66 Penalty" copy in both `Arena.tsx:974` and `Autopsy.tsx:129,142` that doesn't correspond to any value the backend actually returns or stores. They happen to agree today; nothing enforces that they keep agreeing.
- **`DiagnosticPreview.tsx`, on the landing page, independently reimplements Arena's option-selection and scoring visuals** with its own hardcoded 2-question sample set, sharing zero code with `Arena.tsx`. If the rework touches option-card visuals or scoring copy, this second copy won't inherit the change — it has to be found and updated separately.
- **`SyllabusMatrix.tsx` (162 lines) is fully built and completely dead** — no imports anywhere in `src/`. Confirmed the "built but never routed" failure mode did happen here, even though it did *not* happen to the core Arena/Autopsy/Leaderboard trio (those are correctly wired into `App.tsx` navigation).
- Minor: the Arena→Autopsy timer `useEffect` re-subscribes every second instead of using a ref (`Arena.tsx:560-586`) — wasteful, not a correctness bug. `App.tsx`'s `gameState`/`activeTab` are two overlapping state machines reconciled by ad hoc branching, with a "cached result exists" check duplicated at four call sites. `Autopsy.tsx` hand-rolls its own auth-fetch pattern instead of using the shared `fetchWithAuth()` helper every other Arena call uses.

---

## 🟢 Confirmed, small, cheap-to-fix user-facing bugs

- **Leaderboard's own "Scoring Rules" modal is factually wrong.** `Leaderboard.tsx:310` tells users "+25 CP bonus" for 80%+ accuracy. The real bonus — confirmed independently in both the DB trigger (`evaluate_quiz_cp()`, `...leaderboard_scoring.sql:41`) and `Autopsy.tsx`'s own duplicate calculation — is **+15 CP**. A clean, ten-point, checkable discrepancy between what the app promises and what it pays out.
- **Training Ground (unranked) sessions show a nonsensical percentile.** `submit-quiz.ts` only computes a real percentile `if (isRanked)`; unranked runs get `percentile: 0`. `Autopsy.tsx:160-190` has no `isRanked` guard on the percentile banner, so every practice session tells the user "Higher than 0% of candidate submissions" — a real, misleading result in a mode that was never meant to be ranked at all.

---

## Documentation hygiene finding

The five `map/objects` and `map/processes` cards for Arena (`arena-ui`, `quiz-engine`, `gamification-leaderboard`, `quiz-submission-scoring`, `unranked-training-practice`) are internally consistent with each other and stamped `status: verified 2026-08-18` — but they consistently cite table names `questions` and `profiles`, both confirmed dead/empty legacy tables. The real, live, populated tables are `static_questions` and `user_profiles`. `docs/monetization-tiers.md` has the same stale naming (`profiles.tier` instead of `user_profiles.membership_tier`). These are exactly the notes an agent (or future me) would trust first as "quick reference" — worth a dedicated correction pass separate from the rework itself, given they're wrong on a load-bearing fact despite the "verified" stamp.

---

## What's actually working well

Unbiased cuts both ways:

- **Real server-side grading exists and is correctly implemented** where it's actually used: `submit-quiz.ts` resolves the user from a verified Bearer token (not the payload) and re-fetches `correct_option` from `static_questions` by ID rather than trusting anything the client sends for scoring math. This is good, real work — it's just not the *only* path into the same tables (see Critical #1/#2).
- **Arena, Autopsy, and Leaderboard are all genuinely wired into navigation.** The "built but never routed" failure mode that hit `SyllabusMatrix.tsx` did not happen to the core loop.
- **The ranked/unranked split (`quiz_sessions` vs `training_sessions`) is a real, coherent, intentional design**, not accidental duplication — confirmed by the frontend's explicit `isRanked` toggle and consistent backend branching.
- **Premium seat-reservation logic is cleanly isolated** from quiz-taking — `reserve_premium_seat_if_available`/`pending_orders` only touch the membership-purchase flow, not question access, so that concern hasn't been tangled up with Arena's own (weaker) gating.
- **The existing `docs/live-site-critique.md` and `docs/ui-revamp-masterplan.md` (both 2026-08-19) hold up on direct re-check** — their timer/progress-dot/motion/Lock-Answer-dialog/typography findings are accurate and specific, and `ui-revamp-masterplan.md` already correctly instructs future editors to preserve state semantics (the Lock-Answer barrier, the answer-state maps, localStorage resume) rather than re-architect while restyling. That instinct is right and should carry into whatever comes next — restyle and re-architect are different jobs and shouldn't be done in the same pass.

---

## Recommended sequencing

1. **Security fixes first, decoupled from the rework and from any restyling.** Lock down the RLS policies on `quiz_sessions`/`question_attempts` (mirror what `training_sessions` already does correctly), delete the `/inline` routes, add auth to the question-fetch endpoints (or stop returning `correct_option` before submission), and move quota/tier enforcement server-side. This is incident-response-shaped, not redesign-shaped, and shouldn't wait on anything below.
2. **The two confirmed factual bugs** (CP bonus copy, Training Ground percentile) — cheap, high user-trust payoff, no architectural risk.
3. **Then the actual rework**, split cleanly into two different jobs per `ui-revamp-masterplan.md`'s own correct instinct:
   - *Restyle*: the UI-layer findings already documented in `live-site-critique.md`/`ui-revamp-masterplan.md` — preserve state semantics, don't re-architect while doing this.
   - *Re-architect*: break `Arena.tsx` into real sub-components, consolidate the four answer-state maps into one source of truth, pick one data-access pattern (server-lib vs. direct Supabase) instead of carrying both forward by accident, remove the dead tables/routes/components.
4. **Fix the stale `map/` documentation** so the load-bearing schema-name error stops propagating to whoever (human or agent) trusts those cards next.

See also: [[docs/live-site-critique|Live-Site Design Critique]], [[docs/ui-revamp-masterplan|UI Revamp Master Plan]], [[docs/codebase-assessment|Forensic Codebase Assessment]], [[docs/subsystem-wiring-map|Subsystem Wiring Map]], [[map/objects/arena-ui]], [[map/objects/quiz-engine]].
