-- ============================================================
-- SECURE GAMIFICATION ENGINE: CP & LEADERBOARD
-- Performs the following atomically:
--   1) Adds contender_points + trophy_count columns
--   2) Creates AFTER INSERT trigger to auto-award CP on quiz completion
--   3) Creates SECURITY DEFINER RPC for weekly leaderboard reset
--   4) Creates sanitized public_leaderboard view
-- ============================================================
-- This migration is idempotent — safe to run multiple times.

-- ============================================================
-- 1. ADD GAMIFICATION COLUMNS (idempotent via IF NOT EXISTS)
-- ============================================================
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS contender_points INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trophy_count     INTEGER NOT NULL DEFAULT 0;

-- Drop existing objects to guarantee clean recreation
DROP TRIGGER IF EXISTS trg_evaluate_quiz_cp ON public.quiz_sessions;
DROP FUNCTION IF EXISTS public.evaluate_quiz_cp();
DROP FUNCTION IF EXISTS public.process_weekly_leaderboard();
DROP VIEW IF EXISTS public.public_leaderboard;

-- ============================================================
-- 2. THE CP TRIGGER
--    Automatically awards 25 contender points when a user
--    scores >= 80% accuracy on a quiz.
--    Runs AFTER INSERT — zero client trust required.
-- ============================================================
CREATE OR REPLACE FUNCTION public.evaluate_quiz_cp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_accuracy numeric;
BEGIN
  -- Calculate accuracy with NULLIF to prevent division by zero
  v_accuracy := NEW.correct_count::numeric
                / NULLIF(NEW.correct_count + NEW.incorrect_count + NEW.unattempted_count, 0);

  -- Award 25 CP if accuracy >= 80%
  IF v_accuracy >= 0.80 THEN
    UPDATE public.user_profiles
    SET contender_points = contender_points + 25
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_evaluate_quiz_cp
  AFTER INSERT ON public.quiz_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.evaluate_quiz_cp();

-- ============================================================
-- 3. THE WEEKLY LEADERBOARD RESET RPC
--    Single atomic transaction:
--      a) Finds the user with highest contender_points (> 0)
--      b) Awards them 1 trophy
--      c) Resets ALL contender_points to zero
--    If the server crashes mid-execution, the entire function
--    rolls back — no partial state (Risk 2 mitigation).
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_weekly_leaderboard()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_winner_id uuid;
BEGIN
  -- Step 1: Find the weekly winner (highest CP > 0)
  SELECT user_id INTO v_winner_id
  FROM public.user_profiles
  WHERE contender_points > 0
  ORDER BY contender_points DESC
  LIMIT 1
  FOR UPDATE;

  -- Step 2: Award trophy if a valid winner exists
  IF FOUND THEN
    UPDATE public.user_profiles
    SET trophy_count = trophy_count + 1
    WHERE user_id = v_winner_id;
  END IF;

  -- Step 3: Reset all contender points to zero
  UPDATE public.user_profiles
  SET contender_points = 0;

  -- Return the winner's user_id (NULL if no one qualified)
  RETURN v_winner_id;
END;
$$;

-- ============================================================
-- 4. SANITIZED PUBLIC LEADERBOARD VIEW
--    Exposes only id, display_name (aliased as name),
--    contender_points, and trophy_count.
--    No PII leakage (Risk 4 mitigation).
-- ============================================================
CREATE VIEW public.public_leaderboard AS
SELECT
  id,
  display_name AS name,
  contender_points,
  trophy_count
FROM public.user_profiles
WHERE contender_points > 0 OR trophy_count > 0
ORDER BY contender_points DESC, trophy_count DESC;

-- Grant SELECT to anonymous and authenticated roles
GRANT SELECT ON public.public_leaderboard TO anon, authenticated;