-- ==============================================================================
-- Migration: Grant service_role permissions on QBank Final Edition tables
-- ==============================================================================

grant all on table public.qbank_releases to service_role;
grant all on table public.qbank_sources to service_role;
grant all on table public.qbank_questions to service_role;
grant all on table public.qbank_keys to service_role;
grant all on table public.qbank_occurrences to service_role;
grant all on table public.qbank_explanations to service_role;
grant all on table public.qbank_mains_questions to service_role;
grant all on table public.qbank_discrepancies to service_role;
