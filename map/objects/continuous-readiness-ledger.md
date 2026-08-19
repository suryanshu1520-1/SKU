---
type: object
status: drafted 2026-08-20
universe: planned
---

# Object: Continuous Readiness Ledger

## 1. What It Is

An immutable, evidence-backed sequence of canonical numeric claim versions and `learn` / `replace` mutations. It is the state substrate for Tark Rebase.

## 2. Why This Shape

- Articles and URLs are observations, not identity.
- A canonical claim is `entity × metric × period × unit`.
- Repeated values do not create content.
- Changed values preserve the prior version and emit a monotonic mutation.
- Per-user checkpoints refer to mutation sequence, so acknowledgements are idempotent and cannot rewind.

## 3. Shape & Citations

- `news_ingest_runs` — pipeline watermark.
- `news_claims` — canonical claim identity.
- `news_claim_versions` — immutable value, evidence, provenance, source-body hash.
- `news_claim_mutations` — ordered `learn` / `replace` stream.
- `user_rebase_checkpoints` — private user sequence and verified-through state.
- `news_ingest_decisions` — private inclusion/omission ledger.
- Migrations: `supabase/migrations/20260819182814_continuous_readiness_core.sql`, `20260819182818_ingest_accountability.sql`.

## 4. Connected To

- **Consumes:** live `synthesizeGrounded()` claims only.
- **Produces:** authenticated `/api/rebase` patches.
- **Read by:** `src/components/RebaseEdition.tsx` through the authenticated API.
- **Falls back to:** `src/components/DailyEdition.tsx` when the patch is unavailable or invalid.

## 5. If You Change This

- **Hits:** ingestion orchestration, cross-run dedup, Rebase API contract, checkpoint semantics, Rebase frontend validator, RLS/grants.
- **Does not hit:** payments, competitive quiz scoring, or leaderboard calculations.

## 6. Invariants

- V1 emits only `learn` and `replace`.
- No legacy summary backfill.
- `verification_method = live_cite_or_drop_v1`.
- URLs never identify claims.
- Backend derives user identity from Bearer auth.
- Tables have no direct `anon` or `authenticated` privileges.

## 7. See

- [[../../docs/continuous-readiness-architecture]]
- [[../processes/rebase-claim-mutation]]
- [[../../docs/handoffs/rebase-v1-antigravity]]

