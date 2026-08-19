-- ============================================================
-- Tark Rebase v1 — Proof of Omission decision ledger
--
-- Candidate-level decisions remain service-role only. A later authenticated or
-- public receipt endpoint may expose aggregate counts from news_ingest_runs;
-- raw candidate URLs and diagnostics are never directly exposed.
-- ============================================================

create table if not exists public.news_ingest_decisions (
  id bigint generated always as identity primary key,
  ingest_run_id uuid not null references public.news_ingest_runs(id) on delete cascade,
  source_id text not null,
  candidate_url text,
  candidate_fingerprint text not null,
  decision text not null
    check (decision in (
      'included',
      'dropped_no_text',
      'excluded',
      'duplicate',
      'clustered',
      'unsupported',
      'budget_omission',
      'failed'
    )),
  reason_code text not null,
  claim_id uuid references public.news_claims(id) on delete set null,
  mutation_id uuid references public.news_claim_mutations(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  observed_at timestamptz not null default timezone('utc', now()),
  constraint news_ingest_decisions_run_fingerprint_unique
    unique (ingest_run_id, candidate_fingerprint)
);

create index if not exists idx_news_ingest_decisions_run_decision
  on public.news_ingest_decisions (ingest_run_id, decision);
create index if not exists idx_news_ingest_decisions_claim
  on public.news_ingest_decisions (claim_id)
  where claim_id is not null;

alter table public.news_ingest_decisions enable row level security;

revoke all on table public.news_ingest_decisions from public, anon, authenticated;
revoke all on sequence public.news_ingest_decisions_id_seq from public, anon, authenticated;

grant all on table public.news_ingest_decisions to service_role;
grant usage, select on sequence public.news_ingest_decisions_id_seq to service_role;
