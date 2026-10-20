-- supabase/migrations/20261021000600_program_gaps.sql
-- Migration: TASK_085L Program gaps schema with Kaplan-Meier timing

CREATE TABLE IF NOT EXISTS public.program_gaps (
  program_slug TEXT PRIMARY KEY REFERENCES public.policy_programs(program_slug) ON DELETE CASCADE,
  gap JSONB NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.program_gaps ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public read program_gaps"
    ON public.program_gaps FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
