-- ============================================================================
-- Migration: 20261017_policy_ripple_graph.sql
-- Policy Ripple Radar Relational Graph, 5 Legal Tiers & Examiner Psyche Bridge
-- ============================================================================

-- 1. Master Policy Chains (Radar Centers bound to Syllabus & PYQ Vault)
CREATE TABLE IF NOT EXISTS public.policy_chains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id TEXT UNIQUE NOT NULL,                                 -- e.g., 'CHAIN_01_SEMICON_NEXUS'
    title TEXT NOT NULL,
    node_id TEXT NOT NULL REFERENCES public.syllabus_nodes(id),    -- Master Join Key to 137-node syllabus graph
    primary_pillar TEXT NOT NULL,                                  -- Display label: 'GS3 Science & Technology'
    lead_driver TEXT NOT NULL,                                     -- Root policy catalyst
    historical_twin_pyq_id TEXT REFERENCES public.pyq_prelims(id), -- Closest 2000-2025 PYQ anchor
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dormant', 'resolved')),
    has_sync_debt BOOLEAN DEFAULT FALSE,                           -- Flagged true if a recent ripple mutated parameters
    boss_mcq_generated_at_node_count INT DEFAULT 0,                -- Milestone tracking for 3-statement synthesis MCQs
    trigger_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Downstream Nodes / Concentric Ripples
-- r0 = Sovereign Origin, r1 = Statutory/Rules, r2 = Inter-Ministerial Execution, r3 = Federal/Rollout
CREATE TABLE IF NOT EXISTS public.policy_chain_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id TEXT NOT NULL REFERENCES public.policy_chains(chain_id) ON DELETE CASCADE,
    ring_depth INT NOT NULL CHECK (ring_depth BETWEEN 0 AND 3),    -- 0: Origin, 1: Statutory/Rules, 2: Execution, 3: Rollout
    step_order INT NOT NULL,                                       -- Chronological sequence within chain
    ministry TEXT NOT NULL,
    action TEXT NOT NULL,
    mutates_prior_fact BOOLEAN DEFAULT FALSE,                      -- Sync Debt trigger
    dispatch_id TEXT NOT NULL,                                     -- Reference to pib_digests.id / source dispatch
    pib_url TEXT,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (chain_id, dispatch_id)                                 -- Idempotency barrier
);

-- 3. 5 Legal Tiers Authority Registry & Examiner Psyche Traps
CREATE TABLE IF NOT EXISTS public.policy_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_slug TEXT UNIQUE NOT NULL,                              -- Canonical key: 'ENT_ISM', 'ENT_NFRA', 'ENT_ECI'
    authority TEXT NOT NULL,                                       -- Display name: 'India Semiconductor Mission (ISM)'
    aliases TEXT[] DEFAULT '{}',                                   -- ['ISM', 'India Semiconductor Mission']
    parent_ministry TEXT NOT NULL,                                 -- e.g., 'Ministry of Electronics and IT (MeitY)'
    appearances_count INT DEFAULT 1,
    tier_number INT NOT NULL CHECK (tier_number BETWEEN 1 AND 5),  -- 1: Const, 2: Stat, 3: Exec, 4: Society, 5: PSU
    tier_name TEXT NOT NULL,
    parent_statute_or_article TEXT,
    tier_description TEXT NOT NULL,
    neutralized_trap examiner_operator_type NOT NULL DEFAULT 'PSY_03_LEGAL_TIER', -- Strictly typed to TASK_080 enum
    trap_explanation TEXT NOT NULL,                                -- Exact 1-line trap defense for BAY_02 Dissection
    last_dispatch_id TEXT,                                         -- Prevents double-counting on cron retries
    last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_policy_chains_node ON public.policy_chains(node_id);
CREATE INDEX IF NOT EXISTS idx_policy_nodes_chain_ring ON public.policy_chain_nodes(chain_id, ring_depth, step_order);
CREATE INDEX IF NOT EXISTS idx_policy_entities_tier ON public.policy_entities(tier_number);
CREATE INDEX IF NOT EXISTS idx_policy_entities_slug ON public.policy_entities(entity_slug);

-- RLS Policies
ALTER TABLE public.policy_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_chain_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_entities ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Allow public read access to policy_chains"
        ON public.policy_chains FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public read access to policy_chain_nodes"
        ON public.policy_chain_nodes FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public read access to policy_entities"
        ON public.policy_entities FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Service role full access for cron jobs
DO $$ BEGIN
    CREATE POLICY "Allow service role write access to policy_chains"
        ON public.policy_chains FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow service role write access to policy_chain_nodes"
        ON public.policy_chain_nodes FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow service role write access to policy_entities"
        ON public.policy_entities FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- ATOMIC IDEMPOTENT TRANSACTION RPC: upsert_policy_ripple
