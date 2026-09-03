-- ============================================================
-- Migration: Candidate Preferences & Optional Subject Schema
-- Date: 2026-09-03
-- Description:
--   - Adds preferences jsonb column to public.user_profiles
--   - Creates index on targetYear and optionalSubject
--   - Updates handle_new_user() trigger to initialize default preferences
-- ============================================================

-- 1. Add preferences column to user_profiles if it does not exist
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{
  "targetYear": "2026",
  "attemptStage": "foundation",
  "optionalSubject": "psir",
  "optionalStage": "foundation",
  "focusPillars": ["gs2", "gs3"],
  "dailyMcqTarget": 10,
  "dailyReadingMins": 7,
  "difficultyPreference": "standard",
  "onboardingCompleted": false,
  "inductionPledged": false
}'::jsonb;

-- 2. Index for cohort queries and rapid profile lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_target_year 
ON public.user_profiles (((preferences->>'targetYear')));

CREATE INDEX IF NOT EXISTS idx_user_profiles_optional_subject 
ON public.user_profiles (((preferences->>'optionalSubject')));

-- 3. Update handle_new_user() to populate default preferences for newly created accounts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, display_name, preferences)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1), 'Candidate'),
    jsonb_build_object(
      'targetYear', '2026',
      'attemptStage', 'foundation',
      'optionalSubject', 'psir',
      'optionalStage', 'foundation',
      'focusPillars', jsonb_build_array('gs2', 'gs3'),
      'dailyMcqTarget', 10,
      'dailyReadingMins', 7,
      'difficultyPreference', 'standard',
      'onboardingCompleted', false,
      'inductionPledged', false
    )
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
