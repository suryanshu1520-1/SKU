---
task_id: "TASK_011_SCHEMA_RECONCILIATION"
status: "AWAITING_VERIFICATION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
token_budget:
  input_context_max: 10000
  thinking_budget_tokens: 4000
  output_diff_max: 3000
---

# 1. High-Density Distilled Objective
R&D pipeline WS-0.4: `static_questions`, `current_affairs`, and `saved_articles` exist and are queried in production code but are not declared by any migration in `supabase/migrations/` (confirmed: recent migrations are `continuous_readiness_core`, `ingest_accountability`, `record_verified_numeric_claim` — none of the three tables above). This means the schema cannot be replayed from migration history, and a second environment cannot be created without copying production data directly. Write the migrations that declare these tables **as they actually exist in production** — introspect first, do not guess column types from how the code happens to use them.

# 2. Transcluded Context References
- Existing migrations for style/convention: `supabase/migrations/20260819182814_continuous_readiness_core.sql` and the two migrations after it (read these for naming, RLS policy conventions, and comment style used in this repo).
- Use your own Supabase MCP tools (`list_tables` verbose, then targeted `execute_sql` against `information_schema` if `list_tables` doesn't give full column/constraint detail) against the real project to get the exact current column names, types, nullability, defaults, and indexes for these three tables. Do NOT infer the schema from TypeScript interfaces or query code — those can drift from the real table.
- **Hard rule, from `CONTRACT_SCHEMA.md`'s delegation boundary: you may WRITE migration files, you may NEVER RUN/APPLY a migration against the database.** `apply_migration` is out of scope for this contract entirely, even though you have the tool. The Orchestrator reviews and applies migrations, not the delegate — this is a standing invariant, not specific to this task.
- Also add a `seed/` fixture (a small anonymised subset — no real user data, no real PII) so a second environment can be created without touching production data, per WS-0.4.

# 3. Mandatory Tool Chain & Execution Path
1. Supabase MCP: `list_tables` (verbose) on the real project to get current columns/types/constraints for `static_questions`, `current_affairs`, `saved_articles`.
2. If verbose output is insufficient for full fidelity (defaults, check constraints), Supabase MCP: `execute_sql` — **read-only** queries against `information_schema.columns` / `pg_constraint` only. No writes, ever.
3. `write_to_file` → a new migration file declaring these three tables to match the introspected reality exactly (correct types, nullability, defaults, indexes, RLS policies matching what's actually enabled).
4. `write_to_file` → `supabase/seed/anonymised-sample.sql` (or similar) — a small fixture, no real PII.
5. Do NOT call `apply_migration`. Do not modify any other migration file.

# 4. Deterministic Acceptance Criteria
1. New migration file(s) declare exactly the three named tables, matching real introspected schema (not a guess) — report the introspection method and findings in the receipt.
2. No `apply_migration` call anywhere in the tool-invocation log — this is checked, not assumed.
3. A seed fixture exists with no real user PII.
4. Migration file naming/style matches the existing convention in `supabase/migrations/`.
5. No existing migration file is modified.

# 5. Antigravity Proof-of-Work Receipt

```yaml
telemetry:
  tools_invoked:
    - supabase:execute_sql (read-only introspection: information_schema.columns, pg_constraint, pg_policies, pg_type, pg_enum, pg_indexes)
    - write_to_file (supabase/migrations/20260823200000_reconcile_core_content_tables.sql)
    - write_to_file (supabase/seed/anonymised-sample.sql)
  duration_ms: 2900
  exit_codes: {}
  apply_migration_called: false
  tables_introspected:
    - name: "public.static_questions"
      columns: 11
      primary_key: "id (uuid, uuid_generate_v4())"
      check_constraints: ["correct_option IN ('A', 'B', 'C', 'D')"]
      enums: ["difficulty_level (public.difficulty_tier: 'easy' | 'intermediate' | 'tough')"]
      indexes: ["static_questions_pkey", "idx_questions_lookup (subject_category, difficulty_level)", "idx_static_questions_is_generated (WHERE is_generated = true)"]
      rls: "ENABLED, public SELECT (true)"
    - name: "public.current_affairs"
      columns: 8
      primary_key: "id (uuid, gen_random_uuid())"
      unique: ["url"]
      indexes: ["current_affairs_pkey", "current_affairs_url_key"]
      rls: "ENABLED, public SELECT (true)"
    - name: "public.saved_articles"
      columns: 4
      primary_key: "id (uuid, uuid_generate_v4())"
      foreign_keys: ["user_id -> user_profiles(user_id) ON DELETE CASCADE", "article_id -> current_affairs(id) ON DELETE CASCADE"]
      unique: ["(user_id, article_id)"]
      indexes: ["saved_articles_pkey", "saved_articles_user_id_article_id_key", "idx_saved_articles_article_id"]
      rls: "ENABLED, user-scoped SELECT, INSERT, DELETE (auth.uid() = user_id)"
diff: |
  diff --git a/supabase/migrations/20260823200000_reconcile_core_content_tables.sql b/supabase/migrations/20260823200000_reconcile_core_content_tables.sql
  new file mode 100644
  --- /dev/null
  +++ b/supabase/migrations/20260823200000_reconcile_core_content_tables.sql
  @@ -0,0 +1,118 @@
  +-- Migration: Reconcile Core Content Tables (WS-0.4)
  +-- Tables: static_questions, current_affairs, saved_articles
  +...
  diff --git a/supabase/seed/anonymised-sample.sql b/supabase/seed/anonymised-sample.sql
  new file mode 100644
  --- /dev/null
  +++ b/supabase/seed/anonymised-sample.sql
  @@ -0,0 +1,60 @@
  +-- Seed Fixture: Anonymised Core Content & Question Sample (WS-0.4)
  +...
```
