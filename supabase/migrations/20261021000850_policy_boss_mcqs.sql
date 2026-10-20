-- supabase/migrations/20261021000850_policy_boss_mcqs.sql
-- Migration: TASK_085O Dedicated policy_boss_mcqs table for grounded questions

CREATE TABLE IF NOT EXISTS public.policy_boss_mcqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_slug TEXT NOT NULL REFERENCES public.policy_programs(program_slug) ON DELETE CASCADE,
  edition_date DATE NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_index SMALLINT NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  statement_dissection JSONB NOT NULL,
  primary_operator examiner_operator_type,
  generator_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (program_slug, edition_date)
);

ALTER TABLE public.policy_boss_mcqs ENABLE ROW LEVEL SECURITY; -- no policies: service role only
