-- ============================================================
-- Migration: Separate Training Sessions
-- Date: 2026-06-19
-- Description:
--   Creates a dedicated training_sessions table to fully isolate
--   Unranked (Training Ground) quizzes from the weekly leaderboard
--   and CP system.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.training_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  correct_count INTEGER DEFAULT 0,
  incorrect_count INTEGER DEFAULT 0,
  unattempted_count INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,
  subject_stats JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own training sessions" 
  ON public.training_sessions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own training sessions" 
  ON public.training_sessions FOR SELECT 
  USING (auth.uid() = user_id);

-- Optional: index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_training_sessions_user_id ON public.training_sessions(user_id);
