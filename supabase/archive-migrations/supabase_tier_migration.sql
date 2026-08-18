-- ============================================================
-- Migration: Tier Ledger — Insights Metering Infrastructure
-- Date: 2026-06-08
-- Description:
--   - Adds insights_consumed column to user_profiles
--   - Creates SECURITY DEFINER RPC for atomic increment
--   - Fully idempotent (safe to run multiple times)
-- ============================================================

-- ----------------------------
-- 1. Add insights_consumed column (idempotent)
-- ----------------------------
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS insights_consumed INTEGER NOT NULL DEFAULT 0;

-- ----------------------------
-- 2. Create increment RPC (idempotent via OR REPLACE)
-- ----------------------------
CREATE OR REPLACE FUNCTION public.increment_insight_count(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.user_profiles
  SET insights_consumed = insights_consumed + 1
  WHERE user_id = user_id_param
  RETURNING insights_consumed INTO new_count;

  RETURN new_count;
END;
$$;

-- ----------------------------
-- 3. Grant execution to application roles
-- ----------------------------
GRANT EXECUTE ON FUNCTION public.increment_insight_count TO anon, authenticated, service_role;