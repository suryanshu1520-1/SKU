-- ============================================================
-- Migration: Phase B - Infrastructure Security & Article Bookmarking
-- Date: 2026-06-09
-- Description:
--   1) Adds last_sync_timestamp column to user_profiles
--      (defaults to '2000-01-01', used for 5-min sync cooldown)
--   2) Creates saved_articles table for bookmarking current_affairs
--      with strict Row Level Security (user_id = auth.uid())
--   3) Enforces UNIQUE(user_id, article_id) to prevent duplicates
-- Fully idempotent — safe to run multiple times.
-- ============================================================

-- ----------------------------
-- 1. Add last_sync_timestamp column (idempotent via IF NOT EXISTS)
-- ----------------------------
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS last_sync_timestamp TIMESTAMPTZ NOT NULL DEFAULT '2000-01-01'::TIMESTAMPTZ;

-- ----------------------------
-- 2. Create saved_articles table (idempotent via IF NOT EXISTS)
-- ----------------------------
CREATE TABLE IF NOT EXISTS public.saved_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.current_affairs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

-- ----------------------------
-- 3. Enable Row Level Security
-- ----------------------------
ALTER TABLE public.saved_articles ENABLE ROW LEVEL SECURITY;

-- ----------------------------
-- 4. Drop existing policies (for idempotent re-run safety)
-- ----------------------------
DROP POLICY IF EXISTS "Users can SELECT their own saved articles" ON public.saved_articles;
DROP POLICY IF EXISTS "Users can INSERT their own saved articles" ON public.saved_articles;
DROP POLICY IF EXISTS "Users can DELETE their own saved articles" ON public.saved_articles;

-- ----------------------------
-- 5. Create RLS policies — zero client trust
-- ----------------------------
CREATE POLICY "Users can SELECT their own saved articles"
  ON public.saved_articles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can INSERT their own saved articles"
  ON public.saved_articles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can DELETE their own saved articles"
  ON public.saved_articles
  FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------
-- 6. Grant access to application roles
-- ----------------------------
GRANT SELECT, INSERT, DELETE ON public.saved_articles TO anon, authenticated;