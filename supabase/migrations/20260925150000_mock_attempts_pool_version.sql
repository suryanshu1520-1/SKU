-- ============================================================
-- Migration: Add pool_version to mock_attempts (Quality Remedy)
-- Date: 2026-09-25
-- Pins an immutable pool version to every candidate attempt so
-- that question bank upgrades/reconciliations never mutate or
-- invalidate active in-progress attempts.
-- ============================================================

ALTER TABLE public.mock_attempts
  ADD COLUMN IF NOT EXISTS pool_version integer NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.mock_attempts.pool_version IS
  'Pinning version of the Exam Hall question pool served to the candidate, ensuring finalization always grades against the exact questions served.';
