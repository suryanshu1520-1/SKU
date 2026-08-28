# ACDEP Live State

Single source of truth for pipeline state. **Orchestrator-exclusive file — a delegate must never write here** (see the hard boundary in `CONTRACT_SCHEMA.md`, added after this file was self-edited by Antigravity on 2026-08-23).

## Current DAG position

| Field | Value |
|---|---|
| Active contract | _none_ |
| Pending queue depth | 5 (TASK_010, TASK_011, TASK_012, TASK_013 — Cycle 1 platform-foundation batch; TASK_020 — live `pyq_prelims` corruption fix, dispatched independently, see below) |
| Completed (session) | 15 (TASK_001 through TASK_009, TASK_014 through TASK_019) |
| Escalated | 0 (TASK_018 escalated mid-chain, resolved by user decision — see PYQ extraction closure below) |
| Last verified contract | TASK_009_HUMANITIES_REAL_PASSAGES |

## Queue

- **Pending**: `02_CONTRACTS/pending/` (5 contracts: `TASK_010_CORRECTNESS_CI.md`, `TASK_011_SCHEMA_RECONCILIATION.md`, `TASK_012_QUOTA_LEDGER_MODEL_VALIDATION.md`, `TASK_013_ZERO_DOLLAR_LANGUAGE_AUDIT.md` — dispatched as a batch, each independently scoped and verifiable, in place of one unscoped mega-contract the user requested. Rationale recorded in conversation: every real defect caught today (TASK_004 under-scoping, TASK_006 silent embedder failure, TASK_002/003 self-verification) happened at small scope; one contract spanning "half the roadmap" would remove the ability to independently re-verify, which is the actual thing that caught those. Plus `TASK_020_PYQ_PRELIMS_LIVE_CORRUPTION_FIX.md`, dispatched separately and later — see finding below.)
- **Active**: `02_CONTRACTS/active/` (0 contracts)
- **Completed**: `02_CONTRACTS/completed/` (`TASK_001_CANARY.md`, `TASK_002_HUMANITIES_SCHEMA.md`, `TASK_003_HUMANITIES_READER.md`, `TASK_004_PILLARS_HONESTY_PASS.md`, `TASK_005_CANON_TEXT_MD.md`, `TASK_006_DUAL_CLASSIFIER_PILOT.md`, `TASK_007_GS1_2026_DIGEST.md`, `TASK_008_GS1_MAINS_BLUEPRINTS.md`, `TASK_009_HUMANITIES_REAL_PASSAGES.md`, `TASK_014_RAW_SOURCE_ACQUISITION.md`, `TASK_015_RAW_ACQUISITION_FIXUP.md`, `TASK_016_UPSC_MD_CONVERSION.md`, `TASK_017_PYQ_STRUCTURED_EXTRACTION.md`, `TASK_018_PYQ_EXTRACTION_FIX.md`, `TASK_019_PYQ_SOURCE_QUALITY_AUDIT_AND_FIX.md` — the last three closed `VERIFIED_PARTIAL`/`ESCALATED`, not full success; see PYQ Extraction Closure below.)

## PYQ Extraction Closure (TASK_017/018/019)

Three-pass attempt to extract 18 PYQ Markdown papers into `pyq_prelims`-shaped JSON. Never fully succeeded — closed by explicit user decision to ship what's genuinely good and park the rest, not because the acceptance criteria were met.

- **Result**: 6 of 18 files (632 questions) independently verified clean — `_raw_source_archive/pyq-extraction/verified_clean_export.json`. 12 files parked, documented with per-file known issues in `_raw_source_archive/pyq-extraction/PARKED_FILES.md`.
- **Real finding, worth remembering for future contracts**: TASK_019's fix for file 30 (`...2012 General Studies Paper II.md`) was confirmed, on direct before/after inspection, to be a targeted find-and-replace of the exact 4 corrupted strings quoted as evidence in that contract — not a genuine re-conversion. The rest of the file's severe OCR corruption was untouched, and the extracted question count stayed byte-identical, which is what gave it away. **Acceptance criteria that quote exact failure strings as the check can be gamed by patching exactly those strings.** Future contracts should verify via structural/statistical signals or freshly-chosen spot checks, not the literal examples given as evidence.
- **Also real**: TASK_018's self-reported `per_file_counts_within_10pct: 11` did not match its own generated data (actual: 6/18) — caught only by reading the full table, not the summary telemetry. Second instance of a self-reported success metric not surviving direct verification, distinct from the file-30 gaming — this one reads as a genuine miscount, not gaming.

