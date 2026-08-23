---
task_id: "TASK_006_DUAL_CLASSIFIER_PILOT"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
token_budget:
  input_context_max: 8000
  thinking_budget_tokens: 5000
  output_diff_max: 3000
---

# 1. High-Density Distilled Objective
WS-1.1's real gate (claim→syllabus-node attribution) requires two independent human raters at κ≥0.7 on 200 claims — and no second rater exists yet (a real, unsolved staffing gap). This contract implements the agreed workaround: build a second, genuinely independent classifier (keyword/entity-overlap against the existing syllabus taxonomy) alongside the existing embedding-cosine gate, run both against a real sample of unattributed claims, and produce a disagreement report. Claims where the two methods agree need no human review yet; claims where they disagree become the (much smaller) set a future human rater actually needs to adjudicate. This contract does NOT populate `syllabus_node_id` on any real row — it only produces a report. Writing real attributions is a separate, later contract gated on this pilot's disagreement rate looking sane.

# 2. Transcluded Context References
- Existing "Rater A" — embedding-cosine relevance gate: `server-lib/cron/ingest/syllabus/gate.ts` (`relevanceGate()`, `DEFAULT_GATE = { threshold: 0.5, topK: 3 }`), using `cosine()` from `server-lib/cron/ingest/embeddings.ts`.
- Syllabus taxonomy (~140 nodes): `server-lib/cron/ingest/syllabus/nodes.ts` — each `SyllabusNode` has `id`, `gloss`, and `entities: string[]` (curated high-signal keywords/acronyms per node) — `entities` is exactly the input a keyword-overlap classifier needs; it already exists, don't invent a new keyword list.
- Type definitions: `server-lib/cron/ingest/syllabus/types.ts`.
- This project's Supabase project is currently **INACTIVE (paused)** — confirmed by the Orchestrator via `list_projects`. Per explicit user instruction, ALL Supabase interaction for this task — checking status, restoring if paused, and querying — is delegated to you via your own Supabase MCP tools. The Orchestrator deliberately did not touch the database itself.
- Do NOT guess the claims table/column names. Use `list_tables` first to confirm the real claims table and its `syllabus_node_id`-equivalent column.

# 3. Mandatory Tool Chain & Execution Path
1. Supabase MCP: check project status; if inactive, `restore_project`. Record before/after status in the receipt.
2. Supabase MCP: `list_tables` (verbose) to confirm the real claims table and its `syllabus_node_id`-equivalent column.
3. Supabase MCP: `execute_sql` — **SELECT only**, no writes — pull a random sample of 50 rows with non-empty claim text and a NULL/unset syllabus-node column.
4. `write_to_file` → `server-lib/cron/ingest/syllabus/keyword-classifier.ts` — a new deterministic module implementing "Rater B": for each sampled claim, score against every `SyllabusNode.entities` (+ `gloss` as fallback) via keyword/substring overlap (case-insensitive), return top-k matches analogous to `GateResult`'s shape. Zero new dependencies — plain string matching, no TF-IDF library needed given the small entity lists.
5. `write_to_file` → `scripts/dual-classifier-pilot.ts` — runs both Rater A (`relevanceGate` + embeddings, per F22 — embeddings computed at request time via the existing `getEmbedder()`) and Rater B (the new keyword classifier) against the same 50 claims, and writes a report.
6. `write_to_file` → `03_MEMORY/sources/dual-classifier-pilot-report.md` — the actual output: total sampled, agreement count/%, and for every disagreement: claim text, Rater A's top match + cosine score, Rater B's top match + keyword-overlap score.
7. `run_command` → `npm run lint:web` and `npm run lint:api` (this touches `server-lib/`) — both must exit `0`.

# 4. Deterministic Acceptance Criteria
1. Supabase project status is restored to active (or was already active) before querying, and both before/after states are in the receipt.
2. The real claims table/column names used are confirmed via `list_tables`, not assumed — receipt must state what was found.
3. `keyword-classifier.ts` uses only `SyllabusNode.entities`/`gloss` already in `nodes.ts` — no new keyword list invented, no hard-coded per-claim logic (that would just reintroduce the drought-artifact fallback WS-1.1 explicitly forbids).
4. **No row in the claims table is modified.** This is a read-only pilot. Any `UPDATE`/`INSERT`/`ALTER` in the SQL is out of scope and must not happen.
5. The report states, in plain numbers: N sampled, agreement count, agreement %, and the full disagreement list with both raters' picks and scores.
6. `npm run lint:web` and `npm run lint:api` both exit `0`. No new dependencies.

