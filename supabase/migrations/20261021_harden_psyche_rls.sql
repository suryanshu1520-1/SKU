-- ============================================================================
-- Migration: 20261021_harden_psyche_rls.sql
-- Description: Hardens RLS on public.user_psyche_telemetry by removing the
--              anonymous access loophole (auth.uid() IS NULL).
-- Human Gate: G1 (Pre-migration schema review). Keep local for review.
-- ============================================================================

ALTER TABLE public.user_psyche_telemetry ENABLE ROW LEVEL SECURITY;

-- Drop insecure legacy policies
DROP POLICY IF EXISTS "Users can insert their own psyche telemetry" ON public.user_psyche_telemetry;
DROP POLICY IF EXISTS "Users can view their own psyche telemetry" ON public.user_psyche_telemetry;

-- Restrict INSERT strictly to authenticated user inserting their own record
CREATE POLICY "Users can insert their own psyche telemetry"
    ON public.user_psyche_telemetry
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Restrict SELECT strictly to authenticated user reading their own records
CREATE POLICY "Users can view their own psyche telemetry"
    ON public.user_psyche_telemetry
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
