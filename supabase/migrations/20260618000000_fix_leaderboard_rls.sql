-- ============================================================
-- FIX: Leaderboard RLS & Privacy Policies
-- Date: 2026-06-18
-- ============================================================

-- 1. Recreate the public_leaderboard view to include user_id
DROP VIEW IF EXISTS public.public_leaderboard;
CREATE VIEW public.public_leaderboard AS
SELECT
  id,
  user_id,
  display_name AS name,
  contender_points,
  trophy_count,
  is_public
FROM public.user_profiles
WHERE contender_points > 0 OR trophy_count > 0
ORDER BY contender_points DESC, trophy_count DESC;

GRANT SELECT ON public.public_leaderboard TO anon, authenticated;

-- 2. Fix user_profiles RLS (restrict to own profile OR public profiles)
DROP POLICY IF EXISTS "Users read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users read public profiles" ON public.user_profiles;

CREATE POLICY "Users read public profiles and own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated, anon
  USING (
    auth.uid() = user_id OR is_public = true
  );

-- 3. Fix quiz_sessions RLS (restrict to own sessions OR sessions of public users)
DROP POLICY IF EXISTS "Allow individual user read" ON public.quiz_sessions;

CREATE POLICY "Allow reading own sessions or public sessions"
  ON public.quiz_sessions
  FOR SELECT
  TO authenticated, anon
  USING (
    auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = quiz_sessions.user_id
        AND user_profiles.is_public = true
    )
  );
