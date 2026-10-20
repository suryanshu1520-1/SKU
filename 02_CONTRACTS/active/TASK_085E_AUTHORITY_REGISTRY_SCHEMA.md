---
task_id: "TASK_085E"
title: "Authority registry schema: legal tier derived from legal basis"
parent: "TASK_085"
status: "AWAITING_VERIFICATION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
depends_on: ["TASK_085A"]
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 2500
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
Make `policy_entities` a canonical authority registry where `tier_number` can never contradict the legal basis,
every registry row is cited, aliases are indexed, and unresolved mentions go to a review queue.

# 2. Transcluded Context References
- `supabase/migrations/20261017_policy_ripple_graph.sql:30-50` — current `policy_entities` DDL (`tier_number INT CHECK 1..5`, free-text `tier_name`, `parent_statute_or_article`, `neutralized_trap examiner_operator_type`).
- Live contradictions to fix by construction: Textiles Committee (basis "Textiles Committee Act, 1963", stored tier 4); municipal corporation under a state Act stored tier 3.

**Distilled spec** — migration `supabase/migrations/20261021000300_authority_registry.sql`:
```sql
DO $$ BEGIN CREATE TYPE legal_basis_kind AS ENUM ('constitution_article','central_act','state_act',
  'executive_order','society_registration','companies_act_section8','trust','companies_act_cpse');
EXCEPTION WHEN duplicate_object THEN null; END $$;
ALTER TABLE public.policy_entities
  ADD COLUMN IF NOT EXISTS legal_basis_kind legal_basis_kind,
  ADD COLUMN IF NOT EXISTS legal_basis_ref TEXT,
  ADD COLUMN IF NOT EXISTS jurisdiction TEXT NOT NULL DEFAULT 'union' CHECK (jurisdiction IN ('union','state')),
  ADD COLUMN IF NOT EXISTS kind TEXT CHECK (kind IN ('ministry','department','constitutional_body','statutory_body',
     'regulator','attached_office','society','section8','cpse','trust','local_body')),
  ADD COLUMN IF NOT EXISTS parent_entity_slug TEXT REFERENCES public.policy_entities(entity_slug),
  ADD COLUMN IF NOT EXISTS source_url TEXT;
-- legacy NOT NULL columns with no default (20261017_policy_ripple_graph.sql) would reject registry rows
ALTER TABLE public.policy_entities ALTER COLUMN parent_ministry DROP NOT NULL,
  ALTER COLUMN tier_description DROP NOT NULL, ALTER COLUMN trap_explanation DROP NOT NULL;
DO $$ BEGIN ALTER TABLE public.policy_entities ADD CONSTRAINT policy_entities_registry_cited
  CHECK (provenance <> 'registry' OR (source_url ~ '^https://' AND legal_basis_kind IS NOT NULL AND legal_basis_ref IS NOT NULL));
EXCEPTION WHEN duplicate_object THEN null; END $$;   -- idempotent; `provenance` comes from 085A
CREATE OR REPLACE FUNCTION public.tier_from_basis(k legal_basis_kind) RETURNS INT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE k WHEN 'constitution_article' THEN 1 WHEN 'central_act' THEN 2 WHEN 'state_act' THEN 2
    WHEN 'executive_order' THEN 3 WHEN 'society_registration' THEN 4 WHEN 'companies_act_section8' THEN 4
    WHEN 'trust' THEN 4 WHEN 'companies_act_cpse' THEN 5 END $$;
CREATE OR REPLACE FUNCTION public.policy_entities_derive_tier() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.legal_basis_kind IS NOT NULL THEN
    NEW.tier_number := public.tier_from_basis(NEW.legal_basis_kind);
    NEW.tier_name := CASE NEW.tier_number WHEN 1 THEN 'Constitutional body' WHEN 2 THEN 'Statutory body'
      WHEN 3 THEN 'Executive / attached office' WHEN 4 THEN 'Registered society / Section-8 / trust'
      WHEN 5 THEN 'Public sector undertaking' END;
  END IF; RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_policy_entities_tier ON public.policy_entities;
CREATE TRIGGER trg_policy_entities_tier BEFORE INSERT OR UPDATE ON public.policy_entities
  FOR EACH ROW EXECUTE FUNCTION public.policy_entities_derive_tier();
CREATE TABLE IF NOT EXISTS public.policy_entity_aliases (
  alias_norm TEXT PRIMARY KEY, entity_slug TEXT NOT NULL REFERENCES public.policy_entities(entity_slug) ON DELETE CASCADE,
  alias_display TEXT NOT NULL, lang TEXT NOT NULL CHECK (lang IN ('en','hi')));
CREATE TABLE IF NOT EXISTS public.policy_entity_review (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, mention TEXT NOT NULL, mention_norm TEXT NOT NULL,
  quote TEXT NOT NULL, source_url TEXT NOT NULL, candidates JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','rejected')),
  resolved_slug TEXT REFERENCES public.policy_entities(entity_slug), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mention_norm, source_url));
```
Plus RLS: public SELECT on `policy_entity_aliases`; review table service-role only. TS mirror
`server-lib/policy/tiers.ts` exporting `TIER_FROM_BASIS: Record<LegalBasisKind, 1|2|3|4|5>` and `TIER_NAME`.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` the existing DDL slice.
2. `write_to_file` migration, `server-lib/policy/tiers.ts`.
3. `write_to_file` `scripts/tests/radar/tiers.test.ts` — asserts the TS map, and parses the migration text to assert each `WHEN '<kind>' THEN <n>` pair equals the TS map (drift guard). Picked up by the `test:radar` glob.
4. `call_mcp_tool` supabase `apply_migration` **on a development branch only if one exists**; otherwise skip.
5. `run_command` `npm run test:radar`, `npm run lint`.

# 4. Deterministic Acceptance Criteria
- Drift-guard test passes for all 8 kinds.
- On a dev branch (if applied): `INSERT … legal_basis_kind='central_act', tier_number=4` stores `tier_number=2`; inserting `provenance='registry'` without `source_url` fails with `policy_entities_registry_cited`.
- Existing rows untouched except trigger behaviour on future updates; no row deleted.
- `npm run lint`, `npm run test:radar` exit 0.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - view_file
    - run_command
    - replace_file_content
    - write_to_file
    - call_mcp_tool
  duration_ms: 12500
  exit_codes: { test_radar: 0, lint: 0 }
  migration_applied: "none"
diff: |
  supabase/migrations/20261021000300_authority_registry.sql:
    + legal_basis_kind ENUM (8 legal basis kinds)
    + Extended policy_entities columns (legal_basis_kind, legal_basis_ref, jurisdiction, kind, parent_entity_slug, source_url)
    + Softened legacy NOT NULL columns without default (parent_ministry, tier_description, trap_explanation)
    + Added CHECK constraint policy_entities_registry_cited
    + Function tier_from_basis(k) and trigger trg_policy_entities_tier deriving tier_number and tier_name
    + Created policy_entity_aliases table with RLS public read
    + Created policy_entity_review table with service-role RLS
  server-lib/policy/tiers.ts:
    + LegalBasisKind, TierNumber types
    + TIER_FROM_BASIS mapping, TIER_NAME mapping
    + tierFromBasis(k) and tierName(t) helpers
  scripts/tests/radar/tiers.test.ts:
    + TypeScript mapping unit tests
    + Drift guard verifying SQL migration function matches TypeScript mirror exactly
```
