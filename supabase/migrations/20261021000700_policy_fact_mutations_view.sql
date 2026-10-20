-- supabase/migrations/20261021000700_policy_fact_mutations_view.sql
-- Migration: TASK_085M Policy fact mutations view linking verified claim mutations to events

CREATE OR REPLACE VIEW public.policy_fact_mutations_v AS
SELECT
  m.id AS mutation_id,
  m.sequence,
  m.claim_id,
  c.canonical_key,
  c.entity,
  c.metric,
  c.period,
  c.unit,
  c.syllabus_node_id,
  m.action,
  m.reason,
  m.effective_at,
  m.detected_at,
  -- Previous version details
  prev.id AS previous_version_id,
  prev.version_no AS prev_version_no,
  prev.value_text AS prev_value_text,
  prev.numeric_value AS prev_numeric_value,
  prev.evidence_quote AS prev_quote,
  prev.source_url AS prev_url,
  prev.story_url AS prev_story_url,
  -- Current version details
  cur.id AS current_version_id,
  cur.version_no AS cur_version_no,
  cur.value_text AS cur_value_text,
  cur.numeric_value AS cur_numeric_value,
  cur.evidence_quote AS cur_quote,
  cur.source_url AS cur_url,
  cur.story_url AS cur_story_url,
  -- Lowest event_seq public event for previous story URL
  (
    SELECT pe.id
    FROM public.policy_events pe
    JOIN public.current_affairs ca ON ca.id = pe.dispatch_id
    WHERE ca.url = prev.story_url
      AND pe.is_public = true
    ORDER BY pe.event_seq ASC
    LIMIT 1
  ) AS src_event,
  -- Lowest event_seq public event for current story URL
  (
    SELECT pe.id
    FROM public.policy_events pe
    JOIN public.current_affairs ca ON ca.id = pe.dispatch_id
    WHERE ca.url = cur.story_url
      AND pe.is_public = true
    ORDER BY pe.event_seq ASC
    LIMIT 1
  ) AS dst_event
FROM public.news_claim_mutations m
JOIN public.news_claims c ON c.id = m.claim_id
JOIN public.news_claim_versions prev ON prev.id = m.previous_version_id
JOIN public.news_claim_versions cur ON cur.id = m.current_version_id
WHERE m.action = 'replace';

DO $$ BEGIN
  GRANT SELECT ON public.policy_fact_mutations_v TO anon, authenticated, service_role;
EXCEPTION WHEN undefined_object THEN null;
END $$;
