-- supabase/migrations/20261021000500_rebuild_program_edges.sql
-- Migration: TASK_085J Atomic replace_program_edges RPC for lineage builder

CREATE OR REPLACE FUNCTION public.replace_program_edges(
  p_program TEXT,
  p_edges JSONB DEFAULT '[]'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Delete this program's IMPLEMENTS edges and REFERENCES edges whose dst belongs to this program
  DELETE FROM public.policy_edges
  WHERE dst_event IN (
    SELECT id FROM public.policy_events WHERE program_slug = p_program
  )
  AND edge_type IN ('IMPLEMENTS', 'REFERENCES');

  -- 2. Insert new edges if p_edges is non-empty
  IF jsonb_array_length(p_edges) > 0 THEN
    INSERT INTO public.policy_edges (
      src_event,
      dst_event,
      edge_type,
      anchor_kind,
      p,
      model_version
    )
    SELECT
      (elem->>'src_event')::uuid,
      (elem->>'dst_event')::uuid,
      elem->>'edge_type',
      elem->>'anchor_kind',
      (elem->>'p')::real,
      elem->>'model_version'
    FROM jsonb_array_elements(p_edges) AS elem
    ON CONFLICT (src_event, dst_event, edge_type) DO UPDATE SET
      anchor_kind = EXCLUDED.anchor_kind,
      p = EXCLUDED.p,
      model_version = EXCLUDED.model_version;
  END IF;
END;
$$;

-- Security: restrict execute to service_role and postgres
REVOKE ALL ON FUNCTION public.replace_program_edges(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_program_edges(TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.replace_program_edges(TEXT, JSONB) TO postgres;
