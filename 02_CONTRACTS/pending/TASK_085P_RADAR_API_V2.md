---
task_id: "TASK_085P"
title: "Radar API v2: programs, lineage, gaps, mutations, ripples, node signals — every item carries its evidence"
parent: "TASK_085"
status: "PENDING_EXECUTION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
depends_on: ["TASK_085J", "TASK_085L", "TASK_085M", "TASK_085N", "TASK_085O"]
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 2500
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
Serve the v2 tables through three read-only endpoints whose payload builders are pure functions, so that a test can
prove: no public item lacks `{source_url, quote}`, no constant baseline appears, and the payload says how much it
covers and how fresh it is.

# 2. Transcluded Context References
- Mounts: `api/server.ts:17` (`import policyRadarHandler from "../server-lib/policy-radar.js"`, default export) and `:57`
  `app.get("/api/policy-radar", …)`; `server.ts:21` (named import) and `:177`. `vercel.json` already rewrites `/api/(.*)` → `/api/server`.
- Cache header convention: `res.setHeader('Cache-Control', 'public, max-age=…, s-maxage=…')` (`server-lib/explanation.ts:160`).
- Tables: `policy_programs`, `policy_events(is_public, evidence jsonb, ring_depth, instrument, actor_slug, program_slug, event_date, date_source, dispatch_id)`, `policy_edges(src_event, dst_event, edge_type, anchor_kind, p, model_version)`, `program_gaps(program_slug, gap)`, `policy_fact_mutations_v`, `node_signals`, `policy_entities` (registry columns from 085E).

**Distilled spec**
1. Types `src/lib/policy-radar-v2-types.ts` (shared by server and UI):
   ```ts
   export type Evidence = { quote: string; source_url: string; span_id?: string };
   export type LineageNode = { event_id: string; event_date: string; date_source: 'release_meta'|'span'|'ingested'; ring: 0|1|2|3;
     instrument: string; actor: { slug: string; name: string; tier: number|null; legal_basis_ref: string|null } | null;
     summary: string; evidence: Evidence[]; parent_event_id: string|null };
   export type Program = { slug: string; name: string; kind: string; nodal: string|null; nodes: LineageNode[];
     gap: Gap|null;
     mutations: Array<Mutation & { event_id: string }>;   // event_id = the event carrying the new value
     boss_mcq: { id: string; question: string; options: string[]; edition_date: string } | null;   // never the key
     ripples: Array<{ direction: 'upstream'|'downstream'; other_program: string; other_name: string; anchor_kind: 'explicit_reference'|'learned'; p: number|null; evidence: Evidence }> };
   export type Coverage = { events: number; programs: number; since: string|null; generated_at: string; last_event_at: string|null };
   export type NodeSignalV2 = NodeSignal & { title: string }; // title = last element of syllabus_nodes.path
   export type RadarV2 = { status: 'ok'|'paused'|'stale'|'unavailable'; programs: Program[]; node_signals: NodeSignalV2[]; coverage: Coverage; version: 'v2' };
   ```
   (`Gap` from 085L, `Mutation` = output of 085M `formatChange`, `NodeSignal` = row of `node_signals`.)
2. Pure builder `server-lib/policy/radar-v2-payload.ts`:
   `buildRadarV2Payload(rows, now: Date, opts: { staleAfterHours: number; maxPrograms: number }): RadarV2`
   - Only `is_public = true` events; an event whose `evidence` lacks a non-empty `quote` **and** `source_url` is dropped and counted in `coverage` as `dropped_no_evidence` (extend `Coverage`).
   - Programs ordered by latest event date desc, ties by slug; at most `maxPrograms` (default 40); a program with 0 kept nodes is omitted.
   - Ripples only from `policy_edges` (`REFERENCES`, 085J direction: `src` = last prior event of the referenced program, `dst` = the referencing event). For program X: edges whose `dst` is in X → `upstream` (X cites the other program); edges whose `src` is in X → `downstream`. Evidence is always the `dst` event's quote that names the other program. Learned edges (085K) appear only with `p !== null`.
   - `status = 'stale'` when `now − coverage.last_event_at > staleAfterHours` (default 72); never substitutes data.
