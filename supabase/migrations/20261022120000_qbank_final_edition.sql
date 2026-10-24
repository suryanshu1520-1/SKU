-- ==============================================================================
-- Migration: QBank Final Edition Schema (Additive Release Tables)
-- Release: final-2026-10
--
-- Description:
--   Creates 8 release tables for canonical question releases, keeping keys and
--   explanations locked down away from public / anon access.
--   Only qbank_releases, qbank_questions, and qbank_mains_questions are readable
--   by anon and authenticated.
-- ==============================================================================

-- 1. qbank_releases
create table if not exists public.qbank_releases (
  release_id text primary key,
  created_at timestamptz not null default now(),
  manifest_sha256 text not null,
  counts jsonb not null default '{}'::jsonb,
  notes text
);

-- 2. qbank_sources
create table if not exists public.qbank_sources (
  release_id text not null references public.qbank_releases (release_id),
  document_id text not null,
  publisher text not null,
  url text not null,
  sha256 text not null,
  bytes bigint,
  pages int,
  retrieved_at timestamptz,
  source_status text not null,
  primary key (release_id, document_id)
);

-- 3. qbank_questions (No key, answer, or explanation column)
create table if not exists public.qbank_questions (
  release_id text not null references public.qbank_releases (release_id),
  canonical_id text not null,
  year int check (year between 2011 and 2026),
  stage text check (stage = 'Prelims'),
  paper text check (paper in ('GS-1', 'GS-2')),
  booklet_series text check (booklet_series in ('A', 'B', 'C', 'D')),
  question_number int check (question_number > 0),
  stem text not null,
  statements jsonb,
  passage text,
  options jsonb not null,
  figures jsonb,
  instruction_refs jsonb,
  format text,
  topic text,
  difficulty text,
  status text check (status in ('complete', 'incomplete')),
  eligibility jsonb not null,
  content_sha256 text not null,
  primary key (release_id, canonical_id)
);

-- 4. qbank_keys
create table if not exists public.qbank_keys (
  release_id text not null,
  canonical_id text not null,
  authority text not null check (authority in ('official-final', 'official-provisional', 'secondary-claimed', 'consensus', 'adjudicated', 'withdrawn', 'unavailable')),
  key text check (key in ('a', 'b', 'c', 'd')),
  accepted_keys text[],
  source_ref jsonb,
  paper_series_join text,
  primary key (release_id, canonical_id),
  foreign key (release_id, canonical_id) references public.qbank_questions (release_id, canonical_id)
);

-- 5. qbank_occurrences
create table if not exists public.qbank_occurrences (
  release_id text not null references public.qbank_releases (release_id),
  occurrence_id text not null,
  canonical_id text,
  source_document_id text not null,
  identity jsonb not null,
  text jsonb not null,
  key_claim jsonb,
  evidence jsonb not null,
  primary key (release_id, occurrence_id)
);

-- 6. qbank_explanations
create table if not exists public.qbank_explanations (
  release_id text not null references public.qbank_releases (release_id),
  canonical_id text not null,
  provenance text check (provenance in ('editorial', 'model-authored', 'none')),
  review_state text not null,
  text text,
  source_refs jsonb,
  display_policy text not null default 'internal_only' check (display_policy in ('internal_only', 'public')),
  primary key (release_id, canonical_id)
);

-- 7. qbank_mains_questions
create table if not exists public.qbank_mains_questions (
  release_id text not null references public.qbank_releases (release_id),
  canonical_id text not null,
  year int,
  paper text check (paper in ('GS-M1', 'GS-M2', 'GS-M3', 'GS-M4', 'Essay')),
  question_number int,
  subpart text,
  prompt text not null,
  case_study text,
  word_limit int,
  marks_allotted numeric,
  section text,
  status text,
  eligibility jsonb not null,
  evidence jsonb not null,
  primary key (release_id, canonical_id)
);

-- 8. qbank_discrepancies
create table if not exists public.qbank_discrepancies (
  id bigint generated always as identity primary key,
  release_id text not null references public.qbank_releases (release_id),
  canonical_id text not null,
  code text not null,
  detail text not null,
  resolved boolean not null default false,
  evidence jsonb,
  unique (release_id, canonical_id, code, detail)
);

-- ==============================================================================
-- Access Control: Row Level Security & Column Restrictions
-- ==============================================================================

alter table public.qbank_releases enable row level security;
alter table public.qbank_sources enable row level security;
alter table public.qbank_questions enable row level security;
alter table public.qbank_keys enable row level security;
alter table public.qbank_occurrences enable row level security;
alter table public.qbank_explanations enable row level security;
alter table public.qbank_mains_questions enable row level security;
alter table public.qbank_discrepancies enable row level security;

revoke all on table public.qbank_releases from anon, authenticated;
revoke all on table public.qbank_sources from anon, authenticated;
revoke all on table public.qbank_questions from anon, authenticated;
revoke all on table public.qbank_keys from anon, authenticated;
revoke all on table public.qbank_occurrences from anon, authenticated;
revoke all on table public.qbank_explanations from anon, authenticated;
revoke all on table public.qbank_mains_questions from anon, authenticated;
revoke all on table public.qbank_discrepancies from anon, authenticated;

-- Public SELECT only on releases, questions, and mains_questions
grant select on table public.qbank_releases to anon, authenticated;
create policy "Allow select on qbank_releases"
  on public.qbank_releases
  for select
  to anon, authenticated
  using (true);

grant select on table public.qbank_questions to anon, authenticated;
create policy "Allow select on qbank_questions"
  on public.qbank_questions
  for select
  to anon, authenticated
  using (true);

grant select on table public.qbank_mains_questions to anon, authenticated;
create policy "Allow select on qbank_mains_questions"
  on public.qbank_mains_questions
  for select
  to anon, authenticated
  using (true);
