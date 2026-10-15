-- supabase/migrations/20261015_examiner_psyche_engine.sql
-- Migration: Deterministic "Examiner's Psyche" 7-Operator Engine
-- TASK_080: Declares examiner_operator_type enum, extends question & node tables, and creates user_psyche_telemetry.

-- 1. Create the Deterministic 7-Operator Enum
DO $$ BEGIN
    CREATE TYPE examiner_operator_type AS ENUM (
        'PSY_01_INST_SWAP',
        'PSY_02_QUAL_POLARITY',
        'PSY_03_LEGAL_TIER',
        'PSY_04_CAUSAL_INV',
        'PSY_05_SCOPE_MUTATE',
        'PSY_06_PAIR_DECOY',
        'PSY_07_TRUE_NON_CAUSAL'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Extend pyq_prelims with Examiner Psyche Metadata
ALTER TABLE IF EXISTS public.pyq_prelims
    ADD COLUMN IF NOT EXISTS primary_operator examiner_operator_type,
    ADD COLUMN IF NOT EXISTS statement_dissection JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS statutory_anchor TEXT;

-- 3. Extend static_questions (Test Arena & Diagnostic Pool)
ALTER TABLE IF EXISTS public.static_questions
    ADD COLUMN IF NOT EXISTS primary_operator examiner_operator_type,
    ADD COLUMN IF NOT EXISTS statement_dissection JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS statutory_anchor TEXT,
    ADD COLUMN IF NOT EXISTS historical_twin_pyq_id TEXT REFERENCES public.pyq_prelims(id);

-- 4. Extend pyq_node_analytics with Empirical Operator Base Rates
ALTER TABLE IF EXISTS public.pyq_node_analytics
    ADD COLUMN IF NOT EXISTS operator_distribution JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS dominant_operator examiner_operator_type,
    ADD COLUMN IF NOT EXISTS extreme_qualifier_false_rate FLOAT DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS contingent_qualifier_true_rate FLOAT DEFAULT 0.0;

-- 5. User Psyche Telemetry & 50:50 Ledger Table
CREATE TABLE IF NOT EXISTS public.user_psyche_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    question_id TEXT NOT NULL,
    node_id TEXT NOT NULL REFERENCES public.syllabus_nodes(id) ON DELETE CASCADE,
    operator_tested examiner_operator_type NOT NULL,
    selected_option TEXT NOT NULL CHECK (selected_option IN ('a', 'b', 'c', 'd')),
    official_key TEXT NOT NULL CHECK (official_key IN ('a', 'b', 'c', 'd')),
    is_correct BOOLEAN NOT NULL,
    marks_delta NUMERIC(4,2) NOT NULL, -- +2.00 or -0.66
    is_50_50_call BOOLEAN DEFAULT FALSE,
    eliminated_options JSONB DEFAULT '[]'::jsonb,
    response_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning fast aggregations and cross-room lookups
CREATE INDEX IF NOT EXISTS idx_pyq_prelims_operator ON public.pyq_prelims(primary_operator);
CREATE INDEX IF NOT EXISTS idx_static_q_operator ON public.static_questions(primary_operator);
CREATE INDEX IF NOT EXISTS idx_user_psyche_user_op ON public.user_psyche_telemetry(user_id, operator_tested);
CREATE INDEX IF NOT EXISTS idx_user_psyche_user_node ON public.user_psyche_telemetry(user_id, node_id);
CREATE INDEX IF NOT EXISTS idx_user_psyche_user_5050 ON public.user_psyche_telemetry(user_id, is_50_50_call);

-- RLS Policies
ALTER TABLE public.user_psyche_telemetry ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can insert their own psyche telemetry"
        ON public.user_psyche_telemetry
        FOR INSERT
        WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can view their own psyche telemetry"
        ON public.user_psyche_telemetry
        FOR SELECT
        USING (auth.uid() = user_id OR auth.uid() IS NULL);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
