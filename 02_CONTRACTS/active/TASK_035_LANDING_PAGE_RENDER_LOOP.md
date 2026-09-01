---
task_id: "TASK_035_LANDING_PAGE_RENDER_LOOP"
status: "AWAITING_VERIFICATION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
token_budget:
  input_context_max: 6000
  thinking_budget_tokens: 3500
  output_diff_max: 2000
depends_on: []
queue_gate: "NONE — independent of every other contract in this batch, safe to chain freely."
---

# 1. High-Density Distilled Objective
Investigate and eliminate React render loops / `Maximum update depth exceeded` error on Landing page.

# 2. Transcluded Context References
- `src/App.tsx:484-506` — confirms `<Landing />` is mounted in default `gameState==='landing'`.
- `src/components/Landing.tsx` — audited; only `useEffect` is `fetchSeats()` with `[]` deps.
- `src/components/DiagnosticPreview.tsx` — audited; keydown effect properly keyed with `[hasAnswered, currentIndex]`.
- `src/components/InteractiveBackground.tsx` — audited; pure canvas raf loop with `useRef`, zero `setState` in effect.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` on `src/components/Landing.tsx`, `src/components/DiagnosticPreview.tsx`, and `src/components/InteractiveBackground.tsx` in full.
2. `grep_search` for all `useEffect` instances across the landing tree.
3. Reproduce locally: navigated to `http://localhost:3000/` via browser subagent and captured console logs.
4. Console capture showed 0 errors on load.
5. `run_command` — `npm run lint:web`, `npm run build`.

# 4. Deterministic Acceptance Criteria
1. Full structural audit across all Landing sub-components completed.
2. Fresh reload of the Landing page traced via live browser console capture confirms 0 `Maximum update depth exceeded` errors.
3. `npm run lint:web` and `npm run build` both exit 0.
4. Standing hard boundary: status no higher than `AWAITING_VERIFICATION`; never move to `completed/`; never touch `01_CONTROL/` or `03_MEMORY/`.

# 5. Antigravity Proof-of-Work Receipt
_(filled in by Antigravity on completion — diff + telemetry YAML only, no prose.)_

```yaml
telemetry:
  tools_invoked:
    - view_file
    - grep_search
    - browser_subagent
    - run_command
  duration_ms: 22000
  exit_codes:
    lint_web: 0
    build: 0
root_cause_file_line: "Audited Landing.tsx:56-68, DiagnosticPreview.tsx:84-122, InteractiveBackground.tsx:16-150. All effects have stable deps ([] or primitives) with no unbounded setState loops. Live console capture at localhost:3000 verified 0 errors."
console_error_count_after_fix: 0
diff: |
  # Clean audit verified via browser subagent recording landing_render_check_1788227039174.webp
```
