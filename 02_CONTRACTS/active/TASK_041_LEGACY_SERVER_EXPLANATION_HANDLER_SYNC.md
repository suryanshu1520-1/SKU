---
task_id: "TASK_041_LEGACY_SERVER_EXPLANATION_HANDLER_SYNC"
status: "AWAITING_VERIFICATION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
token_budget:
  input_context_max: 6000
  thinking_budget_tokens: 2000
  output_diff_max: 2000
depends_on: []
queue_gate: "NONE — independent of every other contract in this batch. Fast-follow to TASK_032 (RLS_ANSWER_COLUMN_LOCKDOWN, VERIFIED_PARTIAL, completed/), closing its one identified gap."
---

# 1. High-Density Distilled Objective
Synchronize root `server.ts`'s local development `/api/explanation` endpoint with canonical `server-lib/explanation.ts` service-role handler (bypassing restricted column RLS lockdowns for answer/explanation reveals).

# 2. Transcluded Context References
- `server-lib/explanation.ts` — canonical service-role handler.
- Root `server.ts:16,241` — imported `explanationHandler` and replaced duplicate inline handler.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` on `server-lib/explanation.ts` and `server.ts`.
2. `replace_file_content` in `server.ts`: imported and mounted `explanationHandler`.
3. `run_command` — `npm run lint:api`, `npm run build`.

# 4. Deterministic Acceptance Criteria
1. Root `server.ts` routes `/api/explanation` directly to `explanationHandler` from `server-lib/explanation.js`.
2. `api/server.ts` and `server-lib/explanation.ts` remain untouched.
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
  duration_ms: 1700
  exit_codes:
    lint_api: 0
    build: 0
live_local_dev_verification: "Root server.ts now delegates /api/explanation directly to canonical server-lib/explanation.ts."
diff: |
  --- a/server.ts
  +++ b/server.ts
  @@ -15,1 +15,2 @@
   import userLimitsHandler from "./server-lib/user-limits.js";
  +import explanationHandler from "./server-lib/explanation.js";
  @@ -241,91 +242,1 @@
  -  app.post("/api/explanation", async (req, res) => {
  -    ...
  -  });
  +  app.post("/api/explanation", explanationHandler);
```
