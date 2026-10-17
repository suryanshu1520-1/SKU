-- ============================================================================
-- Migration: 20261017_audit_cleanup.sql
-- TASK_083: Production Audit Cleanup
-- 1. Purge obsolete 2020 COVID trackers masquerading as 2026 news
-- 2. Backdate historical PRS Bills/Acts (2018-2024) with explicit years
-- 3. Fix tokenizer space typo in Oct 14 BHAVYA dispatch
-- 4. Purge 24-hour ephemeral trivia (VRRR, T-Bills, Special Campaign 6 workshops)
-- 5. Re-calibrate last 30-day numerical items from PSY_01 to PSY_05_SCOPE_MUTATE
-- ============================================================================

-- 1. Remove obsolete 2020 COVID-19 weekly trackers masquerading as 2026 news
DELETE FROM public.current_affairs
WHERE (source ILIKE '%PRS%' OR ministry ILIKE '%PRS%')
  AND (
    headline ILIKE '%COVID-19%'
    OR headline ILIKE '%Apr 13-20, 2020%'
    OR headline ILIKE '%lockdown%'
  );

-- 2. Backdate historical PRS Bills/Acts (2018-2024) whose titles contain an explicit past year
UPDATE public.current_affairs
SET published_at = MAKE_TIMESTAMPTZ((regexp_match(headline, '\b(2018|2019|2020|2021|2022|2023|2024)\b'))[1]::int, 6, 15, 0, 0, 0, 'UTC')
WHERE (source ILIKE '%PRS%' OR ministry ILIKE '%PRS%')
  AND headline ~ '\b(2018|2019|2020|2021|2022|2023|2024)\b'
  AND published_at >= '2026-01-01';

-- 3. Fix tokenizer space typo in Oct 14 BHAVYA dispatch
UPDATE public.current_affairs
SET headline = REPLACE(headline, 'BHAVY A', 'BHAVYA'),
    summary = REPLACE(summary::text, 'BHAVY A', 'BHAVYA')::jsonb
WHERE headline LIKE '%BHAVY A%' OR summary::text LIKE '%BHAVY A%';

-- 4. Purge existing ephemeral trivia
DELETE FROM public.current_affairs
WHERE headline ~* '(Variable Rate Reverse Repo|Treasury Bills.*auction|Workshop on Record Management under Special Campaign|Removal of dust/silt from roads)';

-- 5. One-time re-calibration pass: re-tag numerical outlays/years/percentage targets from PSY_01 to PSY_05
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'current_affairs' 
      AND column_name = 'primary_operator'
  ) THEN
    UPDATE public.current_affairs
    SET primary_operator = 'PSY_05_SCOPE_MUTATE'
    WHERE primary_operator = 'PSY_01_INST_SWAP'
      AND created_at >= NOW() - INTERVAL '30 days'
      AND (
        headline ~* '\b(\d+\s*crore|\d+%\s*|FY\s*\d{2}|\d{4}[-–]\d{2,4}|target|outlay|allocation)\b'
        OR summary::text ~* '\b(\d+\s*crore|\d+%\s*|FY\s*\d{2}|\d{4}[-–]\d{2,4}|target|outlay|allocation)\b'
      );
  END IF;
END $$;
