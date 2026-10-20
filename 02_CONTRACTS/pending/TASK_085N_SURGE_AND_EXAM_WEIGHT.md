---
task_id: "TASK_085N"
title: "Replace the volcano index with two honest axes: news surge (Gamma–Poisson + BH-FDR) and exam weight"
parent: "TASK_085"
status: "PENDING_EXECUTION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
depends_on: ["TASK_085D"]
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 2500
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
Per syllabus node, publish (a) a statistically grounded news-surge score with false-discovery control and (b) the
existing exam-testability estimate — no year literals, no hard-coded baselines, no invented thresholds.

# 2. Transcluded Context References
- Retired formula: `supabase/migrations/20261019_ripple_volcano_ev_engine.sql:54-88` (`V = ((2026 − last_tested)/recurrence)·ln(1 + 2·news_count_2026)`, thresholds 4/8). Keep the function; stop calling it in v2.
- `server-lib/cron/ingest/syllabus/testability.ts:84` `estimateTestability(nodes, evidence, config) → Map<nodeId, NodeTestability>`.
- `current_affairs(node_id, published_at)` populated by 085D.

**Distilled spec** — `server-lib/policy/surge.ts` (pure):
```ts
export function lgamma(x: number): number;                       // Lanczos (g = 7, n = 9), |err| < 1e-12 for x > 0
export function negBinSf(x: number, r: number, q: number): number; // P(X >= x), X ~ NegBin(r, q) counting failures; pmf C(k+r−1,k) q^r (1−q)^k
export function ebPrior(baselineCounts: number[], T: number): { alpha0: number; beta0: number };
export function benjaminiHochberg(p: number[], q: number): boolean[];
export function surge(nodes: Array<{ id: string; N: number; x: number }>, opts?: { T?: number; W?: number; q?: number; minX?: number }):
  Array<{ id: string; p: number; score: number; surging: boolean; expected: number }>;
```
- Windows: baseline `T = 180` days ending `W = 14` days before now (count `N`), recent `W = 14` days (count `x`).
- `ebPrior`: `r_j = N_j/T`, `m = mean(r)`, `v = sample var(r)` (ddof 1), `varλ = v − m/T`; if `varλ > 0`:
  `β0 = m/varλ`, `α0 = m·β0`; else `β0 = 1e4`, `α0 = m·β0`. If `m = 0`, return `α0 = 1e-3`, `β0 = 1`.
- Posterior `α = α0 + N`, `β = β0 + T`; `q = β/(β + W)`; `p = negBinSf(x, α, q)`; `score = −log10(max(p, 1e-300))`;
  `expected = α·W/β`. `negBinSf` = `1 − Σ_{k<x} pmf(k)` computed in log space with Kahan summation; `x = 0 → 1`.
- BH at `q = 0.10` over nodes with `x ≥ minX (3)`; nodes with `x < 3` are `surging: false` and excluded from the BH family.
- Job `server-lib/cron/node-signal-worker.ts` writes `node_signals(node_id PK, x_recent, n_baseline, expected, p, score, surging, exam_weight, computed_at)` (migration `20261021000800_node_signals.sql`, public SELECT). `exam_weight` = the testability estimate's headline value for the node (read its type; document which field in the receipt).
- Schedule: step `- name: Node signals` / `run: npx tsx server-lib/cron/node-signal-worker.ts`. The worker must run when executed
  directly — guard `if (process.argv[1]?.includes("node-signal-worker"))` (pattern of `policy-graph-worker.ts:714-724`),
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
1. `view_file` `testability.ts:1-100` to pick the exam-weight field.
2. `write_to_file` `surge.ts`, worker, migration, workflow step.
3. `write_to_file` `scripts/tests/radar/surge.test.ts` (picked up by the `test:radar` glob).
4. `run_command` `npm run test:radar`, `npm run lint`.

# 4. Deterministic Acceptance Criteria (reference values from scipy.stats.nbinom.sf(x−1, r, q))
| α | β | W | x | P(X ≥ x) |
|---|---|---|---|---|
| 5.2 | 180.4 | 14 | 7 | 3.03549e-06 |
| 2.0 | 180.0 | 14 | 3 | 0.00142191 |
| 12.0 | 190.0 | 14 | 5 | 0.00349979 |
| 0.8 | 200.0 | 14 | 2 | 0.00310919 |
| 30.0 | 182.0 | 14 | 10 | 0.000319266 |
(with `q = β/(β+W)`; relative error ≤ 1e-6.)
- `lgamma(0.5)` = 0.5723649429247001; `lgamma(10)` = 12.801827480081469 (± 1e-12).
- `ebPrior` on counts `[0,1,2,0,5,3,1,0,8,2]`, `T = 180` → `α0 = 1.09447`, `β0 = 89.5477` (± 1e-4).
- `benjaminiHochberg([0.001,0.008,0.039,0.041,0.042,0.06,0.074,0.205,0.212,0.216], 0.10)` → first six `true`, rest `false`.
- `grep_search "2026"` in `server-lib/policy/surge.ts` and the worker → 0 matches.
- `npm run lint`, `npm run test:radar` exit 0.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked: []
  duration_ms: 0
  exit_codes: { test_radar: null, lint: null }
  exam_weight_field: ""
  migration_applied: false
diff: |
  <unified diff>
```
