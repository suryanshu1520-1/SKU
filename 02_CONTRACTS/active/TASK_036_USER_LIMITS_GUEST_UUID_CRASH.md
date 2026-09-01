---
task_id: "TASK_036_USER_LIMITS_GUEST_UUID_CRASH"
status: "AWAITING_VERIFICATION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "low"
token_budget:
  input_context_max: 3000
  thinking_budget_tokens: 1000
  output_diff_max: 1200
depends_on: []
queue_gate: "NONE — independent of every other contract in this batch, safe to chain freely. Note: this is unrelated to TASK_035's render loop despite being found in the same investigation pass — confirmed via live testing they are two separate bugs in unrelated files."
---

# 1. High-Density Distilled Objective
Root cause fully diagnosed; fix-only. `GET /api/user-limits?userId=guest` returns HTTP 500 for every anonymous/guest user. `server-lib/user-limits.ts:36-45` runs `.eq('user_id', userId)` against `public.user_profiles.user_id`, a `uuid NOT NULL` column (`supabase/migrations/20260608040907_user_foundation.sql:26`). The literal string `'guest'` is not a valid UUID, so Postgres/PostgREST throws `invalid input syntax for type uuid` (error 22P02), which the handler correctly catches as a Supabase `error` object and returns as a 500 — there is no special-case for the guest sentinel and no default guest-tier response.

The only client caller is `src/components/Arena.tsx:229-240`, whose `useEffect` already handles the failure safely (`.catch((err) => console.warn(...))`, no state update on error) — this endpoint's failure does not currently cause any visible UI break or loop, but it does mean guest users silently never get real limit data and any future code that trusts a 200 response from this endpoint for guests would break.

# 2. Transcluded Context References
- `server-lib/user-limits.ts:31-45` — the handler; the query and its error branch.
- `supabase/migrations/20260608040907_user_foundation.sql:26` — confirms `user_profiles.user_id` is `uuid NOT NULL REFERENCES auth.users(id)`.
- `src/components/Arena.tsx:229-240` — the sole client caller, for context on what shape of response it expects on success (do not need to change this file).

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` on `server-lib/user-limits.ts` in full to confirm current exact line numbers and the full response shape used on a successful (non-guest) request.
2. `replace_file_content` — add a guard before the Supabase query: if `userId` is the literal string `'guest'` (or, more robustly, fails a UUID-format check), skip the query entirely and return a default guest-tier payload matching the same shape a real free-tier user's successful response would have (check the success-path response shape in this same file and mirror its field names), with HTTP 200.
3. `run_command` — `npm run lint:api`, `npm run build`.
4. Verify live: with the dev server running, test `GET /api/user-limits?userId=guest` and confirm it now returns 200 with a sensible default payload, not 500.

# 4. Deterministic Acceptance Criteria
1. `GET /api/user-limits?userId=guest` returns HTTP 200 with a default guest-tier payload matching the field shape of a real user's response — verified with an actual request against the running dev server, not just by reading the code.
2. A request with a real UUID `userId` for an existing user is unaffected (same behavior as before this fix) — confirm by reading the code path, the guard must not intercept real UUIDs.
3. `npm run lint:api` and `npm run build` both exit 0.
4. Standing hard boundary: status no higher than `AWAITING_VERIFICATION`; never move to `completed/`; never touch `01_CONTROL/` or `03_MEMORY/`.

# 5. Antigravity Proof-of-Work Receipt
_(filled in by Antigravity on completion — diff + telemetry YAML only, no prose.)_

```yaml
telemetry:
  tools_invoked:
    - view_file
    - replace_file_content
    - run_command
  duration_ms: 1900
  exit_codes:
    lint_api: 0
    build: 0
live_guest_request_result:
  status_code: 200
  body: '{"tier":"free","vanguardUsed":0,"insightsUsed":0}'
diff: |
  --- a/server-lib/user-limits.ts
  +++ b/server-lib/user-limits.ts
  @@ -33,6 +33,16 @@
         return res.status(400).json({ error: "userId query parameter is required" });
       }
   
  +    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  +    if (userId === 'guest' || !UUID_REGEX.test(userId)) {
  +      res.setHeader('Cache-Control', 'public, max-age=5, s-maxage=10, stale-while-revalidate=10');
  +      return res.status(200).json({
  +        tier: 'free',
  +        vanguardUsed: 0,
  +        insightsUsed: 0,
  +      });
  +    }
  +
       const { data, error } = await supabaseServer
```
