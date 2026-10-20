---
task_id: "TASK_085K"
title: "Expert gold set tooling + calibrated link model (ships only if it clears the precision gate)"
parent: "TASK_085"
status: "PENDING_EXECUTION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
depends_on: ["TASK_085J"]
human_gate: "G2 — the user labels the exported CSVs (≈ 3 hours: 300 pairs, 100 mentions, 60 events)"
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 6000
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
Turn expert judgement into a versioned asset: export labelling sheets, fit an L2 logistic link model with
out-of-fold validation, choose the threshold by a Wilson lower bound, and enable learned ripple edges only when the
gate passes. Also calibrate the resolver thresholds on the mention sheet.

# 2. Transcluded Context References
- `server-lib/policy/lineage.ts` (085J) — `Ev`, `compareEv`; `server-lib/policy/resolve.ts` (085G) — `resolve`, `jaroWinkler`, `tokenSetJaccard`.
- `server-lib/cron/ingest/embeddings.ts:145` `getEmbedder()`, `:32` `cosine`.

**Distilled spec**
1. `scripts/radar/export-labelling.ts` writes to `data/radar/gold/`:
   - `pairs.csv` (300 rows): candidate pairs from blocking (shared `actor_slug` or shared `node_id`, `date(f) ≤ date(e)`, ≤ 365 days, different programs), stratified 1/3 by each blocking reason plus 1/3 random different-program pairs; columns `pair_id, src_event, dst_event, src_summary, dst_summary, src_url, dst_url, label(1/0), edge_type, notes`.
   - `mentions.csv` (100): random actor mentions with resolver output; columns `mention, quote, proposed_slug, score, correct_slug, notes`.
   - `events.csv` (60): random stored events; columns `event_id, quote, instrument, correct_instrument, is_policy_event(1/0), notes`.
2. `server-lib/policy/link-features.ts`: `features(f, e, ctx): number[]` =
   `[x1 shared actor, x2 shared node_id, x3 Jaccard(entity sets), x4 cosine(event embeddings), x5 1[ring(e)-ring(f) ∈ {0,1}], x6 -log1p(days)/log(366), x7 explicit reference]`.
3. `server-lib/policy/logreg.ts` (pure): `fitLogReg(X, y, lambda) → { w, b, iterations }` by Newton/IRLS
   (`H = XᵀSX + λI` with intercept unpenalised, `S = diag(p(1−p))`, stop when `‖Δ‖∞ < 1e-8` or 50 iterations);
   `predict(w, b, x)`; `stratifiedKFold(y, k, seed)`; `wilsonLower(k, n, z = 1.959964)`.
4. `scripts/radar/fit-link-model.ts`: reads `pairs.csv`, 5-fold OOF predictions, picks `τ*` = smallest τ on the grid
   `0.50..0.99 step 0.01` with OOF precision ≥ 0.90 **and** `wilsonLower(TP, TP+FP) ≥ 0.80`; writes
   `server-lib/policy/link-model.json` `{ version, features, w, b, lambda, tau, metrics:{auc, brier, precision, recall, wilson_lb, n_pos, n_neg}, passed, trained_at, labels_sha256 }`. If no τ qualifies → `passed:false`, `tau:null`.
5. `scripts/radar/calibrate-resolver.ts`: from `mentions.csv`, choose `accept` on grid 0.86..0.99 and `margin` on 0.00..0.10 maximising recall subject to precision ≥ 0.98; write `server-lib/policy/resolver-config.json`.
6. Lineage worker: when `link-model.json.passed === true` **and** `RADAR_LINK_MODEL === '1'`, add `REFERENCES` edges
   (`anchor_kind='learned'`, `p`, `model_version`) for blocked candidates with `p ≥ tau` that also satisfy
   `date(f) ≤ date(e)` and (`x1 = 1` or `x2 = 1`).

# 3. Mandatory Tool Chain & Execution Path
1. `write_to_file` all modules/scripts; `run_command` `npx tsx scripts/radar/export-labelling.ts` (read-only DB).
2. **Stop. Set status `AWAITING_VERIFICATION` with note `BLOCKED_ON_G2`.** The Orchestrator resumes after labels exist.
3. After G2: `run_command` `npx tsx scripts/radar/fit-link-model.ts`, `npx tsx scripts/radar/calibrate-resolver.ts`.
4. `write_to_file` `scripts/tests/radar/logreg.test.ts` (picked up by the `test:radar` glob); `run_command` `npm run test:radar`, `npm run lint`.

# 4. Deterministic Acceptance Criteria (reference values computed independently)
- `wilsonLower(27, 30)` = 0.7438 ± 1e-4; `(45, 50)` = 0.7864; `(9, 10)` = 0.5958; `(90, 100)` = 0.8256.
- IRLS recovery: 20,000 synthetic rows (seeded PRNG), `x ~ N(0, I₃)`, true `w = [1.5, −2.0, 0.5]`, `b = −0.3`, `λ = 1e-6` → every recovered parameter within ±0.12 of truth; converges in ≤ 10 iterations. (Checked: across 200 seeds at n = 4,000 the worst error was 0.17 and the worst iteration count 7; n = 20,000 halves the error.)
- With a perfectly separable toy set and `λ = 1.0`, weights stay finite (no divergence).
- `link-model.json` and `resolver-config.json` validate against their TS types; learned edges are impossible when `passed:false` (unit test on the worker's guard).
- `npm run lint`, `npm run test:radar` exit 0.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked: []
  duration_ms: 0
  exit_codes: { test_radar: null, lint: null }
  gold_export: { pairs: 0, mentions: 0, events: 0 }
  link_model: { passed: null, tau: null, precision: null, wilson_lb: null }
  resolver: { accept: null, margin: null, precision: null, recall: null }
diff: |
  <unified diff>
```
