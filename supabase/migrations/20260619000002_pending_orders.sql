-- ============================================================
-- Migration: Pending Orders & Concurrency Locks
-- Date: 2026-06-19
-- Description:
--   Creates a pending_orders table to hold atomic locks for Razorpay
--   orders before they are verified, preventing the 501st-member race condition.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pending_orders (
  order_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'created',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + interval '15 minutes'
);

-- Enable RLS
ALTER TABLE public.pending_orders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own pending orders" 
  ON public.pending_orders FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own pending orders" 
  ON public.pending_orders FOR SELECT 
  USING (auth.uid() = user_id);

-- Cleanup function to clear expired locks (can be called via cron or lazily)
CREATE OR REPLACE FUNCTION clear_expired_pending_orders()
RETURNS void AS $$
BEGIN
  DELETE FROM public.pending_orders WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Secure atomic function to check availability and create pending order
CREATE OR REPLACE FUNCTION reserve_premium_seat_if_available(p_user_id UUID, p_order_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_members INT;
    active_locks INT;
    total_reserved INT;
    is_already_premium BOOLEAN;
BEGIN
    -- 1. Check if user is already premium
    SELECT membership_tier = 'premium' INTO is_already_premium
    FROM public.user_profiles
    WHERE user_id = p_user_id;

    IF is_already_premium THEN
        RETURN TRUE; -- Let them proceed, maybe they are extending
    END IF;

    -- 2. Lock the rows or table (using advisory lock to serialize)
    PERFORM pg_advisory_xact_lock(hashtext('premium_seat_reservation'));

    -- 3. Cleanup expired locks first
    DELETE FROM public.pending_orders WHERE expires_at < NOW();

    -- 4. Count active members
    SELECT COUNT(*) INTO current_members
    FROM public.user_profiles
    WHERE membership_tier = 'premium';

    -- 5. Count active pending locks (excluding the current user if they already have one, to be safe)
    SELECT COUNT(*) INTO active_locks
    FROM public.pending_orders
    WHERE status = 'created' AND user_id != p_user_id;

    total_reserved := current_members + active_locks;

    -- 6. Check if capacity reached
    IF total_reserved >= 500 THEN
        RETURN FALSE;
    END IF;

    -- 7. Reserve the seat
    INSERT INTO public.pending_orders (order_id, user_id)
    VALUES (p_order_id, p_user_id)
    ON CONFLICT (order_id) DO NOTHING;

    RETURN TRUE;
END;
$$;
