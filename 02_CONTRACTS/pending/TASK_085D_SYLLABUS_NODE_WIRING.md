---
task_id: "TASK_085D"
title: "Wire syllabus node_id into current_affairs at ingest + backfill"
parent: "TASK_085"
status: "PENDING_EXECUTION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
depends_on: ["TASK_085A"]
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 2000
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
Every relevant brief stores its primary syllabus node in `current_affairs.node_id` (0 of the latest 400 do today),
using the existing deterministic keyword classifier — no LLM.

# 2. Transcluded Context References
- `server-lib/cron/ingest/syllabus/keyword-classifier.ts:49-113` — `keywordClassify(text, nodes, cfg?) → KeywordGateResult` (read the result type at `:13-30`).
- `server-lib/cron/ingest/syllabus/nodes.ts:478-490` — `loadNodes()`, `nodeById()`. Example ids: `GS3.ECO.TRADE`, `GS3.ECO.BANKING`, `GS3.ECO.MONETARY`, `GS2.IR.BILATERAL`.
- `supabase/migrations/20261019_ripple_volcano_ev_engine.sql:5-10` — `current_affairs.node_id TEXT REFERENCES syllabus_nodes(id)` already exists.
- `server-lib/cron/db.ts:40-70` — `upsertCurrentAffairs` row builder; `orchestrator.ts:484-516` — summary + upsert.

**Distilled spec**
1. New `server-lib/policy/node-assign.ts`:
   ```ts
   export function assignNode(input: { headline: string; bullets: string[]; tags: string[] }):
     { nodeId: string | null; score: number; runnerUp: string | null }
   ```
   Classify the concatenation `headline + bullets + tags` (English; the synthesis output is English). Return the top
   match only if the classifier marks it as passing; else `nodeId: null`.
2. `upsertCurrentAffairs` accepts optional `node_id`; orchestrator passes `assignNode(...)`.nodeId.
3. Guard: if `nodeById(nodeId)` is undefined (id not in the DB taxonomy), store `null` and log once — never violate the FK.
4. Backfill `scripts/radar/backfill-node-id.ts` (dry-run default, `--apply`): rows with `node_id IS NULL`, using
   `headline`, `summary.bullets`, `summary.tags`. Print `{scanned, assigned, unassigned, by_node: top10}`.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` the slices in §2.
2. `write_to_file` `server-lib/policy/node-assign.ts`, backfill script.
3. `multi_replace_file_content` `db.ts`, `orchestrator.ts`.
4. `write_to_file` `scripts/tests/radar/node-assign.test.ts` (picked up by the `test:radar` glob).
5. `run_command` `npm run test:radar`, `npm run lint`.

# 4. Deterministic Acceptance Criteria
- Test fixtures (assert the stated node or its parent prefix):
  - "India-New Zealand Free Trade Agreement to take effect on October 20, 2026, unlocking new export opportunities." → `GS3.ECO.TRADE`
  - "Directions under Section 35A read with Section 56 of the Banking Regulation Act, 1949 – The Konark Urban Co-operative Bank" → `GS3.ECO.BANKING`
  - "India and Saudi Arabia Discuss Bilateral Power Interconnection Initiative" → prefix `GS2.IR`
  - A ceremony headline ("Union Minister pays floral tributes …") → `nodeId: null`
  If the classifier disagrees on a fixture, report it in the receipt instead of editing the classifier.
- `npm run lint`, `npm run test:radar` exit 0.
- *Orchestrator post-deploy:* after backfill `--apply`, ≥ 95 % of rows with `summary.grounding IS NOT NULL` from the last 30 days have `node_id`.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked: []
  duration_ms: 0
  exit_codes: { test_radar: null, lint: null }
  fixture_disagreements: []
diff: |
  <unified diff>
```
