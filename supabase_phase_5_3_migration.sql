-- ============================================================
-- Migration: Phase 5.3 - Autopsy Paywall & AI Usage Gating
-- Date: 2026-06-11
-- Description:
--   1) Adds ai_autopsies_used column to user_profiles
--      (tracks free-tier AI insight consumption, limit of 3)
--   2) Adds subject_tags column to saved_insights
--      (enables tag-based filtering on saved insights)
--   3) Creates increment_ai_autopsies RPC for atomic counter
--   4) Ensures RLS is active on saved_insights
-- Fully idempotent — safe to run multiple times.
-- ============================================================

-- ----------------------------
-- 1. Add ai_autopsies_used column (idempotent via IF NOT EXISTS)
-- ----------------------------
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS ai_autopsies_used INTEGER NOT NULL DEFAULT 0;

-- ----------------------------
-- 2. Add subject_tags column to saved_insights (idempotent)
-- ----------------------------
ALTER TABLE public.saved_insights
  ADD COLUMN IF NOT EXISTS subject_tags TEXT[] DEFAULT '{}';

-- ----------------------------
-- 3. Create increment_ai_autopsies RPC for atomic counter
-- ----------------------------
CREATE OR REPLACE FUNCTION public.increment_ai_autopsies(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE public.user_profiles
  SET ai_autopsies_used = ai_autopsies_used + 1
  WHERE user_id = user_id_param
  RETURNING ai_autopsies_used INTO new_count;

  RETURN new_count;
END;
$$;

-- ----------------------------
-- 4. Ensure RLS is enabled on saved_insights (idempotent)
-- ----------------------------
ALTER TABLE public.saved_insights ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies for idempotence
DROP POLICY IF EXISTS "Users can SELECT their own saved insights" ON public.saved_insights;
DROP POLICY IF EXISTS "Users can INSERT their own saved insights" ON public.saved_insights;
DROP POLICY IF EXISTS "Users can DELETE their own saved insights" ON public.saved_insights;

CREATE POLICY "Users can SELECT their own saved insights"
  ON public.saved_insights
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can INSERT their own saved insights"
  ON public.saved_insights
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can DELETE their own saved insights"
  ON public.saved_insights
  FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------
-- 5. Grant access to application roles
-- ----------------------------
GRANT SELECT, INSERT, DELETE ON public.saved_insights TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_ai_autopsies TO anon, authenticated, service_role;