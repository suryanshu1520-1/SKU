-- supabase/migrations/20261029120000_news_private_pipeline.sql
-- Migration: Tark International News & Durable Private Pipeline (Phase 2)
-- Architecture: docs/tark_international_news_architecture_plan.md
--
-- Adds private operational pipeline relations:
--   1. news_source_documents    (discovery, conditional fetch headers, fingerprints)
--   2. news_document_versions    (versioned text, rights snapshot, work queue leases)
--   3. news_stories              (canonical episode buckets, accepted match key)
--   4. news_dispatch_revisions   (immutable developments, verified evidence bundle, india posture)
--   5. current_affairs additive  (source_published_at, coverage_scope, content_version, story_id)
--   6. RPC: publish_news_dispatch_atomic with pg_advisory_xact_lock serialization

BEGIN;

-- 1. news_source_documents
CREATE TABLE IF NOT EXISTS public.news_source_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  original_url TEXT NOT NULL,
  title TEXT NOT NULL,
  pub_date_text TEXT,
  source_published_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  etag TEXT,
  last_modified TEXT,
  rss_fingerprint TEXT,
  current_content_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_news_source_canonical UNIQUE (source_id, canonical_url)
);

CREATE INDEX IF NOT EXISTS idx_news_source_canonical 
  ON public.news_source_documents (source_id, canonical_url);

-- 2. news_document_versions (also acts as durable work queue)
CREATE TABLE IF NOT EXISTS public.news_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.news_source_documents(id) ON DELETE CASCADE,
  content_hash TEXT NOT NULL,
  extractor_version TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  title TEXT NOT NULL,
  char_length INT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  rights_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  stage TEXT NOT NULL DEFAULT 'discovered'
    CHECK (stage IN ('discovered', 'fetched', 'classified', 'matched', 'synthesized', 'validated', 'published', 'excluded', 'unsupported', 'review_required', 'failed')),
  reason_code TEXT,
  attempts INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  lease_owner TEXT,
  lease_expires_at TIMESTAMPTZ,
  target_work_manifest JSONB NOT NULL DEFAULT '[]'::jsonb,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_news_doc_version UNIQUE (document_id, content_hash, extractor_version)
);

CREATE INDEX IF NOT EXISTS idx_news_doc_versions_ready
  ON public.news_document_versions (stage, next_attempt_at)
  WHERE stage IN ('discovered', 'fetched', 'classified', 'matched', 'synthesized');

CREATE INDEX IF NOT EXISTS idx_news_doc_versions_doc
  ON public.news_document_versions (document_id);

-- 3. news_stories (canonical episode bucket identity)
CREATE TABLE IF NOT EXISTS public.news_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_bucket_key TEXT NOT NULL,
  accepted_match_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  actors TEXT[] NOT NULL DEFAULT '{}',
  institution TEXT,
  action_domain TEXT NOT NULL,
  event_window TEXT NOT NULL,
  coverage_scope TEXT NOT NULL DEFAULT 'international'
    CHECK (coverage_scope IN ('india', 'international', 'cross_border', 'unclassified')),
  review_state TEXT NOT NULL DEFAULT 'draft'
    CHECK (review_state IN ('draft', 'pending_review', 'published', 'withdrawn')),
  current_revision_no INT NOT NULL DEFAULT 0,
  public_article_id UUID REFERENCES public.current_affairs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_news_stories_bucket
  ON public.news_stories (candidate_bucket_key);

CREATE INDEX IF NOT EXISTS idx_news_stories_match_key
  ON public.news_stories (accepted_match_key);

-- 4. news_dispatch_revisions (immutable developments snapshot)
CREATE TABLE IF NOT EXISTS public.news_dispatch_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.news_stories(id) ON DELETE CASCADE,
  revision_no INT NOT NULL CHECK (revision_no > 0),
  development_id TEXT NOT NULL,
  change_kind TEXT NOT NULL DEFAULT 'initial_release',
  headline TEXT NOT NULL,
  summary_snapshot JSONB NOT NULL,
  evidence_bundle JSONB NOT NULL DEFAULT '[]'::jsonb,
  india_posture TEXT NOT NULL DEFAULT 'unverified'
    CHECK (india_posture IN ('party_signatory', 'party_ratified', 'non_party_observer', 'non_party_commentator', 'not_applicable', 'unverified')),
  content_version INT NOT NULL DEFAULT 1,
  policy_version TEXT NOT NULL DEFAULT 'support_v2',
  prompt_version TEXT NOT NULL DEFAULT 'v1',
  idempotency_key TEXT NOT NULL UNIQUE,
  published_at TIMESTAMPTZ,
  superseded_revision_id UUID REFERENCES public.news_dispatch_revisions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_news_dispatch_revision UNIQUE (story_id, revision_no)
);

CREATE INDEX IF NOT EXISTS idx_news_revisions_story
  ON public.news_dispatch_revisions (story_id, revision_no DESC);

-- 5. Additive metadata columns on current_affairs
ALTER TABLE public.current_affairs
  ADD COLUMN IF NOT EXISTS source_published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS coverage_scope TEXT NOT NULL DEFAULT 'unclassified'
    CHECK (coverage_scope IN ('india', 'international', 'cross_border', 'unclassified')),
  ADD COLUMN IF NOT EXISTS content_version INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS story_id UUID REFERENCES public.news_stories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ca_coverage_scope
  ON public.current_affairs (coverage_scope, published_at DESC);

