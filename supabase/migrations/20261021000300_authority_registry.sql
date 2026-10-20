-- supabase/migrations/20261021000300_authority_registry.sql
-- Migration: TASK_085E Authority Registry Schema (Legal basis -> Tier trigger & entity aliases/review)

DO $$ BEGIN
  CREATE TYPE legal_basis_kind AS ENUM (
    'constitution_article',
    'central_act',
    'state_act',
    'executive_order',
    'society_registration',
    'companies_act_section8',
    'trust',
    'companies_act_cpse'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.policy_entities
  ADD COLUMN IF NOT EXISTS legal_basis_kind legal_basis_kind,
  ADD COLUMN IF NOT EXISTS legal_basis_ref TEXT,
  ADD COLUMN IF NOT EXISTS jurisdiction TEXT NOT NULL DEFAULT 'union' CHECK (jurisdiction IN ('union','state')),
  ADD COLUMN IF NOT EXISTS kind TEXT CHECK (kind IN (
    'ministry',
    'department',
    'constitutional_body',
    'statutory_body',
    'regulator',
    'attached_office',
    'society',
    'section8',
    'cpse',
    'trust',
    'local_body'
  )),
  ADD COLUMN IF NOT EXISTS parent_entity_slug TEXT REFERENCES public.policy_entities(entity_slug),
  ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Legacy NOT NULL columns with no default (20261017_policy_ripple_graph.sql) would reject registry rows
ALTER TABLE public.policy_entities
  ALTER COLUMN parent_ministry DROP NOT NULL,
  ALTER COLUMN tier_description DROP NOT NULL,
  ALTER COLUMN trap_explanation DROP NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.policy_entities ADD CONSTRAINT policy_entities_registry_cited
    CHECK (provenance <> 'registry' OR (source_url ~ '^https://' AND legal_basis_kind IS NOT NULL AND legal_basis_ref IS NOT NULL));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE OR REPLACE FUNCTION public.tier_from_basis(k legal_basis_kind) RETURNS INT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE k
    WHEN 'constitution_article' THEN 1
    WHEN 'central_act' THEN 2
    WHEN 'state_act' THEN 2
    WHEN 'executive_order' THEN 3
    WHEN 'society_registration' THEN 4
    WHEN 'companies_act_section8' THEN 4
    WHEN 'trust' THEN 4
    WHEN 'companies_act_cpse' THEN 5
  END
$$;

CREATE OR REPLACE FUNCTION public.policy_entities_derive_tier() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.legal_basis_kind IS NOT NULL THEN
    NEW.tier_number := public.tier_from_basis(NEW.legal_basis_kind);
    NEW.tier_name := CASE NEW.tier_number
      WHEN 1 THEN 'Constitutional body'
      WHEN 2 THEN 'Statutory body'
      WHEN 3 THEN 'Executive / attached office'
      WHEN 4 THEN 'Registered society / Section-8 / trust'
      WHEN 5 THEN 'Public sector undertaking'
    END;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_policy_entities_tier ON public.policy_entities;
CREATE TRIGGER trg_policy_entities_tier BEFORE INSERT OR UPDATE ON public.policy_entities
  FOR EACH ROW EXECUTE FUNCTION public.policy_entities_derive_tier();

CREATE TABLE IF NOT EXISTS public.policy_entity_aliases (
  alias_norm TEXT PRIMARY KEY,
  entity_slug TEXT NOT NULL REFERENCES public.policy_entities(entity_slug) ON DELETE CASCADE,
  alias_display TEXT NOT NULL,
  lang TEXT NOT NULL CHECK (lang IN ('en','hi'))
);

CREATE TABLE IF NOT EXISTS public.policy_entity_review (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  mention TEXT NOT NULL,
  mention_norm TEXT NOT NULL,
  quote TEXT NOT NULL,
  source_url TEXT NOT NULL,
  candidates JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','rejected')),
  resolved_slug TEXT REFERENCES public.policy_entities(entity_slug),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mention_norm, source_url)
);

ALTER TABLE public.policy_entity_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_entity_review ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public read policy_entity_aliases"
    ON public.policy_entity_aliases FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
