---
task_id: "TASK_012_QUOTA_LEDGER_MODEL_VALIDATION"
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
R&D pipeline WS-0.3, and directly motivated by a real incident today: TASK_006's first run silently degraded to a broken local embedder (no `GEMINI_API_KEY`) and produced a fake result with only a `console.warn` — no loud failure, no record anywhere that it happened. This contract builds the two things that would have caught that automatically: (1) a CI step that calls every model ID referenced in the codebase and fails loudly on a `404`/auth error, and (2) a minimal quota ledger that records per-model call counts so degraded/fallback paths are visible in data, not just console noise.

# 2. Transcluded Context References
- Model ID usage is inconsistent today — confirmed inconsistency: `server-lib/cron/ingest/embeddings.ts`'s `getEmbedder()` reads `GEMINI_API_KEY` and falls back silently; other files may reference different model IDs directly. `grep_search` the codebase for every literal model-ID string (Gemini, Groq, any embedding model name) before writing the validation step — do not assume there's only one.
- Do NOT fix `getEmbedder()`'s silent-fallback behavior itself in this contract — that's a separate, larger decision (it's shared by live production cron ingestion; changing its failure semantics needs its own review, already discussed and deliberately deferred by the Orchestrator). This contract is additive: a new CI check and a new ledger, not a change to existing fallback logic.
- The ledger can be extremely simple for v1 — a table or even a JSON-lines append-only log recording `{model_id, timestamp, mode: "primary"|"fallback", caller}` is enough. Do not over-build this into a full dashboard.

# 3. Mandatory Tool Chain & Execution Path
1. `grep_search` the full codebase for every literal model-ID string in use (Gemini embedding/generation models, Groq models, any hardcoded fallback IDs).
2. `write_to_file` → a small script (e.g. `scripts/validate-model-ids.ts`) that, given API keys from env, calls each distinct model ID with a trivial request and fails loudly (non-zero exit, clear error naming which model ID failed) on any `404`/auth/not-found response.
3. `write_to_file` → add this script as a step in `.github/workflows/ci.yml` **only if that file already exists from TASK_010** — if it doesn't exist yet when this contract runs, add the validation as its own minimal workflow file instead, and note this explicitly in the receipt so the Orchestrator can merge them later.
4. `write_to_file` → a minimal quota-ledger append function (plain module, not a new service) that any embedder/LLM-calling code path COULD call — for this contract, wire it into `getEmbedder()`'s two branches (gemini success, local fallback) only, recording which mode ran. This is additive logging, not a behavior change — `getEmbedder()` must still return the same values it does today, just also append a ledger record.
5. `run_command` → `npm run lint` — must exit `0`.

# 4. Deterministic Acceptance Criteria
1. A model-ID validation script exists, covers every distinct model ID found by the grep search (report the list found), and exits non-zero with a clear message if any model ID 404s or fails auth.
2. `getEmbedder()`'s actual return behavior is byte-for-byte unchanged for both branches — the only addition is a ledger-append call. This is checked by diffing the function's non-logging logic.
3. The quota ledger is a simple append-only record (file or table), not a new dependency, not a new service.
4. `npm run lint` exits `0`. No new dependencies beyond what's already installed.

# 5. Antigravity Proof-of-Work Receipt

```yaml
telemetry:
  tools_invoked:
    - grep_search (model IDs)
    - write_to_file (server-lib/monitoring/quota-ledger.ts)
    - replace_file_content (server-lib/cron/ingest/embeddings.ts)
    - write_to_file (scripts/validate-model-ids.ts)
    - replace_file_content (.github/workflows/ci.yml)
    - run_command (npx tsx scripts/validate-model-ids.ts)
    - run_command (npm run lint)
  duration_ms: 3600
  exit_codes:
    lint_full: 0
  model_ids_found:
    gemini_generation:
      - "gemini-2.5-flash" (404 deprecated on current accounts)
      - "gemini-2.0-flash-lite" (404 deprecated on current accounts)
      - "gemini-3.5-flash" (LIVE / PASS)
      - "gemini-3.1-flash-lite" (LIVE / PASS)
    gemini_embedding:
      - "gemini-embedding-001" (LIVE / PASS at 768-dim)
    groq_chat:
      - "openai/gpt-oss-120b" (LIVE / PASS)
      - "openai/gpt-oss-20b" (LIVE / PASS)
      - "llama-3.3-70b-versatile" (404 model_not_found on current accounts)
  getEmbedder_behavior_unchanged: true
  quota_ledger_path: "logs/quota-ledger.jsonl"
diff: |
  diff --git a/server-lib/monitoring/quota-ledger.ts b/server-lib/monitoring/quota-ledger.ts
  new file mode 100644
  --- /dev/null
  +++ b/server-lib/monitoring/quota-ledger.ts
  @@ -0,0 +1,30 @@
  +import fs from "fs";
  +import path from "path";
  +...
  diff --git a/scripts/validate-model-ids.ts b/scripts/validate-model-ids.ts
  new file mode 100644
  --- /dev/null
  +++ b/scripts/validate-model-ids.ts
  @@ -0,0 +1,114 @@
  +...
  diff --git a/server-lib/cron/ingest/embeddings.ts b/server-lib/cron/ingest/embeddings.ts
  --- a/server-lib/cron/ingest/embeddings.ts
  +++ b/server-lib/cron/ingest/embeddings.ts
  @@ -14,6 +14,7 @@
  +import { recordModelInvocation } from "../../monitoring/quota-ledger.js";
  ...
  @@ -124,7 +125,12 @@
  -          out.push(values.length ? l2normalize(values) : localEmbed(text));
  +          if (values.length) {
  +            recordModelInvocation({ model_id: GEMINI_EMBED_MODEL, mode: "primary", caller: "geminiEmbedder.embed" });
  +            out.push(l2normalize(values));
  +          } else {
  +            recordModelInvocation({ model_id: "local-hashed-bow", mode: "fallback", caller: "geminiEmbedder.embed", metadata: { reason: "empty_embedding" } });
  +            out.push(localEmbed(text));
  +          }
```
