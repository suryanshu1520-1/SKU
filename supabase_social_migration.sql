-- ============================================================
-- SECURE SOCIAL GRAPH & PRIVACY LAYER
-- Phase 4.1 - Idempotent migration that adds:
--   1) is_public column (privacy by default = false)
--   2) Updated public_leaderboard view with is_public exposure
--   3) SECURITY DEFINER RPC get_analyst_dossier() returning
--      lightweight aggregated JSON payload
-- ============================================================
-- This migration is idempotent — safe to run multiple times.

-- ============================================================
-- 1. ADD PRIVACY COLUMN (idempotent via IF NOT EXISTS)
-- ============================================================
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 2. UPDATE PUBLIC LEADERBOARD VIEW
--    Now exposes is_public so the frontend can determine
--    if a name is clickable for profile viewing.
-- ============================================================
CREATE OR REPLACE VIEW public.public_leaderboard AS
SELECT
  id,
  display_name AS name,
  contender_points,
  trophy_count,
  is_public
FROM public.user_profiles
WHERE contender_points > 0 OR trophy_count > 0
ORDER BY contender_points DESC, trophy_count DESC;

-- Grant SELECT to anonymous and authenticated roles
GRANT SELECT ON public.public_leaderboard TO anon, authenticated;

-- ============================================================
-- 3. THE ANALYST DOSSIER RPC
--    SECURITY DEFINER — zero client-side trust.
--    Privacy barrier is enforced atomically in PostgreSQL.
--    Returns a lightweight JSONB payload:
--      Private profile: {"status": "private", "name": "Classified"}
--      Public profile:  {"status": "public", "name": "...",
--                         "points": ..., "trophies": ...,
--                         "total_assessments": ..., "average_accuracy": ...}
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_analyst_dossier(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.user_profiles%ROWTYPE;
  v_total_assessments INTEGER;
  v_avg_accuracy NUMERIC;
BEGIN
  -- Fetch the target user's profile row (lock-free read)
  SELECT * INTO v_profile
  FROM public.user_profiles
  WHERE user_id = target_user_id;

  -- Case 1: Profile not found or not public
  IF NOT FOUND OR v_profile.is_public = false THEN
    RETURN jsonb_build_object(
      'status', 'private',
      'name', 'Classified'
    );
  END IF;

  -- Case 2: Public profile — compute aggregates server-side
  SELECT
    COUNT(*),
    COALESCE(
      ROUND(
        AVG(
          correct_count::NUMERIC
          / NULLIF(correct_count + incorrect_count + unattempted_count, 0)
        ) * 100,
        2
      ),
      0
    )
  INTO v_total_assessments, v_avg_accuracy
  FROM public.quiz_sessions
  WHERE user_id = target_user_id;

  -- Return the dossier
  RETURN jsonb_build_object(
    'status', 'public',
    'name', v_profile.display_name,
    'points', v_profile.contender_points,
    'trophies', v_profile.trophy_count,
    'total_assessments', v_total_assessments,
    'average_accuracy', v_avg_accuracy
  );
END;
$$;

-- Grant execution to application roles
GRANT EXECUTE ON FUNCTION public.get_analyst_dossier TO anon, authenticated, service_role;