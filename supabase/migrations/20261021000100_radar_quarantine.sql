-- Migration: 20261021000100_radar_quarantine.sql
-- Description: Quarantine seeded nodes and mark non-observed entities for human review

ALTER TABLE public.policy_chain_nodes ADD COLUMN IF NOT EXISTS provenance TEXT NOT NULL DEFAULT 'observed'
  CHECK (provenance IN ('seed','observed'));

UPDATE public.policy_chain_nodes 
SET provenance = 'seed' 
WHERE dispatch_id LIKE 'DISP\_%' ESCAPE '\' OR pib_url IS NULL;

ALTER TABLE public.policy_entities ADD COLUMN IF NOT EXISTS provenance TEXT NOT NULL DEFAULT 'llm_legacy'
  CHECK (provenance IN ('seed','registry','llm_legacy'));
