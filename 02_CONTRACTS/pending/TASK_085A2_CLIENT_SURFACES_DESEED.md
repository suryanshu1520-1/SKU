---
task_id: "TASK_085A2"
title: "Remove client-side seeded radar logic from every feed surface (regex chain links, fixed volcano numbers, bundled snapshot)"
parent: "TASK_085"
status: "PENDING_EXECUTION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "low"
depends_on: ["TASK_085A"]
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 1500
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
085A stops the **server** from serving seeds. The **client** has its own copy and shows it on every brief. Remove it:
a feed card must show a policy chain, a resurgence number or an authority tier only when the server sent it for that
item. Until 085P/085Q ship, those blocks render nothing.

# 2. Transcluded Context References (verified 2026-10-20)
- `src/lib/policy-ripple-radar-shared.ts` (single module behind all of it):
  - `:24` `CANONICAL_VOLCANO_BASELINES` — fixed numbers, e.g. `GS2.IR.BILATERAL: last_tested_year 2014, years_dormant 12, news_count_2026 15, volcano_index 28.53, 'ERUPTING'`.
  - `:241` `matchDispatchToPolicyChain(headline, ministry, summary, explicitChainId)` — keyword regex → one of 15 hand-made chains (e.g. `/\b(vrrr|liquidity|rbi|repo|inflation target|forex)\b/` → `CHAIN_05_MONETARY_LIQUIDITY_CORRIDOR`).
  - `:297` `getVolcanoTelemetryForNode(nodeId, headline, ministry)` — regex on headline (`/\b(bilateral|quad|…|free trade agreement|fta|…)\b/` → `GS2.IR.BILATERAL`), and for anything else returns a made-up record `{ last_tested_year: 2024, years_dormant: 2, recurrence_interval_avg: 2.5 }`.
  - `:137` `CANONICAL_5_TIER_ENTITIES` (9 hand-written rows) + `:340` `getPolicyEntityForText` (alias regex over free text).
  - `:386` client copy of `CANONICAL_BOSS_MCQ_FALLBACKS`; `:518` `getBossMcqForChain`.
- Consumers: `src/components/CurrentAffairs.tsx:1015-1016`, `src/components/PolicyBrief.tsx:63-65` (renders "Policy chain … Explore policy chain" at `:250-262` and "{years_dormant} years since last tested · Volcano index" at `:265-271`), `src/components/DailyEdition.tsx:343-344`, `src/components/DiagnosticPreview.tsx:757`, `src/components/Observatory.tsx:36-39, 762, 777, 841, 877, 889, 1830`.
- `src/components/observatory/PolicyRippleRadar.tsx:17` `import SNAPSHOT from '../../data/policy-radar-snapshot.json'`; `:47-71, :108` fall back to `SNAPSHOT` → `CHAINS` → `ENTITIES` from `policy-ripple-data.ts:51, 275` (hand-made); `Observatory.tsx:841, 877, 889` badge "`{CANONICAL_RIPPLE_CHAINS.length}` chains · 5 legal tiers" counts the static array.
- `scripts/seed-policy-ripple-graph.ts` (616 lines) — the script that wrote the `DISP_*` seeds (A1) and the snapshot.

**Distilled spec**
1. `policy-ripple-radar-shared.ts`:
   - `getVolcanoTelemetryForNode(...)` → `return null` (delete baselines, regex and the default object). Keep the exported type.
   - `matchDispatchToPolicyChain(...)` → `return null` (delete regex branch and static lookup). Keep the signature; 085Q2 replaces the call sites.
   - `getPolicyEntityForText(text, entitySlugs)` → match by `entitySlugs` only; delete the free-text alias loop.
   - `getBossMcqForChain(chain)` → return `chain.boss_mcq` only if it has `statement_dissection` (server-built); else `null`. Delete the client `CANONICAL_BOSS_MCQ_FALLBACKS` and `CANONICAL_VOLCANO_BASELINES` exports.
2. `PolicyRippleRadar.tsx`: delete the `SNAPSHOT` import and the `CHAINS`/`ENTITIES` fallbacks; initial state `[]`; states `loading` → `empty` ("No source-backed policy chains yet") → `ready`; never index `chains[0]` without a length check.
3. `Observatory.tsx`: badge and announcement text use the live count from `/api/policy-radar` (`chains.length`), hidden while loading or when 0; drop "5 legal tiers"; the volcano list (`:762`) and the `erupting/heating` filter render only when telemetry is non-null (they will be hidden until 085Q).
4. `git mv src/data/policy-radar-snapshot.json scripts/tests/fixtures/radar/legacy-snapshot.json`. Move the data arrays `CHAINS` and `ENTITIES` out of `policy-ripple-data.ts` into `scripts/tests/fixtures/radar/legacy-chains.ts` (cut, not copy); `git mv` the remainder (interfaces + `TIERS`) to `src/components/observatory/policy-ripple-types.ts` and update imports.
5. `git mv scripts/seed-policy-ripple-graph.ts scripts/legacy/seed-policy-ripple-graph.ts`; first statement of `seedPolicyRippleGraph()` (`:530`, the entry point) exits with code 2 and the message `synthetic seed disabled (TASK_085A2)` unless `RADAR_ALLOW_SYNTHETIC_SEED === '1'`; update its snapshot path to the fixture.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` `policy-ripple-radar-shared.ts:230-360, 510-527`; `multi_replace_file_content` per spec 1.
2. `view_file` `PolicyRippleRadar.tsx:40-110`; `multi_replace_file_content` per spec 2. Same for `Observatory.tsx` lines listed.
3. `run_command` the `git mv`s (spec 4–5); `grep_search` for broken imports and fix.
4. `write_to_file` `scripts/tests/radar/client-deseed.test.ts` (picked up by the `test:radar` glob).
5. `run_command` `npm run lint`, `npm run test:radar`, `npm run build`.

# 4. Deterministic Acceptance Criteria
- `getVolcanoTelemetryForNode('GS2.IR.BILATERAL', 'India–New Zealand free trade agreement', 'Ministry of Commerce and Industry')` → `null`.
- `matchDispatchToPolicyChain('RBI keeps repo rate unchanged', 'RBI', '', undefined)` → `null`.
- `getPolicyEntityForText('India Semiconductor Mission chip fab', [])` → `null`; with a slug present in the module → that row.
- `grep_search` in `src/` for `CANONICAL_VOLCANO_BASELINES|CANONICAL_RIPPLE_CHAINS|CANONICAL_BOSS_MCQ_FALLBACKS|policy-radar-snapshot` → 0 matches.
- `npm run build` output contains no `policy-radar-snapshot` chunk (`grep -r "CHAIN_05_MONETARY" dist/` → 0).
- `npx tsx scripts/legacy/seed-policy-ripple-graph.ts` exits 2 without touching the network.
- `npm run lint`, `npm run test:radar`, `npm run build` exit 0.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked: []
  duration_ms: 0
  exit_codes: { lint: null, test_radar: null, build: null, legacy_seed: null }
  grep_hits_src: null
diff: |
  <unified diff>
```
