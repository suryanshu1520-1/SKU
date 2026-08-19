---
type: process
status: drafted 2026-08-20
universe: planned
---

# Process: Verified Claim Mutation and Learner Rebase

## 1. Summary

Turn a live span-verified numeric fact into an immutable canonical version, emit a mutation only when knowledge changed, compile unseen mutations for an authenticated learner, and advance their checkpoint monotonically after acknowledgement.

## 2. Movement

1. Start `news_ingest_runs` and persist the requested source boundary.
2. Gather, cluster, and run grounded synthesis.
3. Reject every non-numeric, ambiguous, unrecognized, ungrounded, pre-summarized, or legacy claim.
4. Canonicalize `entity × metric × period × unit` and normalize the value.
5. Lock the canonical key transactionally.
6. First value → immutable version + `learn`; repeated value → unchanged; new value → linked version + `replace`.
7. Finish the run with its highest mutation sequence and result ledger.
8. `GET /api/rebase` reads mutations after the token-derived user's checkpoint.
9. Frontend validates the complete response and otherwise renders Daily Edition.
10. `POST /api/rebase/ack` advances the checkpoint without accepting a rewind.

## 3. Objects Touched

- [[../objects/continuous-readiness-ledger]]
- [[../objects/ingestion-pipeline]]
- [[../objects/user-and-auth]]

## 4. If You Change This

- Re-run numeric normalization, duplicate/change distinction, auth-isolation, empty-patch, and monotonic-ack tests.
- Re-run Supabase security and performance advisors after schema/RPC changes.
- Verify both `server.ts` and `api/server.ts` mount identical routes.

## 5. Deliberate Non-Behavior

- No `watch` inference from the current contested detector.
- No `retire` inference from absence.
- No same-URL revision detection in v1.
- No personalized set-level compression yet.

