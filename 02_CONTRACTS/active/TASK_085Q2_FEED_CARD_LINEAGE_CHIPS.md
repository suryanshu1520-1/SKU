---
task_id: "TASK_085Q2"
title: "Feed cards and diagnostics read lineage, surge and authority tiers from API v2 (replaces client regex)"
parent: "TASK_085"
status: "AWAITING_VERIFICATION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
depends_on: ["TASK_085A2", "TASK_085P", "TASK_085Q"]
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 2500
  output_diff_max: 3500
---

# 1. High-Density Distilled Objective
Bring the "Policy chain" and "Topic resurgence" blocks back to the news surfaces, now driven by data: a brief shows a
lineage chip only if one of its own verified events belongs to a program, and a surge note only if its syllabus node
passed the false-discovery test.

# 2. Transcluded Context References
- Call sites emptied by 085A2 (signatures kept, return `null`): `src/components/CurrentAffairs.tsx:1015-1016`,
  `src/components/PolicyBrief.tsx:63-65` (blocks at `:211`, `:250-262`, `:265-271`), `src/components/DailyEdition.tsx:343-344`,
  `src/components/DiagnosticPreview.tsx:757` (`getPolicyEntityForText`, renders "5-Tier Authority").
- API v2 (085P): `GET /api/policy-radar/v2/by-dispatch?ids=` → `Record<dispatch_id, { program_slug, program_name, ring, instrument, gap_sentence, evidence }>` (≤ 50 ids); `GET /api/policy-radar/v2` → `node_signals[]` (`node_id, x_recent, expected, surging, exam_weight`); `GET /api/policy-radar/v2/authorities?slugs=` (≤ 20).
- Labels/links: `radar-v2/labels.ts` (`RING_LABEL`, `INSTRUMENT_LABEL`), `radar-v2/sourceLink.ts` (`sourceHref`) from 085Q.

**Distilled spec**
1. `src/lib/radar-v2-client.ts` (no React):
   - `createBatcher<K, V>(fetchMany: (keys: K[]) => Promise<Record<string, V>>, { max: 50, waitMs: 25 })` — coalesces `get(key)` calls made in the same tick window into one request per ≤ 50 keys; caches results (including "absent") for the page lifetime; dedupes in-flight keys.
   - `getDispatchLineage(id)` via the batcher on `/by-dispatch`; `getNodeSignals()` = single memoised fetch of `/api/policy-radar/v2` mapped to `Map<node_id, NodeSignal>`; `getAuthorities(slugs)` via a second batcher (max 20).
   - Any non-`ok`/`stale` status or network error → resolves to "absent" (never throws into render).
2. Hooks `src/components/radar/useRadarV2.ts` (repo convention: hooks live beside their components, e.g. `src/components/exam/useExamSession.ts`): `useDispatchLineage(id?: string)`, `useNodeSignal(nodeId?: string)`, `useAuthority(slugs?: string[])` — return `undefined` while loading, `null` when absent.
3. Surfaces:
   - `PolicyBrief.tsx`: "Policy lineage" block = `{program_name}` · `{INSTRUMENT_LABEL[instrument]}` ({`RING_LABEL[ring]`}) · `gap_sentence` (verbatim, if present) · source chip · link "Open in Policy Radar" → `/observatory?tab=ripple&program={slug}`. "Topic resurgence" block only if `signal.surging`: text "{x_recent} items in the last 14 days vs {expected.toFixed(1)} expected for this syllabus node" + "Exam weight {exam_weight formatted as in 085N receipt}". Disclosure preview text ("Policy chain & study focus") switches on the new lineage value.
   - `CurrentAffairs.tsx` (`renderSignalCard`, a plain render function — blocks at `:1087-1105`) and `DailyEdition.tsx` (inside `items.map` at `:337-344`): hooks cannot be called there. Create `src/components/radar/RadarCardExtras.tsx` — `({ dispatchId, nodeId, variant: 'signal'|'edition' })` — which calls the hooks and renders the lineage line and the surge line (same copy as PolicyBrief, compact), and render it where the old `volcano`/`chain` blocks were. Remove the old local `chain`/`volcano` variables. `EditionItem.id` is optional (`DailyEdition.tsx:62`): with no `dispatchId` the component renders `null` (no URL-based fallback).
   - `DiagnosticPreview.tsx`: replace `getPolicyEntityForText` with `useAuthority(q.entity_slugs)`; render "Tier {tier_number} · {legal_basis_ref}" + source chip; drop `neutralized_trap` / `trap_explanation` from this block (registry rows do not carry them).
