-- ============================================================
-- Tark Rebase v1 — Atomic recording of verified numeric claims
--
-- Security:
--   * SECURITY INVOKER
--   * search_path = ''
--   * Transaction advisory lock on canonical_key
--   * Execution granted ONLY to service_role
-- ============================================================

create or replace function public.record_verified_numeric_claim(
  p_ingest_run_id uuid,
  p_canonical_key text,
  p_entity text,
  p_metric text,
  p_period text,
  p_unit text,
  p_syllabus_node_id text,
  p_syllabus_tags text[],
  p_claim_text text,
  p_value_text text,
  p_numeric_value numeric,
  p_value_hash text,
  p_evidence_quote text,
  p_evidence_span_ids text[],
  p_source_id text,
  p_source_url text,
  p_source_body_sha256 text,
  p_story_headline text,
  p_story_url text,
  p_effective_at timestamptz default null,
  p_observed_at timestamptz default timezone('utc', now())
)
returns table (
  claim_id uuid,
  version_id uuid,
  mutation_id uuid,
  sequence text,
  action text,
  changed boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_claim_id uuid;
  v_existing_version_id uuid;
  v_latest_version record;
  v_version_no integer;
  v_version_id uuid;
  v_mutation_id uuid;
  v_sequence bigint;
  v_action text;
  v_reason text;
  v_observed_at timestamptz;
begin
  if p_ingest_run_id is null or p_canonical_key is null or p_value_hash is null then
    raise exception 'Missing required claim parameters';
  end if;

  v_observed_at := coalesce(p_observed_at, timezone('utc', now()));

  -- 1. Acquire transaction-level advisory lock derived from canonical_key hash
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_canonical_key));

  -- 2. Upsert canonical claim entity
  insert into public.news_claims (
    canonical_key,
    entity,
    metric,
    period,
    unit,
    syllabus_node_id,
    syllabus_tags,
    created_at,
    last_observed_at
  ) values (
    p_canonical_key,
    p_entity,
    p_metric,
    p_period,
    p_unit,
    p_syllabus_node_id,
    coalesce(p_syllabus_tags, '{}'::text[]),
    v_observed_at,
    v_observed_at
  )
  on conflict (canonical_key) do update set
    last_observed_at = greatest(public.news_claims.last_observed_at, excluded.last_observed_at),
    syllabus_node_id = coalesce(excluded.syllabus_node_id, public.news_claims.syllabus_node_id),
    syllabus_tags = case
      when pg_catalog.cardinality(excluded.syllabus_tags) > 0 then excluded.syllabus_tags
      else public.news_claims.syllabus_tags
    end
  returning id into v_claim_id;

  -- 3. Check if this exact value hash is already recorded for this claim
  select id into v_existing_version_id
  from public.news_claim_versions
  where public.news_claim_versions.claim_id = v_claim_id
    and public.news_claim_versions.value_hash = p_value_hash;

  if v_existing_version_id is not null then
    -- Value is unchanged; do not emit a new version or mutation
    return query
    select
      v_claim_id as claim_id,
      v_existing_version_id as version_id,
      null::uuid as mutation_id,
      null::text as sequence,
      null::text as action,
      false as changed;
    return;
  end if;

  -- 4. Find the latest existing version for this claim
  select id, version_no into v_latest_version
  from public.news_claim_versions
  where public.news_claim_versions.claim_id = v_claim_id
  order by version_no desc
  limit 1;

  if v_latest_version.id is null then
    -- First observation of this fact => learn
    v_version_no := 1;
    v_action := 'learn';
    v_reason := 'First verified observation for ' || p_entity || ' ' || p_metric || ', ' || p_period || '.';
  else
    -- New verified value for known fact => replace
    v_version_no := v_latest_version.version_no + 1;
    v_action := 'replace';
    v_reason := 'Verified value changed for ' || p_entity || ' ' || p_metric || ', ' || p_period || '.';
  end if;

  -- 5. Insert new claim version
  insert into public.news_claim_versions (
    claim_id,
    version_no,
    claim_text,
    value_text,
    numeric_value,
    value_hash,
    evidence_quote,
    evidence_span_ids,
    source_id,
    source_url,
    source_body_sha256,
    story_headline,
    story_url,
    verification_method,
    effective_at,
    observed_at,
    supersedes_version_id,
    ingest_run_id,
    created_at
  ) values (
    v_claim_id,
    v_version_no,
    p_claim_text,
    p_value_text,
    p_numeric_value,
    p_value_hash,
    p_evidence_quote,
    p_evidence_span_ids,
    p_source_id,
    p_source_url,
    p_source_body_sha256,
    p_story_headline,
    p_story_url,
    'live_cite_or_drop_v1',
    p_effective_at,
    v_observed_at,
    v_latest_version.id,
    p_ingest_run_id,
    v_observed_at
  )
  returning id into v_version_id;

  -- 6. Insert new claim mutation
  insert into public.news_claim_mutations (
    claim_id,
    action,
    previous_version_id,
    current_version_id,
    reason,
    effective_at,
    detected_at,
    ingest_run_id,
    created_at
  ) values (
    v_claim_id,
    v_action,
    v_latest_version.id,
    v_version_id,
    v_reason,
    p_effective_at,
    v_observed_at,
    p_ingest_run_id,
    v_observed_at
  )
  returning id, public.news_claim_mutations.sequence into v_mutation_id, v_sequence;

  -- 7. Monotonically advance the ingest run's ledger sequence watermark
  update public.news_ingest_runs
  set ledger_sequence_through = greatest(public.news_ingest_runs.ledger_sequence_through, v_sequence)
  where id = p_ingest_run_id;

  return query
  select
    v_claim_id as claim_id,
    v_version_id as version_id,
    v_mutation_id as mutation_id,
    v_sequence::text as sequence,
    v_action as action,
    true as changed;
end;
$$;

revoke all on function public.record_verified_numeric_claim(
  uuid, text, text, text, text, text, text, text[], text, text, numeric, text, text, text[], text, text, text, text, text, timestamptz, timestamptz
) from public, anon, authenticated;

grant execute on function public.record_verified_numeric_claim(
  uuid, text, text, text, text, text, text, text[], text, text, numeric, text, text, text[], text, text, text, text, text, timestamptz, timestamptz
) to service_role;
