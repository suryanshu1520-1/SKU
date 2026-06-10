-- ============================================================
-- ONE-SHOT SQL: Run this in Supabase Dashboard SQL Editor
-- This script DROPS and recreates all tables with correct schema,
-- grants privileges, and sets RLS.
-- ============================================================

-- ============================================================
-- IMPORTANT: Drop dependent tables first (FK constraints)
-- Then drop quiz_sessions before user_profiles
-- ============================================================
DROP TABLE IF EXISTS public.question_attempts CASCADE;
DROP TABLE IF EXISTS public.saved_insights CASCADE;
DROP TABLE IF EXISTS public.quiz_sessions CASCADE;

-- ----------------------------
-- 1. user_profiles
-- ----------------------------
DROP TABLE IF EXISTS public.user_profiles CASCADE;
CREATE TABLE public.user_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    text,
  membership_tier text NOT NULL DEFAULT 'free' CHECK (membership_tier IN ('free', 'premium')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_profiles_user_id_key UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles (user_id);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON public.user_profiles;
CREATE POLICY "Users read own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own profile" ON public.user_profiles;
CREATE POLICY "Users update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1), 'Candidate')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ----------------------------
-- 2. quiz_sessions  (correct_count / incorrect_count / unattempted_count)
-- ----------------------------
CREATE TABLE public.quiz_sessions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  correct_count     integer NOT NULL DEFAULT 0,
  incorrect_count   integer NOT NULL DEFAULT 0,
  unattempted_count integer NOT NULL DEFAULT 0,
  total_time_seconds integer NOT NULL DEFAULT 0,
  subject_stats     jsonb NOT NULL DEFAULT '{}'::jsonb,
  percentile        numeric(5,2) DEFAULT 0.00,
  created_at        timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_id ON public.quiz_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_created_at ON public.quiz_sessions (created_at DESC);
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;

-- PERMISSIVE POLICIES — allows both anon and authenticated to insert/select
DROP POLICY IF EXISTS "Allow individual user insertion" ON public.quiz_sessions;
CREATE POLICY "Allow individual user insertion"
  ON public.quiz_sessions FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow individual user read" ON public.quiz_sessions;
CREATE POLICY "Allow individual user read"
  ON public.quiz_sessions FOR SELECT
  TO authenticated, anon
  USING (true);


-- ----------------------------
-- 3. question_attempts
-- ----------------------------
CREATE TABLE public.question_attempts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        uuid NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id       text NOT NULL,
  selected_option   text,
  is_correct        boolean,
  time_spent_seconds smallint NOT NULL DEFAULT 0,
  subject_category  text,
  created_at        timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_question_attempts_user_question ON public.question_attempts (user_id, question_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_session ON public.question_attempts (session_id);
ALTER TABLE public.question_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users manage own attempts" ON public.question_attempts;
CREATE POLICY "Allow users manage own attempts"
  ON public.question_attempts FOR ALL
  TO authenticated, anon
  USING (true) WITH CHECK (true);


-- ----------------------------
-- 4. saved_insights
-- ----------------------------
CREATE TABLE public.saved_insights (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id   text NOT NULL,
  question_text text NOT NULL,
  insight_text  text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT saved_insights_user_question_unique UNIQUE (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_insights_user ON public.saved_insights (user_id);
ALTER TABLE public.saved_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users manage own insights" ON public.saved_insights;
CREATE POLICY "Allow users manage own insights"
  ON public.saved_insights FOR ALL
  TO authenticated, anon
  USING (true) WITH CHECK (true);


-- ----------------------------
-- 5. get_user_percentile RPC
-- ----------------------------
CREATE OR REPLACE FUNCTION public.get_user_percentile(target_score integer)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    ROUND(
      (SELECT COUNT(*)::numeric FROM public.quiz_sessions WHERE correct_count < target_score)
      /
      NULLIF((SELECT COUNT(*)::numeric FROM public.quiz_sessions), 0)
      * 100,
    1),
  0);
$$;


-- ----------------------------
-- 6. EXPLICIT GRANTS — bypass RLS for service_role, allow anon + authenticated
-- ----------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;