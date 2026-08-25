-- ============================================================================
-- Migration: 20260826000001_arena_security_hardening.sql
-- Description: 
--   1. Restricts RLS policies on public.quiz_sessions to authenticated users (auth.uid() = user_id).
--   2. Restricts RLS policies on public.question_attempts to authenticated users (auth.uid() = user_id).
--   3. Relaxes question_attempts.session_id foreign key constraint to accommodate both quiz_sessions and training_sessions UUIDs.
--   4. Standardizes increment_vanguard_count RPC with SECURITY DEFINER and caller verification.
-- ============================================================================

-- 1. Tighten RLS on quiz_sessions
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow individual user insertion" ON public.quiz_sessions;
DROP POLICY IF EXISTS "Allow individual user read" ON public.quiz_sessions;
DROP POLICY IF EXISTS "Users can insert their own quiz sessions" ON public.quiz_sessions;
DROP POLICY IF EXISTS "Users can view their own quiz sessions" ON public.quiz_sessions;

CREATE POLICY "Users can insert their own quiz sessions"
  ON public.quiz_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own quiz sessions"
  ON public.quiz_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Relax FK on question_attempts.session_id to allow training_sessions
ALTER TABLE public.question_attempts
  DROP CONSTRAINT IF EXISTS question_attempts_session_id_fkey;

-- 3. Tighten RLS on question_attempts
ALTER TABLE public.question_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users manage own attempts" ON public.question_attempts;
DROP POLICY IF EXISTS "Users can manage own question attempts" ON public.question_attempts;

CREATE POLICY "Users can manage own question attempts"
  ON public.question_attempts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Secure increment_vanguard_count RPC
CREATE OR REPLACE FUNCTION public.increment_vanguard_count(user_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure caller can only increment their own quota unless called via service_role
  IF auth.uid() IS NOT NULL AND auth.uid() <> user_id_param THEN
    RAISE EXCEPTION 'UNAUTHORIZED_QUOTA_MODIFICATION';
  END IF;

  UPDATE public.user_profiles
  SET vanguard_sessions_used = COALESCE(vanguard_sessions_used, 0) + 1
  WHERE id = user_id_param OR user_id = user_id_param;
END;
$$;
