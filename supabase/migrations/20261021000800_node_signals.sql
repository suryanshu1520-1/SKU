-- supabase/migrations/20261021000800_node_signals.sql
-- Migration: TASK_085N Node signals schema for news surge and exam weight

CREATE TABLE IF NOT EXISTS public.node_signals (
  node_id TEXT PRIMARY KEY REFERENCES public.syllabus_nodes(id) ON DELETE CASCADE,
  x_recent INTEGER NOT NULL DEFAULT 0,
  n_baseline INTEGER NOT NULL DEFAULT 0,
  expected REAL NOT NULL DEFAULT 0,
  p DOUBLE PRECISION NOT NULL DEFAULT 1,
  score REAL NOT NULL DEFAULT 0,
  surging BOOLEAN NOT NULL DEFAULT false,
  exam_weight REAL NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.node_signals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public read node_signals"
    ON public.node_signals FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
