-- ============================================================
-- Migration: Exam Hall mock attempts (TASK_062)
-- Date: 2026-09-24
-- One row per Exam Hall sitting. All writes go through the
-- service-role API in server-lib/exam/*. Users may read their
-- own rows. A partial unique index allows one sitting in
-- progress per user.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mock_attempts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paper_code       text NOT NULL CHECK (paper_code IN ('GS1_FULL', 'GS1_HALF', 'GS1_SECTION')),
  subject          text,
  rules            text NOT NULL CHECK (rules IN ('exam_day', 'practice')),
  series           text NOT NULL CHECK (series IN ('A', 'B', 'C', 'D')),
  seed             bigint NOT NULL,
  question_ids     text[] NOT NULL,
  duration_seconds integer NOT NULL CHECK (duration_seconds > 0),
  started_at       timestamptz NOT NULL DEFAULT now(),
  deadline_at      timestamptz NOT NULL,
  status           text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted')),
  submit_mode      text CHECK (submit_mode IN ('manual', 'timeout', 'recovered')),
  sheet            jsonb NOT NULL DEFAULT '{}'::jsonb,
  checkpoint_at    timestamptz,
  submitted_at     timestamptz,
  result           jsonb,
  net_hundredths   integer,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mock_attempts_user_started
  ON public.mock_attempts (user_id, started_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mock_attempts_one_in_progress
  ON public.mock_attempts (user_id)
  WHERE status = 'in_progress';

ALTER TABLE public.mock_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mock_attempts_select_own" ON public.mock_attempts;
CREATE POLICY "mock_attempts_select_own"
  ON public.mock_attempts
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.mock_attempts FROM anon, authenticated;
GRANT SELECT ON public.mock_attempts TO authenticated;
GRANT ALL ON public.mock_attempts TO service_role;

