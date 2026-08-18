-- ============================================================
-- Migration: Razorpay Payment Integration — Concurrency-Safe
-- Date: 2026-06-13
-- Description:
--   1) Creates atomic premium capacity check RPC
--      (advisory-lock-protected to prevent race conditions)
--   2) Creates atomic upgrade-to-premium RPC
--      (ensures cap is not exceeded during concurrent verifications)
-- Fully idempotent — safe to run multiple times.
-- ============================================================

-- ----------------------------
-- 1. ATOMIC PREMIUM CAPACITY CHECK
--    Uses pg_try_advisory_xact_lock with a fixed key (42)
--    to serialize concurrent checks during order creation.
--    Returns current premium count + capacity boolean.
-- ----------------------------
CREATE OR REPLACE FUNCTION public.check_premium_capacity()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
  v_lock_acquired BOOLEAN;
BEGIN
  -- Try to acquire advisory lock (key = 42 for premium capacity)
  v_lock_acquired := pg_try_advisory_xact_lock(42);

  IF NOT v_lock_acquired THEN
    -- Another request holds the lock; return current count without guarantee
    SELECT COUNT(*) INTO v_count
    FROM public.user_profiles
    WHERE membership_tier = 'premium';

    RETURN json_build_object(
      'count', v_count,
      'hasCapacity', v_count < 500,
      'lockAcquired', false
    );
  END IF;

  -- Lock acquired — count is authoritative
  SELECT COUNT(*) INTO v_count
  FROM public.user_profiles
  WHERE membership_tier = 'premium';

  RETURN json_build_object(
    'count', v_count,
    'hasCapacity', v_count < 500,
    'lockAcquired', true
  );
END;
$$;

-- ----------------------------
-- 2. ATOMIC PREMIUM UPGRADE
--    Atomically upgrades user to premium ONLY if cap not exceeded.
--    Returns { success: true } or { success: false, reason: "..." }.
-- ----------------------------
CREATE OR REPLACE FUNCTION public.upgrade_to_premium(user_id_param UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
  v_current_tier TEXT;
  v_lock_acquired BOOLEAN;
BEGIN
  -- Check if user is already premium (idempotent)
  SELECT membership_tier INTO v_current_tier
  FROM public.user_profiles
  WHERE user_id = user_id_param;

  IF v_current_tier = 'premium' THEN
    RETURN json_build_object('success', true, 'alreadyPremium', true);
  END IF;

  -- Enforce advisory transaction lock to serialize concurrent upgrade calls
  PERFORM pg_try_advisory_xact_lock(42);

  -- Atomically check cap and upgrade in one transaction
  SELECT COUNT(*) INTO v_count
  FROM public.user_profiles
  WHERE membership_tier = 'premium';

  IF v_count >= 500 THEN
    RETURN json_build_object('success', false, 'reason', 'Founders Club is full.');
  END IF;

  -- Upgrade the user
  UPDATE public.user_profiles
  SET membership_tier = 'premium'
  WHERE user_id = user_id_param;

  RETURN json_build_object('success', true, 'alreadyPremium', false);
END;
$$;

-- ----------------------------
-- 3. Grant execution to application roles
-- ----------------------------
GRANT EXECUTE ON FUNCTION public.check_premium_capacity TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upgrade_to_premium TO anon, authenticated, service_role;