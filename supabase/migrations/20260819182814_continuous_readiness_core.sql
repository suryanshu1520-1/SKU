-- ============================================================
-- Tark Rebase v1 — verified numeric claim mutations
--
-- V1 is intentionally narrow. It records only:
--   * learn   — first live, cite-or-drop observation of a canonical numeric fact
--   * replace — the same entity/metric/period/unit receives a new verified value
--
-- No legacy current_affairs row is backfilled. No watch/retire inference is
-- permitted. The authenticated API is the only user-facing boundary.
-- ============================================================

create table if not exists public.news_ingest_runs (
  id uuid primary key default gen_random_uuid(),
  pipeline_version text not null default 'rebase-v1',
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  status text not null default 'running'
    check (status in ('running', 'success', 'degraded', 'warning', 'failed')),
  requested_sources text[] not null default '{}',
  result jsonb not null default '{}'::jsonb
    check (jsonb_typeof(result) = 'object'),
  ledger_sequence_through bigint not null default 0 check (ledger_sequence_through >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  constraint news_ingest_runs_time_order
    check (completed_at is null or completed_at >= started_at)
);

create table if not exists public.news_claims (
  id uuid primary key default gen_random_uuid(),
  canonical_key text not null unique,
  entity text not null,
  metric text not null,
  period text not null,
  unit text not null,
  syllabus_node_id text,
  syllabus_tags text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  last_observed_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.news_claim_versions (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.news_claims(id) on delete cascade,
  version_no integer not null check (version_no > 0),
  claim_text text not null,
  value_text text not null,
  numeric_value numeric not null,
  value_hash text not null check (value_hash ~ '^[0-9a-f]{64}$'),
  evidence_quote text not null,
  evidence_span_ids text[] not null check (cardinality(evidence_span_ids) > 0),
  source_id text not null,
  source_url text not null,
  source_body_sha256 text not null check (source_body_sha256 ~ '^[0-9a-f]{64}$'),
  story_headline text not null,
  story_url text not null,
  verification_method text not null default 'live_cite_or_drop_v1'
    check (verification_method = 'live_cite_or_drop_v1'),
  effective_at timestamptz,
  observed_at timestamptz not null default timezone('utc', now()),
  supersedes_version_id uuid references public.news_claim_versions(id) on delete set null,
  ingest_run_id uuid not null references public.news_ingest_runs(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  constraint news_claim_versions_claim_version_unique unique (claim_id, version_no),
  constraint news_claim_versions_claim_value_unique unique (claim_id, value_hash)
);

create table if not exists public.news_claim_mutations (
  id uuid primary key default gen_random_uuid(),
  sequence bigint generated always as identity unique not null,
  claim_id uuid not null references public.news_claims(id) on delete cascade,
  action text not null check (action in ('learn', 'replace')),
  previous_version_id uuid references public.news_claim_versions(id) on delete restrict,
  current_version_id uuid not null references public.news_claim_versions(id) on delete restrict,
  reason text not null,
  effective_at timestamptz,
  detected_at timestamptz not null default timezone('utc', now()),
  ingest_run_id uuid not null references public.news_ingest_runs(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  constraint news_claim_mutations_version_shape check (
    (action = 'learn' and previous_version_id is null)
    or (
      action = 'replace'
      and previous_version_id is not null
      and previous_version_id <> current_version_id
    )
  )
);

create table if not exists public.user_rebase_checkpoints (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_mutation_sequence bigint not null default 0 check (last_mutation_sequence >= 0),
  last_run_id uuid references public.news_ingest_runs(id) on delete set null,
  verified_through timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_news_ingest_runs_completed
  on public.news_ingest_runs (completed_at desc)
  where completed_at is not null;
create index if not exists idx_news_claims_entity_metric
  on public.news_claims (entity, metric, period, unit);
create index if not exists idx_news_claim_versions_claim_observed
  on public.news_claim_versions (claim_id, observed_at desc);
create index if not exists idx_news_claim_versions_ingest_run
  on public.news_claim_versions (ingest_run_id);
create index if not exists idx_news_claim_mutations_sequence
  on public.news_claim_mutations (sequence);
create index if not exists idx_news_claim_mutations_run
  on public.news_claim_mutations (ingest_run_id, sequence);

alter table public.news_ingest_runs enable row level security;
alter table public.news_claims enable row level security;
alter table public.news_claim_versions enable row level security;
alter table public.news_claim_mutations enable row level security;
alter table public.user_rebase_checkpoints enable row level security;

-- These tables are internal. Authenticated users reach them only through the
-- bearer-authenticated Rebase handlers, which derive identity from the JWT.
revoke all on table public.news_ingest_runs from public, anon, authenticated;
revoke all on table public.news_claims from public, anon, authenticated;
revoke all on table public.news_claim_versions from public, anon, authenticated;
revoke all on table public.news_claim_mutations from public, anon, authenticated;
revoke all on table public.user_rebase_checkpoints from public, anon, authenticated;
revoke all on sequence public.news_claim_mutations_sequence_seq from public, anon, authenticated;

grant all on table public.news_ingest_runs to service_role;
grant all on table public.news_claims to service_role;
grant all on table public.news_claim_versions to service_role;
grant all on table public.news_claim_mutations to service_role;
grant all on table public.user_rebase_checkpoints to service_role;
grant usage, select on sequence public.news_claim_mutations_sequence_seq to service_role;