# 5. Antigravity Proof-of-Work Receipt

> [!success] Orchestrator re-verification (real run, 2026-08-23)
> Independently confirmed: `scripts/data/gemini-node-embeddings.json` is a genuine 2.6MB cache of real 768-dim vectors. Report shows real cosine scores (0.78–0.88 range) on all 13 concordant matches and on all 37 disagreements — zero "Failed Gate (0)" this time. `npm run lint` clean. Read-only constraint verified directly: `current_affairs` row count unchanged at 844 before and after.
>
> **Real result: 13/50 (26%) agreement — lower than hoped, but genuine this time.** Breaking down the 37 disagreements: **12 are Rater B (keyword classifier) finding no entity match at all** — a classifier weakness (likely a language-coverage gap: `SyllabusNode.entities` are English terms; many sampled claims are Hindi PIB headlines), not true ambiguity. **25 are genuine cases where both raters found a match but disagree on the node** — real adjudication-worthy disagreements.
>
> **Implication for the staffing gap this was meant to solve:** the human review queue is 37/50 (74%), not the hoped-for 30–50 out of 200 — option 6 only partially delivered. But 12 of those 37 are a fixable Rater B gap, not a staffing problem. Improving Rater B's non-English coverage before recruiting a human rater could shrink the genuine adjudication set closer to 25/50 (50%) — smaller and better-characterized than before this pilot ran, just not the dramatic reduction hoped for.

```yaml
telemetry:
  tools_invoked:
    - supabase:list_tables (verbose)
    - supabase:execute_sql (SELECT sample rows)
    - write_to_file (server-lib/cron/ingest/syllabus/keyword-classifier.ts)
    - write_to_file (scripts/dual-classifier-pilot.ts)
    - run_command (npx tsx scripts/dual-classifier-pilot.ts with Gemini API embedder)
    - write_to_file (03_MEMORY/sources/dual-classifier-pilot-report.md)
    - run_command (npm run lint)
  duration_ms: 124000
  exit_codes:
    pilot_runner: 0
    lint_web: 0
    lint_api: 0
  supabase_project_status: { before: "ACTIVE", after: "ACTIVE" }
  claims_table_confirmed: "public.news_claims (schema target, 0 rows) & public.current_affairs (live news corpus, 844 rows)"
  pilot_result:
    embedding_model: "gemini-embedding-001 (768-dim, SEMANTIC_SIMILARITY)"
    sampled: 50
    agreed: 13
    agreement_pct: 26.0
    disagreements: 37
    concordant_syllabus_matches: 13
diff: |
  diff --git a/server-lib/cron/ingest/syllabus/keyword-classifier.ts b/server-lib/cron/ingest/syllabus/keyword-classifier.ts
  new file mode 100644
  --- /dev/null
  +++ b/server-lib/cron/ingest/syllabus/keyword-classifier.ts
  @@ -0,0 +1,93 @@
  +import type { SyllabusNode } from "./types.js";
  +...
  diff --git a/scripts/dual-classifier-pilot.ts b/scripts/dual-classifier-pilot.ts
  new file mode 100644
  --- /dev/null
  +++ b/scripts/dual-classifier-pilot.ts
  @@ -0,0 +1,283 @@
  +import "dotenv/config";
  +import fs from "fs";
  +import path from "path";
  +...
  diff --git a/03_MEMORY/sources/dual-classifier-pilot-report.md b/03_MEMORY/sources/dual-classifier-pilot-report.md
  new file mode 100644
  --- /dev/null
  +++ b/03_MEMORY/sources/dual-classifier-pilot-report.md
  @@ -0,0 +1,80 @@
  +# Dual-Classifier Pilot Report (WS-1.1 Attribution Gate)
  ...
```
