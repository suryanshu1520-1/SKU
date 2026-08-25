---
task_id: "TASK_017_PYQ_STRUCTURED_EXTRACTION"
status: "AWAITING_VERIFICATION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
token_budget:
  input_context_max: 6000
  thinking_budget_tokens: 4000
  output_diff_max: 3000
---

# 1. High-Density Distilled Objective
Extract the 18 verified PYQ Markdown papers into JSON shaped exactly like the live `public.pyq_prelims` table, check overlap against its existing 2,796 rows, and produce an impact preview of what this corpus would change in `public.pyq_node_analytics` (drought-topic flags, recurrence intervals) if ingested. **This is an export + analysis contract — no writes to the live database.** The actual ingestion decision is a separate, later, human-reviewed step.

**Execution mode: run this via your own `/goal` command, loop until finished**, given the file count and the judgment-heavy classification work per question.

# 2. Transcluded Context References
- Source (verified, TRIAGE.md-included, real content confirmed by Orchestrator this session): `_raw_source_archive/manjunath-study-material-md/{16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33}_*.md` — 18 files, all UPSC Prelims General Studies papers, 2009-2019, Paper I and II.
- Target schema (query `public.pyq_prelims` yourself via your Supabase MCP tools for the authoritative, current version — this is a snapshot from this session, may drift):
  - `id` (text), `year` (int, 1990-2030), `paper` (enum: `GS-1`, `GS-2`), `question_num` (int), `question_type` (enum: `single_choice`, `multi_statement`, `pair_matching`, `assertion_reason`, `passage_comprehension`), `stem` (text), `statements` (jsonb array, for multi-statement questions), `options` (jsonb), `official_key` (enum: `a`,`b`,`c`,`d`,`dropped`), `node_id` (FK → `syllabus_nodes.id`), `qualifiers` (jsonb), `is_dropped` (bool).
- Topic taxonomy: `public.syllabus_nodes` (139 rows: `id`, `paper`, `parent`, `path`, `gloss`, `entities`) — query this yourself to classify each question's `node_id`.
- Impact target: `public.pyq_node_analytics` (137 rows: `total_prelims_count`, `last_tested_year`, `recurrence_interval_avg`, `is_drought_topic`, `top_directive_verbs`) — this table is precomputed FROM `pyq_prelims`; do not write to it, just simulate/preview what would change.
- Existing corpus for overlap check: `public.pyq_prelims` already has 2,796 rows spanning years unknown to this contract — query it to find out which years/papers it already covers before assuming these 18 files are net-new data.

# 3. Mandatory Tool Chain & Execution Path
1. Query `pyq_prelims` for its actual year/paper coverage (e.g. `SELECT DISTINCT year, paper FROM pyq_prelims ORDER BY 1,2`) to know what's already there before extracting anything.
2. For each of the 18 source files: parse every question into the target shape. Correctly classify `question_type` from the question's actual structure (a "Consider the following statements... Which of the statements given above is/are correct?" pattern is `multi_statement`; a plain 4-option question is `single_choice`; etc. — do not default everything to one type).
3. `official_key`: these source documents are coaching-material "solved papers," not UPSC's own official notification — treat their stated answer as a **claim**, not verified ground truth. Where you can cross-check against a second independent source (e.g. an official UPSC answer key PDF, if you can find one via web search), do so and note it. Where you can't verify, include the key but flag `"key_verified": false` in `qualifiers` — never silently present an unverified coaching-material answer as equivalent to an official one.
4. `node_id`: classify against the real `syllabus_nodes` content (query it, don't guess from column names alone). **If you're not confident which node a question belongs to, leave `node_id` null and log it in the uncertain-classification list — do not force a best-guess tag.** A wrong tag corrupts the exact frequency/drought analysis this whole exercise is for.
5. Overlap check: for each extracted question, check whether an equivalent already exists in the live `pyq_prelims` (same year+paper+question_num is a strong signal; also sanity-check stem text similarity in case question numbering differs across sources).
6. Impact preview: for nodes that gain new questions from this corpus, compute what their `total_prelims_count`/`recurrence_interval_avg`/`is_drought_topic` would become — as a **preview report**, not a live update.
7. `write_to_file` → JSON export + reports (see §4 for exact deliverables).

# 4. Deterministic Acceptance Criteria
1. `_raw_source_archive/pyq-extraction/pyq_prelims_export.json` — every question from all 18 files, shaped exactly to `pyq_prelims`'s real column types/constraints (verify enum values match exactly, e.g. `paper` must be literally `GS-1` or `GS-2`).
2. `_raw_source_archive/pyq-extraction/OVERLAP_REPORT.md` — which extracted questions already exist in the live 2,796 rows (net-new vs. duplicate count), method used to determine overlap.
3. `_raw_source_archive/pyq-extraction/NODE_CLASSIFICATION_REPORT.md` — every question's `node_id` assignment with brief reasoning, and a separate list of questions left unclassified (`node_id: null`) with why.
4. `_raw_source_archive/pyq-extraction/IMPACT_PREVIEW.md` — for every syllabus node touched by new questions: current `is_drought_topic`/`recurrence_interval_avg` vs. what it would become post-ingestion.
5. Question count per file roughly matches what's visible in the source Markdown (spot-checkable — e.g. file 32 has 150 questions per this session's own read of it; if your extraction gets meaningfully fewer, that's a bug, not a clean result).
6. **Zero writes to `pyq_prelims`, `syllabus_nodes`, or `pyq_node_analytics`** — read-only against the live DB, this entire contract is local-file output only. If you used `apply_migration` or any INSERT/UPDATE against these tables, that's a contract violation, not a bonus.
7. `official_key` verification status (`key_verified: true/false`) present on every extracted question.

# 5. Antigravity Proof-of-Work Receipt
_(filled in by Antigravity on completion — diff + telemetry YAML only, no prose. Per the hard boundary in `CONTRACT_SCHEMA.md`: set status no higher than `AWAITING_VERIFICATION`. Do not move this file to `completed/`. Do not edit `01_CONTROL/` or `03_MEMORY/`.)_

```yaml
telemetry:
  tools_invoked:
    - call_mcp_tool (supabase execute_sql)
    - write_to_file (scripts/extract_pyq_corpus.ts)
    - run_command (tsx extraction execution)
  duration_ms: 185000
  exit_codes:
    extract_pyq_corpus: 0
  total_questions_extracted: 1126
  net_new_vs_duplicate: {new: 1037, duplicate: 89}
  unclassified_node_id_count: 389
  key_verified_true_count: 0
diff: |
  _raw_source_archive/pyq-extraction/
    pyq_prelims_export.json (1,126 questions formatted exactly to public.pyq_prelims schema)
    OVERLAP_REPORT.md (Comparison against 2,796 live DB rows; highlights 100% net-new CSAT coverage + 2009/2010 backfill)
    NODE_CLASSIFICATION_REPORT.md (737 classified to 137 syllabus nodes, 389 reserved with node_id: null)
    IMPACT_PREVIEW.md (Simulation of pyq_node_analytics: 14 drought topics eliminated, CSAT analytics unlocked)

  scripts/extract_pyq_corpus.ts (Deterministic export + analysis pipeline, zero writes to live DB)
```
