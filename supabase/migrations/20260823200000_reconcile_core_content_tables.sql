-- ==============================================================================
-- Migration: Reconcile Core Content Tables (WS-0.4)
-- Tables: static_questions, current_affairs, saved_articles
-- Exact Introspected Schema Replay Migration
-- ==============================================================================

-- 1. Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Ensure difficulty_tier enum exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'difficulty_tier') THEN
        CREATE TYPE public.difficulty_tier AS ENUM ('easy', 'intermediate', 'tough');
    END IF;
END $$;

-- 3. static_questions Table
CREATE TABLE IF NOT EXISTS public.static_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    options_matrix JSONB NOT NULL,
    correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
    exam_origin_tag VARCHAR NOT NULL,
    subject_category VARCHAR NOT NULL,
    difficulty_level public.difficulty_tier NOT NULL,
    conceptual_explanation TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    ai_insights JSONB,
    is_generated BOOLEAN DEFAULT FALSE
);

-- Indexes for static_questions
CREATE INDEX IF NOT EXISTS idx_questions_lookup 
    ON public.static_questions (subject_category, difficulty_level);

CREATE INDEX IF NOT EXISTS idx_static_questions_is_generated 
    ON public.static_questions (is_generated) 
    WHERE (is_generated = true);

-- Enable RLS & Public Read Policy for static_questions
ALTER TABLE public.static_questions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'static_questions' AND policyname = 'Allow public read access to questions'
    ) THEN
        CREATE POLICY "Allow public read access to questions" 
            ON public.static_questions FOR SELECT TO public 
            USING (true);
    END IF;
END $$;


-- 4. current_affairs Table
CREATE TABLE IF NOT EXISTS public.current_affairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL DEFAULT 'PIB',
    ministry TEXT DEFAULT 'General Policy',
    headline TEXT NOT NULL,
    summary JSONB NOT NULL,
    url TEXT NOT NULL UNIQUE,
    published_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS & Public Read Policy for current_affairs
ALTER TABLE public.current_affairs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'current_affairs' AND policyname = 'Allow public read access for current affairs'
    ) THEN
        CREATE POLICY "Allow public read access for current affairs" 
            ON public.current_affairs FOR SELECT TO public 
            USING (true);
    END IF;
END $$;


-- 5. saved_articles Table
CREATE TABLE IF NOT EXISTS public.saved_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES public.current_affairs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT saved_articles_user_id_article_id_key UNIQUE (user_id, article_id)
);

-- Index on article_id for saved_articles
CREATE INDEX IF NOT EXISTS idx_saved_articles_article_id 
    ON public.saved_articles (article_id);

-- Enable RLS & User-Scoped Policies for saved_articles
ALTER TABLE public.saved_articles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'saved_articles' AND policyname = 'Users can SELECT their own saved articles'
    ) THEN
        CREATE POLICY "Users can SELECT their own saved articles" 
            ON public.saved_articles FOR SELECT TO public 
            USING ((SELECT auth.uid()) = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'saved_articles' AND policyname = 'Users can INSERT their own saved articles'
    ) THEN
        CREATE POLICY "Users can INSERT their own saved articles" 
            ON public.saved_articles FOR INSERT TO public 
            WITH CHECK ((SELECT auth.uid()) = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'saved_articles' AND policyname = 'Users can DELETE their own saved articles'
    ) THEN
        CREATE POLICY "Users can DELETE their own saved articles" 
            ON public.saved_articles FOR DELETE TO public 
            USING ((SELECT auth.uid()) = user_id);
    END IF;
END $$;