4. Delete from `policy-ripple-radar-shared.ts` the now-unused `matchDispatchToPolicyChain`, `getVolcanoTelemetryForNode`, `getPolicyEntityForText`, `CANONICAL_5_TIER_ENTITIES` and their types if no import remains.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` the listed line ranges (± 15 lines) in the four components.
2. `write_to_file` `radar-v2-client.ts`, `useRadarV2.ts`, `RadarCardExtras.tsx`; `multi_replace_file_content` the four components; `grep_search` for remaining imports, then step 4.
3. `write_to_file` `scripts/tests/radar/radar-v2-client.test.ts` (fake `fetch`) (picked up by the `test:radar` glob).
4. `run_command` `npm run lint`, `npm run test:radar`, `npm run build`.
5. `browser_subagent` with the 085Q fixture server: open a brief whose dispatch id is in the fixture (chip + gap sentence visible) and one that is not (no "Policy lineage" block, no empty heading).

# 4. Deterministic Acceptance Criteria
- Batcher: 120 `get` calls for 120 distinct ids within one tick → exactly 3 fetches (50, 50, 20); repeated ids → no extra fetch; an id absent from the response resolves to `null` and is not re-requested.
- A `paused` response → every getter resolves to `null`; no `console.error`.
- Surge block renders only for `surging: true`; with `surging: false` the DOM has no "Topic resurgence" text.
- `grep_search "matchDispatchToPolicyChain|getVolcanoTelemetryForNode|CANONICAL_5_TIER_ENTITIES" src` → 0 matches.
- Browser check from step 5 passes; screenshots attached.
- `npm run lint`, `npm run test:radar`, `npm run build` exit 0.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked: ["run_command", "view_file", "write_to_file", "replace_file_content", "grep_search", "browser_subagent"]
  duration_ms: 124000
  exit_codes: { lint: 0, test_radar: 0, build: 0 }
  batcher_fetch_count_120_ids: 3
  screenshots:
    - "C:/Users/bentn/.gemini/antigravity-ide/brain/a885cd34-c907-4100-a092-8de11d31aa27/.tempmediaStorage/media_1792519845763.png"
    - "C:/Users/bentn/.gemini/antigravity-ide/brain/a885cd34-c907-4100-a092-8de11d31aa27/.tempmediaStorage/media_1792519857624.png"
    - "C:/Users/bentn/.gemini/antigravity-ide/brain/a885cd34-c907-4100-a092-8de11d31aa27/brief_lineage_verify_1792519446013.webp"
diff: |
  src/lib/radar-v2-client.ts: createBatcher with coalescing and caching, getDispatchLineage, getNodeSignals, getAuthority
  src/components/radar/useRadarV2.ts: useDispatchLineage, useNodeSignal, useAuthority
  src/components/radar/RadarCardExtras.tsx: compact lineage chip, gap sentence, and topic resurgence note
  src/components/PolicyBrief.tsx: real lineage chip and topic resurgence wired to radar v2 hooks
  src/components/CurrentAffairs.tsx, src/components/DailyEdition.tsx: wired to RadarCardExtras
  src/components/DiagnosticPreview.tsx: wired to useAuthority
  src/lib/policy-ripple-radar-shared.ts: removed unused matchDispatchToPolicyChain, getVolcanoTelemetryForNode, getPolicyEntityForText, CANONICAL_5_TIER_ENTITIES
  server-lib/seo/routes.ts: dev pass-through for interactive SPA
  scripts/tests/radar/radar-v2-client.test.ts: 3/3 tests covering batching, paused state, and surging filters
```