-- 6. Row Level Security on Private Pipeline Tables
ALTER TABLE public.news_source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_dispatch_revisions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role only for news_source_documents"
    ON public.news_source_documents FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role only for news_document_versions"
    ON public.news_document_versions FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role only for news_stories"
    ON public.news_stories FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role only for news_dispatch_revisions"
    ON public.news_dispatch_revisions FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 7. Atomic Publication RPC with Advisory Lock Serialization
CREATE OR REPLACE FUNCTION public.publish_news_dispatch_atomic(
  p_candidate_bucket_key TEXT,
  p_accepted_match_key TEXT,
  p_actors TEXT[],
  p_institution TEXT,
  p_action_domain TEXT,
  p_event_window TEXT,
  p_coverage_scope TEXT,
  p_development_id TEXT,
  p_change_kind TEXT,
  p_headline TEXT,
  p_summary_snapshot JSONB,
  p_evidence_bundle JSONB,
  p_india_posture TEXT,
  p_idempotency_key TEXT,
  p_public_url TEXT,
  p_source TEXT,
  p_ministry TEXT,
  p_source_published_at TIMESTAMPTZ
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_story_id UUID;
  v_revision_no INT;
  v_revision_id UUID;
  v_article_id UUID;
  v_existing_rev UUID;
  v_now TIMESTAMPTZ := timezone('utc', now());
BEGIN
  -- 1. Strictly serialize concurrent workers examining the same episode bucket
  PERFORM pg_advisory_xact_lock(hashtext(p_candidate_bucket_key));

  -- 2. Idempotency check: if this exact revision was already published, return committed state
  SELECT id, story_id, revision_no INTO v_existing_rev, v_story_id, v_revision_no
  FROM public.news_dispatch_revisions
  WHERE idempotency_key = p_idempotency_key;

  IF v_existing_rev IS NOT NULL THEN
    SELECT public_article_id INTO v_article_id FROM public.news_stories WHERE id = v_story_id;
    RETURN jsonb_build_object(
      'status', 'idempotent_duplicate',
      'story_id', v_story_id,
      'revision_no', v_revision_no,
      'revision_id', v_existing_rev,
      'article_id', v_article_id
    );
  END IF;

  -- 3. Resolve or insert canonical story
  SELECT id, current_revision_no, public_article_id
  INTO v_story_id, v_revision_no, v_article_id
  FROM public.news_stories
  WHERE accepted_match_key = p_accepted_match_key
  FOR UPDATE;

  IF v_story_id IS NULL THEN
    INSERT INTO public.news_stories (
      candidate_bucket_key,
      accepted_match_key,
      title,
      actors,
      institution,
      action_domain,
      event_window,
      coverage_scope,
      review_state,
      current_revision_no
    ) VALUES (
      p_candidate_bucket_key,
      p_accepted_match_key,
      p_headline,
      p_actors,
      p_institution,
      p_action_domain,
      p_event_window,
      p_coverage_scope,
      'published',
      1
    ) RETURNING id INTO v_story_id;

    v_revision_no := 1;
  ELSE
    v_revision_no := v_revision_no + 1;
    UPDATE public.news_stories
    SET current_revision_no = v_revision_no,
        review_state = 'published',
        updated_at = v_now
    WHERE id = v_story_id;
  END IF;

  -- 4. Insert immutable dispatch revision
  INSERT INTO public.news_dispatch_revisions (
    story_id,
    revision_no,
    development_id,
    change_kind,
    headline,
    summary_snapshot,
    evidence_bundle,
    india_posture,
    content_version,
    policy_version,
    prompt_version,
    idempotency_key,
    published_at
  ) VALUES (
    v_story_id,
    v_revision_no,
    p_development_id,
    p_change_kind,
    p_headline,
    p_summary_snapshot,
    p_evidence_bundle,
    p_india_posture,
    v_revision_no,
    'support_v2',
    'v1',
    p_idempotency_key,
    v_now
  ) RETURNING id INTO v_revision_id;

  -- 5. Upsert public current_affairs projection with graph_status='skipped'
  -- Checks existing row to guarantee created_at immutability
  SELECT id INTO v_article_id FROM public.current_affairs WHERE url = p_public_url;

  IF v_article_id IS NULL THEN
    INSERT INTO public.current_affairs (
      source,
      ministry,
      headline,
      summary,
      url,
      published_at,
      source_published_at,
      coverage_scope,
      content_version,
      story_id,
      graph_status,
      created_at
    ) VALUES (
      p_source,
      p_ministry,
      p_headline,
      p_summary_snapshot,
      p_public_url,
      v_now,
      p_source_published_at,
      p_coverage_scope,
      v_revision_no,
      v_story_id,
      'skipped', -- International firewall: exempt from domestic Indian policy graph
      v_now
    ) RETURNING id INTO v_article_id;
  ELSE
    UPDATE public.current_affairs
    SET headline = p_headline,
        summary = p_summary_snapshot,
        coverage_scope = p_coverage_scope,
        content_version = v_revision_no,
        story_id = v_story_id,
        graph_status = 'skipped'
    WHERE id = v_article_id;
  END IF;

  -- Link public article back to story
  UPDATE public.news_stories
  SET public_article_id = v_article_id
  WHERE id = v_story_id;

  RETURN jsonb_build_object(
    'status', 'published',
    'story_id', v_story_id,
    'revision_no', v_revision_no,
    'revision_id', v_revision_id,
    'article_id', v_article_id
  );
END;
$$;

COMMIT;

