---
task_id: "TASK_085J"
title: "Deterministic lineage builder (program chains + explicit-reference ripples); retire LLM chain matching"
parent: "TASK_085"
status: "AWAITING_VERIFICATION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
depends_on: ["TASK_085I"]
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 6000
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
Build `policy_edges` from `policy_events` with pure, order-independent, race-free code: program lineages
(`IMPLEMENTS`) and explicit cross-program references (`REFERENCES`). The LLM chain matcher stops running when
`RADAR_V2=1`.

# 2. Transcluded Context References
- Tables: `policy_events(id, program_slug, ring_depth, event_date, created_at, evidence jsonb, is_public)`, `policy_programs(program_slug, aliases)`, `policy_edges(src_event, dst_event, edge_type, anchor_kind, p, model_version)` — 085H.
- `server-lib/text/normalize.ts` `normUnicode`.
- Legacy entry points to gate: `server-lib/cron/ingest/orchestrator.ts:564-576` (inline `processDispatchIntoPolicyGraph`) and `:627-632` (`runPolicyGraphWorker`). (The `pib-aggregator.ts` call is deleted by 085B.)

**Distilled spec** — `server-lib/policy/lineage.ts` (pure):
```ts
export type Ev = { id: string; program: string|null; ring: 0|1|2|3; date: string /*YYYY-MM-DD*/; createdAt: string; text: string };
export function orderKey(e: Ev): [string, number, string, string];      // [date, ring, createdAt, id]
export function compareEv(a: Ev, b: Ev): number;                          // lexicographic on orderKey
export function programParents(events: Ev[]): Map<string, string|null>;   // event id → parent id within its program
export function explicitReferences(events: Ev[], aliasesByProgram: Map<string, string[]>): Array<{ src: string; dst: string }>;
export function assertAcyclic(edges: Array<{ src: string; dst: string }>, byId: Map<string, Ev>): void; // throws on violation
```
Rules:
1. `programParents`: group by `program` (skip null). Sort each group with `compareEv`. For event `e` at position `i`,
   parent = the **last** earlier event `f` (positions `< i`) with `f.ring <= e.ring`; if none, `null` (a root).
   Determinism: result must be identical for any input permutation.
2. `explicitReferences`: for event `e` and program `P ≠ e.program` (both non-null), if some alias `a` of `P` with
   `normUnicode(a).length >= 6` occurs as a whole-word substring of `normUnicode(e.text)` (e.text = concatenated
   evidence quotes), add **one** edge `{src: f.id, dst: e.id}` where `f` is the last event of `P` with
   `compareEv(f, e) < 0` (the program's state when it was referenced). No such `f` → no edge. Use an alias → programs
   inverted index; complexity O(Σ|text| · aliases) — no O(n²) scan over all pairs.
3. `assertAcyclic`: every edge must satisfy `compareEv(src, dst) < 0` (edges go forward in the total order ⇒ DAG).
4. Worker `server-lib/cron/policy-lineage-worker.ts` → `rebuildLineage({ sinceHours = 72 })`: load public events of
   programs touched in the window (+ all events of those programs), compute edges, then per program **replace**
   that program's `IMPLEMENTS` edges and the `REFERENCES` edges whose `dst` is in the set, inside one RPC/transaction
   (`model_version = 'lineage_v1'`, `p = null`, anchor `shared_program` / `explicit_reference`). Idempotent.
5. Flag: when `process.env.RADAR_V2 === '1'`, skip all three legacy calls in §2 and call `rebuildLineage()` once at the
   end of the ingest run instead. In the same run, rows with `graph_status='pending'` and `created_at < RADAR_V2_SINCE`
   (ISO date) are set to `'skipped'` — v2 only reads events extracted at synthesis time, so pre-cutover rows are not
   processed and the coverage line starts at `RADAR_V2_SINCE`.

# 3. Mandatory Tool Chain & Execution Path
1. `write_to_file` `lineage.ts`, `policy-lineage-worker.ts`, and migration `supabase/migrations/20261021000500_rebuild_program_edges.sql` (RPC `replace_program_edges(p_program TEXT, p_edges JSONB)` doing delete+insert in one transaction, `SECURITY DEFINER`, service role only).
2. `multi_replace_file_content` `orchestrator.ts` (flag gate); `.github/workflows/scraper.yml` → add `RADAR_V2: ${{ vars.RADAR_V2 }}` and `RADAR_V2_SINCE: ${{ vars.RADAR_V2_SINCE }}` to the pipeline step's `env` (GitHub repository variables, so the Orchestrator flips v2 without a code change).
3. `write_to_file` `scripts/tests/radar/lineage.test.ts` (picked up by the `test:radar` glob).
4. `run_command` `npm run test:radar`, `npm run lint`.

# 4. Deterministic Acceptance Criteria
Fixture (program P = NZ FTA, Q = an export-promotion scheme):
`a:P r0 2026-01-12 ("treaty signed")`, `b:P r1 2026-10-19 ("comes into force 20 Oct")`, `c:P r2 2026-10-19 ("customs notification")`, `d:P r1 2026-10-19` (created after b), `e:Q r2 2026-11-02` whose text contains "India New Zealand Free Trade Agreement", `f:Q r2 2026-11-02` (created after e, no reference).
- `programParents`: a→null, b→a, d→b, c→d (last earlier with ring ≤ 2 in order a,b,d,c), e→null, f→e.
- Same output for 20 random permutations of the input array.
- `explicitReferences` with `aliases(P) = ["India-New Zealand Free Trade Agreement"]` returns exactly `[{ src: c, dst: e }]`
  (c is P's last event in order a, b, d, c); nothing for f.
- `assertAcyclic` throws on a hand-made backward edge `e→a`.
- With `RADAR_V2` unset, legacy behaviour unchanged (grep shows calls are inside `if (process.env.RADAR_V2 !== '1')`).
- `npm run lint`, `npm run test:radar` exit 0.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked: ["write_to_file", "multi_replace_file_content", "replace_file_content", "run_command", "view_file"]
  duration_ms: 28000
  exit_codes: { test_radar: 0, test: 0, lint: 0 }
  migration_applied: false
diff: |
  server-lib/policy/lineage.ts (orderKey, compareEv, programParents, explicitReferences, assertAcyclic)
  server-lib/cron/policy-lineage-worker.ts (rebuildLineage, pre-cutover skipping, atomic replace_program_edges)
  supabase/migrations/20261021000500_rebuild_program_edges.sql (replace_program_edges RPC)
  server-lib/cron/ingest/orchestrator.ts (rebuildLineage invocation on RADAR_V2=1)
  .github/workflows/scraper.yml (RADAR_V2 and RADAR_V2_SINCE workflow env vars)
  scripts/tests/radar/lineage.test.ts (total order, 20 permutations, explicit references, assertAcyclic, legacy behavior guards)
```
