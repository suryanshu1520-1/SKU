---
task_id: "TASK_085H"
title: "Programs and policy events schema (ring derived from instrument)"
parent: "TASK_085"
status: "AWAITING_VERIFICATION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
depends_on: ["TASK_085E"]
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 2500
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
Create the event layer: `policy_programs`, `policy_events`, `policy_edges`, with ring depth computed in the
database from the legal instrument and every event carrying at least one evidence quote with a source URL.

# 2. Transcluded Context References
- Registry: `policy_entities(entity_slug)` (085E). Rows: `current_affairs(id uuid)`.
- Ring table (master §6.3) — reproduce exactly:
  - ring 0: `cabinet_approval, budget_announcement, executive_announcement, treaty_signed`
  - ring 1: `bill_introduced, bill_passed, act_assented, ordinance_promulgated, rules_notified, regulation_issued, commencement_or_entry_into_force`
  - ring 2: `guidelines_issued, institution_constituted, funds_released, tender_awarded, interagency_mou`
  - ring 3: `state_rollout, project_commissioned, beneficiary_milestone, enforcement_action`
  - non-events (never stored): `review_meeting, visit_or_courtesy, campaign_or_awareness, award_or_ceremony, conference_or_seminar, other`

**Distilled spec** — migration `supabase/migrations/20261021000400_policy_events.sql`:
```sql
DO $$ BEGIN CREATE TYPE instrument_class AS ENUM (
 'cabinet_approval','budget_announcement','executive_announcement','treaty_signed',
 'bill_introduced','bill_passed','act_assented','ordinance_promulgated','rules_notified','regulation_issued','commencement_or_entry_into_force',
 'guidelines_issued','institution_constituted','funds_released','tender_awarded','interagency_mou',
 'state_rollout','project_commissioned','beneficiary_milestone','enforcement_action');
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE program_kind AS ENUM ('scheme','mission','act','bill','treaty','regulation','policy');
EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE OR REPLACE FUNCTION public.ring_of_instrument(i instrument_class) RETURNS SMALLINT LANGUAGE sql IMMUTABLE AS $$
 SELECT CASE WHEN i IN ('cabinet_approval','budget_announcement','executive_announcement','treaty_signed') THEN 0
  WHEN i IN ('bill_introduced','bill_passed','act_assented','ordinance_promulgated','rules_notified','regulation_issued','commencement_or_entry_into_force') THEN 1
  WHEN i IN ('guidelines_issued','institution_constituted','funds_released','tender_awarded','interagency_mou') THEN 2
  ELSE 3 END::SMALLINT $$;
CREATE TABLE IF NOT EXISTS public.policy_programs (
 program_slug TEXT PRIMARY KEY, name TEXT NOT NULL, kind program_kind NOT NULL,
 nodal_entity_slug TEXT REFERENCES public.policy_entities(entity_slug), aliases TEXT[] NOT NULL DEFAULT '{}',
 node_id TEXT REFERENCES public.syllabus_nodes(id), provenance TEXT NOT NULL DEFAULT 'auto' CHECK (provenance IN ('auto','registry')),
 first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.policy_events (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 dispatch_id UUID NOT NULL REFERENCES public.current_affairs(id) ON DELETE CASCADE,
 event_seq SMALLINT NOT NULL CHECK (event_seq BETWEEN 0 AND 4),
 instrument instrument_class NOT NULL,
 ring_depth SMALLINT GENERATED ALWAYS AS (public.ring_of_instrument(instrument)) STORED,
 actor_slug TEXT REFERENCES public.policy_entities(entity_slug),
 program_slug TEXT REFERENCES public.policy_programs(program_slug),
 jurisdiction TEXT NOT NULL DEFAULT 'union' CHECK (jurisdiction IN ('union','state')),
 summary TEXT NOT NULL,
 event_date DATE NOT NULL, date_source TEXT NOT NULL CHECK (date_source IN ('release_meta','span','ingested')),
 evidence JSONB NOT NULL CHECK (jsonb_typeof(evidence)='array' AND jsonb_array_length(evidence) >= 1),
 review_id BIGINT REFERENCES public.policy_entity_review(id),
 is_public BOOLEAN GENERATED ALWAYS AS (actor_slug IS NOT NULL AND review_id IS NULL) STORED,
 extractor_version TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE (dispatch_id, event_seq));
CREATE TABLE IF NOT EXISTS public.policy_edges (
 src_event UUID NOT NULL REFERENCES public.policy_events(id) ON DELETE CASCADE,
 dst_event UUID NOT NULL REFERENCES public.policy_events(id) ON DELETE CASCADE,
 edge_type TEXT NOT NULL CHECK (edge_type IN ('IMPLEMENTS','REFERENCES','AMENDS')),
 anchor_kind TEXT NOT NULL CHECK (anchor_kind IN ('shared_program','explicit_reference','fact_mutation','learned')),
 p REAL CHECK (p IS NULL OR (p >= 0 AND p <= 1)), model_version TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (src_event, dst_event, edge_type), CHECK (src_event <> dst_event));
CREATE INDEX IF NOT EXISTS idx_events_program_order ON public.policy_events (program_slug, event_date, ring_depth, created_at);
CREATE INDEX IF NOT EXISTS idx_events_actor ON public.policy_events (actor_slug);
```
RLS: public SELECT on programs, events `WHERE is_public`, edges; writes service-role only. Each evidence element must
have keys `span_id`, `quote`, `source_url` — enforced in TS (`server-lib/policy/instruments.ts` `assertEvidence()`).
TS mirror `RING_OF: Record<InstrumentClass, 0|1|2|3>` and `NON_EVENTS` in `server-lib/policy/instruments.ts`.

