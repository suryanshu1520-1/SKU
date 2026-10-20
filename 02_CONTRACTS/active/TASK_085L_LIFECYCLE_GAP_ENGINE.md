---
task_id: "TASK_085L"
title: "Lifecycle gap engine: what has not yet been seen, with Kaplan–Meier timing"
parent: "TASK_085"
status: "AWAITING_VERIFICATION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
depends_on: ["TASK_085J"]
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 2500
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
For each program, compute its last observed lifecycle stage, the next expected stage, and an honest timing
statement learned from history — phrased as "not yet seen in the sources Tark tracks", always with its sample size.

# 2. Transcluded Context References
- `policy_programs(kind)`, `policy_events(program_slug, instrument, event_date, is_public)` — 085H.

**Distilled spec**
1. Config `server-lib/policy/lifecycle-templates.ts`:
   ```ts
   export const TEMPLATES: Record<ProgramKind, InstrumentClass[]> = {
     act: ['bill_introduced','bill_passed','act_assented','commencement_or_entry_into_force','rules_notified','guidelines_issued'],
     bill: ['bill_introduced','bill_passed','act_assented'],
     scheme: ['cabinet_approval','guidelines_issued','funds_released','state_rollout'],
     mission: ['cabinet_approval','guidelines_issued','funds_released','project_commissioned'],
     treaty: ['treaty_signed','commencement_or_entry_into_force','regulation_issued'],
     regulation: ['regulation_issued','commencement_or_entry_into_force'],
     policy: ['cabinet_approval','guidelines_issued'],
   };
   ```
2. `server-lib/policy/lifecycle.ts` (pure):
   ```ts
   export type Obs = { duration: number; event: boolean };            // event=false ⇒ right-censored
   export function kaplanMeier(obs: Obs[]): Array<{ t: number; S: number; atRisk: number; events: number }>;
   export function quantileTime(curve, q: number): number | null;     // first t with S(t) <= q, else null
   export function transitionSamples(programs, events, kind, from, to, today): Obs[];
   export function programGap(program, events, stats, today): Gap;
   export type Gap = { lastStage: InstrumentClass|null; lastDate: string|null; nextStage: InstrumentClass|null;
     elapsedDays: number|null; nObserved: number; medianDays: number|null; q25Days: number|null;
     status: 'complete'|'on_track'|'longer_than_usual'|'no_estimate'|'not_applicable'; sentence: string };
   ```
   - Stage of a program = the furthest template index among its public events. Transition samples for
     `(from → to)`: programs that reached `from`; `duration` = days to the first `to` event (`event:true`) or, if
     none yet, days from `from` to `today` (`event:false`).
   - KM: `S(t) = Π_{tᵢ ≤ t} (1 − dᵢ/nᵢ)` over distinct event times; censored observations leave the risk set after their time.
   - Status: last template stage → `complete`; `nObserved < 8` → `no_estimate`; `elapsed > q25Days` (first t with S ≤ 0.25) → `longer_than_usual`; else `on_track`; programs with `kind` absent from TEMPLATES → `not_applicable`.
   - Sentences (exact templates, English):
     `no_estimate`: "Next stage ({next}) not yet seen in the sources Tark tracks. Not enough history to estimate timing (n = {n})."
     `on_track`: "Next stage ({next}) not yet seen in the sources Tark tracks. Typically follows in about {median} days (n = {n})."
     `longer_than_usual`: "Next stage ({next}) not yet seen in the sources Tark tracks, {elapsed} days on. That is longer than 75% of past cases (n = {n})."
3. Daily job writes `program_gaps(program_slug PK, gap JSONB, computed_at)` (migration `20261021000600_program_gaps.sql`, public SELECT).
4. Schedule: step `- name: Lifecycle gaps` / `run: npx tsx server-lib/cron/policy-gap-worker.ts`. The worker must run when executed
   directly — guard `if (process.argv[1]?.includes("policy-gap-worker"))` (pattern of `policy-graph-worker.ts:714-724`),
   `process.exit(0)` on success, `process.exit(1)` on error.
   If `.github/workflows/radar-daily.yml` does not exist, create it exactly as below, then add your step under the
   marker in the stated order (gaps 085L → node signals 085N → boss MCQs 085O → eval 085R):
   ```yaml
   name: Radar Daily
   on:
     schedule:
       - cron: '0 3 * * *'   # after the 02:30 UTC ingest run
     workflow_dispatch:
   jobs:
     radar:
       runs-on: ubuntu-latest
       timeout-minutes: 30
       env:
         SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
         SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
         GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
         GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
         RADAR_V2_SINCE: ${{ vars.RADAR_V2_SINCE }}
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: '22', cache: 'npm' }
         - run: npm ci
         # --- radar steps (order: gaps, node signals, boss MCQs, eval) ---
   ```

# 3. Mandatory Tool Chain & Execution Path
1. `write_to_file` templates, `lifecycle.ts`, migration, job `server-lib/cron/policy-gap-worker.ts`, and the workflow step (spec 4).
2. `write_to_file` `scripts/tests/radar/lifecycle.test.ts` (picked up by the `test:radar` glob).
3. `run_command` `npm run test:radar`, `npm run lint`.

# 4. Deterministic Acceptance Criteria (reference values computed independently)
- KM on durations `[30,45,60c,60,90,120c,150,200,210c,365]` (c = censored) gives
  `S = 0.9, 0.8, 0.7, 0.5833, 0.4375, 0.2917, 0.0` at `t = 30, 45, 60, 90, 150, 200, 365` (± 1e-4);
  `quantileTime(·, 0.5) = 150`; `quantileTime(·, 0.25) = 365`.
- A program at `act_assented` with 3 observations → `no_estimate`, sentence contains "(n = 3)".
- `nObserved` counts uncensored observations only. The fixture above has 7 → `no_estimate`. Adding an observed
  duration of 20 days (n_observed = 8) gives `S = 0.9091, 0.8182, 0.7273, 0.6364, 0.5303, 0.3977, 0.2652, 0.0` at
  `t = 20, 30, 45, 60, 90, 150, 200, 365`, median 150, `q25 = 365`; a program sitting 400 days → `longer_than_usual`,
  one sitting 100 days → `on_track` with "about 150 days (n = 8)".
- Ties: an observation censored at time t is still at risk at t (events processed before censorings).
- No sentence contains the words "pending", "delayed", "failed" or "not done" (string test).
- `npm run lint`, `npm run test:radar` exit 0.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked: ["write_to_file", "replace_file_content", "run_command"]
  duration_ms: 8500
  exit_codes: { test_radar: 0, lint: 0 }
  migration_applied: false
```
