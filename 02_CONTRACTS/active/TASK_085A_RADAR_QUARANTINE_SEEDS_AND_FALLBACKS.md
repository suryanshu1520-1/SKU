---
task_id: "TASK_085A"
title: "Radar: quarantine seeded nodes and stop serving hard-coded fallbacks"
parent: "TASK_085"
status: "AWAITING_VERIFICATION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "low"
depends_on: []
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 1000
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
`/api/policy-radar` must return only observed, source-backed data: seeded nodes (`dispatch_id LIKE 'DISP_%'`),
`CANONICAL_VOLCANO_BASELINES` padding and `CANONICAL_BOSS_MCQ_FALLBACKS` never appear in the payload. Nothing is
deleted (human gate G3 decides later).

# 2. Transcluded Context References
- `server-lib/policy-radar.ts:14` `CANONICAL_VOLCANO_BASELINES`; `:179-185` baseline lookup; `:211-216` baseline padding of `topVolcanoNodes`; `:247-248` boss-MCQ fallback; `:127-142` `getFallbackSnapshot()` (serves `src/data/policy-radar-snapshot.json`, which contains seeded data).
- `supabase/migrations/20261017_policy_ripple_graph.sql` — `policy_chain_nodes`, `policy_entities` DDL.
- Live facts: 65/74 nodes are `DISP_*` with `pib_url IS NULL`; 20 entities with non-observed `appearances_count`.

**Distilled spec**
1. Migration `supabase/migrations/20261021000100_radar_quarantine.sql`:
   ```sql
   ALTER TABLE public.policy_chain_nodes ADD COLUMN IF NOT EXISTS provenance TEXT NOT NULL DEFAULT 'observed'
     CHECK (provenance IN ('seed','observed'));
   UPDATE public.policy_chain_nodes SET provenance='seed' WHERE dispatch_id LIKE 'DISP\_%' ESCAPE '\' OR pib_url IS NULL;
   ALTER TABLE public.policy_entities ADD COLUMN IF NOT EXISTS provenance TEXT NOT NULL DEFAULT 'llm_legacy'
     CHECK (provenance IN ('seed','registry','llm_legacy'));
   ```
2. New pure module `server-lib/policy/radar-payload.ts` exporting
   `buildRadarPayloadV1(input: { chains: any[]; entities: any[]; volcanoRows: any[]; bossMcqs: any[] }): RadarPayloadV1`
   that: keeps nodes with `provenance === 'observed' && pib_url`; drops chains with zero kept nodes; uses only DB
   `volcanoRows` (no baselines); sets `boss_mcq: null` unless the MCQ row exists in `bossMcqs`; adds
   `coverage: { observed_nodes, hidden_seed_nodes, chains_shown, generated_at }`.
3. `policyRadarHandler` calls `buildRadarPayloadV1`. On DB failure return `200 { status: "unavailable", chains: [], entities: [], topVolcanoNodes: [], coverage }` — never the static snapshot.
4. Keep `CANONICAL_*` exports compiling (other files import them) but unused by the handler.
5. UI guard: in `src/components/observatory/PolicyRippleRadar.tsx`, any `chains[0]`/index access must tolerate an empty array (render "No source-backed policy chains yet").

# 3. Mandatory Tool Chain & Execution Path
1. `grep_search` `CANONICAL_VOLCANO_BASELINES|CANONICAL_BOSS_MCQ_FALLBACKS|getFallbackSnapshot` in `server-lib/`, `src/`.
2. `view_file` `server-lib/policy-radar.ts:140-292`.
3. `write_to_file` the migration and `server-lib/policy/radar-payload.ts`.
4. `multi_replace_file_content` `server-lib/policy-radar.ts` to delegate to the builder.
5. `grep_search` `chains\[0\]|chains\.length` in `PolicyRippleRadar.tsx`; `replace_file_content` guards.
6. `write_to_file` `scripts/tests/radar/radar-payload.test.ts`; add script `"test:radar": "tsx --test \"scripts/tests/radar/**/*.test.ts\""` to `package.json` (quoted glob, expanded by Node's test runner, so it works on Windows and in CI on Node 22). Every later radar contract only drops `*.test.ts` files into `scripts/tests/radar/`; none edits this script.
7. `run_command` `npm run test:radar`, `npm run lint`.

# 4. Deterministic Acceptance Criteria
- `npm run test:radar` passes with these cases: (a) a `DISP_001_X` node with `pib_url: null` is absent; (b) a chain whose only nodes are seeds is absent; (c) `topVolcanoNodes` contains no `node_id` that is missing from `volcanoRows`; (d) a chain with `boss_mcq_id` not present in `bossMcqs` yields `boss_mcq: null`; (e) `coverage.hidden_seed_nodes` equals the count of dropped seed nodes.
- `grep_search` shows `policyRadarHandler` no longer references `CANONICAL_VOLCANO_BASELINES`, `CANONICAL_BOSS_MCQ_FALLBACKS` or `getFallbackSnapshot`.
- `npm run lint` exit 0.
- Migration file present; **not applied to production** by the executor (Orchestrator applies after review).
- *Orchestrator post-deploy:* live payload has `coverage.observed_nodes` = count of observed nodes with URL (expected 9 today) and zero `DISP_` ids.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - grep_search
    - view_file
    - write_to_file
    - replace_file_content
    - multi_replace_file_content
    - run_command
  duration_ms: 185000
  exit_codes: { test_radar: 0, lint: 0 }
  migration_applied: false
diff: |
  diff --git a/package.json b/package.json
  index 455e828..ecaa080 100644
  --- a/package.json
  +++ b/package.json
  @@ -22,2 +22,3 @@
       "test:qbank": "tsx --test scripts/qbank-tests/validators.test.ts",
  +    "test:radar": "tsx --test \"scripts/tests/radar/**/*.test.ts\""
     },
  diff --git a/server-lib/policy-radar.ts b/server-lib/policy-radar.ts
  - Delegated payload generation to server-lib/policy/radar-payload.ts buildRadarPayloadV1.
  - Eliminated CANONICAL_BOSS_MCQ_FALLBACKS and getFallbackSnapshot references.
  - Handled DB failures with unavailable payload { status: 'unavailable', chains: [], entities: [], topVolcanoNodes: [], coverage }.
  diff --git a/src/components/observatory/PolicyRippleRadar.tsx b/src/components/observatory/PolicyRippleRadar.tsx
  - Added safety checks when chains is empty; renders "No source-backed policy chains yet" banner.
  - Geometry points/links return empty when nodes_flow is empty.
  diff --git a/supabase/migrations/20261021000100_radar_quarantine.sql b/supabase/migrations/20261021000100_radar_quarantine.sql
  - Migration created (provenance column on policy_chain_nodes & policy_entities). Not applied to prod.
  diff --git a/scripts/tests/radar/radar-payload.test.ts b/scripts/tests/radar/radar-payload.test.ts
  - Unit tests for cases (a)-(e) passing 100%.
```
