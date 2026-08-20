---
tags:
  - docs
  - news-intelligence
  - continuous-readiness
  - rebase
status: active
date: 2026-08-20
---

# Continuous Readiness — Tark Rebase Architecture

> **Product decision, 2026-08-20:** Tark is not another AI current-affairs digest. It is a version-controlled exam-knowledge system that reconciles changes in the verified public record with changes in an aspirant's knowledge. The existing Daily Edition remains the safe compatibility surface while Rebase is built.

## The category

**Continuous Readiness** means keeping an aspirant's exam-relevant model synchronized with reality without creating a content backlog.

The user-facing promise is:

> **No backlog. No stale facts. Every verified change accounted for.**

The system objective is deliberately contrarian:

> Minimize required consumption while bounding the risk of omitting exam-relevant information.

Daily summaries, source links, syllabus tags, PYQ mapping, rankings, personalization, and generated MCQs already exist across the market. They remain useful outputs, but they are not Tark's category claim.

## The new atomic unit

The old atomic unit was an article or daily card. The Rebase atomic unit is an immutable, proof-carrying **claim mutation**.

```text
changing public record
        ↓
live cite-or-drop evidence
        ↓
canonical claim identity
        ↓
immutable claim version
        ↓
learn / replace mutation
        ↓
learner checkpoint
        ↓
minimal verified patch
```

The full long-term mutation vocabulary is `learn`, `watch`, `replace`, `retire`, and `contest`. Rebase v1 intentionally implements only `learn` and `replace` for recognized numeric facts.

## Why v1 is narrow

Tark cannot claim temporal intelligence merely because an LLM labels an update.

V1 accepts a claim only when all of these are true:

1. It came directly from the in-memory result of `synthesizeGrounded()` during a live ingestion run.
2. `verifyClaim()` accepted its evidence spans.
3. It is numeric and maps unambiguously to a recognized entity, metric, period, and unit.
4. The entity is not `General`, the metric is not `general_metric`, and the unit is not an ambiguous year.
5. Its source body has a stored SHA-256 fingerprint.
6. Its verification marker is exactly `live_cite_or_drop_v1`.

No stored legacy summary may seed the ledger. No ungrounded fallback, pre-summarized source, raw contested scan, or headline-only input may create a mutation.

## Claim identity and versioning

The canonical identity for v1 is:

```text
v1 | normalized entity | metric | normalized period | unit
```

URLs are evidence locations, never identity.

Example:

```text
v1|rbi|repo_rate|current_period|%
```

The normalized value receives its own SHA-256 hash.

- First verified value for a canonical key → immutable version 1 + `learn` mutation.
- Same normalized value again → observation only; no new version or mutation.
- Different verified value for the same canonical key → immutable next version + `replace` mutation linked to the prior version.
- Different period or unit → different claim, never an accidental replacement.

## State model

The checked-in migrations define five internal tables:

| Table | Purpose |
|---|---|
| `news_ingest_runs` | Persisted run boundary and verified ledger watermark |
| `news_claims` | Stable canonical identity: entity × metric × period × unit |
| `news_claim_versions` | Immutable values with exact evidence, provenance, and source-body hash |
| `news_claim_mutations` | Monotonic `learn` / `replace` event stream |
| `user_rebase_checkpoints` | Private per-user mutation sequence and verified-through watermark |

`news_ingest_decisions` is the private Proof-of-Omission ledger: every candidate receives a decision and reason code, including budget omissions and unsupported claims.

All tables are RLS-enabled, revoked from `PUBLIC`, `anon`, and `authenticated`, and reachable only through service-role ingestion or bearer-authenticated API handlers. The API derives the user from the token; it never accepts a caller-supplied user ID.

## Rebase patch contract

`GET /api/rebase` compares the authenticated user's mutation checkpoint with the latest completed ingest watermark.

It returns:

- The checkpoint sequence and previous verified-through time.
- The new through-sequence and verified-through time.
- Ordered `learn` and `replace` mutations.
- Exact evidence quotes and span IDs.
- Source, story, syllabus, and effective-time context.
- `hasMore`, so a partial page can never masquerade as a complete patch.

`POST /api/rebase/ack` advances the checkpoint monotonically. An old or replayed acknowledgement is idempotent and can never move the checkpoint backwards.

The frontend rejects malformed or unproven payloads at runtime and renders the existing Daily Edition instead. Rebase therefore fails closed.

## Product behavior

The Rebase surface says:

