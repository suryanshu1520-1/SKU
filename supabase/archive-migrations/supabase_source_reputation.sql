-- Adaptive Scraper Phase 1: Source Reputation Ledger
-- Tracks per-source health metrics for dynamic crawler backpressure.

CREATE TABLE IF NOT EXISTS source_reputation (
  source_id TEXT PRIMARY KEY,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  fail_count INTEGER DEFAULT 0,
  avg_latency_ms INTEGER
);

-- Updates source reputation on each scrape attempt.
-- Uses Exponential Moving Average (EMA) for avg_latency_ms to prevent false spikes.
-- Resets fail_count to 0 on success, increments by 1 on failure.
CREATE OR REPLACE FUNCTION update_source_reputation(
  p_source_id TEXT,
  p_is_success BOOLEAN,
  p_latency INTEGER
) RETURNS VOID AS $$
BEGIN
  INSERT INTO source_reputation (source_id, last_success_at, last_failure_at, fail_count, avg_latency_ms)
  VALUES (
    p_source_id,
    CASE WHEN p_is_success THEN NOW() ELSE NULL END,
    CASE WHEN p_is_success THEN NULL ELSE NOW() END,
    CASE WHEN p_is_success THEN 0 ELSE 1 END,
    p_latency
  )
  ON CONFLICT (source_id) DO UPDATE SET
    last_success_at = CASE WHEN p_is_success THEN NOW() ELSE source_reputation.last_success_at END,
    last_failure_at = CASE WHEN p_is_success THEN source_reputation.last_failure_at ELSE NOW() END,
    fail_count = CASE WHEN p_is_success THEN 0 ELSE source_reputation.fail_count + 1 END,
    avg_latency_ms = CASE
      WHEN source_reputation.avg_latency_ms IS NULL THEN p_latency
      ELSE ((source_reputation.avg_latency_ms * 3) + p_latency) / 4
    END;
END;
$$ LANGUAGE plpgsql;