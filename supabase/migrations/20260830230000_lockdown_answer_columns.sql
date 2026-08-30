-- ==============================================================================
-- Migration: Lockdown Answer Columns from Public/Anon Access (TASK_032)
-- Tables: current_affairs_mcqs, static_questions
--
-- Description:
--   Removes blanket SELECT grants on answer-containing tables from anon and authenticated roles.
--   Grants explicit column-level SELECT on all non-sensitive columns (excluding correct_index
--   and correct_option) and exposes public views (current_affairs_mcqs_public, static_questions_public).
--   The service_role retains full access for server-side grading and authorized on-lock reveals.
-- ==============================================================================

-- 1. Revoke blanket table-level SELECT on current_affairs_mcqs and static_questions
REVOKE SELECT ON TABLE public.current_affairs_mcqs FROM anon, authenticated, public;
REVOKE SELECT ON TABLE public.static_questions FROM anon, authenticated, public;

-- 2. Drop existing blanket RLS policies
DROP POLICY IF EXISTS "Allow public read access on current_affairs_mcqs" ON public.current_affairs_mcqs;
DROP POLICY IF EXISTS "Allow public read access to questions" ON public.static_questions;

-- 3. Re-create RLS read policies for anon and authenticated
CREATE POLICY "Allow public read access on current_affairs_mcqs"
  ON public.current_affairs_mcqs
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access to questions"
  ON public.static_questions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 4. Grant column-specific SELECT to anon and authenticated (excluding answer columns)
GRANT SELECT (
  id,
  affair_url,
  headline,
  question,
  options,
  explanation,
  subject,
  edition_date,
  created_at
) ON TABLE public.current_affairs_mcqs TO anon, authenticated;

GRANT SELECT (
  id,
  exam_origin_tag,
  subject_category,
  difficulty_level,
  question_text,
  options_matrix,
  ai_insights,
  conceptual_explanation,
  is_generated,
  created_at
) ON TABLE public.static_questions TO anon, authenticated;

-- 5. Provide safe public views for direct PostgREST consumers
CREATE OR REPLACE VIEW public.current_affairs_mcqs_public AS
  SELECT
    id,
    affair_url,
    headline,
    question,
    options,
    explanation,
    subject,
    edition_date,
    created_at
  FROM public.current_affairs_mcqs;

GRANT SELECT ON public.current_affairs_mcqs_public TO anon, authenticated;

CREATE OR REPLACE VIEW public.static_questions_public AS
  SELECT
    id,
    exam_origin_tag,
    subject_category,
    difficulty_level,
    question_text,
    options_matrix,
    ai_insights,
    conceptual_explanation,
    is_generated,
    created_at
  FROM public.static_questions;

GRANT SELECT ON public.static_questions_public TO anon, authenticated;

-- 6. Ensure service_role retains full management and read access across all columns
GRANT ALL ON TABLE public.current_affairs_mcqs TO service_role;
GRANT ALL ON TABLE public.static_questions TO service_role;
GRANT ALL ON public.current_affairs_mcqs_public TO service_role;
GRANT ALL ON public.static_questions_public TO service_role;
