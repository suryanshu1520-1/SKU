-- Migration 20261021000200_graph_worker_state.sql
-- TASK_085B: Graph worker reliability (state, retries, exponential backoff, bounded queue)

ALTER TABLE public.current_affairs
  ADD COLUMN IF NOT EXISTS graph_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (graph_status IN ('pending','linked','no_event','failed','skipped')),
  ADD COLUMN IF NOT EXISTS graph_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS graph_next_attempt_at TIMESTAMPTZ;

-- Backfill existing linked rows
UPDATE public.current_affairs SET graph_status='linked' WHERE chain_id IS NOT NULL;

-- Legacy rows already marked processed without a chain: failures and no-matches are indistinguishable (A9)
UPDATE public.current_affairs SET graph_status='no_event' WHERE graph_processed_at IS NOT NULL AND chain_id IS NULL;

-- Queue index for bounded candidate queries
CREATE INDEX IF NOT EXISTS idx_ca_graph_queue ON public.current_affairs (graph_status, graph_next_attempt_at, published_at DESC);
