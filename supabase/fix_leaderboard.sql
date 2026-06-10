-- ============================================================
-- FIX: Recreate public_leaderboard view and grant permissions
-- ============================================================

-- Drop and recreate the view
DROP VIEW IF EXISTS public.public_leaderboard;

CREATE VIEW public.public_leaderboard AS
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
-- Also create the CP trigger and weekly reset function if missing
-- ============================================================

-- Add gamification columns if missing
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS contender_points INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trophy_count     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- Create CP trigger
DROP TRIGGER IF EXISTS trg_evaluate_quiz_cp ON public.quiz_sessions;
DROP FUNCTION IF EXISTS public.evaluate_quiz_cp();

CREATE OR REPLACE FUNCTION public.evaluate_quiz_cp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_accuracy numeric;
BEGIN
  v_accuracy := NEW.correct_count::numeric
                / NULLIF(NEW.correct_count + NEW.incorrect_count + NEW.unattempted_count, 0);
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

-- Create weekly reset RPC
CREATE OR REPLACE FUNCTION public.process_weekly_leaderboard()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_winner_id uuid;
BEGIN
  SELECT user_id INTO v_winner_id
  FROM public.user_profiles
  WHERE contender_points > 0
  ORDER BY contender_points DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.user_profiles
    SET trophy_count = trophy_count + 1
    WHERE user_id = v_winner_id;
  END IF;

  UPDATE public.user_profiles
  SET contender_points = 0;

  RETURN v_winner_id;
END;
$$;

-- Grant execution to application roles
GRANT EXECUTE ON FUNCTION public.process_weekly_leaderboard TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_analyst_dossier TO anon, authenticated, service_role;