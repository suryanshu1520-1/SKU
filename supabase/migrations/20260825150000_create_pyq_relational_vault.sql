-- 20260825150000_create_pyq_relational_vault.sql
-- Relational PYQ Schema for 25-Year UPSC CSE Prelims & Mains (2001–2025)
-- Supports Examiner Psyche Engine, Pareto Analysis, Qualifier Correlation, and Rubric Generation.

-- 1. Syllabus Nodes Ontology Table
CREATE TABLE IF NOT EXISTS public.syllabus_nodes (
    id TEXT PRIMARY KEY, -- e.g. 'GS1.HIS.ANCIENT', 'GS2.POL.CONSTITUTION'
    paper TEXT NOT NULL, -- 'GS1', 'GS2', 'GS3', 'GS4', 'ESSAY', 'CSAT', 'PRELIMS'
    parent TEXT REFERENCES public.syllabus_nodes(id) ON DELETE SET NULL,
    path JSONB NOT NULL DEFAULT '[]'::jsonb,
    gloss TEXT NOT NULL,
    entities JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Prelims Questions Table
CREATE TABLE IF NOT EXISTS public.pyq_prelims (
    id TEXT PRIMARY KEY, -- e.g., 'UPSC_PRE_2023_GS1_Q042'
    year INTEGER NOT NULL CHECK (year BETWEEN 2001 AND 2025),
    paper TEXT NOT NULL CHECK (paper IN ('GS-1', 'GS-2')),
    question_num INTEGER NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('single_choice', 'multi_statement', 'pair_matching', 'assertion_reason', 'passage_comprehension')),
    stem TEXT NOT NULL,
    statements JSONB DEFAULT '[]'::jsonb,
    options JSONB NOT NULL, -- {"a": "...", "b": "...", "c": "...", "d": "..."}
    official_key TEXT NOT NULL CHECK (official_key IN ('a', 'b', 'c', 'd', 'dropped')),
    node_id TEXT NOT NULL REFERENCES public.syllabus_nodes(id) ON DELETE RESTRICT,
    qualifiers JSONB DEFAULT '[]'::jsonb, -- ['only', 'all', 'drastically', 'steadily', etc.]
    is_dropped BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Mains Questions Table
CREATE TABLE IF NOT EXISTS public.pyq_mains (
    id TEXT PRIMARY KEY, -- e.g., 'UPSC_MAIN_2023_GS2_Q04'
    year INTEGER NOT NULL CHECK (year BETWEEN 2001 AND 2025),
    paper TEXT NOT NULL CHECK (paper IN ('GS-1', 'GS-2', 'GS-3', 'GS-4', 'ESSAY')),
    question_num INTEGER NOT NULL,
    sub_part TEXT, -- 'a', 'b', or NULL
    marks INTEGER NOT NULL,
    word_limit INTEGER,
    prompt TEXT NOT NULL,
    directive_verb TEXT, -- 'Critically Analyze', 'Elucidate', 'Discuss', 'Examine', 'Evaluate', 'Comment', etc.
    node_id TEXT NOT NULL REFERENCES public.syllabus_nodes(id) ON DELETE RESTRICT,
    nature TEXT NOT NULL CHECK (nature IN ('static', 'dynamic_trigger_static_anchor', 'purely_contemporary')),
    trigger_entity TEXT, -- e.g., '22nd Law Commission Report', 'COP28'
    rubric_level_1 TEXT, -- Misunderstanding / Off-topic criteria
    rubric_level_2 TEXT, -- Definition / Rote retrieval criteria
    rubric_level_3 TEXT, -- Dialectical / Framework synthesis criteria
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Syllabus Node Analytics Ledger
CREATE TABLE IF NOT EXISTS public.pyq_node_analytics (
    node_id TEXT PRIMARY KEY REFERENCES public.syllabus_nodes(id) ON DELETE CASCADE,
    total_prelims_count INTEGER DEFAULT 0,
    total_mains_count INTEGER DEFAULT 0,
    total_marks_allocated INTEGER DEFAULT 0,
    last_tested_year INTEGER,
    recurrence_interval_avg FLOAT,
    is_drought_topic BOOLEAN DEFAULT FALSE,
    top_directive_verbs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_prelims_node ON public.pyq_prelims(node_id);
CREATE INDEX IF NOT EXISTS idx_mains_node ON public.pyq_mains(node_id);
CREATE INDEX IF NOT EXISTS idx_prelims_year ON public.pyq_prelims(year);
CREATE INDEX IF NOT EXISTS idx_mains_year ON public.pyq_mains(year);
CREATE INDEX IF NOT EXISTS idx_prelims_paper ON public.pyq_prelims(paper);
CREATE INDEX IF NOT EXISTS idx_mains_paper ON public.pyq_mains(paper);
CREATE INDEX IF NOT EXISTS idx_prelims_type ON public.pyq_prelims(question_type);

-- RLS Policies (Public Read Access for Analytics & Test Arena)
ALTER TABLE public.syllabus_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pyq_prelims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pyq_mains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pyq_node_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to syllabus_nodes" ON public.syllabus_nodes FOR SELECT USING (true);
CREATE POLICY "Allow public read access to pyq_prelims" ON public.pyq_prelims FOR SELECT USING (true);
CREATE POLICY "Allow public read access to pyq_mains" ON public.pyq_mains FOR SELECT USING (true);
CREATE POLICY "Allow public read access to pyq_node_analytics" ON public.pyq_node_analytics FOR SELECT USING (true);
