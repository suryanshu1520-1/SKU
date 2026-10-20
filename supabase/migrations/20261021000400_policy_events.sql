-- supabase/migrations/20261021000400_policy_events.sql
-- Migration: TASK_085H Programs and policy events schema (ring derived from instrument)

DO $$ BEGIN
  CREATE TYPE instrument_class AS ENUM (
    'cabinet_approval',
    'budget_announcement',
    'executive_announcement',
    'treaty_signed',
    'bill_introduced',
    'bill_passed',
    'act_assented',
    'ordinance_promulgated',
    'rules_notified',
    'regulation_issued',
    'commencement_or_entry_into_force',
    'guidelines_issued',
    'institution_constituted',
    'funds_released',
    'tender_awarded',
    'interagency_mou',
    'state_rollout',
    'project_commissioned',
    'beneficiary_milestone',
    'enforcement_action'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE program_kind AS ENUM (
    'scheme',
    'mission',
    'act',
    'bill',
    'treaty',
    'regulation',
    'policy'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE OR REPLACE FUNCTION public.ring_of_instrument(i instrument_class) RETURNS SMALLINT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN i IN ('cabinet_approval','budget_announcement','executive_announcement','treaty_signed') THEN 0
    WHEN i IN ('bill_introduced','bill_passed','act_assented','ordinance_promulgated','rules_notified','regulation_issued','commencement_or_entry_into_force') THEN 1
    WHEN i IN ('guidelines_issued','institution_constituted','funds_released','tender_awarded','interagency_mou') THEN 2
    ELSE 3
  END::SMALLINT
$$;

CREATE TABLE IF NOT EXISTS public.policy_programs (
  program_slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind program_kind NOT NULL,
  nodal_entity_slug TEXT REFERENCES public.policy_entities(entity_slug),
  aliases TEXT[] NOT NULL DEFAULT '{}',
  node_id TEXT REFERENCES public.syllabus_nodes(id),
  provenance TEXT NOT NULL DEFAULT 'auto' CHECK (provenance IN ('auto','registry')),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
  event_date DATE NOT NULL,
  date_source TEXT NOT NULL CHECK (date_source IN ('release_meta','span','ingested')),
  evidence JSONB NOT NULL CHECK (jsonb_typeof(evidence)='array' AND jsonb_array_length(evidence) >= 1),
  review_id BIGINT REFERENCES public.policy_entity_review(id),
  is_public BOOLEAN GENERATED ALWAYS AS (actor_slug IS NOT NULL AND review_id IS NULL) STORED,
  extractor_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (dispatch_id, event_seq)
);

CREATE TABLE IF NOT EXISTS public.policy_edges (
  src_event UUID NOT NULL REFERENCES public.policy_events(id) ON DELETE CASCADE,
  dst_event UUID NOT NULL REFERENCES public.policy_events(id) ON DELETE CASCADE,
  edge_type TEXT NOT NULL CHECK (edge_type IN ('IMPLEMENTS','REFERENCES','AMENDS')),
  anchor_kind TEXT NOT NULL CHECK (anchor_kind IN ('shared_program','explicit_reference','fact_mutation','learned')),
  p REAL CHECK (p IS NULL OR (p >= 0 AND p <= 1)),
  model_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (src_event, dst_event, edge_type),
  CHECK (src_event <> dst_event)
);

CREATE INDEX IF NOT EXISTS idx_events_program_order ON public.policy_events (program_slug, event_date, ring_depth, created_at);
CREATE INDEX IF NOT EXISTS idx_events_actor ON public.policy_events (actor_slug);

-- RLS
ALTER TABLE public.policy_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_edges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public read policy_programs"
    ON public.policy_programs FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Public read policy_events"
    ON public.policy_events FOR SELECT USING (is_public = true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Public read policy_edges"
    ON public.policy_edges FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
