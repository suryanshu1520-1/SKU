-- ============================================================
-- Migration: Tactical Yield Scoring Logic (Option 1)
-- Date: 2026-06-19
-- Description:
--   Updates the evaluate_quiz_cp() trigger to use the Tactical Yield System:
--   - Correct: +3 CP
--   - Incorrect: -1 CP
--   - Unattempted: 0 CP
--   - Vanguard Bonus: +15 CP flat bonus if accuracy >= 80%
-- ============================================================

DROP TRIGGER IF EXISTS trg_evaluate_quiz_cp ON public.quiz_sessions;

CREATE OR REPLACE FUNCTION public.evaluate_quiz_cp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_accuracy numeric;
  v_total_questions integer;
  v_cp_earned integer := 0;
BEGIN
  -- Only award CP for ranked assessments
  IF NEW.is_ranked = true THEN
    v_total_questions := NEW.correct_count + NEW.incorrect_count + NEW.unattempted_count;
    
    IF v_total_questions > 0 THEN
      v_accuracy := NEW.correct_count::numeric / v_total_questions::numeric;
    ELSE
      v_accuracy := 0;
    END IF;

    -- Tactical Yield Calculation
    -- Correct: +3 CP, Incorrect: -1 CP
    v_cp_earned := (NEW.correct_count * 3) - (NEW.incorrect_count * 1);

    -- Vanguard Bonus
    IF v_accuracy >= 0.80 THEN
      v_cp_earned := v_cp_earned + 15;
    END IF;

    -- Floor the session CP to 0, so users don't lose overall CP for simply participating
    IF v_cp_earned < 0 THEN
      v_cp_earned := 0;
    END IF;

    IF v_cp_earned > 0 THEN
      UPDATE public.user_profiles
      SET contender_points = contender_points + v_cp_earned
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_evaluate_quiz_cp
  AFTER INSERT ON public.quiz_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.evaluate_quiz_cp();
