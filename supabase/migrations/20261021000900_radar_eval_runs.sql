-- supabase/migrations/20261021000900_radar_eval_runs.sql
-- Migration: TASK_085R radar_eval_runs table and radar_eval_status_v view

CREATE TABLE IF NOT EXISTS public.radar_eval_runs (
  id BIGSERIAL PRIMARY KEY,
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  git_sha TEXT,
  metrics JSONB NOT NULL,
  thresholds JSONB NOT NULL,
  passed BOOLEAN NOT NULL,
  failing TEXT[] NOT NULL DEFAULT '{}'
);

ALTER TABLE public.radar_eval_runs ENABLE ROW LEVEL SECURITY;

-- Service role can read and write all evaluation runs
DO $$ BEGIN
  CREATE POLICY "service_role_eval_runs_all" ON public.radar_eval_runs
    FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Public view exposing only run_at, passed, failing
CREATE OR REPLACE VIEW public.radar_eval_status_v WITH (security_invoker = false) AS
SELECT
  id,
  run_at,
  passed,
  failing
FROM public.radar_eval_runs
ORDER BY run_at DESC;

DO $$ BEGIN
  GRANT SELECT ON public.radar_eval_status_v TO anon, authenticated, service_role;
EXCEPTION WHEN undefined_object THEN null;
END $$;
