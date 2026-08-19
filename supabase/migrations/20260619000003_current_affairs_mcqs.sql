-- ============================================================
-- Migration: Create current_affairs_mcqs Table
-- Date: 2026-06-19
-- Description:
--   Stores auto-generated UPSC Prelims MCQs tied to high-significance
--   Daily Briefs dispatches. Supports the Briefs <-> Arena bridge.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.current_affairs_mcqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affair_url TEXT NOT NULL UNIQUE,
  headline TEXT,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_index SMALLINT NOT NULL,
  explanation TEXT,
  subject TEXT,
  edition_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Indices for rapid lookups by edition date and unique article URL
CREATE INDEX IF NOT EXISTS idx_current_affairs_mcqs_edition_date ON public.current_affairs_mcqs(edition_date);
CREATE INDEX IF NOT EXISTS idx_current_affairs_mcqs_affair_url ON public.current_affairs_mcqs(affair_url);

-- Enable Row Level Security (RLS)
ALTER TABLE public.current_affairs_mcqs ENABLE ROW LEVEL SECURITY;

-- Allow public and authenticated clients to read MCQs for the Daily Edition / Arena
CREATE POLICY "Allow public read access on current_affairs_mcqs"
  ON public.current_affairs_mcqs
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow service_role full management access for cron ingestion workers
CREATE POLICY "Allow service_role full access on current_affairs_mcqs"
  ON public.current_affairs_mcqs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant appropriate permissions
GRANT SELECT ON TABLE public.current_affairs_mcqs TO anon, authenticated;
GRANT ALL ON TABLE public.current_affairs_mcqs TO service_role;
