---
name: supabase-postgres-crucible
description: >-
  Standard protocol and best practices for Supabase Postgres engineering in Tark.
  Covers zero-downtime migrations, Row Level Security (RLS) policies, atomic RPCs,
  concurrency locking (e.g. seat reservations), index optimization, and connection pooling.
license: MIT
---

# Supabase & PostgreSQL Crucible (Tark Standard)

This skill provides the architectural guidelines, query performance patterns, and security guardrails for working with PostgreSQL and Supabase across Tark.

---

## 1. Golden Rules of Database Changes

1. **Human-Gated Migration Protocol**:
   - Write migration files under `supabase/migrations/YYYYMMDDHHMMSS_<name>.sql`.
   - **NEVER** self-authorize applying migrations directly to production databases.
   - Always verify migrations locally or via dry-run before handing off to the human operator.
2. **Idempotency & Reversibility**:
   - Use `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, and `CREATE INDEX IF NOT EXISTS`.
   - Always wrap multi-statement migrations in atomic transaction blocks (`BEGIN; ... COMMIT;`) when feasible.

---

## 2. Row Level Security (RLS) Standard

Every table exposed via Supabase PostgREST must have RLS enabled:

```sql
ALTER TABLE candidate_attempts ENABLE ROW LEVEL SECURITY;
```

### Policy Patterns:
1. **Candidate-Owned Records**:
   ```sql
   CREATE POLICY "Candidates can read own attempts"
     ON candidate_attempts FOR SELECT
     USING (auth.uid() = candidate_id);
   ```
2. **Server-Only Tables (Quiz scoring, Answer keys)**:
   ```sql
   -- No public access. Only service_role or serverless backend can read/write.
   CREATE POLICY "Service role only"
     ON official_answer_keys FOR ALL
     USING (auth.role() = 'service_role');
   ```

---

## 3. High-Concurrency & Atomic Locks

In Tark, operations like seat purchases and quiz submissions experience high concurrency.

- **Reservation Pattern (`reserve_premium_seat_if_available`)**:
  - Use `FOR UPDATE` with row-level locks on inventory rows.
  - Implement a 15-minute TTL lock window (`reserved_until = NOW() + INTERVAL '15 minutes'`).
  - Idempotent payment webhook confirmation: confirm reservation only if the lock has not expired.
- **Server-Side Scoring Verification**:
  - Client sends candidate's bubble map.
  - Server fetches official answer key and computes scores strictly in `server-lib/submit-quiz.ts`.
  - Client is NEVER trusted with raw answer keys or scores.

---

## 4. Indexing & Query Optimization

1. **Foreign Key Indexing**: Always create a B-Tree index on foreign key columns (`candidate_id`, `paper_id`, `question_id`).
2. **JSONB Querying**: For metadata and telemetry blobs, use GIN indexes:
   ```sql
   CREATE INDEX idx_candidate_events_payload ON candidate_events USING GIN (payload jsonb_path_ops);
   ```
3. **Connection Pooling**: Serverless functions (`server-lib/`, `api/`) must connect via Supabase Transaction Pooler (`port 6543`) with `pgbouncer=true` to prevent connection exhaustion.
