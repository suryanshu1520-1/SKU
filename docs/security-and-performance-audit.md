# Supabase Security & Performance Audit & Remediation Guide

This document captures the live database audit conducted via Supabase MCP on project `ixngfxaerlkkcacrbdgc` and provides production SQL remediation scripts.

---

## 1. Security Advisor Findings & Remediation

### A. Mutable `search_path` on Database Functions (Vulnerability: Search Path Hijacking)
- **Problem**: When a `SECURITY DEFINER` function does not set an explicit `search_path`, PostgreSQL resolves objects using the caller's search path. An attacker could create a malicious function or operator in a temporary schema to execute arbitrary SQL with elevated privileges.
- **Affected Functions**:
  - `public.clear_expired_pending_orders()`
  - `public.reserve_premium_seat_if_available(uuid, text)`
  - `public.increment_vanguard_count(uuid)`
  - `public.update_source_reputation()`
  - `public.generate_daily_arena_quiz(uuid, text)`
  - `public.fetch_active_tier_pricing()`
  - `public.consume_insight_token(uuid)`
  - `public.upgrade_to_premium(uuid)`

```sql
-- Remediation: Set strict immutable search_path on all functions
ALTER FUNCTION public.clear_expired_pending_orders() SET search_path = public, pg_temp;
ALTER FUNCTION public.reserve_premium_seat_if_available(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_vanguard_count(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_source_reputation() SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_daily_arena_quiz(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.fetch_active_tier_pricing() SET search_path = public, pg_temp;
ALTER FUNCTION public.consume_insight_token(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.upgrade_to_premium(uuid) SET search_path = public, pg_temp;
```

---

### B. Unrestricted RPC Execution by `anon` Role
- **Problem**: Several sensitive functions with `SECURITY DEFINER` are callable by unauthenticated anonymous users via the REST API (`/rest/v1/rpc/*`).
- **Remediation**: Revoke execute permissions from the `anon` role on administrative and account mutation functions.

```sql
-- Revoke execute from unauthenticated callers
REVOKE EXECUTE ON FUNCTION public.upgrade_to_premium(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.consume_insight_token(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_weekly_leaderboard() FROM anon;
REVOKE EXECUTE ON FUNCTION public.reserve_premium_seat_if_available(uuid, text) FROM anon;
```

---

### C. `SECURITY DEFINER` View Privilege Bypass
- **Problem**: `public.public_leaderboard` is configured as `SECURITY DEFINER`, allowing queries to bypass table-level RLS policies.
- **Remediation**: Convert the view to `SECURITY INVOKER`.

```sql
ALTER VIEW public.public_leaderboard SET (security_invoker = true);
```

---

## 2. Performance Advisor Findings & Remediation

### A. RLS Sub-Query Re-Evaluation (`auth_rls_initplan`)
- **Problem**: Policies that use `auth.uid() = user_id` re-evaluate `auth.uid()` for each row in the result set, creating an $O(N)$ CPU bottleneck on large table scans.
- **Remediation**: Wrap `auth.uid()` with `(select auth.uid())` so Postgres calculates the user ID once at query initialization ($O(1)$).

```sql
-- Example: Fix user_profiles RLS policy
DROP POLICY IF EXISTS "Users update own profile" ON public.user_profiles;
CREATE POLICY "Users update own profile" ON public.user_profiles
  FOR UPDATE USING ((select auth.uid()) = id);

-- Example: Fix saved_insights RLS policies
DROP POLICY IF EXISTS "Users can SELECT their own saved insights" ON public.saved_insights;
CREATE POLICY "Users can SELECT their own saved insights" ON public.saved_insights
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can INSERT their own saved insights" ON public.saved_insights;
CREATE POLICY "Users can INSERT their own saved insights" ON public.saved_insights
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can DELETE their own saved insights" ON public.saved_insights;
CREATE POLICY "Users can DELETE their own saved insights" ON public.saved_insights
  FOR DELETE USING ((select auth.uid()) = user_id);
```

---

### B. Missing Covering Indexes on Foreign Keys
- **Problem**: Foreign keys without covering indexes cause slow cascading lookups and table locks.

```sql
-- Add covering indexes on foreign keys
CREATE INDEX IF NOT EXISTS idx_pending_orders_user_id ON public.pending_orders (user_id);
CREATE INDEX IF NOT EXISTS idx_saved_articles_article_id ON public.saved_articles (article_id);
CREATE INDEX IF NOT EXISTS idx_saved_insights_user_id ON public.saved_insights (user_id);
```

---

### C. Deduplicate Redundant Permissive Policies
- **Problem**: Tables like `public.current_affairs` and `public.static_questions` have multiple overlapping permissive policies (`Allow public read access for current affairs` and `Allow public read access to current_affairs`), causing duplicate policy evaluations.

```sql
-- Drop duplicate policy on current_affairs
DROP POLICY IF EXISTS "Allow public read access to current_affairs" ON public.current_affairs;

-- Drop duplicate policy on static_questions
DROP POLICY IF EXISTS "Allow public read access to static_questions" ON public.static_questions;
```