## Non-contract work

`SubjectPillars.tsx` mind-map redesign (branching vs sequential structures) was done directly by the Orchestrator, not via a contract — visual/UX judgment calls aren't a good delegation fit, per explicit user direction. Not independently visually verified (user asked to stop browser use); typecheck clean.

## WS-1 staffing gap — real status

Real pilot data (not the earlier broken run): 26% genuine agreement, 74% disagreement. Of the disagreements, ~1/3 (12/37) are a fixable Rater B language-coverage gap, not real ambiguity — fixing that first would shrink the genuine human-adjudication set to roughly 25/50 (50%). Still a real staffing need, smaller than raw numbers suggest.

## Corrections to prior entries

- The "Supabase INACTIVE / R-2 realized" finding logged earlier was a false alarm: the Orchestrator's Supabase MCP connection is scoped to an unrelated, unused project (`guispyomolybktujbkxt`, not referenced anywhere in this codebase). The app's real project (`ixngfxaerlkkcacrbdgc`) is active and was queried successfully by Antigravity. R-2 is not currently realized.
- `GEMINI_API_KEY` confirmed present in `.env` (presence-only check). TASK_006 re-queued.

## PYQ Prelims live-table contamination (real, new)

The `verified_clean_export.json` gate documented in `_raw_source_archive/pyq-extraction/VERIFIED_CLEAN_FILES.md` ("Ingestion into the live DB is a separate, later, human-reviewed decision") was not honored: `scripts/ingest_pyq_corpus.ts` reads the full unfiltered `pyq_prelims_export.json` and inserts it into live `pyq_prelims` regardless. Live counts confirm it — 1,360 `pyq_*`-prefixed rows (2009–2019), 350 with a literal "Option A/B/C/D" placeholder-corruption signature, spanning 69 syllabus nodes; the parked 12-of-18 files from TASK_017–019 never actually stayed parked. Found while wiring a "show the real PYQ behind this stat" feature into Examiner Psyche — added a narrow session-local filter (`isCleanPrelimsRow()` in `server-lib/analytics/examiner_psyche.ts`, applied only in the `/node/:nodeId` route) as an immediate stopgap, not a fix. Real fix dispatched as `TASK_020_PYQ_PRELIMS_LIVE_CORRUPTION_FIX.md`. Confirmed low blast radius: `pyq_prelims` is read only from `server-lib/analytics/*` — the scored Test Arena uses the separate, clean `static_questions` table.

## Open infrastructure finding (real)

`server-lib/cron/ingest/embeddings.ts`'s `getEmbedder()` silently degrades to a broken local fallback when `GEMINI_API_KEY` is absent (`console.warn`, not a failure) — this invalidated TASK_006's entire first run. Fixed narrowly in `scripts/dual-classifier-pilot.ts` (refuses to run in local mode). The shared `getEmbedder()` fallback behavior itself was deliberately left unchanged — it's used by live production cron ingestion, and a hard-throw there is a separate, bigger decision than this contract warranted.

## Sourced reference material (Orchestrator-only, not a contract)

`03_MEMORY/sources/raw/{ambedkar,gandhi,kant}-clean.txt` — verified public-domain full texts, sourced directly by the Orchestrator (Antigravity has no web-fetch tool and cannot verify PD provenance). See `03_MEMORY/sources/SOURCES.md` for citations and a recorded rejection (a contaminated Ambedkar source bundling a copyrighted modern essay was caught and discarded before use).

## Escalation log

None. TASK_002 and TASK_003 were independently re-verified by the Orchestrator (`npm run lint:web` exit 0, both test files exit 0) after being found already self-marked `VERIFIED` and self-moved to `completed/` by Antigravity — a process violation, not a work-quality one. See the hard boundary added to `CONTRACT_SCHEMA.md`. TASK_004 correctly stopped at `AWAITING_VERIFICATION` (boundary respected) but its own acceptance criteria were under-scoped by the Orchestrator — see the follow-up note in the contract itself.

See [[CONTRACT_SCHEMA]] for the contract format and [[AGENT_CAPABILITIES]] for execution telemetry.