-- ============================================================================
CREATE OR REPLACE FUNCTION public.upsert_policy_ripple(
    p_classification TEXT,
    p_chain_id TEXT,
    p_chain_proposal JSONB,
    p_node_step JSONB,
    p_dispatch_id TEXT,
    p_pib_url TEXT,
    p_entities JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_chain_id TEXT := p_chain_id;
    v_next_step INT;
    v_entity JSONB;
    v_entity_slug TEXT;
BEGIN
    -- 1. Handle New Root Policy Trigger
    IF p_classification = 'NEW_ROOT_TRIGGER' AND p_chain_proposal IS NOT NULL THEN
        v_target_chain_id := p_chain_proposal->>'chain_id';
        INSERT INTO public.policy_chains (
            chain_id, title, node_id, primary_pillar, lead_driver, historical_twin_pyq_id
        ) VALUES (
            v_target_chain_id,
            p_chain_proposal->>'title',
            p_chain_proposal->>'node_id',
            p_chain_proposal->>'primary_pillar',
            p_chain_proposal->>'lead_driver',
            p_chain_proposal->>'historical_twin_pyq_id'
        )
        ON CONFLICT (chain_id) DO UPDATE SET
            title = EXCLUDED.title,
            primary_pillar = EXCLUDED.primary_pillar,
            lead_driver = EXCLUDED.lead_driver,
            updated_at = NOW();
    END IF;

    -- 2. Handle Chain Ripple Node Attachment (if valid chain & step provided)
    IF v_target_chain_id IS NOT NULL AND p_node_step IS NOT NULL THEN
        -- Compute next chronological step_order
        SELECT COALESCE(MAX(step_order) + 1, 0)
        INTO v_next_step
        FROM public.policy_chain_nodes
        WHERE chain_id = v_target_chain_id;

        INSERT INTO public.policy_chain_nodes (
            chain_id, ring_depth, step_order, ministry, action,
            mutates_prior_fact, dispatch_id, pib_url, published_at
        ) VALUES (
            v_target_chain_id,
            (p_node_step->>'ring_depth')::INT,
            v_next_step,
            p_node_step->>'ministry',
            p_node_step->>'action',
            COALESCE((p_node_step->>'mutates_prior_fact')::BOOLEAN, FALSE),
            p_dispatch_id,
            p_pib_url,
            NOW()
        )
        ON CONFLICT (chain_id, dispatch_id) DO UPDATE SET
            action = EXCLUDED.action,
            mutates_prior_fact = EXCLUDED.mutates_prior_fact;

        -- If prior fact was mutated, trigger Sync Debt on the master chain
        IF (p_node_step->>'mutates_prior_fact')::BOOLEAN IS TRUE THEN
            UPDATE public.policy_chains
            SET has_sync_debt = TRUE, updated_at = NOW()
            WHERE chain_id = v_target_chain_id;
        END IF;
    END IF;

    -- 3. Idempotent Entity Extraction & Trap Upsert
    IF p_entities IS NOT NULL AND jsonb_array_length(p_entities) > 0 THEN
        FOR v_entity IN SELECT * FROM jsonb_array_elements(p_entities)
        LOOP
            v_entity_slug := v_entity->>'entity_slug';

            INSERT INTO public.policy_entities (
                entity_slug, authority, aliases, parent_ministry,
                tier_number, tier_name, parent_statute_or_article,
                tier_description, neutralized_trap, trap_explanation,
                appearances_count, last_dispatch_id, last_seen_at
            ) VALUES (
                v_entity_slug,
                v_entity->>'authority',
                ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_entity->'aliases', '[]'::jsonb))),
                v_entity->>'parent_ministry',
                (v_entity->>'tier_number')::INT,
                v_entity->>'tier_name',
                v_entity->>'parent_statute_or_article',
                v_entity->>'tier_description',
                (v_entity->>'neutralized_trap')::examiner_operator_type,
                v_entity->>'trap_explanation',
                1,
                p_dispatch_id,
                NOW()
            )
            ON CONFLICT (entity_slug) DO UPDATE SET
                appearances_count = CASE 
                    WHEN public.policy_entities.last_dispatch_id = p_dispatch_id 
                    THEN public.policy_entities.appearances_count
                    ELSE public.policy_entities.appearances_count + 1 
                END,
                last_dispatch_id = p_dispatch_id,
                last_seen_at = NOW();
        END LOOP;
    END IF;

    RETURN jsonb_build_object('success', true, 'chain_id', v_target_chain_id);
END;
$$;
