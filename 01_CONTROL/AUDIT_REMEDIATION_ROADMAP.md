# Audit Remediation Roadmap

Orchestrator-owned control document. Source: 2026-08-30 verification-first audit (10 code-grounded agents) + direct Orchestrator re-verification during contract-authoring on this date. Supersedes nothing in `STATE.md` — this is the forward queue; `STATE.md` remains the historical ledger.

**Governing philosophy (carried forward from this project's own recorded lesson, see `STATE.md` "Pending queue depth" note):** small, independently-verifiable contracts beat one mega-contract. Every real defect this pipeline has caught (TASK_004 under-scoping, TASK_006 silent embedder failure, TASK_017/018 self-reported-metric mismatches) was caught *because* scope was small enough to independently re-run. Waves 5-11 below are named and scoped at objective+acceptance-sketch level only — they get full ACDEP contracts once the waves ahead of them verify, not before.

**Dispatch mode (2026-08-30):** Waves 1-4 (TASK_021-028) were batch-dispatched directly into `02_CONTRACTS/active/` at once, per explicit user request for zero-idle-time execution — Antigravity self-chains through them in numeric order per the new §5 "Autonomous Multi-Contract Queue Protocol" in `00_SYSTEM/AGENT_CAPABILITIES.md`, without waiting for Orchestrator re-dispatch between contracts. This does **not** relax per-contract verification: 7 of the 8 are mutually independent (safe to chain on self-report), but `TASK_028` carries a hard `depends_on: [TASK_021]` gate and will not start until `TASK_021` is Orchestrator-verified in `completed/` — because it inherits `TASK_021`'s actual fix, and self-reported completion has twice before in this pipeline diverged from real correctness (TASK_002/003, TASK_017/018).

## Legend

- **[CONTRACT → ANTIGRAVITY]** — dispatched as a full ACDEP contract in `02_CONTRACTS/pending/`, mechanical/verifiable enough for the Workhorse.
- **[ORCHESTRATOR-DIRECT]** — judgment call, cross-file architectural decision, or something touching `01_CONTROL`/`03_MEMORY` — stays with Claude Code, never delegated (per `CONTRACT_SCHEMA.md` hard boundary and `AGENT_CAPABILITIES.md` §5 anti-patterns).
- **[USER-DECISION]** — destructive, billing, or public-repo-content call that isn't the Orchestrator's or a delegate's to make unilaterally. Named here, not executed, until Suryanshu says go.

## Outstanding item found while authoring this roadmap

`02_CONTRACTS/pending/TASK_020_PYQ_PRELIMS_LIVE_CORRUPTION_FIX.md` has a fully-populated Antigravity receipt (`rows_deleted: 1266`, `placeholder_count_after: 0`, diff included) but was never independently re-verified or moved to `completed/` by the Orchestrator — it has sat in `pending/` since 2026-08-28. This session's Supabase MCP connection is scoped to the same unrelated inactive project (`guispyomolybktujbkxt`) already documented in `STATE.md`'s "Corrections to prior entries" — cannot independently re-run the receipt's verification query from here. **[ORCHESTRATOR-DIRECT, blocked]** — next session with real project access (`ixngfxaerlkkcacrbdgc`) must re-run `select count(*) from pyq_prelims where options::text ~* 'option [a-d]'` and expect `0` before trusting the receipt and closing it out. This is unrelated to the `master_7841_pyqs.json` corpus in Wave 2 below — different table, different dataset, do not conflate.

---

## Wave 0 — Verification housekeeping

Not contracts. Must happen before or alongside Wave 1, done by the Orchestrator or the user directly.

- **[ORCHESTRATOR-DIRECT, blocked]** Close out TASK_020 (see above) once real Supabase access is available.
- **[USER-DECISION]** Confirm `supabase/migrations/20260826000001_arena_security_hardening.sql` is applied to the **live** production project, not just present in the repo. The RLS/quota fixes it contains are proven only in the migration file.
- **[USER-DECISION]** Rotate the Supabase `service_role` key — flagged pending in project memory (`tark-repo-hygiene-and-secrets`), predates this roadmap.
- **[ORCHESTRATOR-DIRECT]** Reconcile `01_CONTROL/ACTIVE_PIPELINE.json`'s stale summary counters (`tasks_completed: 9`, `tasks_total: 13`, `current_stage: QUEUED`) against `STATE.md`'s real count (15 completed) — done as part of this roadmap's STATE.md/ACTIVE_PIPELINE.json update below.

---

## Wave 1 — Security & integrity fix-first [CONTRACT → ANTIGRAVITY, ACTIVE, AUTO-CHAINING]

The core "testing arena" cannot be trusted until this wave lands. Nothing else matters if the answer key is readable before answering.

- **TASK_021** — Answer-key leak, corrected scope. Original audit framing ("strip `correct_option`, one line per endpoint") was too optimistic — confirmed by direct re-read of `Arena.tsx` that this is a **per-question lock-and-reveal** UX (20s timer, reveal fires at `Arena.tsx:567` when a question locks), not a submit-once-at-the-end flow. The real fix moves the per-question answer out of the bulk fetch and into an on-lock authenticated reveal, and also strips the bundled static-fallback JSON (`Arena.tsx:419-428`) which ships answers in the JS bundle itself — no network request even needed today.
- **TASK_022** — Remove hardcoded Supabase anon-key + prod-URL literals committed as fallbacks (`server-lib/questions.ts:16`, `server-lib/analytics/examiner_psyche.ts:30-31`). Public auto-deploy repo; env-only, no literal fallback, matching the pattern already used correctly in `submit-quiz.ts:16-17`.
- **TASK_023** — Two small monetization-integrity gaps: null `user_profiles` row silently bypasses the ranked-quota cap (`submit-quiz.ts:96`, `if (profile)` — a signed-in user with no profile row gets unlimited ranked tests); `verify-payment.ts` never cross-checks the request body's `userId` against the paid order's `notes.userId`, so a legitimate payer could misdirect an upgrade to a different account.

## Wave 2 — Data & statistical credibility [CONTRACT → ANTIGRAVITY, ACTIVE, AUTO-CHAINING]

Public-facing false claims. This is the single biggest reputational exposure found in the audit.

- **TASK_024** — Observatory statistical honesty pass. `Observatory.tsx:45-320` hardcodes an `OBSERVATORY_DATA` blob under a banner reading "AUTHORITATIVE EMPIRICAL RESEARCH DATASET" — its headline `uniformityChiSquare: 1.638, uniformityPValue: 0.651` (claiming uniform answer keys) is fabricated: the real shipped corpus is heavily A-skewed (independently recomputed: keys are far from uniform). Either compute census/uniformity stats live from the real corpus via the already-working `/api/analytics/observatory/pyqs` engine, or relabel the panel as illustrative/non-empirical. Do not ship an invented statistic under an "authoritative" banner.
- **TASK_025** — Fix the broken insight→practice bridge and stop presenting untestable content as scoreable. "Practice Similar in Arena" passes a bare subject string (`Observatory.tsx:1704`) that `server-lib/questions.ts:52-83` only matches for POLITY/CSAT — every other subject silently falls through to an unfiltered random pull. Separately, independently verified 6,081 of 7,841 rows (77.6%) in `server-lib/analytics/data/master_7841_pyqs.json` carry placeholder options literally reading `(a) Option A`/`(b) Option B` etc. — hide the answer/score UI for those rows in the Explorer (read-only archive mode) rather than let a user "answer" a blank option.

## Wave 3 — Repo hygiene [CONTRACT → ANTIGRAVITY where mechanical; USER-DECISION where destructive/public]

- **TASK_026** — Delete 7 confirmed-zero-importer components (`ContextActionRail.tsx`, `StaticLibrary.tsx`, `DialecticWorkbench.tsx`, `ThinkerPortraitCard.tsx`, `ThinkerTerminalCard.tsx`, `PassageCard.tsx`, `SyllabusMatrix.tsx`, ~1,881 lines combined) and consolidate the two hand-maintained nav systems (`App.tsx:391-568` inline horizontal header + `VerticalNavRail.tsx`) into one shared `NAV_ITEMS` definition.
- **TASK_027** — Collapse the Docker stack. Production is Vercel serverless (`vercel.json`); `Dockerfile`, `Dockerfile.dev`, `docker-compose.yml`, and 697 lines of `DOCKER_GUIDE.md`/`DOCKER_INTEGRATION.md`/`DOCKER_SETUP_COMPLETE.md` describe a deploy path that doesn't exist. Keep only `Dockerfile.pdf-convert`/`docker/Dockerfile.docling` (real one-time local OCR use) with a one-line comment clarifying scope.
- **[USER-DECISION]** Fate of the local agent-theater sprawl: `hive/` (a **nested git repository** — has its own `.git`, one $1.59 session, net-zero shipped output), `roster.json` + `roster-backups/` (55 near-identical snapshots in 20 minutes), `YOLO/`, `gemini-scribe/`, `copilot/`. All git-ignored, zero product references. Recommend deletion, but a nested repo and 55 backup snapshots represent real (if low-value) session history — not deleting this unilaterally. Say the word and it's a two-minute cleanup.
- **[USER-DECISION]** Fate of the `docs/` research-monograph corpus (~67k words: the 25-year treatise, the "mathematical proof," cross-cultural modeling, `docs/research/` Tark-2.0 blueprints). Two of these docs give contradictory answer-key distributions for the identical dataset (A=24% vs A=44%) and the flagship chi-square is arithmetically wrong. Zero product code reads any of them. Options: delete, or move to a private/local-only path (repo is public per `tark-repo-hygiene-and-secrets` memory, and `docs/research/` is already noted there as "kept local/unpushed per @repo-hygiene" — worth confirming that's actually enforced, not just documented as intent).
- **[USER-DECISION]** Fate of the PIB Aggregator daemon (`server-lib/cron/pib-aggregator.ts`, 589 lines) — fully built, cron-unwired, feeds a live UI modal (`CurrentAffairs.tsx` PIB modal) that therefore only ever shows stale/hand-run data. Either wire it into a cron route (adds a real recurring cost/complexity), or delete it plus the modal rather than present a dead feature as live.

## Wave 4 — Bridge 1: news → practice loop [CONTRACT → ANTIGRAVITY, ACTIVE, HARD-GATED ON WAVE 1]

The fastest real win in the whole audit — content that already exists, generated daily, validated, and currently dies in a reading view.

- **TASK_028** — Union `current_affairs_mcqs` into the Arena's question pool as a "Today's Current Affairs" mode (or a source branch inside the existing pool), reusing the existing server-side grading path (`submit-quiz.ts`) unchanged. These MCQs are already generated daily and shape-validated (`server-lib/cron/ingest/mcq.ts:135-154`) — currently their only reader is `DailyEdition.tsx`. **Will not start until `TASK_021` is Orchestrator-verified in `completed/`** — it inherits `TASK_021`'s corrected response shape and must not be built against an unverified self-report.

---

## Wave 5 — Syllabus Coverage Ledger *(scoped, not yet contracted)*

The #1 item every strategy doc named as core and unbuilt. Two sub-contracts once Wave 1-4 verify:
- Tag `static_questions` to the existing syllabus node graph using the already-built keyword classifier (`server-lib/cron/ingest/syllabus/keyword-classifier.ts`, `nodes.ts`).
- Surface per-user attempted/accuracy/staleness per GS node in `SubjectPillars.tsx` (currently a hardcoded static page, zero Supabase reads) using `question_attempts` data that `submit-quiz.ts` already writes on every submission.

Acceptance sketch: a signed-in user with quiz history sees real per-node counts, not the current static content; a user with zero history sees an honest "not yet attempted" state, not a fabricated stat.

## Wave 6 — Decoy diagnosis at point of mistake *(scoped)*

Converts the repo's biggest "sophisticated nothing" surface (the examiner-psyche/decoy research, currently only rendered as static charts) into the product's most differentiated teaching moment. At the moment `submit-quiz.ts` grades a wrong answer, classify which distractor type the user fell for (extreme-modifier, plausible-swap, near-neighbour) using the existing decoy model in `server-lib/analytics/examiner_psyche.ts`, and surface it in `Autopsy.tsx` instead of a bare "incorrect."

Acceptance sketch: a wrong answer in Autopsy shows a specific trap label, not just correct/incorrect; the label is computed from the actual chosen option, not a static lookup.

## Wave 7 — Spaced-repetition Revision Arena *(scoped)*

Second core anxiety from the strategy docs ("will I forget what I learned"), currently unaddressed — the retention loop stops at today's news quiz. Recirculate a user's own wrong answers from `question_attempts` on a decay schedule, prioritized by the Wave 5 coverage gaps once that exists.

Acceptance sketch: a returning user with prior wrong answers sees a "Revision" queue populated from their own `question_attempts` rows, not a generic question pull.

## Wave 8 — Rebase surfacing *(scoped)*

Rebase's engineering is sound (advisory-locked atomic versioning) but invisible: gated behind a non-default `briefViewMode==='edition'` toggle (`CurrentAffairs.tsx:674`, default is `'signals'`), and `news_ingest_decisions` ("proof of omission") is write-only with zero read path anywhere in `src/`.
- Surface a lightweight "N verified changes since your last visit" signal in the default `signals` view instead of requiring the toggle.
- Give proof-of-omission a read path — even a small panel showing "we saw X, dropped it because Y."

Acceptance sketch: a user who never touches the edition toggle still sees when a tracked fact changed; at least one proof-of-omission decision is visible somewhere in the UI.

## Wave 9 — Bridge 2: Rebase → question-staleness *(scoped, the real moat, needs its own design pass first)*

The single highest-leverage, hardest move: when the Rebase ledger records a numeric fact flipping value (e.g. repo rate 6.25→6.0), auto-flag every `static_question`/`current_affairs_mcq` whose answer references the superseded value, mark it stale, and surface a targeted re-test. This is the one move no UPSC competitor can copy — it requires both a live fact ledger AND a question bank, and Tark is the only product with both. Currently starved by `contested.ts`'s ~20-entry hardcoded entity vocabulary + 9 metric regexes; a real version likely needs the LLM to emit structured `(entity, metric, value, unit, period)` tuples directly during `synthesizeGrounded` rather than regex extraction. Do not contract this piece by piece — write an Orchestrator-direct design note first (data model for "this question is now stale," matching logic between ledger canonical_key and question content, re-test UX) before decomposing into contracts. Effort: months, not weeks.

## Wave 10 — Growth: router + public digest permalinks *(scoped)*

The SEO audit's single biggest named fix, unbuilt: there is no router at all (`src/main.tsx`), so `public/sitemap.xml`'s `/arena`, `/current-affairs`, `/leaderboard` URLs resolve to no distinct crawlable content. The daily AI content is already generated and sitting in Supabase — this is a pure distribution/plumbing gap, not a content gap.
- Add a minimal client router (or a lightweight prerender layer) and ship `/briefs/[date]` permalinks for the daily current-affairs content.

Acceptance sketch: a `/briefs/2026-08-30`-style URL returns distinct, crawlable HTML for that day's content, not the SPA shell; sitemap URLs resolve to real distinct pages.

## Wave 11 — Monetization correction *(scoped)*

- Ranked-test paywall fires at 50 **lifetime** ranked sessions (`submit-quiz.ts:99`), contradicting `docs/monetization-tiers.md`'s documented "1/day" free tier, and commit `7d2c040` removed paywall redirects entirely — no realistic aspirant hits a conversion trigger today. Reinstate a paywall that actually creates urgency, ideally tied to the exam-date "Clock" concept from the brand-review doc rather than an arbitrary lifetime count.

Acceptance sketch: a free-tier user hits a meaningful, clearly-communicated limit before 50 sessions, with a real upgrade prompt at the moment of the block.

---

## Dispatch policy for waves 5-11

Do not write full ACDEP contracts for these until the preceding wave has at least one round of Orchestrator-verified, `completed/`-moved contracts. This is not process ceremony — it's the same lesson `STATE.md` already recorded from TASK_017-019: contracts that span more territory than can be independently re-verified in one pass are where self-reported success stops meaning anything.
