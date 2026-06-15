-- ============================================================
-- Migration: Phase 1 - Freemium Tier & Vanguard Limits
-- Date: 2026-06-16
-- Description:
--   1) Adds vanguard_sessions_used column to user_profiles
--      (tracks free-tier ranked assessment consumption, limit of 3)
--   2) Creates increment_vanguard_count RPC for atomic counter
-- Fully idempotent — safe to run multiple times.
-- ============================================================

-- ----------------------------
-- 1. Add vanguard_sessions_used column (idempotent via IF NOT EXISTS)
-- ----------------------------
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS vanguard_sessions_used INTEGER NOT NULL DEFAULT 0;

-- ----------------------------
-- 2. Create increment_vanguard_count RPC for atomic counter
-- ----------------------------
CREATE OR REPLACE FUNCTION public.increment_vanguard_count(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE public.user_profiles
  SET vanguard_sessions_used = vanguard_sessions_used + 1
  WHERE user_id = user_id_param
  RETURNING vanguard_sessions_used INTO new_count;

  RETURN new_count;
END;
$$;

-- ----------------------------
-- 3. Grant access to application roles
-- ----------------------------
GRANT EXECUTE ON FUNCTION public.increment_vanguard_count TO anon, authenticated, service_role;
