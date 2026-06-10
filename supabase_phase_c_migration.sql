-- ============================================================
-- Migration: Phase C - The Patch & The Tark V2 Architecture
-- Date: 2026-06-09
-- Description:
--   1) Adds is_ranked BOOLEAN column to quiz_sessions
--   2) Updates evaluate_quiz_cp() trigger to only award CP
--      when is_ranked = true AND accuracy >= 80%
-- Fully idempotent — safe to run multiple times.
-- ============================================================

-- ----------------------------
-- 1. Add is_ranked column (idempotent via IF NOT EXISTS)
-- ----------------------------
ALTER TABLE public.quiz_sessions
  ADD COLUMN IF NOT EXISTS is_ranked BOOLEAN NOT NULL DEFAULT true;

-- ----------------------------
-- 2. Drop existing objects to guarantee clean recreation
-- ----------------------------
DROP TRIGGER IF EXISTS trg_evaluate_quiz_cp ON public.quiz_sessions;

-- ----------------------------
-- 3. Recreate the CP trigger function — only awards points
--    when is_ranked = true AND accuracy >= 0.80
-- ----------------------------
CREATE OR REPLACE FUNCTION public.evaluate_quiz_cp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_accuracy numeric;
BEGIN
  -- Only award CP for ranked assessments with >= 80% accuracy
  IF NEW.is_ranked = true THEN
    v_accuracy := NEW.correct_count::numeric
                  / NULLIF(NEW.correct_count + NEW.incorrect_count + NEW.unattempted_count, 0);

    IF v_accuracy >= 0.80 THEN
      UPDATE public.user_profiles
      SET contender_points = contender_points + 25
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ----------------------------
-- 4. Recreate the trigger
-- ----------------------------
CREATE TRIGGER trg_evaluate_quiz_cp
  AFTER INSERT ON public.quiz_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.evaluate_quiz_cp();