3. Handlers `server-lib/policy-radar-v2.ts`:
   - `GET /api/policy-radar/v2` → `RadarV2`; `Cache-Control: public, max-age=300, s-maxage=900, stale-while-revalidate=3600`.
   - `GET /api/policy-radar/v2/by-dispatch?ids=<uuid,…>` (≤ 50 ids, validated as UUIDs) → `Record<dispatch_id, { program_slug, program_name, ring, instrument, gap_sentence: string|null, evidence: Evidence }>`; ids with no public event are absent. Used by feed cards (085Q).
   - `POST /api/policy-radar/v2/boss-mcq/:id/check` body `{ choice: 0|1|2|3 }` → `{ correct: boolean, correct_index, dissection }`, read server-side (service role) from `policy_boss_mcqs` (085O; RLS on, no public policy). Answers and dissections are never in the GET payload (repo invariant: evaluation is server-side).
   - `GET /api/policy-radar/v2/authorities?slugs=<slug,…>` (≤ 20, each `^ENT_[A-Z0-9_]{1,60}$`, the 085F slug format) → registry rows `{ slug, authority, tier_number, legal_basis_kind, legal_basis_ref, source_url }` with `provenance = 'registry'` only.
   - Supabase client: public tables may use the existing client; `policy_boss_mcqs` is read only with a client built from `SUPABASE_SERVICE_ROLE_KEY` (no anon fallback, unlike `server-lib/policy-radar.ts:9`) — without it, `boss_mcq: null` and `check` returns `503`.
   - All handlers: queries with `.in()` / `.eq()` builders (no string-built filters); on error → `200 { status: 'unavailable', … empty }`; `await isRadarPublic()` from `server-lib/policy/radar-flags.ts`, declared `async function isRadarPublic(): Promise<boolean>` from the start (today: `process.env.RADAR_PUBLIC === '1'`; 085R adds the database gate without changing the signature) → when false, `{ status: 'paused' }` with empty arrays.
4. Legacy v1 compatibility: `buildRadarPayloadV1` (085A) gains an adapter `v1FromV2(payload: RadarV2)` mapping programs → `chains` (`nodes_flow` = lineage nodes in order, `ring_depth` = ring, `pib_url` = evidence[0].source_url). `RADAR_V2=1` switches the v1 handler to the adapter; default off.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` `server-lib/policy/radar-payload.ts` (085A) and `server-lib/policy/lifecycle.ts` `Gap` type.
2. `write_to_file` types, builder, handlers, `radar-flags.ts`; `multi_replace_file_content` `api/server.ts`, `server.ts` (mount the four routes next to `/api/policy-radar`: `GET /v2`, `GET /v2/by-dispatch`, `GET /v2/authorities`, `POST /v2/boss-mcq/:id/check`; `express.json()` must apply to the POST).
3. `write_to_file` `scripts/tests/radar/radar-v2-payload.test.ts` (picked up by the `test:radar` glob).
4. `run_command` `npm run test:radar`, `npm run lint`.

# 4. Deterministic Acceptance Criteria
- Builder test over a fixture with 3 programs / 9 events (one event missing `source_url`, one `is_public=false`):
  payload has 7 nodes; `coverage.dropped_no_evidence = 1`; a recursive walk finds **no** object with `quote` but no `source_url` or vice versa; no `node_id` in `node_signals` that is absent from the input rows.
- Ordering: programs by latest event date desc; within a program nodes follow `compareEv` (085J) exactly.
- `now` 73 h after the last event → `status: 'stale'`, data unchanged; 71 h → `'ok'`.
- `RADAR_PUBLIC` unset → `/api/policy-radar/v2` returns `status: 'paused'` and `programs: []` (supertest or handler unit test with mocked `res`).
- `by-dispatch` rejects 51 ids and non-UUIDs with `400`; `authorities` rejects `slugs=ENT_RBI,ENT_X;drop` and lowercase `ent_rbi` with `400`.
- A recursive walk of the GET payload finds no `correct_index`, `key` or `statement_dissection` field; `check` returns `400` for `choice` outside 0–3 and `404` for an unknown id.
- `grep_search "CANONICAL_|2026" server-lib/policy/radar-v2-payload.ts server-lib/policy-radar-v2.ts` → 0 matches.
- `npm run lint`, `npm run test:radar` exit 0.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked: []
  duration_ms: 0
  exit_codes: { test_radar: null, lint: null }
  routes_mounted: { api_server: false, server: false }
diff: |
  <unified diff>
```
