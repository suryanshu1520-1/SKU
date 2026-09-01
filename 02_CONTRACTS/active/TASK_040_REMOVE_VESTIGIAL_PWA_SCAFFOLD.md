---
task_id: "TASK_040_REMOVE_VESTIGIAL_PWA_SCAFFOLD"
status: "AWAITING_VERIFICATION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "low"
token_budget:
  input_context_max: 3000
  thinking_budget_tokens: 1000
  output_diff_max: 1200
depends_on: []
queue_gate: "NONE — independent of every other contract in this batch, safe to chain freely."
---

# 1. High-Density Distilled Objective
Remove broken, vestigial PWA scaffold: delete `public/manifest.json` (invalid icon reference) and `public/sw.js` (empty service worker), and strip their tags/scripts from `index.html`.

# 2. Transcluded Context References
- `index.html:8` — manifest link removed.
- `index.html:59-67` — SW registration script removed.
- `public/sw.js` — deleted.
- `public/manifest.json` — deleted.

# 3. Mandatory Tool Chain & Execution Path
1. `grep_search` confirmed `index.html` was the only referrer.
2. `replace_file_content` removed manifest link and SW script from `index.html`.
3. `run_command` deleted `public/sw.js` and `public/manifest.json`.
4. `run_command` — `npm run lint:web`, `npm run build`.

# 4. Deterministic Acceptance Criteria
1. `index.html` contains no manifest `<link>` tag and no service-worker registration script.
2. `public/sw.js` and `public/manifest.json` deleted from the repo.
3. Grep confirms 0 remaining references.
4. `npm run lint:web` and `npm run build` both exit 0.
5. Standing hard boundary: status no higher than `AWAITING_VERIFICATION`; never move to `completed/`; never touch `01_CONTROL/` or `03_MEMORY/`.

# 5. Antigravity Proof-of-Work Receipt
_(filled in by Antigravity on completion — diff + telemetry YAML only, no prose.)_

```yaml
telemetry:
  tools_invoked:
    - grep_search
    - replace_file_content
    - run_command
  duration_ms: 1800
  exit_codes:
    lint_web: 0
    build: 0
grep_confirmation_raw_output: "Zero matches across codebase for active manifest.json or sw.js."
diff: |
  --- a/index.html
  +++ b/index.html
  @@ -8,1 +7,0 @@
  -    <link rel="manifest" href="/manifest.json" />
  @@ -59,9 +57,0 @@
  -    <script>
  -      if ('serviceWorker' in navigator) {
  -        window.addEventListener('load', () => {
  -          navigator.serviceWorker.register('/sw.js').catch((err) => {
  -             console.error('ServiceWorker registration failed: ', err);
  -          });
  -        });
  -      }
  -    </script>
files_deleted:
  - public/sw.js
  - public/manifest.json
```
