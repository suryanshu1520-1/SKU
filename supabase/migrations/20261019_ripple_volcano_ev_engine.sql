-- supabase/migrations/20261019_ripple_volcano_ev_engine.sql
-- Migration: TASK_084 Unified Cross-Room Ripple, Volcano Radar & Calibrated 50:50 EV Engine

-- 1. Quota Idempotency Guard on current_affairs
ALTER TABLE IF EXISTS public.current_affairs
    ADD COLUMN IF NOT EXISTS node_id TEXT REFERENCES public.syllabus_nodes(id),
    ADD COLUMN IF NOT EXISTS graph_processed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS chain_id TEXT REFERENCES public.policy_chains(chain_id),
    ADD COLUMN IF NOT EXISTS ring_depth INT CHECK (ring_depth BETWEEN 0 AND 3),
    ADD COLUMN IF NOT EXISTS entity_slugs TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_current_affairs_node_id ON public.current_affairs(node_id);

CREATE INDEX IF NOT EXISTS idx_current_affairs_unprocessed_graph
    ON public.current_affairs(published_at DESC)
    WHERE graph_processed_at IS NULL;

-- 2. Track Boss MCQ Synthesis State on policy_chains
ALTER TABLE IF EXISTS public.policy_chains
    ADD COLUMN IF NOT EXISTS boss_mcq_id TEXT,
    ADD COLUMN IF NOT EXISTS last_synthesized_node_count INT DEFAULT 0;

-- 3. Extend current_affairs_mcqs & static_questions for Full-Chain Boss MCQs & 5-Tier Entity Dissection
ALTER TABLE IF EXISTS public.current_affairs_mcqs
    ADD COLUMN IF NOT EXISTS node_id TEXT REFERENCES public.syllabus_nodes(id),
    ADD COLUMN IF NOT EXISTS chain_id TEXT REFERENCES public.policy_chains(chain_id),
    ADD COLUMN IF NOT EXISTS is_boss_mcq BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS primary_operator examiner_operator_type,
    ADD COLUMN IF NOT EXISTS secondary_operator examiner_operator_type,
    ADD COLUMN IF NOT EXISTS entity_slugs TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS statement_dissection JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS statutory_anchor TEXT,
    ADD COLUMN IF NOT EXISTS claim_half_life_days FLOAT DEFAULT 231.0 CHECK (claim_half_life_days >= 99.0);

CREATE INDEX IF NOT EXISTS idx_current_affairs_mcqs_node ON public.current_affairs_mcqs(node_id);
CREATE INDEX IF NOT EXISTS idx_current_affairs_mcqs_chain ON public.current_affairs_mcqs(chain_id);

ALTER TABLE IF EXISTS public.static_questions
    ADD COLUMN IF NOT EXISTS chain_id TEXT REFERENCES public.policy_chains(chain_id),
    ADD COLUMN IF NOT EXISTS is_boss_mcq BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS entity_slugs TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS claim_half_life_days FLOAT DEFAULT 866.4;

-- 4. Extend pyq_node_analytics with Volcano Index (V_j) Telemetry
ALTER TABLE IF EXISTS public.pyq_node_analytics
    ADD COLUMN IF NOT EXISTS news_count_2026 INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS volcano_index FLOAT DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS volcano_status TEXT DEFAULT 'STABLE'
        CHECK (volcano_status IN ('ERUPTING', 'HEATING', 'STABLE'));

CREATE INDEX IF NOT EXISTS idx_pyq_node_volcano
    ON public.pyq_node_analytics(volcano_index DESC);

-- 5. Deterministic SQL Function to Recompute Volcano Index (V_j) Across All 137 Nodes
-- Formula: V_j = ((2026 - last_tested_year) / GREATEST(1.0, recurrence_interval_avg)) * LN(1 + 2 * news_count_2026)
CREATE OR REPLACE FUNCTION public.recompute_volcano_indices()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    WITH article_counts AS (
        SELECT
            COALESCE(ca.node_id, pc.node_id) AS node_id,
            COUNT(*)::INT AS cnt_2026
        FROM public.current_affairs ca
        LEFT JOIN public.policy_chains pc ON ca.chain_id = pc.chain_id
        WHERE (ca.node_id IS NOT NULL OR pc.node_id IS NOT NULL)
          AND ca.published_at >= '2026-01-01T00:00:00Z'
        GROUP BY COALESCE(ca.node_id, pc.node_id)
    )
    UPDATE public.pyq_node_analytics a
    SET
        news_count_2026 = COALESCE(ac.cnt_2026, 0),
        volcano_index = ROUND(
            (
                (
                    (2026.0 - COALESCE(a.last_tested_year, 2018)::FLOAT)
                    / GREATEST(1.0, COALESCE(a.recurrence_interval_avg, 2.5)::FLOAT)
                ) * LN(1.0 + 2.0 * COALESCE(ac.cnt_2026, 0)::FLOAT)
            )::NUMERIC,
            2
        )::FLOAT,
        volcano_status = CASE
            WHEN (
                (2026.0 - COALESCE(a.last_tested_year, 2018)::FLOAT)
                / GREATEST(1.0, COALESCE(a.recurrence_interval_avg, 2.5)::FLOAT)
            ) * LN(1.0 + 2.0 * COALESCE(ac.cnt_2026, 0)::FLOAT) > 8.0 THEN 'ERUPTING'
            WHEN (
                (2026.0 - COALESCE(a.last_tested_year, 2018)::FLOAT)
                / GREATEST(1.0, COALESCE(a.recurrence_interval_avg, 2.5)::FLOAT)
            ) * LN(1.0 + 2.0 * COALESCE(ac.cnt_2026, 0)::FLOAT) > 4.0 THEN 'HEATING'
            ELSE 'STABLE'
        END,
        is_drought_topic = (2026 - COALESCE(a.last_tested_year, 2018)) >= 6
    FROM article_counts ac
    WHERE a.node_id = ac.node_id;
END;
$$;
