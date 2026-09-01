---
task_id: "TASK_039_ARENA_A11Y_LABELS_AND_MOBILE_TITLE_TRUNCATION"
status: "AWAITING_VERIFICATION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "low"
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 1500
  output_diff_max: 1800
depends_on: []
queue_gate: "NONE — independent of every other contract in this batch, safe to chain freely."
---

# 1. High-Density Distilled Objective
1. Add explicit accessible `aria-label` to option buttons in `Arena.tsx` and `DiagnosticPreview.tsx` combining the option key and text.
2. Replace single-line `truncate` with `line-clamp-2` on engine title headings in `MobileLanding.tsx:155`.

# 2. Transcluded Context References
- `src/components/Arena.tsx:1423-1444` — option button aria-label.
- `src/components/DiagnosticPreview.tsx:174-187` — option button aria-label.
- `src/components/MobileLanding.tsx:153-157` — title wrapping fix.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` on all three referenced locations.
2. `replace_file_content` — add aria-labels and replace `truncate` with `line-clamp-2`.
3. `run_command` — `npm run lint:web`, `npm run build`.

# 4. Deterministic Acceptance Criteria
1. Option buttons in `Arena.tsx` and `DiagnosticPreview.tsx` have descriptive `aria-label` attributes.
2. `MobileLanding.tsx` titles wrap cleanly across up to 2 lines instead of truncating mid-word.
3. Secondary description text behavior remains untouched.
4. `npm run lint:web` and `npm run build` both exit 0.
5. Standing hard boundary: status no higher than `AWAITING_VERIFICATION`; never move to `completed/`; never touch `01_CONTROL/` or `03_MEMORY/`.

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
    lint_web: 0
    build: 0
diff: |
  --- a/src/components/Arena.tsx
  +++ b/src/components/Arena.tsx
  @@ -1428,1 +1428,2 @@
                     disabled={isQuestionLocked}
  +                  aria-label={`Option ${key}: ${typeof val === 'string' ? val : ''}`}
                     className={`w-full p-4 rounded-sm border text-left flex items-start gap-3 transition-all cursor-pointer ${optionStyle}`}
  --- a/src/components/DiagnosticPreview.tsx
  +++ b/src/components/DiagnosticPreview.tsx
  @@ -179,1 +179,2 @@
                 disabled={hasAnswered}
  +              aria-label={`Option ${String.fromCharCode(65 + idx)}: ${opt}`}
                 className={`p-3.5 rounded-xs border text-left text-[13.5px] font-sans flex items-start gap-3 transition-all cursor-pointer select-none ${btnStyle}`}
  --- a/src/components/MobileLanding.tsx
  +++ b/src/components/MobileLanding.tsx
  @@ -155,1 +155,1 @@
  -                      <h3 className="font-serif text-sm font-bold text-[#e8e0cf] truncate">
  +                      <h3 className="font-serif text-sm font-bold text-[#e8e0cf] line-clamp-2">
```
