---
task_id: "TASK_085R"
title: "Eval harness, radar_eval_runs and the kill switch: the radar is public only while it measurably passes"
parent: "TASK_085"
status: "PENDING_EXECUTION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
depends_on: ["TASK_085J", "TASK_085K", "TASK_085O", "TASK_085P"]
human_gate: "G4 — the user reviews the first passing run and sets RADAR_PUBLIC=1 in Vercel"
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 2500
  output_diff_max: 3500
---

# 1. High-Density Distilled Objective
Compute every quality gate of the epic from live tables and human-labelled sheets, store each run, and make the public
API serve the radar only when `RADAR_PUBLIC=1` **and** the latest run (≤ 8 days old) passed. A metric with no
evidence counts as failing.

# 2. Transcluded Context References
- Gates (master §8): items without `{source_url, quote}` = 0; PIB non-fallback ministry (latest 200) ≥ 0.90; passing rows with `node_id` ≥ 0.95; event precision (50-event audit) ≥ 0.90; instrument accuracy (60 labelled) ≥ 0.85; resolver precision ≥ 0.98 and recall ≥ 0.85 (100 mentions); ordering errors on fixtures = 0; learned edges (only if `link-model.json.passed`) precision ≥ 0.90 and Wilson LB ≥ 0.80; `graph_status='pending'` with `created_at ≥ RADAR_V2_SINCE` and older than 48 h = 0 (`RADAR_V2_SINCE` unset ⇒ `missing`); boss-MCQ dissection entries with evidence or operator = 100 %.
- Inputs: `data/radar/gold/events.csv`, `mentions.csv` (085K export, user-labelled), `server-lib/policy/link-model.json`, `server-lib/policy/resolve.ts`, ordering check = run `npx tsx --test scripts/tests/radar/lineage.test.ts` from `eval.ts` (exit 0 ⇒ 0 ordering errors; the 085J fixtures live inside that test file), `server-lib/policy/logreg.ts` `wilsonLower`.
- `server-lib/policy/radar-flags.ts` `isRadarPublic()` (085P: env only).
- Workflows: `.github/workflows/scraper.yml` (cron `30 2,10,16 * * *`, secrets `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`); `.github/workflows/ci.yml` runs `npm test`.

**Distilled spec**
1. Migration `20261021000900_radar_eval_runs.sql`: `radar_eval_runs(id BIGSERIAL PK, run_at TIMESTAMPTZ DEFAULT now(), git_sha TEXT, metrics JSONB NOT NULL, thresholds JSONB NOT NULL, passed BOOLEAN NOT NULL, failing TEXT[] NOT NULL DEFAULT '{}')`; RLS: public SELECT of `run_at, passed, failing` only via view `radar_eval_status_v`; writes service-role.
2. `server-lib/policy/radar-thresholds.json` — the numbers above, plus `audit_max_age_days: 35`, `run_max_age_days: 8`.
3. Pure `server-lib/policy/radar-eval.ts`:
   ```ts
   export type Metric = { key: string; value: number|null; n: number|null; threshold: number; op: '>='|'<='|'=='; status: 'pass'|'fail'|'missing'|'skipped'; wilson_lb?: number };
   export function evaluate(inputs: EvalInputs, t: Thresholds, today: string): { metrics: Metric[]; passed: boolean; failing: string[] };
   ```
   - `missing` (no input, or audit file older than `audit_max_age_days`) counts as failing. `skipped` only for learned edges when `link-model.json.passed !== true` (they are then not served).
   - Event precision from the newest **fully labelled** `data/radar/gold/audit-<YYYY-MM-DD>.csv` (every row has `is_policy_event`, `actor_correct`, `date_correct` filled; unlabelled exports are ignored): a row is correct iff `is_policy_event=1 ∧ actor_correct=1 ∧ date_correct=1 ∧ (program_correct=1 ∨ program blank)`; report `value = correct/n` and `wilson_lb`.
   - Resolver: run `resolve()` with `resolver-config.json` over `mentions.csv`; precision over accepted, recall over mentions with a non-empty `correct_slug`.
4. `scripts/radar/export-audit.ts` → writes `data/radar/gold/audit-<YYYY-MM-DD>.csv` (today's date): 50 public events from the last 30 days, sampled with `mulberry32(fnv1a(date))` from `server-lib/policy/prng.ts` (085O), CSV columns `event_id, event_date, instrument, actor, program, quote, source_url, is_policy_event, actor_correct, program_correct, date_correct, notes` (last five blank).
5. `scripts/radar/eval.ts [--write]`: gathers inputs (service-role, read-only queries), runs `evaluate`, prints a table, inserts a row when `--write`. Exit 0 when the run is recorded (pass or fail is data, not a crash); exit 1 only on errors.
6. `isRadarPublic(): Promise<boolean>` (signature from 085P, unchanged) → `env RADAR_PUBLIC === '1'` ∧ latest `radar_eval_runs` row has `passed` ∧ `run_at ≥ now − run_max_age_days`; cached in memory 10 min; DB error ⇒ `false`.
7. Add the last step to `.github/workflows/radar-daily.yml` (created by 085L/085N): `- name: Radar eval` / `run: npx tsx scripts/radar/eval.ts --write`. `package.json` `"test"` gains `&& npm run test:radar` so CI enforces the radar suite.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` `server-lib/policy/radar-flags.ts`, `package.json` scripts.
2. `write_to_file` migration, thresholds, `radar-eval.ts`, both scripts, workflow step; `multi_replace_file_content` `radar-flags.ts`, `package.json`.
3. `write_to_file` `scripts/tests/radar/radar-eval.test.ts` (picked up by the `test:radar` glob).
4. `run_command` `npm run test:radar`, `npm run lint`, `npx tsx scripts/radar/export-audit.ts` (read-only).
5. Stop at `AWAITING_VERIFICATION`; G4 happens after the user labels the audit sheet.

# 4. Deterministic Acceptance Criteria
- `evaluate` on fixtures: audit 46/50 correct → `value 0.92`, `pass`, `wilson_lb` = 0.8116 ± 1e-4; 44/50 → `0.88`, `fail`; no audit file → `missing` and `passed: false` with `failing` containing `event_precision`; audit dated 36 days before `today` → `missing`.
- Learned-edge metric is `skipped` (not failing) when `link-model.json.passed` is false, `fail` when the model passed but live precision < 0.90.
- `await isRadarPublic()`: env unset → false; env set + latest run passed 2 days ago → true; passed 9 days ago → false; latest run failed → false; DB throws → false (mocked client).
- `npm test` runs `test:radar` (string check on `package.json`).
- `npm run lint`, `npm run test:radar` exit 0; audit CSV has 50 rows (or all events if fewer, count in receipt).

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked: []
  duration_ms: 0
  exit_codes: { test_radar: null, lint: null, export_audit: null }
  audit_rows: 0
  migration_applied: false
diff: |
  <unified diff>
```
