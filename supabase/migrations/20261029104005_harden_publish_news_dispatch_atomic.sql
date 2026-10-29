-- supabase/migrations/20261029104005_harden_publish_news_dispatch_atomic.sql
-- Security Hardening: Pin search_path and restrict RPC execution to service_role

ALTER FUNCTION public.publish_news_dispatch_atomic(
  text, text, text[], text, text, text, text, text, text, text, jsonb, jsonb, text, text, text, text, text, timestamptz
) SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.publish_news_dispatch_atomic(
  text, text, text[], text, text, text, text, text, text, text, jsonb, jsonb, text, text, text, text, text, timestamptz
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.publish_news_dispatch_atomic(
  text, text, text[], text, text, text, text, text, text, text, jsonb, jsonb, text, text, text, text, text, timestamptz
) TO service_role;