- **Learn:** a verified fact the learner has not checkpointed before.
- **Replace:** a verified value has changed; the old value is struck through beside the new one.
- **Evidence verified through:** the persisted ingest-run watermark, not `Date.now()`.
- **Changes processed:** mutation acknowledgements, not articles read.

When all returned mutations are processed and no page remains, the user can advance the checkpoint. Only a successful server acknowledgement permits the copy “You are current through …”. Local-only progress is explicitly qualified as “on this device.”

The initial UI remains feature-gated. Before the backend routes are live and the response passes the runtime contract, users continue to see Daily Edition without regression.

## Trust incident and quarantine rule

`scripts/backfill-grounding.ts` is not valid evidence infrastructure. It stamped legacy bullets as verified, used the bullet itself as a supposed source quote, invented span IDs, set grounding to `100` instead of the `0..1` contract, and injected a demonstration contested dispute with fabricated figures.

Consequences:

- Existing `summary.claims`, `summary.grounding`, and `summary.contested` are not trusted Rebase inputs.
- The frontend now hides trust badges and anchors unless explicit live provenance is present.
- Rebase starts from an empty ledger.
- Live-data inspection and remediation require a separate, reversible Supabase operation with an exact target count.

## Proof of Omission

The market can show what it published. Tark must learn from everything it rejected.

Each ingestion candidate receives a private decision:

- `included`
- `dropped_no_text`
- `excluded`
- `duplicate`
- `clustered`
- `unsupported`
- `budget_omission`
- `failed`

The run record stores aggregate results and a stable pipeline version. Later exam audits can evaluate false negatives instead of cherry-picking successful matches. Raw rejected URLs and diagnostics remain private; a later receipt API may expose aggregate coverage safely.

## Rollout sequence

### V1 — verified numeric Rebase

- `learn` and `replace` only.
- New source releases only; mutable same-URL documents are not yet revisited.
- Bearer-authenticated patch and acknowledgement API.
- No legacy backfill.

### V2 — typed state transitions

Add explicit, evidenced transitions such as proposed → passed → assented → notified → effective. Each transition family requires its own precision backtest.

### V3 — correction propagation

Link claim versions to briefs, MCQs, Mains notes, translations, and revision cards. A new version marks dependent artifacts stale and rebuilds or retires them.

### V4 — rate-distortion compiler

Choose the smallest set of mutations that preserves required syllabus coverage under a time budget. Short builds must declare what coverage they sacrifice.

### V5 — temporal knowledge debt

Use question outcomes to distinguish unseen, learning, mastered, and stale claims. Practice becomes a sensor that changes the next patch.

## Acceptance gates

Rebase v1 is not complete until all are true:

1. First verified 6.50% observation creates one claim, one version, and one `learn` mutation.
2. Repeated 6.50% / normalized 6.5% creates nothing new.
3. A later 6.25% creates one linked version and one `replace` mutation.
4. FY25 versus FY26 and differing units remain separate claims.
5. Ungrounded, context-only, `General`, ambiguous, and legacy claims produce no ledger writes.
6. Semantic repeats with changed recognized facts survive cross-run dedup.
7. User A cannot read or advance user B's checkpoint.
8. Empty patches advance the verified-through watermark safely.
9. Acknowledgements are idempotent and monotonic.
10. Supabase security and performance advisors introduce no new warnings.

## Current status

As of 2026-08-20:

- ⚠️ Three Rebase migrations are checked in, but live application is unverified and the static review of `dc70b7e` says **do not apply as-is**.
- ✅ Rebase frontend and strict runtime contract are built behind a fail-closed fallback.
- ✅ Unproven legacy trust badges are quarantined in the UI.
- ⚠️ Antigravity's first backend draft landed in `dc70b7e`; ledger history, run ordering, patch-bounded acknowledgement, decimal verification, and test isolation remain release blockers.
- ⏳ Backend correction, live migration application, remediation audit, and Supabase verification remain assigned to Antigravity in [[handoffs/rebase-v1-antigravity]].

## See also

- [[news-intelligence-architecture]] — ingestion substrate and Daily Edition compatibility layer
- [[research/tark-2.0-architectural-blueprint|Tark 2.0 Architectural Blueprint]] — 180-day master architecture integrating Rebase with Humanities & Temporal engines
- [[news-feed-quality-roadmap]] — historical consolidation roadmap
- [[../map/objects/continuous-readiness-ledger]] — system-map noun card
- [[../map/processes/rebase-claim-mutation]] — system-map workflow
- [[handoffs/rebase-v1-antigravity]] — execution contract