# 3. Mandatory Tool Chain & Execution Path
1. `write_to_file` migration and `server-lib/policy/instruments.ts`.
2. `write_to_file` `scripts/tests/radar/instruments.test.ts`: TS map vs migration text drift guard (every instrument appears in the SQL CASE branch of its ring); `assertEvidence` rejects missing `source_url`. Picked up by the `test:radar` glob.
3. `call_mcp_tool` supabase `apply_migration` on a dev branch only if one exists.
4. `run_command` `npm run test:radar`, `npm run lint`.

# 4. Deterministic Acceptance Criteria
- Drift guard passes for all 20 instruments; `RING_OF.commencement_or_entry_into_force === 1`; no non-event string exists in the SQL enum.
- `npm run lint`, `npm run test:radar` exit 0; migration not applied to production by the executor.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - view_file
    - run_command
    - replace_file_content
    - write_to_file
  duration_ms: 14200
  exit_codes: { test_radar: 0, lint: 0 }
  migration_applied: "none"
diff: |
  supabase/migrations/20261021000400_policy_events.sql:
    + instrument_class ENUM (20 policy instruments)
    + program_kind ENUM (scheme, mission, act, bill, treaty, regulation, policy)
    + ring_of_instrument function mapping instrument_class -> ring (0, 1, 2, 3)
    + policy_programs table with nodal_entity_slug FK and RLS
    + policy_events table with stored GENERATED ring_depth, is_public, and evidence check
    + policy_edges table with src_event/dst_event and edge_type
  server-lib/policy/instruments.ts:
    + InstrumentClass, NonEventClass, RingDepth types
    + RING_OF record mapping, NON_EVENTS constant array
    + assertEvidence function enforcing non-empty array with span_id, quote, and https:// source_url
  scripts/tests/radar/instruments.test.ts:
    + Drift guard asserting all 20 instruments match SQL CASE statement
    + Verified commencement_or_entry_into_force === 1
    + Verified no NON_EVENTS string exists in SQL enum
    + Comprehensive assertEvidence validator tests
```
